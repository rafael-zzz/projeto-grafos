"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { GraphData } from "@/lib/graph/types";
import type { BfsResult } from "@/lib/graph/bfs";
import { bfsLevelColor, runBfs } from "@/lib/graph/bfs";
import {
  computeInDegrees,
  computeOutDegrees,
  degreeDistribution,
  topAirports,
  regionalMetrics,
  bfsLevelDistribution,
} from "@/lib/graph/analytics";

type Tab = "dist" | "ranking" | "regioes" | "bfs";

const TABS: { id: Tab; label: string }[] = [
  { id: "dist", label: "Distribuição" },
  { id: "ranking", label: "Ranking" },
  { id: "regioes", label: "Regiões" },
  { id: "bfs", label: "BFS" },
];

const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 11, borderColor: "#e4e4e7" },
  labelStyle: { color: "#18181b", fontWeight: 600 },
  itemStyle: { color: "#3f3f46" },
} as const;

const REGION_COLORS: Record<string, string> = {
  Norte: "#22c55e",
  Nordeste: "#f97316",
  "Centro-Oeste": "#a855f7",
  Sudeste: "#3b82f6",
  Sul: "#ef4444",
};

const RANK_LIMIT_OPTIONS = [5, 10, 15, 20, 30] as const;

export function ChartsPanel({
  graph,
  bfsResult,
  onClose,
}: {
  graph: GraphData;
  bfsResult: BfsResult | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("dist");
  const [degreeDir, setDegreeDir] = useState<"out" | "in">("out");
  const [rankLimit, setRankLimit] = useState<number>(15);
  const [bfsOrigin, setBfsOrigin] = useState("");
  const [localBfsResult, setLocalBfsResult] = useState<BfsResult | null>(bfsResult);
  const [bfsError, setBfsError] = useState<string | null>(null);

  const nodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.key, n])), [graph]);
  const outDegrees = useMemo(() => computeOutDegrees(graph), [graph]);
  const inDegrees = useMemo(() => computeInDegrees(graph), [graph]);
  const degrees = degreeDir === "out" ? outDegrees : inDegrees;

  const distData = useMemo(() => degreeDistribution(degrees), [degrees]);
  const rankData = useMemo(
    () => topAirports(outDegrees, graph, rankLimit),
    [outDegrees, graph, rankLimit],
  );
  const regionData = useMemo(() => regionalMetrics(graph), [graph]);
  const activeBfs = localBfsResult;
  const bfsData = useMemo(
    () => (activeBfs ? bfsLevelDistribution(activeBfs) : []),
    [activeBfs],
  );

  function calculateBfs() {
    setBfsError(null);
    const key = bfsOrigin.trim().toUpperCase();
    if (!key) { setBfsError("Informe o aeroporto de origem."); return; }
    if (!nodeMap.has(key)) { setBfsError(`Aeroporto "${key}" não encontrado.`); return; }
    setLocalBfsResult(runBfs(graph, key));
  }

  const rankChartHeight = Math.max(200, rankLimit * 22 + 40);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <span className="text-sm font-bold text-zinc-800">Análises</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          ×
        </button>
      </div>

      <div className="flex border-b border-zinc-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-semibold transition-colors ${
              tab === t.id
                ? "border-b-2 border-zinc-800 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "dist" && (
          <ChartSection
            title="Distribuição de Graus"
            subtitle={`Aeroportos por faixa de grau de ${degreeDir === "out" ? "saída" : "entrada"}`}
            controls={
              <ToggleGroup
                value={degreeDir}
                onChange={setDegreeDir}
                options={[
                  { value: "out", label: "Saída" },
                  { value: "in", label: "Entrada" },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "#3f3f46" }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: "#3f3f46" }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Aeroportos" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
        )}

        {tab === "ranking" && (
          <ChartSection
            title="Aeroportos Mais Conectados"
            subtitle={`Top ${rankLimit} por grau de saída`}
            controls={
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-zinc-600">Top</span>
                <select
                  value={rankLimit}
                  onChange={(e) => setRankLimit(Number(e.target.value))}
                  className="rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-800 outline-none focus:border-zinc-400"
                >
                  {RANK_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={rankChartHeight}>
              <BarChart
                data={rankData}
                layout="vertical"
                margin={{ top: 8, right: 40, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#3f3f46" }} />
                <YAxis dataKey="key" type="category" tick={{ fontSize: 9, fill: "#3f3f46" }} width={44} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, _name, props) => [value, (props.payload as { city: string }).city]}
                />
                <Bar dataKey="degree" name="Grau" fill="#0f766e" radius={[0, 2, 2, 0]}>
                  <LabelList
                    dataKey="degree"
                    position="right"
                    style={{ fontSize: 9, fill: "#374151" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
        )}

        {tab === "regioes" && (
          <>
            <ChartSection
              title="Aeroportos por Região"
              subtitle="Total de aeroportos em cada macrorregião"
            >
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={regionData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#3f3f46" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#3f3f46" }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="airports" name="Aeroportos" radius={[2, 2, 0, 0]}>
                    {regionData.map((d) => (
                      <Cell key={d.region} fill={REGION_COLORS[d.region] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>

            <ChartSection
              title="Densidade por Região"
              subtitle="Proporção de arestas intra-região em relação ao máximo possível"
              className="mt-6"
            >
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={regionData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#3f3f46" }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#3f3f46" }}
                    tickFormatter={(v: number) => v.toFixed(3)}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v) => [typeof v === "number" ? v.toFixed(4) : v, "Densidade"]}
                  />
                  <Bar dataKey="density" name="Densidade" radius={[2, 2, 0, 0]}>
                    {regionData.map((d) => (
                      <Cell key={d.region} fill={REGION_COLORS[d.region] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartSection>
          </>
        )}

        {tab === "bfs" && (
          <div className="flex flex-col gap-4">
            {/* Origin selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Origem</label>
              <div className="flex gap-2">
                <input
                  list="charts-bfs-nodes"
                  value={bfsOrigin}
                  onChange={(e) => setBfsOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calculateBfs()}
                  placeholder="Ex: SBGR"
                  className="min-w-0 flex-1 rounded border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                />
                <button
                  onClick={calculateBfs}
                  className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
                >
                  Calcular
                </button>
              </div>
              <datalist id="charts-bfs-nodes">
                {graph.nodes.map((n) => (
                  <option key={n.key} value={n.key}>{n.attributes.city}</option>
                ))}
              </datalist>
              {bfsError && <p className="text-[10px] text-red-500">{bfsError}</p>}
            </div>

            {bfsData.length > 0 ? (
              <ChartSection
                title="Nós por Nível BFS"
                subtitle={`A partir de ${activeBfs!.originKey} · ${bfsData.length - 1} níveis · ${activeBfs!.levels.size - 1} aeroportos alcançados`}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bfsData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#3f3f46" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#3f3f46" }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Aeroportos" radius={[2, 2, 0, 0]}>
                      {bfsData.map((d) => (
                        <Cell key={d.level} fill={bfsLevelColor(d.level, bfsData.length - 1)} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        style={{ fontSize: 9, fill: "#374151" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartSection>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-1 text-center">
                <p className="text-xs font-semibold text-zinc-600">Selecione uma origem</p>
                <p className="text-[10px] text-zinc-500">Informe um aeroporto e clique em Calcular</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartSection({
  title,
  subtitle,
  controls,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-zinc-800">{title}</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">{subtitle}</p>
        </div>
        {controls && <div className="shrink-0">{controls}</div>}
      </div>
      {children}
    </div>
  );
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded border border-zinc-200 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
            value === opt.value
              ? "bg-zinc-800 text-white"
              : "bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
