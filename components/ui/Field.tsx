import type { ReactNode } from "react";

export const inputClasses =
  "block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 aria-[invalid=true]:border-red-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500";

type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  errorId?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + optional hint/error, with consistent spacing. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  errorId,
  className = "",
  children,
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pill-style segmented radio group (e.g. Dog / Cat). */
export function Segmented<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  value: T | "";
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
        {legend}
      </legend>
      <div className="inline-flex w-full rounded-full border border-stone-300 bg-stone-100 p-1 dark:border-stone-700 dark:bg-stone-900">
        {options.map((opt) => {
          const checked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-600 ${
                checked
                  ? "bg-white text-teal-700 shadow-sm dark:bg-stone-800 dark:text-teal-300"
                  : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
