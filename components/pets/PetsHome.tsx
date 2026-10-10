"use client";

import { useEffect, useState } from "react";
import { useBrowserId } from "@/lib/client/browser-id";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PetForm } from "./PetForm";
import { PetList } from "./PetList";
import type { PetDTO } from "./types";

export function PetsHome() {
  const browserId = useBrowserId();
  const [pets, setPets] = useState<PetDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Runs again whenever this page becomes visible (Activity re-runs effects),
  // so the list stays fresh after editing or deleting a pet elsewhere.
  useEffect(() => {
    if (!browserId) return;
    const ctrl = new AbortController();
    fetch(`/api/pets?browserId=${encodeURIComponent(browserId)}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as PetDTO[];
      })
      .then((data) => {
        setPets(data);
        setError(null);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError("We couldn't load your pets.");
      });
    return () => ctrl.abort();
  }, [browserId, reloadKey]);

  const loading = pets === null && !error;
  const hasPets = (pets?.length ?? 0) > 0;
  const formVisible = pets !== null && (!hasPets || showForm);

  return (
    <section aria-labelledby="your-pets" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="your-pets"
            className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
          >
            {hasPets ? "Your pets" : "Tell us about your pet"}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {hasPets
              ? "Open a profile to see insights, guides and reminders."
              : "We'll turn this into instant nutrition, vaccine and medication insights."}
          </p>
        </div>
        {hasPets && !showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <span aria-hidden="true">+</span> Add a pet
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading pets">
          <Skeleton className="h-[88px] rounded-3xl" />
          <Skeleton className="h-[88px] rounded-3xl" />
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
          <Button variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </Button>
        </div>
      ) : null}

      {hasPets && pets ? <PetList pets={pets} /> : null}

      {formVisible ? (
        <Card className="p-5 sm:p-7">
          {hasPets ? (
            <h3 className="mb-5 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Add another pet
            </h3>
          ) : null}
          <PetForm
            key={formKey}
            onSaved={(pet) => {
              setPets((prev) => (prev ? [pet, ...prev] : [pet]));
              setShowForm(false);
              setFormKey((k) => k + 1);
            }}
            onCancel={hasPets ? () => setShowForm(false) : undefined}
          />
        </Card>
      ) : null}
    </section>
  );
}
