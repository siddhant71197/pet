"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Ad } from "@/lib/ads/types";
import { getBrowserId } from "@/lib/client/browser-id";

type FieldErrors = Partial<Record<"name" | "age" | "zipcode" | "email" | "consent", string[]>>;
type Status = "idle" | "submitting" | "success";

type Props = {
  /** The ad that opened the form; null = closed. */
  ad: Ad | null;
  petId?: string;
  onClose: () => void;
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 aria-[invalid=true]:border-red-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export function LeadFormModal({ ad, petId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // Open/close the native dialog to follow `ad`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ad && !dialog.open) dialog.showModal();
    if (!ad && dialog.open) dialog.close();
  }, [ad]);

  // Activity (cacheComponents) hides rather than unmounts: close and reset on hide.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const form = formRef.current;
    return () => {
      if (dialog?.open) dialog.close();
      form?.reset();
      setStatus("idle");
      setFieldErrors({});
      setFormError(null);
      onCloseRef.current();
    };
  }, []);

  function handleClosed() {
    formRef.current?.reset();
    setStatus("idle");
    setFieldErrors({});
    setFormError(null);
    onCloseRef.current();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ad || status === "submitting") return;
    const fd = new FormData(e.currentTarget);
    const ageRaw = String(fd.get("age") ?? "").trim();
    const payload = {
      name: String(fd.get("name") ?? ""),
      age: ageRaw === "" ? null : Number(ageRaw),
      zipcode: String(fd.get("zipcode") ?? ""),
      email: String(fd.get("email") ?? ""),
      consent: fd.get("consent") === "on",
      sourceAd: ad.id,
      adProvider: ad.provider,
      petId: petId || undefined,
      browserId: getBrowserId(),
    };

    setStatus("submitting");
    setFieldErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: FieldErrors };
      setStatus("idle");
      if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
        setFieldErrors(data.fieldErrors);
      } else {
        setFormError(
          res.status === 429
            ? "You've sent a few requests already. Please try again later."
            : data.error || "Something went wrong. Please try again.",
        );
      }
    } catch {
      setStatus("idle");
      setFormError("Network error. Please check your connection and try again.");
    }
  }

  const err = (k: keyof FieldErrors) => fieldErrors[k]?.[0];
  const errorText = (k: keyof FieldErrors, friendly: string) =>
    err(k) ? (
      <p id={`lead-${k}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
        {friendly}
      </p>
    ) : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClosed}
      aria-labelledby="lead-form-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
    >
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Sponsored · {ad?.partnerName}
            </span>
            <h2 id="lead-form-title" className="mt-1 text-lg font-semibold">
              {status === "success" ? "Request sent" : "Get a pet insurance quote"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              Thanks! {ad?.partnerName ?? "Our partner"} will reach out by email with quote options.
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              Done
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="lead-name" className="text-sm font-medium">Full name</label>
              <input
                id="lead-name" name="name" type="text" autoComplete="name" required maxLength={80}
                aria-invalid={!!err("name")} aria-describedby={err("name") ? "lead-name-error" : undefined}
                className={inputClass}
              />
              {errorText("name", "Please enter your name.")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lead-age" className="text-sm font-medium">Your age</label>
                <input
                  id="lead-age" name="age" type="number" inputMode="numeric" min={18} max={120} required
                  aria-invalid={!!err("age")} aria-describedby={err("age") ? "lead-age-error" : undefined}
                  className={inputClass}
                />
                {errorText("age", "You must be 18 or older.")}
              </div>
              <div>
                <label htmlFor="lead-zip" className="text-sm font-medium">Zip code</label>
                <input
                  id="lead-zip" name="zipcode" type="text" inputMode="numeric" autoComplete="postal-code"
                  pattern="\d{5,6}" maxLength={6} required
                  aria-invalid={!!err("zipcode")} aria-describedby={err("zipcode") ? "lead-zipcode-error" : undefined}
                  className={inputClass}
                />
                {errorText("zipcode", "Enter a 5 or 6 digit zip code.")}
              </div>
            </div>
            <div>
              <label htmlFor="lead-email" className="text-sm font-medium">Email</label>
              <input
                id="lead-email" name="email" type="email" autoComplete="email" required
                aria-invalid={!!err("email")} aria-describedby={err("email") ? "lead-email-error" : undefined}
                className={inputClass}
              />
              {errorText("email", "Enter a valid email address.")}
            </div>
            <div>
              <label className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
                <input
                  name="consent" type="checkbox" required
                  aria-invalid={!!err("consent")} aria-describedby={err("consent") ? "lead-consent-error" : undefined}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 accent-emerald-600"
                />
                <span>
                  I agree to share these details with {ad?.partnerName ?? "the advertiser"} so they can contact me
                  about pet insurance.
                </span>
              </label>
              {errorText("consent", "Please tick the box to continue.")}
            </div>

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {status === "submitting" ? "Sending..." : "Request my quote"}
            </button>
            {ad?.disclosure && (
              <p className="text-[11px] leading-snug text-stone-400 dark:text-stone-500">{ad.disclosure}</p>
            )}
          </form>
        )}
      </div>
    </dialog>
  );
}

export default LeadFormModal;
