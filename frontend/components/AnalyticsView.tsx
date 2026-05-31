"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Legend, ReferenceLine,
} from "recharts";
import type { GraphData } from "@/lib/graph/types";
import type { BfsResult } from "@/lib/graph/bfs";
import { bfsLevelColor, runBfs } from "@/lib/graph/bfs";
import type { DfsResult } from "@/lib/graph/dfs";
import { dfsLevelColor, runDfs } from "@/lib/graph/dfs";
import {
  computeInDegrees, computeOutDegrees, degreeDistribution,
  topAirports, regionalMetrics, bfsLevelDistribution, regionalFlowMatrix,
  computeTotalDegrees, degreeConcentration, dominantDegreeBin,
  formatPercent, formatRouteCost, lowConnectivityAirports,
  networkInsightCards, reciprocalRouteStats, regionalFlowBalance,
  regionalFlowSummary, routeFrequencyDistribution, routeFrequencyStats,
  strongestRegionalFlow, topDegreeImbalances,
  type InsightCardData,
} from "@/lib/graph/analytics";

type Tab = "dist" | "ranking" | "regioes" | "heatmap" | "rotas" | "diagnostico" | "bfs" | "dfs";
type RankMode = "out" | "in" | "total";

const TABS: { id: Tab; label: string }[] = [
  { id: "dist", label: "Distribuição" },
  { id: "ranking", label: "Ranking" },
  { id: "regioes", label: "Regiões" },
  { id: "heatmap", label: "Heatmap" },
  { id: "rotas", label: "Rotas" },
  { id: "diagnostico", label: "Diagnóstico" },
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
const RANK_MODE_OPTIONS: { value: RankMode; label: string }[] = [
  { value: "out", label: "Saída" },
  { value: "in", label: "Entrada" },
  { value: "total", label: "Total" },
];
const TICK = { fontSize: 11, fill: "#3f3f46" } as const;
const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 11, borderColor: "#e4e4e7" },
  labelStyle: { color: "#18181b", fontWeight: 600 },
  itemStyle: { color: "#3f3f46" },
} as const;

