"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnalyticsView } from "@/components/AnalyticsView";

const BrazilAirportMap = dynamic(
  () => import("@/components/BrazilAirportMap").then((m) => m.BrazilAirportMap),
  { ssr: false }
);

type Dataset = "airports" | "wikipedia";
type View = "mapa" | "analises";

const VIEWS: { id: View; label: string; description: string }[] = [
  { id: "mapa", label: "Mapa", description: "Aeroportos, BFS, DFS, Dijkstra, Roteiro" },
  { id: "analises", label: "Análises", description: "Distribuição, ranking, regiões, heatmap" },
];

export function GraphViewClient() {
  const [dataset, setDataset] = useState<Dataset>("airports");
  const [view, setView] = useState<View>("mapa");

  function switchDataset(next: Dataset) {
    setDataset(next);
    setView("mapa");
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Sidebar */}
      <nav className="flex w-48 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-3 py-3">
          <p className="mb-2.5 px-1 text-xs font-bold text-zinc-800">Projeto Grafos</p>
          {/* Dataset toggle */}
          <div className="flex overflow-hidden rounded-md border border-zinc-200 text-[11px] font-semibold">
            <button
              onClick={() => switchDataset("airports")}
              className={`flex-1 py-1.5 transition-colors ${
                dataset === "airports"
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Aeroportos
            </button>
            <button
              onClick={() => switchDataset("wikipedia")}
              className={`flex-1 border-l border-zinc-200 py-1.5 transition-colors ${
                dataset === "wikipedia"
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Wikipedia
            </button>
          </div>
        </div>
        <ul className="flex flex-col gap-0.5 p-2 pt-3">
          {VIEWS.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => setView(v.id)}
                className={`w-full rounded px-3 py-2.5 text-left transition-colors ${
                  view === v.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <p className={`text-xs font-semibold ${view === v.id ? "text-white" : "text-zinc-700"}`}>
                  {v.label}
                </p>
                <p className={`mt-0.5 text-[10px] leading-tight ${view === v.id ? "text-zinc-300" : "text-zinc-400"}`}>
                  {v.description}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {dataset === "wikipedia" ? (
          <WikipediaPlaceholder />
        ) : view === "mapa" ? (
          <BrazilAirportMap />
        ) : (
          <AnalyticsView />
        )}
      </div>
    </div>
  );
}

function WikipediaPlaceholder() {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-800">Grafo Wikipedia</h1>
        <p className="mt-0.5 text-xs text-zinc-500">Em desenvolvimento</p>
      </header>
      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-zinc-200 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-700">Em desenvolvimento</p>
          <p className="mt-1 text-xs text-zinc-400">O dataset Wikipedia ainda não foi integrado.</p>
        </div>
      </div>
    </div>
  );
}
