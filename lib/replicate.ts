// Server-only: this module reads REPLICATE_API_TOKEN. Do not import it from client components.
import Replicate from "replicate";

const DEFAULT_MODEL = "google/gemini-3.5-flash";
const DEFAULT_EFFORT = "medium";
const IDLE_POLL_MS = 2000;
// Models may work silently for 10-15s before their first output.
const STALL_MS = 45_000;
const TOTAL_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 2;
const MIN_FIRST_YIELD = 40;

let client: Replicate | null = null;

function getClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }
  client ??= new Replicate({ auth: token });
  return client;
}

type SseEvent = { event: string; data: string };

async function* readSse(body: ReadableStream<Uint8Array>): AsyncIterable<SseEvent> {
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        const colon = line.indexOf(":");
        if (colon <= 0) continue;
        const field = line.slice(0, colon);
        const value = line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
      }
      yield { event, data: data.join("\n") };
    }
  }
}

// The Replicate stream for this model mixes incremental deltas with periodic
// cumulative snapshots ("full text so far"), and deltas after a snapshot
// continue from that snapshot. A chunk that repeats the start of the text is
// treated as a snapshot (replaces the text); anything else is appended.
function applyChunk(text: string, chunk: string): string {
  const probe = Math.min(text.length, chunk.length);
  if (chunk.length >= 4 && probe >= 4 && chunk.slice(0, probe) === text.slice(0, probe)) {
    return chunk;
  }
  return text + chunk;
}

// Each model family on Replicate names its inputs differently.
function modelInput(model: string, input: { prompt: string; systemPrompt: string }) {
  if (model.startsWith("google/")) {
    return {
      prompt: input.prompt,
      system_instruction: input.systemPrompt,
      thinking_level: process.env.REPLICATE_THINKING ?? "none",
      max_output_tokens: 8192,
      temperature: 0.7,
    };
  }
  return {
    prompt: input.prompt,
    system_prompt: input.systemPrompt,
    max_tokens: 4096, // Claude on Replicate requires >= 1024
    effort: process.env.REPLICATE_EFFORT ?? DEFAULT_EFFORT,
  };
}

class StalledError extends Error {}

const TERMINAL = new Set(["succeeded", "failed", "canceled"]);

function outputText(output: unknown): string {
  return Array.isArray(output) ? output.join("") : output == null ? "" : String(output);
}

// Streams text deltas from the Replicate model. Every yielded value extends
// the text yielded so far. If a prediction stalls before producing anything
// useful it is cancelled and retried once.
export async function* streamCompletion(input: {
  prompt: string;
  systemPrompt: string;
}): AsyncIterable<string> {
  for (let attempt = 1; ; attempt++) {
    let produced = false;
    try {
      for await (const chunk of runPrediction(input)) {
        produced = true;
        yield chunk;
      }
      return;
    } catch (err) {
      if (err instanceof StalledError && !produced && attempt < MAX_ATTEMPTS) {
        console.warn(`Replicate prediction stalled (${err.message}); retrying`);
        continue;
      }
      throw err;
    }
  }
}

async function* runPrediction(input: {
  prompt: string;
  systemPrompt: string;
}): AsyncIterable<string> {
  const replicate = getClient();
  const model = process.env.REPLICATE_MODEL ?? DEFAULT_MODEL;
  const prediction = await replicate.predictions.create({
    model,
    input: modelInput(model, input),
    stream: true,
  });
  const streamUrl = prediction.urls?.stream;
  if (!streamUrl) throw new Error("Prediction does not support streaming");

  const startedAt = Date.now();
  let lastProgressAt = startedAt;
  let finished = false;
  const abort = new AbortController();
  // `text` is the reconciled output so far; `sent` is how much was yielded.
  // Nothing is yielded until there is a meaningful amount of text, so a
  // prediction that stalls after a few characters can still be retried.
  let text = "";
  let sent = 0;
  const flush = function* (force = false): Generator<string> {
    if (text.length > sent && (force || text.length >= MIN_FIRST_YIELD || sent > 0)) {
      yield text.slice(sent);
      sent = text.length;
    }
  };
  // Accept a newer view of the output only if it extends what was sent.
  const advance = (next: string) => {
    if (next.length > text.length && next.startsWith(text.slice(0, sent))) {
      text = next;
      lastProgressAt = Date.now();
    }
  };

  try {
    const res = await fetch(streamUrl, {
      headers: { Accept: "text/event-stream", "Cache-Control": "no-store" },
      signal: abort.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Stream request failed with status ${res.status}`);
    }

    const events = readSse(res.body)[Symbol.asyncIterator]();
    let next: Promise<IteratorResult<SseEvent>> = events.next();
    let reconciled = "";
    try {
      while (true) {
        // The SSE stream can go quiet, close early, or send "done" minutes
        // late. When it is quiet, poll the prediction instead.
        const result = await Promise.race([
          next,
          new Promise<"idle">((resolve) => setTimeout(() => resolve("idle"), IDLE_POLL_MS)),
        ]);
        if (result === "idle") {
          const p = await replicate.predictions.get(prediction.id);
          if (TERMINAL.has(p.status)) break;
          advance(outputText(p.output));
          yield* flush();
          const now = Date.now();
          if (sent === 0 && now - lastProgressAt > STALL_MS) {
            throw new StalledError(`no output after ${Math.round((now - startedAt) / 1000)}s`);
          }
          if (now - lastProgressAt > STALL_MS * 3 || now - startedAt > TOTAL_TIMEOUT_MS) {
            throw new Error("The model stopped responding");
          }
          continue;
        }
        if (result.done) {
          // Stream closed before the model finished: keep polling.
          next = new Promise<never>(() => {});
          continue;
        }
        next = events.next();
        const ev = result.value;
        if (ev.event === "error") throw new Error(ev.data || "Model error");
        if (ev.event === "done") break;
        if (ev.event !== "output" || !ev.data) continue;
        reconciled = applyChunk(reconciled, ev.data);
        advance(reconciled);
        yield* flush();
      }
    } finally {
      // Close the SSE connection; we may have stopped before Replicate did.
      next.catch(() => {});
      abort.abort();
    }

    const final = await replicate.predictions.get(prediction.id);
    finished = TERMINAL.has(final.status);
    if (final.status === "failed" || final.status === "canceled") {
      throw new Error(`Prediction ${final.status}: ${String(final.error ?? "")}`);
    }
    const out = outputText(final.output);
    if (out.startsWith(text.slice(0, sent))) {
      text = out;
    } else {
      console.warn(
        `Replicate stream diverged from final output (streamed ${sent}, final ${out.length} chars)`,
      );
    }
    yield* flush(true);
  } finally {
    if (!finished) {
      // Client disconnected, stalled or failed: stop the paid prediction.
      replicate.predictions.cancel(prediction.id).catch(() => {});
    }
  }
}
