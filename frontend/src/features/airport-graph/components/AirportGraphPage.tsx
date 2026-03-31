"use client";

import { REGION_COLORS, REGION_ORDER } from "../constants/regionStyles";
import { useAirportGraph } from "../hooks/useAirportGraph";
import { AirportGraphView } from "./AirportGraphView";

export function AirportGraphPage() {
  const state = useAirportGraph();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight">
          Grafo de aeroportos (Brasil)
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Nós: código IATA. Arestas:{" "}
          <span className="text-slate-600 dark:text-slate-300">regional</span>,{" "}
          <span className="text-red-600 dark:text-red-400">hub</span>,{" "}
          <span className="text-violet-600 dark:text-violet-400">
            curta_distância
          </span>
          . Arraste um nó para movê-lo; use zoom e pan no canvas.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-6 py-6 lg:flex-row">
        <aside className="w-full shrink-0 space-y-3 lg:w-52">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Regiões
          </h2>
          <ul className="space-y-2 text-sm">
            {REGION_ORDER.map((regiao) => (
              <li key={regiao} className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: REGION_COLORS[regiao] }}
                  aria-hidden
                />
                <span>{regiao}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-h-[480px] flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {state.status === "loading" ? (
            <div className="flex h-[480px] items-center justify-center text-zinc-500">
              Carregando dados e montando o grafo…
            </div>
          ) : null}
          {state.status === "error" ? (
            <div className="flex h-[480px] items-center justify-center px-4 text-center text-red-600 dark:text-red-400">
              {state.message}
            </div>
          ) : null}
          {state.status === "ready" ? (
            <AirportGraphView graph={state.graph} className="h-[520px]" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
