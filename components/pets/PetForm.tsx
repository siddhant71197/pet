"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getBrowserId } from "@/lib/client/browser-id";
import type { Gender, PetType, SizeClass } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Field, Segmented, inputClasses } from "@/components/ui/Field";
import { readError, type PetDTO } from "./types";

type NeuteredChoice = "" | "yes" | "no";

type FormState = {
  type: PetType;
  name: string;
  breed: string;
  years: string;
  months: string;
  sizeClass: SizeClass;
  weightKg: string;
  gender: Gender | "";
  neutered: NeuteredChoice;
  notes: string;
};

type Errors = Partial<Record<keyof FormState | "age" | "form", string>>;

const EMPTY: FormState = {
  type: "dog",
  name: "",
  breed: "",
  years: "",
  months: "",
  sizeClass: "medium",
  weightKg: "",
  gender: "",
  neutered: "",
  notes: "",
};

function fromPet(pet: PetDTO): FormState {
  return {
    type: pet.type,
    name: pet.name,
    breed: pet.breed ?? "",
    years: String(Math.floor(pet.ageMonths / 12)),
    months: String(pet.ageMonths % 12),
    sizeClass: pet.sizeClass,
    weightKg: pet.weightKg != null ? String(pet.weightKg) : "",
    gender: pet.gender === "male" || pet.gender === "female" ? pet.gender : "",
    neutered: pet.neutered === true ? "yes" : pet.neutered === false ? "no" : "",
    notes: pet.notes ?? "",
  };
}

// Server field names -> form field names.
const SERVER_FIELD_MAP: Record<string, keyof Errors> = {
  type: "type",
  name: "name",
  breed: "breed",
  ageMonths: "age",
  sizeClass: "sizeClass",
  weightKg: "weightKg",
  gender: "gender",
  neutered: "neutered",
  notes: "notes",
};

function validate(s: FormState): { errors: Errors; ageMonths: number; weight?: number } {
  const errors: Errors = {};
  if (!s.name.trim()) errors.name = "Please enter a name.";
  else if (s.name.trim().length > 40) errors.name = "Keep the name under 40 characters.";

  const years = s.years.trim() === "" ? 0 : Number(s.years);
  const months = s.months.trim() === "" ? 0 : Number(s.months);
  const ageMonths = years * 12 + months;
  if (
    !Number.isInteger(years) ||
    !Number.isInteger(months) ||
    years < 0 ||
    months < 0 ||
    months > 11
  ) {
    errors.age = "Use whole years and 0-11 months.";
  } else if (s.years.trim() === "" && s.months.trim() === "") {
    errors.age = "Please enter an age (months is fine for young pets).";
  } else if (ageMonths > 300) {
    errors.age = "That's older than 25 years - please double-check.";
  }

  let weight: number | undefined;
  if (s.weightKg.trim() !== "") {
    weight = Number(s.weightKg);
    if (!Number.isFinite(weight) || weight < 0.1 || weight > 150) {
      errors.weightKg = "Weight should be between 0.1 and 150 kg.";
    }
  }
  if (!s.gender) errors.gender = "Please choose male or female.";
  if (s.breed.length > 60) errors.breed = "Keep the breed under 60 characters.";
  if (s.notes.length > 500) errors.notes = "Notes can be up to 500 characters.";
  return { errors, ageMonths, weight };
}