function levelFromBarClick(data: unknown): number | null {
  const item = data as { level?: unknown; payload?: { level?: unknown } };
  const level = typeof item.level === "number" ? item.level : item.payload?.level;
  return typeof level === "number" ? level : null;
}

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
  const cell = 82;
  const labelW = 118;
  const labelH = 42;
  const w = labelW + n * cell;
  const h = labelH + n * cell;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[640px] mx-auto" style={{ height: h }}>
      {regions.map((r, j) => (
        <text
          key={j}
          x={labelW + j * cell + cell / 2}
          y={24}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill="#3f3f46"
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
          fontWeight={700}
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
                rx={6}
              />
              <text
                x={cx}
                y={cy - 5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={800}
                fill={t > 0.5 ? "#fff" : "#374151"}
              >
                {val}
              </text>
              {val === max && (
                <text
                  x={cx}
                  y={cy + 13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill={t > 0.5 ? "#dbeafe" : "#64748b"}
                >
                  maior fluxo
                </text>
              )}
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
  const [rankMode, setRankMode] = useState<RankMode>("out");
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
  const totalDeg = useMemo(() => graph ? computeTotalDegrees(graph) : new Map(), [graph]);
  const degrees = degreeDir === "out" ? outDeg : inDeg;
  const rankDegrees = rankMode === "out" ? outDeg : rankMode === "in" ? inDeg : totalDeg;
  const rankModeText = rankMode === "out" ? "grau de saída" : rankMode === "in" ? "grau de entrada" : "grau total";

  const distData = useMemo(() => degreeDistribution(degrees), [degrees]);
  const rankData = useMemo(() => graph ? topAirports(rankDegrees, graph, rankLimit) : [], [graph, rankDegrees, rankLimit]);
  const regionData = useMemo(() => graph ? regionalMetrics(graph) : [], [graph]);
  const flowData = useMemo(() => graph ? regionalFlowMatrix(graph) : { regions: [], matrix: [] }, [graph]);
  const regionalFlowRows = useMemo(() => graph ? regionalFlowSummary(graph) : [], [graph]);
  const routeFrequencyRows = useMemo(() => graph ? routeFrequencyDistribution(graph) : [], [graph]);
  const routeStats = useMemo(() => graph ? routeFrequencyStats(graph) : null, [graph]);
  const reciprocity = useMemo(() => graph ? reciprocalRouteStats(graph) : null, [graph]);
  const imbalanceData = useMemo(() => graph ? topDegreeImbalances(graph) : [], [graph]);
  const lowDegreeData = useMemo(() => graph ? lowConnectivityAirports(graph, 10) : [], [graph]);
  const bfsData = useMemo(() => (localBfs ? bfsLevelDistribution(localBfs) : []), [localBfs]);
  const dfsData = useMemo(() => (localDfs ? bfsLevelDistribution(localDfs) : []), [localDfs]);
  const networkInsights = useMemo(() => graph ? networkInsightCards(graph) : [], [graph]);
  const distributionInsights = useMemo(() => {
    const dominant = dominantDegreeBin(distData);
    const concentration = degreeConcentration(degrees, 5);
    const values = [...degrees.values()];
    const connected = values.filter((degree) => degree > 0).length;

    return [
      {
        label: "Faixa dominante",
        value: dominant ? dominant.label : "-",
        detail: dominant
          ? `${dominant.count} aeroportos (${formatPercent(dominant.share)}) estão nessa faixa.`
          : "Sem dados suficientes para distribuir os graus.",
        tone: "blue",
      },
      {
        label: "Aeroportos conectados",
        value: `${connected}/${values.length}`,
        detail: "Quantidade de aeroportos com pelo menos uma conexão no sentido selecionado.",
        tone: "green",
      },
      {
        label: "Top 5 hubs",
        value: formatPercent(concentration),
        detail: "Parcela das conexões concentrada nos cinco maiores graus.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [degrees, distData]);
  const rankingInsights = useMemo(() => {
    const leader = rankData[0];
    const runnerUp = rankData[1];
    const gap = leader && runnerUp ? leader.degree - runnerUp.degree : 0;

    return [
      {
        label: "Líder do ranking",
        value: leader ? leader.key : "-",
        detail: leader ? `${leader.city}, com ${leader.degree} conexões no ${rankModeText}.` : "Sem ranking disponível.",
        tone: "green",
      },
      {
        label: "Folga do líder",
        value: leader && runnerUp ? `${gap}` : "-",
        detail: runnerUp ? `Diferença para ${runnerUp.key}, segundo colocado.` : "Não há segundo colocado para comparar.",
        tone: "blue",
      },
      {
        label: `Top ${Math.min(rankLimit, 5)}`,
        value: formatPercent(degreeConcentration(rankDegrees, Math.min(rankLimit, 5))),
        detail: `Quanto os maiores hubs concentram do ${rankModeText}.`,
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [rankData, rankDegrees, rankLimit, rankModeText]);
  const regionInsights = useMemo(() => {
    const byAirports = [...regionData].sort((a, b) => b.airports - a.airports)[0];
    const byDensity = [...regionData].sort((a, b) => b.density - a.density)[0];
    const byEdges = [...regionData].sort((a, b) => b.edges - a.edges)[0];
    const byExternalOut = [...regionalFlowRows].sort((a, b) => b.externalOut - a.externalOut)[0];

    return [
      {
        label: "Mais aeroportos",
        value: byAirports ? byAirports.region : "-",
        detail: byAirports ? `${byAirports.airports} aeroportos nessa macrorregião.` : "Sem regiões calculadas.",
        tone: "blue",
      },
      {
        label: "Maior densidade",
        value: byDensity ? byDensity.region : "-",
        detail: byDensity ? `Densidade ${byDensity.density.toFixed(4)} no subgrafo regional.` : "Sem densidade calculada.",
        tone: "purple",
      },
      {
        label: "Mais conexões internas",
        value: byEdges ? byEdges.region : "-",
        detail: byEdges ? `${byEdges.edges} arestas com origem e destino na própria região.` : "Sem conexões internas.",
        tone: "green",
      },
      {
        label: "Mais envia para fora",
        value: byExternalOut ? byExternalOut.region : "-",
        detail: byExternalOut ? `${byExternalOut.externalOut} conexões saem para outras regiões.` : "Sem fluxo externo.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [regionData, regionalFlowRows]);
  const heatmapInsights = useMemo(() => {
    const strongest = strongestRegionalFlow(flowData);
    const balance = regionalFlowBalance(flowData);

    return [
      {
        label: "Maior fluxo",
        value: strongest ? `${strongest.origin} -> ${strongest.destination}` : "-",
        detail: strongest ? `${strongest.count} conexões direcionadas nesse par regional.` : "Sem fluxo regional calculado.",
        tone: "blue",
      },
      {
        label: "Fluxo interno",
        value: formatPercent(balance.internalShare),
        detail: `${balance.internal} conexões ficam dentro da própria região.`,
        tone: "green",
      },
      {
        label: "Fluxo entre regiões",
        value: `${balance.external}`,
        detail: "Conexões que cruzam de uma macrorregião para outra.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [flowData]);
  const routeInsights = useMemo(() => {
    if (!routeStats) return [];

    return [
      {
        label: "Voos por rota",
        value: routeStats.average.toFixed(1),
        detail: `Mediana ${routeStats.median.toFixed(0)} voos em ${routeStats.count} conexões direcionadas.`,
        tone: "blue",
      },
      {
        label: "Rota mais forte",
        value: routeStats.strongest ? `${routeStats.strongest.source} -> ${routeStats.strongest.target}` : "-",
        detail: routeStats.strongest
          ? `${routeStats.strongest.flights} voos; custo ${formatRouteCost(routeStats.strongest.weight)}.`
          : "Sem frequência calculada.",
        tone: "green",
      },
      {
        label: "Rota mais fraca",
        value: routeStats.weakest ? `${routeStats.weakest.source} -> ${routeStats.weakest.target}` : "-",
        detail: routeStats.weakest
          ? `${routeStats.weakest.flights} voo; custo ${formatRouteCost(routeStats.weakest.weight)}.`
          : "Sem frequência calculada.",
        tone: "purple",
      },
      {
        label: "Amplitude",
        value: `${routeStats.max - routeStats.min}`,
        detail: "Diferença entre a menor e a maior frequência de voos.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [routeStats]);
  const diagnosticInsights = useMemo(() => {
    const mostUnbalanced = imbalanceData[0];
    const weakest = lowDegreeData[0];

    return [
      {
        label: "Reciprocidade",
        value: reciprocity ? formatPercent(reciprocity.reciprocityRate) : "-",
        detail: reciprocity
          ? `${reciprocity.reciprocalPairs} pares têm rota nos dois sentidos.`
          : "Sem conexões para avaliar reciprocidade.",
        tone: "blue",
      },
      {
        label: "Rotas mão única",
        value: reciprocity ? `${reciprocity.oneWayEdges}` : "-",
        detail: "Conexões direcionadas sem aresta equivalente no sentido oposto.",
        tone: "orange",
      },
      {
        label: "Maior desequilíbrio",
        value: mostUnbalanced ? mostUnbalanced.key : "-",
        detail: mostUnbalanced
          ? `${mostUnbalanced.outDegree} saídas, ${mostUnbalanced.inDegree} entradas.`
          : "Sem aeroportos para comparar.",
        tone: "purple",
      },
      {
        label: "Menor conectividade",
        value: weakest ? weakest.key : "-",
        detail: weakest ? `${weakest.city}, grau total ${weakest.totalDegree}.` : "Sem aeroportos conectados.",
        tone: "green",
      },
    ] satisfies InsightCardData[];
  }, [imbalanceData, lowDegreeData, reciprocity]);
  const bfsInsights = useMemo(() => {
    if (!graph || !localBfs || bfsData.length === 0) return [];
    const reached = localBfs.levels.size;
    const widestLevel = [...bfsData].sort((a, b) => b.count - a.count)[0];

    return [
      {
        label: "Alcance",
        value: `${reached}/${graph.nodes.length}`,
        detail: `${formatPercent(reached / graph.nodes.length)} dos aeroportos foram alcançados.`,
        tone: "blue",
      },
      {
        label: "Profundidade máxima",
        value: `${localBfs.maxLevel}`,
        detail: "Maior nível encontrado a partir da origem selecionada.",
        tone: "purple",
      },
      {
        label: "Nível mais largo",
        value: widestLevel ? widestLevel.label : "-",
        detail: widestLevel ? `${widestLevel.count} aeroportos aparecem nesse nível.` : "Sem distribuição por nível.",
        tone: "green",
      },
    ] satisfies InsightCardData[];
  }, [bfsData, graph, localBfs]);
  const dfsInsights = useMemo(() => {
    if (!graph || !localDfs || dfsData.length === 0) return [];
    const visited = localDfs.levels.size;
    const deepestLevel = [...dfsData].sort((a, b) => b.level - a.level)[0];

    return [
      {
        label: "Visitados",
        value: `${visited}/${graph.nodes.length}`,
        detail: `${formatPercent(visited / graph.nodes.length)} dos aeroportos entraram na árvore DFS.`,
        tone: "blue",
      },
      {
        label: "Maior profundidade",
        value: `${localDfs.maxLevel}`,
        detail: "Profundidade máxima atingida pela busca.",
        tone: "purple",
      },
      {
        label: "Última camada",
        value: deepestLevel ? deepestLevel.label : "-",
        detail: deepestLevel ? `${deepestLevel.count} aeroporto(s) no nível mais profundo.` : "Sem distribuição por profundidade.",
        tone: "green",
      },
    ] satisfies InsightCardData[];
  }, [dfsData, graph, localDfs]);
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
        <div className="flex overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`mr-4 shrink-0 py-2.5 text-xs font-semibold transition-colors ${
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
        <InsightGrid items={networkInsights} />

        {tab === "dist" && (
          <Section
            title="Distribuição de Graus"
            subtitle={`Aeroportos por faixa de grau de ${degreeDir === "out" ? "saída" : "entrada"}`}
            insights={distributionInsights}
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
            subtitle={`Top ${rankLimit} por ${rankModeText}`}
            insights={rankingInsights}
            controls={
              <div className="flex flex-wrap items-center gap-2">
                <Toggle value={rankMode} onChange={setRankMode} options={RANK_MODE_OPTIONS} />
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
          <>
            <InsightGrid items={regionInsights} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
              <Section title="Entrada e Saída por Região" subtitle="Comparação entre conexões recebidas e emitidas">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={regionalFlowRows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="region" tick={{ ...TICK, fontSize: 10 }} />
                    <YAxis tick={TICK} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="outgoing" name="Saídas" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="incoming" name="Entradas" fill="#f97316" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
              <Section title="Saldo Externo Regional" subtitle="Saídas para outras regiões menos entradas externas">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={regionalFlowRows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="region" tick={{ ...TICK, fontSize: 10 }} />
                    <YAxis tick={TICK} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <ReferenceLine y={0} stroke="#71717a" />
                    <Bar dataKey="netExternal" name="Saldo externo" radius={[3, 3, 0, 0]}>
                      {regionalFlowRows.map((d) => (
                        <Cell key={d.region} fill={d.netExternal >= 0 ? "#0f766e" : "#be123c"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>
          </>
        )}

        {tab === "heatmap" && (
          <Section
            title="Fluxo de Conexões entre Regiões"
            subtitle="Número de arestas direcionadas de cada região de origem para cada região de destino"
            insights={heatmapInsights}
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

        {tab === "rotas" && (
          <Section
            title="Intensidade das Rotas"
            subtitle="Distribuição das conexões pelo número de voos observados"
            insights={routeInsights}
          >
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={routeFrequencyRows} margin={{ top: 10, right: 16, bottom: 50, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={{ ...TICK, fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={TICK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Rotas" fill="#7c3aed" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "diagnostico" && (
          <Section
            title="Diagnóstico Estrutural"
            subtitle="Reciprocidade, assimetria de graus e aeroportos menos conectados"
            insights={diagnosticInsights}
          >
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold text-zinc-900">Maiores desequilíbrios entrada/saída</p>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={imbalanceData} layout="vertical" margin={{ top: 8, right: 36, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" tick={TICK} />
                    <YAxis dataKey="key" type="category" tick={{ ...TICK, fontSize: 10 }} width={48} />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(value, name, props) => [
                        value,
                        name === "balance"
                          ? `${(props.payload as { outDegree: number }).outDegree} saídas / ${(props.payload as { inDegree: number }).inDegree} entradas`
                          : name,
                      ]}
                    />
                    <ReferenceLine x={0} stroke="#71717a" />
                    <Bar dataKey="balance" name="Saldo" radius={[0, 3, 3, 0]}>
                      {imbalanceData.map((d) => (
                        <Cell key={d.key} fill={d.balance >= 0 ? "#0f766e" : "#be123c"} />
                      ))}
                      <LabelList dataKey="balance" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <LowConnectivityTable rows={lowDegreeData} />
            </div>
          </Section>
        )}

        {tab === "bfs" && (
          <Section title="Distribuição por Nível BFS" subtitle="Quantidade de aeroportos alcançados por nível a partir de uma origem" insights={bfsInsights}>
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
                      onClick={(d) => {
                        const level = levelFromBarClick(d);
                        if (level !== null) setBfsSelectedLevel(bfsSelectedLevel === level ? null : level);
                      }}
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
          <Section title="Distribuição por Nível DFS" subtitle="Quantidade de aeroportos visitados por profundidade a partir de uma origem" insights={dfsInsights}>
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
                      onClick={(d) => {
                        const level = levelFromBarClick(d);
                        if (level !== null) setDfsSelectedLevel(dfsSelectedLevel === level ? null : level);
                      }}
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
  title, subtitle, controls, insights = [], children, className = "",
}: {
  title: string; subtitle: string; controls?: React.ReactNode; insights?: InsightCardData[];
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
      {insights.length > 0 && <InsightGrid items={insights} compact />}
      {children}
    </div>
  );
}

function InsightGrid({
  items,
  compact = false,
}: {
  items: InsightCardData[];
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`grid gap-3 ${compact ? "mb-4" : "mb-6"} md:grid-cols-2 xl:grid-cols-4`}>
      {items.map((item) => (
        <InsightCard key={`${item.label}-${item.value}`} item={item} />
      ))}
    </div>
  );
}

function InsightCard({ item }: { item: InsightCardData }) {
  const toneClasses = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    zinc: "border-zinc-100 bg-white text-zinc-700",
  }[item.tone ?? "zinc"];

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClasses}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{item.label}</p>
      <p className="mt-1 text-lg font-bold leading-tight">{item.value}</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">{item.detail}</p>
    </div>
  );
}

function LowConnectivityTable({
  rows,
}: {
  rows: {
    key: string;
    city: string;
    inDegree: number;
    outDegree: number;
    totalDegree: number;
  }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-zinc-900">Aeroportos menos conectados</p>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Aeroporto</th>
              <th className="px-3 py-2">Cidade</th>
              <th className="px-3 py-2 text-right">Entrada</th>
              <th className="px-3 py-2 text-right">Saída</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-zinc-100">
                <td className="px-3 py-2 font-bold text-zinc-900">{row.key}</td>
                <td className="px-3 py-2 text-zinc-600">{row.city}</td>
                <td className="px-3 py-2 text-right text-zinc-700">{row.inDegree}</td>
                <td className="px-3 py-2 text-right text-zinc-700">{row.outDegree}</td>
                <td className="px-3 py-2 text-right font-semibold text-zinc-900">{row.totalDegree}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
