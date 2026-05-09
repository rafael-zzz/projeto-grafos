"use client";

import { useState } from "react";
import type { GraphData } from "@/lib/graph/types";
import { type DijkstraResult, runDijkstra, getPath } from "@/lib/graph/dijkstra";

const REGION_COLORS: Record<string, string> = {
  Norte: "#0d9488", Nordeste: "#ea580c", "Centro-Oeste": "#7c3aed",
  Sudeste: "#2563eb", Sul: "#16a34a",
};

export function DijkstraPanel({
  graph,
  onResult,
  onClose,
}: {
  graph: GraphData;
  onResult: (result: DijkstraResult | null) => void;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [result, setResult] = useState<DijkstraResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nodeMap = new Map(graph.nodes.map((n) => [n.key, n]));

  function calculate() {
    setError(null);
    const originKey = origin.trim().toUpperCase();
    const destKey = dest.trim().toUpperCase() || null;

    if (!originKey) { setError("Informe o aeroporto de origem."); return; }
    if (!nodeMap.has(originKey)) { setError(`Aeroporto "${originKey}" não encontrado.`); return; }
    if (destKey && !nodeMap.has(destKey)) { setError(`Aeroporto "${destKey}" não encontrado.`); return; }
    if (destKey && destKey === originKey) { setError("Origem e destino iguais."); return; }

    const { dist, prev } = runDijkstra(graph, originKey);
    const r: DijkstraResult = { originKey, destKey, dist, prev };
    setResult(r);
    onResult(r);
  }

  function clear() {
    setResult(null);
    setError(null);
    setOrigin("");
    setDest("");
    onResult(null);
  }

  const path = result && result.destKey ? getPath(result.prev, result.destKey) : null;
  const totalCost = path && result ? result.dist.get(result.destKey!) : null;

  const allDests = result && !result.destKey
    ? graph.nodes
        .filter((n) => n.key !== result.originKey && result.dist.get(n.key) !== Infinity)
        .sort((a, b) => (result.dist.get(a.key) ?? Infinity) - (result.dist.get(b.key) ?? Infinity))
    : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="text-sm font-bold text-zinc-800">Dijkstra</span>
        <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">×</button>
      </div>

      {/* Inputs */}
      <div className="border-b border-zinc-100 px-4 py-3 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-zinc-400">Origem</label>
          <input
            list="dj-nodes"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Ex: SBGR"
            className="rounded border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-zinc-400">Destino <span className="normal-case text-zinc-300">(opcional)</span></label>
          <input
            list="dj-nodes"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="Deixe vazio para todos"
            className="rounded border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
          />
        </div>
        <datalist id="dj-nodes">
          {graph.nodes.map((n) => (
            <option key={n.key} value={n.key}>{n.attributes.city}</option>
          ))}
        </datalist>
        {error && <p className="text-[10px] text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={calculate}
            className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            Calcular
          </button>
          {result && (
            <button
              onClick={clear}
              className="rounded border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Specific path */}
        {path && result && totalCost !== undefined && totalCost !== null && (
          <div className="px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Caminho mínimo</span>
              <span className="text-xs tabular-nums text-zinc-500">custo {totalCost.toFixed(4)}</span>
            </div>
            <div className="flex flex-col gap-1">
              {path.map((key, i) => {
                const node = nodeMap.get(key)!;
                const color = REGION_COLORS[node.attributes.region] ?? "#94a3b8";
                const legCost = i > 0 ? (result.dist.get(key)! - result.dist.get(path[i - 1])!) : null;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
                      {i < path.length - 1 && <div className="w-px flex-1 bg-zinc-200 my-0.5" style={{ height: 12 }} />}
                    </div>
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-800">{key}</span>
                        <span className="ml-1 text-xs text-zinc-400 truncate">{node.attributes.city}</span>
                      </div>
                      {legCost !== null && (
                        <span className="shrink-0 text-[10px] tabular-nums text-amber-500">+{legCost.toFixed(4)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All destinations */}
        {allDests && result && (
          <>
            <p className="sticky top-0 border-b border-zinc-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Todos os destinos · {allDests.length}
            </p>
            <ul className="divide-y divide-zinc-50">
              {allDests.map((n) => {
                const color = REGION_COLORS[n.attributes.region] ?? "#94a3b8";
                const d = result.dist.get(n.key)!;
                const p = getPath(result.prev, n.key);
                return (
                  <li key={n.key} className="flex items-center gap-3 px-4 py-2">
                    <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-zinc-800">{n.key}</span>
                      <span className="ml-1 text-xs text-zinc-400">{n.attributes.city}</span>
                      <p className="text-[10px] text-zinc-300 truncate">{p.join(" → ")}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">{d.toFixed(4)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
