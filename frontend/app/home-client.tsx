"use client";

import dynamic from "next/dynamic";

const AirportGraphPage = dynamic(
  () =>
    import("@/src/features/airport-graph/components/AirportGraphPage").then(
      (m) => m.AirportGraphPage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Carregando visualização…
      </div>
    ),
  },
);

export function HomeClient() {
  return <AirportGraphPage />;
}
