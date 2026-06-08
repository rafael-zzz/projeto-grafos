"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnalyticsView } from "@/components/AnalyticsView";
import { WikipediaAnalyticsView } from "@/components/WikipediaAnalyticsView";
import { useWikiGraph } from "@/lib/graph/useWikiGraph";

const BrazilAirportMap = dynamic(
  () => import("@/components/BrazilAirportMap").then((m) => m.BrazilAirportMap),
  { ssr: false }
);

const WikipediaGlobe = dynamic(
  () => import("@/components/WikipediaGlobe").then((m) => m.WikipediaGlobe),
  { ssr: false }
);

type Dataset = "airports" | "wikipedia";
type View    = "mapa" | "analises";

const VIEWS: { id: View; label: string; description: Record<Dataset, string> }[] = [
  {
    id: "mapa",
    label: "Mapa",
    description: {
      airports: "Aeroportos, BFS, DFS, Dijkstra, Roteiro",
      wikipedia: "Páginas, ligações e layout (globo)",
    },
  },
  {
    id: "analises",
    label: "Análises",
    description: {
      airports: "Métricas, rankings, regiões e rotas",
      wikipedia: "Métricas, rankings e subgrafos",
    },
  },
];

// Wrapper mounts only when Wikipedia is active — keeps useWikiGraph
// (and its two fetches) from running while the user is on Aeroportos.
function WikipediaWrapper({ view }: { view: View }) {
  const wikiState = useWikiGraph();
  return view === "mapa"
    ? <WikipediaGlobe wikiState={wikiState} />
    : (
      <WikipediaAnalyticsView
        graph={wikiState.subgraph}
        seed={wikiState.seed}
        setSeed={wikiState.setSeed}
        nodeKeys={wikiState.nodeKeys}
        depth={wikiState.depth}
      />
    );
}

export function GraphViewClient() {
  const [dataset, setDataset] = useState<Dataset>("airports");
  const [view,    setView]    = useState<View>("mapa");

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
          <div className="flex overflow-hidden rounded-md border border-zinc-200 text-[11px] font-semibold">
            <button
              onClick={() => switchDataset("airports")}
              className={`flex-1 py-1.5 transition-colors ${
                dataset === "airports" ? "bg-zinc-800 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              Aeroportos
            </button>
            <button
              onClick={() => switchDataset("wikipedia")}
              className={`flex-1 border-l border-zinc-200 py-1.5 transition-colors ${
                dataset === "wikipedia" ? "bg-zinc-800 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
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
                  view === v.id ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <p className={`text-xs font-semibold ${view === v.id ? "text-white" : "text-zinc-700"}`}>
                  {v.label}
                </p>
                <p className={`mt-0.5 text-[10px] leading-tight ${view === v.id ? "text-zinc-300" : "text-zinc-400"}`}>
                  {v.description[dataset]}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {dataset === "airports" && view === "mapa"     && <BrazilAirportMap />}
        {dataset === "airports" && view === "analises" && <AnalyticsView />}
        {dataset === "wikipedia"                       && <WikipediaWrapper view={view} />}
      </div>
    </div>
  );
}
