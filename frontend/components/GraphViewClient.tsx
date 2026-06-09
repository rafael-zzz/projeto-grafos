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

// ─── theme tokens ────────────────────────────────────────────────────────────
const THEME = {
  airports: {
    nav:          "bg-slate-950 border-amber-500/30",
    header:       "border-amber-500/20",
    title:        "text-amber-400 font-mono tracking-widest uppercase text-[10px]",
    toggleWrap:   "border-amber-500/40 bg-slate-800",
    toggleActive: "bg-amber-400 text-slate-950",
    toggleIdle:   "bg-transparent text-slate-400 hover:bg-slate-800 hover:text-amber-300",
    toggleDivider:"border-amber-500/20",
    navActive:    "bg-amber-400 text-slate-950",
    navIdle:      "text-slate-400 hover:bg-slate-800 hover:text-amber-300",
    navLabelActive:"text-slate-950",
    navLabelIdle: "text-slate-300",
    navDescActive:"text-slate-700",
    navDescIdle:  "text-slate-500",
  },
  wikipedia: {
    nav:          "bg-white border-zinc-200",
    header:       "border-zinc-100",
    title:        "text-zinc-800",
    toggleWrap:   "border-zinc-200 bg-white",
    toggleActive: "bg-zinc-800 text-white",
    toggleIdle:   "bg-white text-zinc-500 hover:bg-zinc-50",
    toggleDivider:"border-zinc-200",
    navActive:    "bg-zinc-800 text-white",
    navIdle:      "text-zinc-600 hover:bg-zinc-100",
    navLabelActive:"text-white",
    navLabelIdle: "text-zinc-700",
    navDescActive:"text-zinc-300",
    navDescIdle:  "text-zinc-400",
  },
} as const;

export function GraphViewClient() {
  const [dataset, setDataset] = useState<Dataset>("airports");
  const [view,    setView]    = useState<View>("mapa");

  function switchDataset(next: Dataset) {
    setDataset(next);
    setView("mapa");
  }

  const t = THEME[dataset];

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Sidebar */}
      <nav className={`flex w-48 shrink-0 flex-col border-r transition-colors duration-300 ${t.nav}`}>
        <div className={`border-b px-3 py-3 transition-colors duration-300 ${t.header}`}>
          <p className={`mb-2.5 px-1 transition-colors duration-300 ${t.title}`}>
            {dataset === "airports" ? "✈ PROJ. GRAFOS" : "Projeto Grafos"}
          </p>
          <div className={`flex overflow-hidden rounded-md border text-[11px] font-semibold transition-colors duration-300 ${t.toggleWrap}`}>
            <button
              onClick={() => switchDataset("airports")}
              className={`flex-1 py-1.5 transition-colors duration-200 ${
                dataset === "airports" ? t.toggleActive : t.toggleIdle
              }`}
            >
              Aeroportos
            </button>
            <button
              onClick={() => switchDataset("wikipedia")}
              className={`flex-1 border-l py-1.5 transition-colors duration-200 ${t.toggleDivider} ${
                dataset === "wikipedia" ? t.toggleActive : t.toggleIdle
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
                className={`w-full rounded px-3 py-2.5 text-left transition-colors duration-200 ${
                  view === v.id ? t.navActive : t.navIdle
                }`}
              >
                <p className={`text-xs font-semibold transition-colors duration-200 ${
                  view === v.id ? t.navLabelActive : t.navLabelIdle
                }`}>
                  {v.label}
                </p>
                <p className={`mt-0.5 text-[10px] leading-tight transition-colors duration-200 ${
                  view === v.id ? t.navDescActive : t.navDescIdle
                }`}>
                  {v.description[dataset]}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {/* airport runway indicator */}
        {dataset === "airports" && (
          <div className="mt-auto border-t border-amber-500/20 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              <span className="text-[9px] font-mono text-amber-500/70 tracking-widest">LIVE</span>
            </div>
          </div>
        )}
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
