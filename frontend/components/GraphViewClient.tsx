"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const BrazilAirportMap = dynamic(
  () => import("@/components/BrazilAirportMap").then((m) => m.BrazilAirportMap),
  { ssr: false }
);

type Entrega = 1 | 2;

const ENTREGAS: { id: Entrega; label: string; description: string }[] = [
  { id: 1, label: "Entrega 1", description: "Grafo de aeroportos, BFS, DFS, Dijkstra" },
  { id: 2, label: "Entrega 2", description: "Em desenvolvimento" },
];

export function GraphViewClient() {
  const [entrega, setEntrega] = useState<Entrega>(1);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Sidebar */}
      <nav className="flex w-48 shrink-0 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-4">
          <p className="text-xs font-bold text-zinc-800">Projeto Grafos</p>
          <p className="mt-0.5 text-[10px] text-zinc-400">Teoria dos Grafos · 2026</p>
        </div>
        <ul className="flex flex-col gap-0.5 p-2 pt-3">
          {ENTREGAS.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => setEntrega(e.id)}
                className={`w-full rounded px-3 py-2.5 text-left transition-colors ${
                  entrega === e.id
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <p className={`text-xs font-semibold ${entrega === e.id ? "text-white" : "text-zinc-700"}`}>
                  {e.label}
                </p>
                <p className={`mt-0.5 text-[10px] leading-tight ${entrega === e.id ? "text-zinc-300" : "text-zinc-400"}`}>
                  {e.description}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {entrega === 1 ? (
          <BrazilAirportMap />
        ) : (
          <Entrega2Placeholder />
        )}
      </div>
    </div>
  );
}

function Entrega2Placeholder() {
  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-800">Entrega 2</h1>
        <p className="mt-0.5 text-xs text-zinc-500">Em desenvolvimento</p>
      </header>
      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-zinc-200 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-zinc-700">Em desenvolvimento</p>
          <p className="mt-1 text-xs text-zinc-400">Esta entrega ainda não foi implementada.</p>
        </div>
      </div>
    </div>
  );
}
