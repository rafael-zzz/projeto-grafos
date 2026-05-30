"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { GraphData } from "@/lib/graph/types";
import type { BfsResult } from "@/lib/graph/bfs";
import { bfsLevelColor, runBfs } from "@/lib/graph/bfs";
import type { DfsResult } from "@/lib/graph/dfs";
import { dfsLevelColor, runDfs } from "@/lib/graph/dfs";
import {
  computeInDegrees, computeOutDegrees, degreeDistribution,
  topAirports, regionalMetrics, bfsLevelDistribution, regionalFlowMatrix,
} from "@/lib/graph/analytics";

type Tab = "dist" | "ranking" | "regioes" | "heatmap" | "bfs" | "dfs";

const TABS: { id: Tab; label: string }[] = [
  { id: "dist", label: "Distribuição" },
  { id: "ranking", label: "Ranking" },
  { id: "regioes", label: "Regiões" },
  { id: "heatmap", label: "Heatmap" },
  { id: "bfs", label: "BFS" },
  { id: "dfs", label: "DFS" },
];

const REGION_COLORS: Record<string, string> = {
  Norte: "#22c55e",
  Nordeste: "#f97316",
  "Centro-Oeste": "#a855f7",
  Sudeste: "#3b82f6",
  Sul: "#ef4444",
};

const RANK_OPTIONS = [5, 10, 15, 20, 30] as const;
const TICK = { fontSize: 11, fill: "#3f3f46" } as const;
const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 11, borderColor: "#e4e4e7" },
  labelStyle: { color: "#18181b", fontWeight: 600 },
  itemStyle: { color: "#3f3f46" },
} as const;

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function heatColor(t: number): string {
  const r = Math.round(lerp(239, 29, t));
  const g = Math.round(lerp(246, 78, t));
  const b = Math.round(lerp(255, 216, t));
  return `rgb(${r},${g},${b})`;
}

function FlowHeatmap({ regions, matrix }: { regions: string[]; matrix: number[][] }) {
  const n = regions.length;
  const max = Math.max(...matrix.flat(), 1);
  const cell = 72;
  const labelW = 84;
  const labelH = 84;
  const w = labelW + n * cell;
  const h = labelH + n * cell;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[520px] mx-auto" style={{ height: h }}>
      {regions.map((r, j) => (
        <text
          key={j}
          x={labelW + j * cell + cell / 2}
          y={labelH - 6}
          textAnchor="end"
          fontSize={11}
          fill="#3f3f46"
          transform={`rotate(-40, ${labelW + j * cell + cell / 2}, ${labelH - 6})`}
        >
          {r}
        </text>
      ))}
      {regions.map((r, i) => (
        <text
          key={i}
          x={labelW - 8}
          y={labelH + i * cell + cell / 2}
          textAnchor="end"
          fontSize={11}
          fill="#3f3f46"
          dominantBaseline="middle"
        >
          {r}
        </text>
      ))}
      {matrix.map((row, i) =>
        row.map((val, j) => {
          const t = val / max;
          const fill = heatColor(t);
          const cx = labelW + j * cell + cell / 2;
          const cy = labelH + i * cell + cell / 2;
          return (
            <g key={`${i}-${j}`}>
              <rect
                x={labelW + j * cell}
                y={labelH + i * cell}
                width={cell}
                height={cell}
                fill={fill}
                stroke="#fff"
                strokeWidth={2}
                rx={3}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight={600}
                fill={t > 0.5 ? "#fff" : "#374151"}
              >
                {val}
              </text>
            </g>
          );
        })
      )}
    </svg>
  );
}

