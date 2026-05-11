"use client";

import { useState } from "react";
import type { GraphData } from "@/lib/graph/types";
import { type BfsResult, runBfs, bfsLevelColor } from "@/lib/graph/bfs";

export function BfsPanel({
  graph,
  onResult,
  onClose,
}: {
  graph: GraphData;
  onResult: (result: BfsResult | null) => void;
  onClose: () => void;
}) {
  const [origin, setOrigin] = useState("");
  const [result, setResult] = useState<BfsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nodeMap = new Map(graph.nodes.map((n) => [n.key, n]));

  function calculate() {
    setError(null);
    const originKey = origin.trim().toUpperCase();
    if (!originKey) { setError("Informe o aeroporto de origem."); return; }
    if (!nodeMap.has(originKey)) { setError(`Aeroporto "${originKey}" não encontrado.`); return; }
    const r = runBfs(graph, originKey);
    setResult(r);
    onResult(r);
  }

  function clear() {
    setResult(null);
    setError(null);
    setOrigin("");
    onResult(null);
  }

  const nodesByLevel = result
    ? [...result.levels.entries()]
        .reduce((map, [key, level]) => {
          if (!map.has(level)) map.set(level, []);
          map.get(level)!.push(key);
          return map;
        }, new Map<number, string[]>())
    : null;

  const levelList = nodesByLevel
    ? [...nodesByLevel.entries()].sort(([a], [b]) => a - b)
    : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="text-sm font-bold text-zinc-800">BFS</span>
        <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">×</button>
      </div>

      {/* Input */}
      <div className="border-b border-zinc-100 px-4 py-3 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wide text-zinc-400">Origem</label>
          <input
            list="bfs-nodes"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Ex: SBGR"
            className="rounded border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
          />
        </div>
        <datalist id="bfs-nodes">
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
      {result && levelList && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="sticky top-0 border-b border-zinc-100 bg-white px-4 py-2 text-xs text-zinc-700">
            <span className="font-semibold text-zinc-900">{result.maxLevel}</span> níveis ·{" "}
            <span className="font-semibold text-zinc-900">{result.levels.size - 1}</span> aeroportos alcançados
          </p>
          {levelList.map(([level, keys]) => (
            <div key={level}>
              <p className="sticky top-[33px] border-b border-zinc-100 bg-zinc-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: bfsLevelColor(level, result.maxLevel) }}
                />
                {level === 0 ? "Origem" : `Nível ${level}`}
                <span className="ml-auto font-normal text-zinc-500">{keys.length}</span>
              </p>
              <ul className="divide-y divide-zinc-100">
                {keys.map((key) => {
                  const node = nodeMap.get(key)!;
                  return (
                    <li key={key} className="flex items-center gap-3 px-4 py-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: bfsLevelColor(level, result.maxLevel) }}
                      />
                      <span className="text-xs font-bold text-zinc-900">{key}</span>
                      <span className="text-xs text-zinc-600 truncate">{node.attributes.city}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
