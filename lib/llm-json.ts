// Server-only helpers for getting JSON out of a text-streaming LLM.
import { streamCompletion } from "@/lib/replicate";

/** Run a completion to the end and return the joined text. */
export async function collectCompletion(input: {
  prompt: string;
  systemPrompt: string;
}): Promise<string> {
  let text = "";
  for await (const chunk of streamCompletion(input)) text += chunk;
  return text;
}

/**
 * Find and parse the first complete top-level JSON object in `text`.
 * Strips markdown code fences, then scans braces while tracking string
 * literals and escapes so braces inside strings are ignored.
 * Returns null when no parseable object is found.
 */
export function extractJsonObject(text: string): unknown | null {
  const unfenced = text.replace(/```(?:json|JSON)?\s*/g, "").replace(/```/g, "");

  for (let start = unfenced.indexOf("{"); start !== -1; start = unfenced.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < unfenced.length; i++) {
      const ch = unfenced[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(unfenced.slice(start, i + 1));
          } catch {
            break; // try the next "{" as a start
          }
        }
      }
    }
  }
  return null;
}