export function PetForm({
  pet,
  onSaved,
  onCancel,
  submitLabel,
}: {
  /** When given, the form edits this pet; otherwise it creates a new one. */
  pet?: PetDTO;
  onSaved?: (pet: PetDTO) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const uid = useId();
  const isEdit = Boolean(pet);
  const [state, setState] = useState<FormState>(() => (pet ? fromPet(pet) : EMPTY));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { errors: clientErrors, ageMonths, weight } = validate(state);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const browserId = getBrowserId();
    const neutered =
      state.neutered === "yes" ? true : state.neutered === "no" ? false : undefined;

    try {
      let res: Response;
      if (pet) {
        res = await fetch(`/api/pets/${encodeURIComponent(pet.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            browserId,
            data: {
              type: state.type,
              name: state.name.trim(),
              ageMonths,
              sizeClass: state.sizeClass,
              weightKg: weight ?? null,
              breed: state.breed.trim() || null,
              notes: state.notes.trim() || null,
              gender: state.gender,
              neutered: neutered ?? null,
            },
          }),
        });
      } else {
        res = await fetch("/api/pets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            browserId,
            type: state.type,
            name: state.name.trim(),
            ageMonths,
            sizeClass: state.sizeClass,
            weightKg: weight,
            breed: state.breed.trim() || undefined,
            notes: state.notes.trim() || undefined,
            gender: state.gender,
            neutered,
          }),
        });
      }

      if (!res.ok) {
        const { message, fieldErrors } = await readError(
          res,
          "We couldn't save your pet. Please try again.",
        );
        const mapped: Errors = {};
        for (const [key, msgs] of Object.entries(fieldErrors ?? {})) {
          const target = SERVER_FIELD_MAP[key];
          if (target && msgs?.[0]) mapped[target] = msgs[0];
        }
        mapped.form =
          Object.keys(mapped).length > 0 ? "Please fix the highlighted fields." : message;
        setErrors(mapped);
        setSubmitting(false);
        return;
      }

      const saved = (await res.json()) as PetDTO;
      setSubmitting(false);
      if (isEdit) {
        onSaved?.(saved);
      } else {
        // Reset so the form is fresh if the user navigates back (Activity keeps state).
        setState(EMPTY);
        onSaved?.(saved);
        router.push(`/pets/${saved.id}`);
      }
    } catch {
      setErrors({ form: "Network error - check your connection and try again." });
      setSubmitting(false);
    }
  }

  const neuterWord =
    state.gender === "female" ? "Spayed" : state.gender === "male" ? "Neutered" : "Spayed / neutered";
  const err = (k: keyof Errors) => errors[k];
  const invalid = (k: keyof Errors) => (errors[k] ? true : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Segmented<PetType>
        name={id("type")}
        legend="Pet type"
        value={state.type}
        onChange={(v) => set("type", v)}
        options={[
          { value: "dog", label: <><span aria-hidden="true">{"\u{1F436}"}</span> Dog</> },
          { value: "cat", label: <><span aria-hidden="true">{"\u{1F431}"}</span> Cat</> },
        ]}
        error={err("type")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={id("name")} error={err("name")} errorId={id("name-err")}>
          <input
            id={id("name")}
            className={inputClasses}
            value={state.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={40}
            autoComplete="off"
            placeholder={state.type === "cat" ? "e.g. Miso" : "e.g. Biscuit"}
            aria-invalid={invalid("name")}
            aria-describedby={errors.name ? id("name-err") : undefined}
            required
          />
        </Field>
        <Field
          label="Breed"
          htmlFor={id("breed")}
          hint="Optional - mixed breeds welcome"
          error={err("breed")}
        >
          <input
            id={id("breed")}
            className={inputClasses}
            value={state.breed}
            onChange={(e) => set("breed", e.target.value)}
            maxLength={60}
            autoComplete="off"
            placeholder={state.type === "cat" ? "e.g. Domestic shorthair" : "e.g. Labrador mix"}
            aria-invalid={invalid("breed")}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
          Age
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label htmlFor={id("years")} className="sr-only">
              Years
            </label>
            <input
              id={id("years")}
              type="number"
              inputMode="numeric"
              min={0}
              max={25}
              className={`${inputClasses} pr-14`}
              value={state.years}
              onChange={(e) => set("years", e.target.value)}
              placeholder="0"
              aria-invalid={invalid("age")}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-500">
              years
            </span>
          </div>
          <div className="relative">
            <label htmlFor={id("months")} className="sr-only">
              Months
            </label>
            <input
              id={id("months")}
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              className={`${inputClasses} pr-16`}
              value={state.months}
              onChange={(e) => set("months", e.target.value)}
              placeholder="0"
              aria-invalid={invalid("age")}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-stone-500">
              months
            </span>
          </div>
        </div>
        {errors.age ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {errors.age}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented<SizeClass>
          name={id("size")}
          legend="Size"
          value={state.sizeClass}
          onChange={(v) => set("sizeClass", v)}
          options={[
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
          ]}
          error={err("sizeClass")}
        />
        <Field
          label="Weight (kg)"
          htmlFor={id("weight")}
          hint="Optional"
          error={err("weightKg")}
        >
          <input
            id={id("weight")}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0.1}
            max={150}
            className={inputClasses}
            value={state.weightKg}
            onChange={(e) => set("weightKg", e.target.value)}
            placeholder={state.type === "cat" ? "e.g. 4.5" : "e.g. 22"}
            aria-invalid={invalid("weightKg")}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented<Gender>
          name={id("gender")}
          legend="Sex"
          value={state.gender}
          onChange={(v) => set("gender", v)}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          error={err("gender")}
        />
        <Field label={`${neuterWord}?`} htmlFor={id("neutered")} error={err("neutered")}>
          <select
            id={id("neutered")}
            className={inputClasses}
            value={state.neutered}
            onChange={(e) => set("neutered", e.target.value as NeuteredChoice)}
          >
            <option value="">Not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>

      <Field
        label="Notes"
        htmlFor={id("notes")}
        hint="Optional - allergies, health conditions, diet, temperament..."
        error={err("notes")}
      >
        <textarea
          id={id("notes")}
          rows={3}
          maxLength={500}
          className={`${inputClasses} resize-y`}
          value={state.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Sensitive stomach, loves fetch, scared of the vacuum"
          aria-invalid={invalid("notes")}
        />
      </Field>

      {errors.form ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting
            ? "Saving..."
            : (submitLabel ?? (isEdit ? "Save changes" : "Create care plan"))}
        </Button>
        {onCancel ? (
          <Button variant="ghost" size="lg" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
