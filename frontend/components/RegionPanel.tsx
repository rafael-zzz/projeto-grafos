"use client";

import type { GraphData } from "@/lib/graph/types";

const REGION_COLORS: Record<string, string> = {
  Norte:          "#0d9488",
  Nordeste:       "#ea580c",
  "Centro-Oeste": "#7c3aed",
  Sudeste:        "#2563eb",
  Sul:            "#16a34a",
};

export function RegionPanel({
  region,
  graph,
  onClose,
}: {
  region: string;
  graph: GraphData;
  onClose: () => void;
}) {
  const regionNodes = graph.nodes.filter((n) => n.attributes.region === region);
  const regionKeys = new Set(regionNodes.map((n) => n.key));
  const regionEdges = graph.edges.filter(
    (e) => regionKeys.has(e.source) && regionKeys.has(e.target)
  );

  const order = regionNodes.length;
  const size = regionEdges.length;
  const density = order < 2 ? 0 : (2 * size) / (order * (order - 1));

  const degreeMap = new Map<string, number>(regionNodes.map((n) => [n.key, 0]));
  for (const e of regionEdges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }

  const sortedNodes = [...regionNodes].sort(
    (a, b) => (degreeMap.get(b.key) ?? 0) - (degreeMap.get(a.key) ?? 0)
  );

  const color = REGION_COLORS[region] ?? "#94a3b8";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white">
      <div className="flex items-start justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-sm font-bold text-zinc-800">{region}</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Subgrafo induzido</p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          ×
        </button>
      </div>

      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">Ordem</span>
            <span className="text-xl font-bold text-zinc-800">{order}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">Tamanho</span>
            <span className="text-xl font-bold text-zinc-800">{size}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-zinc-400">Densidade</span>
            <span className="text-xl font-bold text-zinc-800">{density.toFixed(6)}</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="sticky top-0 border-b border-zinc-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Aeroportos · {order}
        </p>
        <ul className="divide-y divide-zinc-50">
          {sortedNodes.map((n) => (
            <li key={n.key} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-8 text-xs font-bold text-zinc-800">{n.attributes.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{n.attributes.city}</span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                grau {degreeMap.get(n.key) ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
