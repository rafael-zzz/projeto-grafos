"use client";

import { useCallback, useRef, useState } from "react";
import type { GraphData } from "@/lib/graph/types";

const REGION_COLORS: Record<string, string> = {
  Norte:          "#0d9488",
  Nordeste:       "#ea580c",
  "Centro-Oeste": "#7c3aed",
  Sudeste:        "#2563eb",
  Sul:            "#16a34a",
};

type PanelEdge = {
  key: string;
  neighborKey: string;
  neighborLabel: string;
  neighborCity: string;
  neighborRegion: string;
  weight: number;
  tipoConexao: string;
  justificativa: string;
  direction: "out" | "in";
};

type Transform = { x: number; y: number; scale: number };

function toSVG(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  return [x, y];
}

const VW = 300;
const VH = 260;

export function AirportPanel({
  nodeKey,
  graph,
  onClose,
}: {
  nodeKey: string;
  graph: GraphData;
  onClose: () => void;
}) {
  const node = graph.nodes.find((n) => n.key === nodeKey)!;
  const nodeMap = new Map(graph.nodes.map((n) => [n.key, n]));

  const edges: PanelEdge[] = [];
  for (const e of graph.edges) {
    if (e.source === nodeKey) {
      const nb = nodeMap.get(e.target);
      if (nb) edges.push({ key: e.key, neighborKey: e.target, neighborLabel: nb.attributes.label, neighborCity: nb.attributes.city, neighborRegion: nb.attributes.region, weight: e.attributes.weight, tipoConexao: e.attributes.tipo_conexao, justificativa: e.attributes.justificativa, direction: "out" });
    } else if (e.target === nodeKey) {
      const nb = nodeMap.get(e.source);
      if (nb) edges.push({ key: e.key, neighborKey: e.source, neighborLabel: nb.attributes.label, neighborCity: nb.attributes.city, neighborRegion: nb.attributes.region, weight: e.attributes.weight, tipoConexao: e.attributes.tipo_conexao, justificativa: e.attributes.justificativa, direction: "in" });
    }
  }
  edges.sort((a, b) => a.weight - b.weight);

  const egoR = Math.min(108, Math.max(72, edges.length * 7));
  const neighborPos = new Map<string, [number, number]>();
  edges.forEach((e, i) => {
    const angle = (2 * Math.PI * i) / edges.length - Math.PI / 2;
    neighborPos.set(e.neighborKey, [Math.cos(angle) * egoR, Math.sin(angle) * egoR]);
  });

  const [tr, setTr] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const trRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  function apply(updater: (p: Transform) => Transform) {
    setTr((p) => { const n = updater(p); trRef.current = n; return n; });
  }

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const [cx, cy] = toSVG(svgRef.current!, e.clientX, e.clientY);
    apply((p) => {
      const s = Math.min(Math.max(p.scale * factor, 0.25), 10);
      return { scale: s, x: cx - (cx - p.x) * (s / p.scale), y: cy - (cy - p.y) * (s / p.scale) };
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const [sx, sy] = toSVG(svgRef.current!, e.clientX, e.clientY);
    drag.current = { sx, sy, tx: trRef.current.x, ty: trRef.current.y };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    const [cx, cy] = toSVG(svgRef.current!, e.clientX, e.clientY);
    apply((p) => ({ ...p, x: d.tx + (cx - d.sx), y: d.ty + (cy - d.sy) }));
  }, []);

  const onMouseUp = useCallback(() => { drag.current = null; }, []);

  const nodeColor = REGION_COLORS[node.attributes.region] ?? "#94a3b8";
  const outCount = edges.filter((e) => e.direction === "out").length;
  const inCount = edges.filter((e) => e.direction === "in").length;
  const cx = VW / 2;
  const cy = VH / 2;
  const { x: tx, y: ty, scale } = tr;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: nodeColor }} />
            <span className="text-sm font-bold text-zinc-800">{node.attributes.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{node.attributes.city} · {node.attributes.region}</p>
          <p className="mt-1 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">{outCount}</span> saídas ·{" "}
            <span className="font-medium text-zinc-700">{inCount}</span> chegadas
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          ×
        </button>
      </div>

      {/* Ego network */}
      <div className="relative border-b border-zinc-100">
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
          <button onClick={() => apply((t) => ({ ...t, scale: Math.min(t.scale * 1.3, 10) }))} className="flex size-6 items-center justify-center rounded border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50">+</button>
          <button onClick={() => apply((t) => ({ ...t, scale: Math.max(t.scale / 1.3, 0.25) }))} className="flex size-6 items-center justify-center rounded border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50">−</button>
          <button onClick={() => apply(() => ({ x: 0, y: 0, scale: 1 }))} className="flex size-6 items-center justify-center rounded border border-zinc-200 bg-white text-[10px] text-zinc-600 hover:bg-zinc-50" title="Reset">↺</button>
        </div>

        <svg
          ref={svgRef}
          className="w-full cursor-grab active:cursor-grabbing select-none"
          style={{ height: VH }}
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <marker id="pa-out" viewBox="0 0 6 6" refX="6" refY="3" markerUnits="strokeWidth" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
            </marker>
            <marker id="pa-in" viewBox="0 0 6 6" refX="6" refY="3" markerUnits="strokeWidth" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
            </marker>
          </defs>

          <g transform={`translate(${cx + tx},${cy + ty}) scale(${scale})`}>
            {edges.map((e) => {
              const np = neighborPos.get(e.neighborKey)!;
              const dist = Math.sqrt(np[0] ** 2 + np[1] ** 2);
              const nr = 5 / scale;
              const cr = 8 / scale;
              if (e.direction === "out") {
                const shrink = (dist - nr) / dist;
                return <line key={e.key} x1={0} y1={0} x2={np[0] * shrink} y2={np[1] * shrink} stroke="#94a3b8" strokeWidth={1 / scale} strokeOpacity={0.55} markerEnd="url(#pa-out)" />;
              } else {
                const x2 = (np[0] / dist) * cr;
                const y2 = (np[1] / dist) * cr;
                return <line key={e.key} x1={np[0]} y1={np[1]} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth={1 / scale} strokeOpacity={0.7} markerEnd="url(#pa-in)" />;
              }
            })}

            {edges.map((e) => {
              const np = neighborPos.get(e.neighborKey)!;
              const color = REGION_COLORS[e.neighborRegion] ?? "#94a3b8";
              const r = 5 / scale;
              const labelY = np[1] <= 0 ? np[1] - r - 2 / scale : np[1] + r + 8 / scale;
              return (
                <g key={`nb-${e.neighborKey}`}>
                  <circle cx={np[0]} cy={np[1]} r={r} fill={color} stroke="#fff" strokeWidth={1 / scale} />
                  <text x={np[0]} y={labelY} textAnchor="middle" fontSize={7 / scale} fontWeight="600" fill="#374151" pointerEvents="none">
                    {e.neighborLabel}
                  </text>
                </g>
              );
            })}

            <circle cx={0} cy={0} r={8 / scale} fill={nodeColor} stroke="#fff" strokeWidth={1.5 / scale} />
            <text x={0} y={-11 / scale} textAnchor="middle" fontSize={8 / scale} fontWeight="700" fill="#111827" pointerEvents="none">
              {node.attributes.label}
            </text>
          </g>
        </svg>
      </div>

      {/* Connection list */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="sticky top-0 border-b border-zinc-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Conexões · {edges.length}
        </p>
        <ul className="divide-y divide-zinc-50">
          {edges.map((e) => (
            <li key={e.key} className="flex flex-col gap-0.5 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className={`w-3 shrink-0 text-center text-xs font-bold ${e.direction === "out" ? "text-zinc-400" : "text-amber-400"}`}>
                  {e.direction === "out" ? "→" : "←"}
                </span>
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: REGION_COLORS[e.neighborRegion] ?? "#94a3b8" }} />
                <div className="min-w-0 flex-1 truncate">
                  <span className="text-xs font-bold text-zinc-800">{e.neighborLabel}</span>
                  <span className="ml-1 text-xs text-zinc-400">{e.neighborCity}</span>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-zinc-400">{e.weight.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                  {e.tipoConexao}
                </span>
                <span className="truncate text-[10px] text-zinc-400">{e.justificativa}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
