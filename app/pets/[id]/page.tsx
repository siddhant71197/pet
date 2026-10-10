import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardSkeleton, PetDashboard } from "@/components/pets/PetDashboard";

export const metadata: Metadata = {
  title: "Pet dashboard",
  description: "Personalised nutrition, vaccines, grooming, growth and training plans.",
};

export default function PetPage({ params }: PageProps<"/pets/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {params.then(({ id }) => (
        <PetDashboard key={id} petId={id} />
      ))}
    </Suspense>
  );
}