// ─── Analytics view ───────────────────────────────────────────────────────────
export function AnalyticsView() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [tab, setTab] = useState<Tab>("dist");
  const [degreeDir, setDegreeDir] = useState<"out" | "in">("out");
  const [rankLimit, setRankLimit] = useState(15);
  const [bfsOrigin, setBfsOrigin] = useState("");
  const [localBfs, setLocalBfs] = useState<BfsResult | null>(null);
  const [bfsError, setBfsError] = useState<string | null>(null);
  const [bfsSelectedLevel, setBfsSelectedLevel] = useState<number | null>(null);
  const [dfsOrigin, setDfsOrigin] = useState("");
  const [localDfs, setLocalDfs] = useState<DfsResult | null>(null);
  const [dfsError, setDfsError] = useState<string | null>(null);
  const [dfsSelectedLevel, setDfsSelectedLevel] = useState<number | null>(null);

  useEffect(() => {
    fetch("/graph.json").then((r) => r.json()).then(setGraph);
  }, []);

  const nodeMap = useMemo(() => new Map(graph?.nodes.map((n) => [n.key, n]) ?? []), [graph]);
  const outDeg = useMemo(() => graph ? computeOutDegrees(graph) : new Map(), [graph]);
  const inDeg = useMemo(() => graph ? computeInDegrees(graph) : new Map(), [graph]);
  const degrees = degreeDir === "out" ? outDeg : inDeg;

  const distData = useMemo(() => degreeDistribution(degrees), [degrees]);
  const rankData = useMemo(() => graph ? topAirports(outDeg, graph, rankLimit) : [], [outDeg, graph, rankLimit]);
  const regionData = useMemo(() => graph ? regionalMetrics(graph) : [], [graph]);
  const flowData = useMemo(() => graph ? regionalFlowMatrix(graph) : { regions: [], matrix: [] }, [graph]);
  const bfsData = useMemo(() => (localBfs ? bfsLevelDistribution(localBfs) : []), [localBfs]);
  const dfsData = useMemo(() => (localDfs ? bfsLevelDistribution(localDfs) : []), [localDfs]);
  const rankChartH = Math.max(300, rankLimit * 24 + 60);

  function calcBfs() {
    if (!graph) return;
    setBfsError(null);
    const key = bfsOrigin.trim().toUpperCase();
    if (!key) { setBfsError("Informe o aeroporto de origem."); return; }
    if (!nodeMap.has(key)) { setBfsError(`"${key}" não encontrado.`); return; }
    setLocalBfs(runBfs(graph, key));
    setBfsSelectedLevel(null);
  }

  function calcDfs() {
    if (!graph) return;
    setDfsError(null);
    const key = dfsOrigin.trim().toUpperCase();
    if (!key) { setDfsError("Informe o aeroporto de origem."); return; }
    if (!nodeMap.has(key)) { setDfsError(`"${key}" não encontrado.`); return; }
    setLocalDfs(runDfs(graph, key));
    setDfsSelectedLevel(null);
  }

  function airportsAtLevel(levels: Map<string, number>, level: number) {
    return [...levels.entries()]
      .filter(([, l]) => l === level)
      .map(([key]) => ({ key, city: nodeMap.get(key)?.attributes.city ?? key }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  if (!graph) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
          <h1 className="text-sm font-semibold text-zinc-800">Análises do Grafo</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Carregando dados…</p>
        </header>
        <div className="flex flex-1 items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-500">Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with tabs */}
      <header className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Análises do Grafo</h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              {graph.nodes.length} aeroportos · {graph.edges.length} conexões
            </p>
          </div>
        </div>
        <div className="flex px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`mr-4 py-2.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "border-b-2 border-zinc-900 text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Chart content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 bg-zinc-50">
        {tab === "dist" && (
          <Section
            title="Distribuição de Graus"
            subtitle={`Aeroportos por faixa de grau de ${degreeDir === "out" ? "saída" : "entrada"}`}
            controls={
              <Toggle
                value={degreeDir}
                onChange={setDegreeDir}
                options={[{ value: "out", label: "Saída" }, { value: "in", label: "Entrada" }]}
              />
            }
          >
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={distData} margin={{ top: 10, right: 16, bottom: 50, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ ...TICK, fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={TICK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Aeroportos" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "ranking" && (
          <Section
            title="Aeroportos Mais Conectados"
            subtitle={`Top ${rankLimit} por grau de saída`}
            controls={
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-zinc-600">Top</span>
                <select
                  value={rankLimit}
                  onChange={(e) => setRankLimit(Number(e.target.value))}
                  className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                >
                  {RANK_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={rankChartH}>
              <BarChart data={rankData} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={TICK} />
                <YAxis dataKey="key" type="category" tick={{ ...TICK, fontSize: 10 }} width={48} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, _n, props) => [value, (props.payload as { city: string }).city]}
                />
                <Bar dataKey="degree" name="Grau" fill="#0f766e" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="degree" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "regioes" && (
          <div className="grid grid-cols-2 gap-6">
            <Section title="Aeroportos por Região" subtitle="Total por macrorregião">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="region" tick={{ ...TICK, fontSize: 10 }} />
                  <YAxis tick={TICK} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="airports" name="Aeroportos" radius={[3, 3, 0, 0]}>
                    {regionData.map((d) => <Cell key={d.region} fill={REGION_COLORS[d.region] ?? "#94a3b8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Densidade por Região" subtitle="Arestas intra-região / máximo possível">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="region" tick={{ ...TICK, fontSize: 10 }} />
                  <YAxis tick={TICK} tickFormatter={(v: number) => v.toFixed(3)} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [typeof v === "number" ? v.toFixed(4) : v, "Densidade"]} />
                  <Bar dataKey="density" name="Densidade" radius={[3, 3, 0, 0]}>
                    {regionData.map((d) => <Cell key={d.region} fill={REGION_COLORS[d.region] ?? "#94a3b8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>
        )}

        {tab === "heatmap" && (
          <Section
            title="Fluxo de Conexões entre Regiões"
            subtitle="Número de arestas direcionadas de cada região de origem para cada região de destino"
          >
            <div className="mt-2 overflow-x-auto">
              <FlowHeatmap regions={flowData.regions} matrix={flowData.matrix} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <div className="flex h-3 w-24 rounded" style={{ background: "linear-gradient(to right, rgb(239,246,255), rgb(29,78,216))" }} />
                <span>Baixo → Alto</span>
              </div>
              <p className="text-[11px] text-zinc-500">Linhas = origem · Colunas = destino</p>
            </div>
          </Section>
        )}

        {tab === "bfs" && (
          <Section title="Distribuição por Nível BFS" subtitle="Quantidade de aeroportos alcançados por nível a partir de uma origem">
            <div className="mb-4 flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Origem</label>
                <input
                  list="analytics-bfs-nodes"
                  value={bfsOrigin}
                  onChange={(e) => setBfsOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcBfs()}
                  placeholder="Ex: SBGR"
                  className="w-36 rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                />
                <datalist id="analytics-bfs-nodes">
                  {graph.nodes.map((n) => <option key={n.key} value={n.key}>{n.attributes.city}</option>)}
                </datalist>
              </div>
              <button
                onClick={calcBfs}
                className="rounded bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                Calcular
              </button>
              {bfsError && <p className="text-xs text-red-500">{bfsError}</p>}
            </div>
            {bfsData.length > 0 ? (
              <>
                <p className="mb-3 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-900">{bfsData.length - 1}</span> níveis ·{" "}
                  <span className="font-semibold text-zinc-900">{localBfs!.levels.size - 1}</span> aeroportos alcançados a partir de{" "}
                  <span className="font-semibold text-zinc-900">{localBfs!.originKey}</span>
                  {bfsSelectedLevel === null && <span className="ml-2 text-zinc-400">· clique em uma barra para ver os aeroportos</span>}
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bfsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={TICK} />
                    <YAxis tick={TICK} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar
                      dataKey="count"
                      name="Aeroportos"
                      radius={[3, 3, 0, 0]}
                      cursor="pointer"
                      onClick={(d: any) => setBfsSelectedLevel(bfsSelectedLevel === d.level ? null : d.level)}
                    >
                      {bfsData.map((d) => (
                        <Cell
                          key={d.level}
                          fill={bfsLevelColor(d.level, bfsData.length - 1)}
                          opacity={bfsSelectedLevel === null || bfsSelectedLevel === d.level ? 1 : 0.35}
                        />
                      ))}
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {bfsSelectedLevel !== null && (
                  <LevelAirportList
                    level={bfsSelectedLevel}
                    airports={airportsAtLevel(localBfs!.levels, bfsSelectedLevel)}
                    color={bfsLevelColor(bfsSelectedLevel, bfsData.length - 1)}
                    onClose={() => setBfsSelectedLevel(null)}
                  />
                )}
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                Selecione uma origem e clique em Calcular
              </div>
            )}
          </Section>
        )}

        {tab === "dfs" && (
          <Section title="Distribuição por Nível DFS" subtitle="Quantidade de aeroportos visitados por profundidade a partir de uma origem">
            <div className="mb-4 flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Origem</label>
                <input
                  list="analytics-dfs-nodes"
                  value={dfsOrigin}
                  onChange={(e) => setDfsOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcDfs()}
                  placeholder="Ex: SBGR"
                  className="w-36 rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                />
                <datalist id="analytics-dfs-nodes">
                  {graph.nodes.map((n) => <option key={n.key} value={n.key}>{n.attributes.city}</option>)}
                </datalist>
              </div>
              <button
                onClick={calcDfs}
                className="rounded bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                Calcular
              </button>
              {dfsError && <p className="text-xs text-red-500">{dfsError}</p>}
            </div>
            {dfsData.length > 0 ? (
              <>
                <p className="mb-3 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-900">{dfsData.length - 1}</span> níveis ·{" "}
                  <span className="font-semibold text-zinc-900">{localDfs!.levels.size - 1}</span> aeroportos visitados a partir de{" "}
                  <span className="font-semibold text-zinc-900">{localDfs!.originKey}</span>
                  {dfsSelectedLevel === null && <span className="ml-2 text-zinc-400">· clique em uma barra para ver os aeroportos</span>}
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dfsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={TICK} />
                    <YAxis tick={TICK} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar
                      dataKey="count"
                      name="Aeroportos"
                      radius={[3, 3, 0, 0]}
                      cursor="pointer"
                      onClick={(d: any) => setDfsSelectedLevel(dfsSelectedLevel === d.level ? null : d.level)}
                    >
                      {dfsData.map((d) => (
                        <Cell
                          key={d.level}
                          fill={dfsLevelColor(d.level, dfsData.length - 1)}
                          opacity={dfsSelectedLevel === null || dfsSelectedLevel === d.level ? 1 : 0.35}
                        />
                      ))}
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {dfsSelectedLevel !== null && (
                  <LevelAirportList
                    level={dfsSelectedLevel}
                    airports={airportsAtLevel(localDfs!.levels, dfsSelectedLevel)}
                    color={dfsLevelColor(dfsSelectedLevel, dfsData.length - 1)}
                    onClose={() => setDfsSelectedLevel(null)}
                  />
                )}
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                Selecione uma origem e clique em Calcular
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Section({
  title, subtitle, controls, children, className = "",
}: {
  title: string; subtitle: string; controls?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-900">{title}</p>
          <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
        </div>
        {controls && <div className="shrink-0">{controls}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex overflow-hidden rounded border border-zinc-200">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs font-semibold transition-colors ${
            value === o.value ? "bg-zinc-800 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LevelAirportList({
  level, airports, color, onClose,
}: {
  level: number; airports: { key: string; city: string }[]; color: string; onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs font-bold text-zinc-900">
            {level === 0 ? "Origem" : `Nível ${level}`}
          </span>
          <span className="text-xs text-zinc-500">· {airports.length} aeroporto{airports.length !== 1 ? "s" : ""}</span>
        </div>
        <button onClick={onClose} className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600">
          ✕
        </button>
      </div>
      <ul className="grid max-h-48 grid-cols-2 gap-0 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        {airports.map(({ key, city }) => (
          <li key={key} className="flex items-center gap-2 px-4 py-2 even:bg-white odd:bg-zinc-50 border-b border-zinc-100">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold text-zinc-900">{key}</span>
            <span className="truncate text-[11px] text-zinc-600">{city}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
