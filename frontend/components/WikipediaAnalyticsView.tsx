"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { WikiGraphData, WikiNode } from "@/lib/graph/wiki_types";
import {
  degreeConcentration,
  dominantDegreeBin,
  formatPercent,
  graphDensity,
  type InsightCardData,
} from "@/lib/graph/analytics";
import {
  asGraphData,
  buildCategoryNarratives,
  buildConnectionInsights,
  buildConnectionNarratives,
  buildOverviewNarratives,
  buildRankingNarratives,
  rareCategoryCount,
  semanticBridgeCandidates,
  topCategoryCoverage,
  topImbalances,
  topIncoming,
  topOutgoing,
  topThematicPages,
  wikiDegreeRecords,
  type WikiDegreeRecord,
  type WikiNarrative,
} from "@/lib/graph/wikiAnalytics";
import { timedBfs, timedDfs, type RunReport } from "@/lib/graph/wikiReport";

type Tab = "dist" | "ranking" | "categorias" | "conexoes" | "report";

const TABS: { id: Tab; label: string }[] = [
  { id: "dist",       label: "Distribuição" },
  { id: "ranking",    label: "Ranking"      },
  { id: "categorias", label: "Categorias"   },
  { id: "conexoes",   label: "Conexões"    },
  { id: "report",     label: "Report"       },
];


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
  // Wikipedia view uses a neutral palette: white / gray / black only.
  const toneClasses = {
    blue: "border-zinc-100 bg-white text-zinc-900",
    green: "border-zinc-100 bg-white text-zinc-900",
    orange: "border-zinc-100 bg-white text-zinc-900",
    purple: "border-zinc-100 bg-white text-zinc-900",
    zinc: "border-zinc-100 bg-white text-zinc-900",
  }[item.tone ?? "zinc"];

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClasses}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{item.label}</p>
      <p className="mt-1 text-lg font-bold leading-tight">{item.value}</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">{item.detail}</p>
    </div>
  );
}
const TICK         = { fontSize: 11, fill: "#3f3f46" } as const;
const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 11, borderColor: "#e4e4e7" },
  labelStyle: { color: "#18181b", fontWeight: 600 },
  itemStyle:    { color: "#3f3f46" },
} as const;

function wikiDegreeMap(graph: WikiGraphData) {
  const deg = new Map<string, number>(graph.nodes.map((n) => [n.key, 0]));
  for (const edge of graph.edges) {
    deg.set(edge.source, (deg.get(edge.source) ?? 0) + 1);
    deg.set(edge.target, (deg.get(edge.target) ?? 0) + 1);
  }
  return deg;
}

// ─── Analytics helpers ────────────────────────────────────────────────────────
function wikiDegreeDistribution(graph: WikiGraphData) {
  const deg = wikiDegreeMap(graph);
  const bins = [
    { min: 0,  max: 0,        label: "0"     },
    { min: 1,  max: 1,        label: "1"     },
    { min: 2,  max: 3,        label: "2–3"   },
    { min: 4,  max: 7,        label: "4–7"   },
    { min: 8,  max: 15,       label: "8–15"  },
    { min: 16, max: 31,       label: "16–31" },
    { min: 32, max: 63,       label: "32–63" },
    { min: 64, max: Infinity, label: "64+"   },
  ];
  return bins
    .map(({ min, max, label }) => ({
      label,
      count: [...deg.values()].filter((v) => v >= min && v <= max).length,
    }))
    .filter((b) => b.count > 0);
}

function topPages(graph: WikiGraphData, limit = 20) {
  const deg = wikiDegreeMap(graph);
  return [...deg.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, degree]) => ({ key, degree }));
}

function topWordCountPages(graph: WikiGraphData, limit = 10) {
  return [...graph.nodes]
    .map((node) => ({
      key: node.key,
      title: node.attributes.title,
      wordCount: node.attributes.word_count,
    }))
    .sort((a, b) => b.wordCount - a.wordCount || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function countCategories(nodes: WikiNode[], limit?: number) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const category of node.attributes.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => ({ category, count }));

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

function topCategories(nodes: WikiNode[], limit = 20) {
  return countCategories(nodes, limit);
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title, subtitle, controls, insights = [], children,
}: {
  title: string; subtitle: string; controls?: ReactNode; insights?: InsightCardData[]; children: ReactNode;
}) {
  return (
    <div>
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

function NarrativePanel({ items }: { items: WikiNarrative[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold text-zinc-900">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function truncateLabel(value: string, max = 26): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

type WikiNumericColumnKey =
  | "inDegree"
  | "outDegree"
  | "totalDegree"
  | "balance"
  | "absBalance"
  | "categoryCount"
  | "bridgeScore"
  | "wordCount";

function ConnectionTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: WikiDegreeRecord[];
  columns: { key: WikiNumericColumnKey; label: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-zinc-900">{title}</p>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Artigo</th>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-3 py-2 text-right">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.key}`} className="border-t border-zinc-100">
                <td className="max-w-[260px] truncate px-3 py-2 font-semibold text-zinc-900" title={row.key}>
                  {row.key}
                </td>
                {columns.map((column) => (
                  <td key={`${row.key}-${String(column.key)}`} className="px-3 py-2 text-right text-zinc-700">
                    {Number(row[column.key]).toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WikipediaAnalyticsView({
  graph,
  seed,
  setSeed,
  nodeKeys,
  depth,
}: {
  graph: WikiGraphData | null;
  seed: string;
  setSeed: (seed: string) => void;
  nodeKeys: string[];
  depth: number;
}) {
  const [tab, setTab] = useState<Tab>("dist");

  // Report state
  const [reportRunning, setReportRunning] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    bfs: RunReport;
    dfs: RunReport;
    origin: string;
    depth: number;
  } | null>(null);

  const nodeMap = useMemo(
    () => new Map(graph?.nodes.map((n) => [n.key, n]) ?? []),
    [graph],
  );
  const relativeSeed = useMemo(() => {
    const origin = graph?.nodes[0]?.key?.trim();
    return origin || seed.trim() || "-";
  }, [graph, seed]);

  const distData      = useMemo(() => graph ? wikiDegreeDistribution(graph) : [],    [graph]);
  const rankData      = useMemo(() => graph ? topPages(graph)               : [],    [graph]);
  const wordCountData  = useMemo(() => graph ? topWordCountPages(graph)     : [],    [graph]);
  const categoryData  = useMemo(() => graph ? topCategories(graph.nodes)    : [],    [graph]);
  const categoryCountData = useMemo(() => graph ? countCategories(graph.nodes) : [], [graph]);
  const degreeMap     = useMemo(() => graph ? wikiDegreeMap(graph) : new Map<string, number>(), [graph]);
  const degreeRecords = useMemo(() => graph ? wikiDegreeRecords(graph) : [], [graph]);
  const thematicRankData = useMemo(() => topThematicPages(degreeRecords, 20), [degreeRecords]);
  const filteredUtilityCount = useMemo(
    () => Math.max(0, degreeRecords.length - topThematicPages(degreeRecords, degreeRecords.length).length),
    [degreeRecords],
  );
  const incomingRows  = useMemo(() => topIncoming(degreeRecords, 10), [degreeRecords]);
  const outgoingRows  = useMemo(() => topOutgoing(degreeRecords, 10), [degreeRecords]);
  const imbalanceRows = useMemo(() => topImbalances(degreeRecords, 10), [degreeRecords]);
  const bridgeRows    = useMemo(() => semanticBridgeCandidates(degreeRecords, 10), [degreeRecords]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setReportData(null);
      setReportError(null);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [graph]);

  const overviewNarratives = useMemo(() => {
    if (!graph) return [];
    return buildOverviewNarratives({
      graph,
      seed: relativeSeed,
      dominantBin: dominantDegreeBin(distData),
      topHub: rankData[0],
      concentration: degreeConcentration(degreeMap, 5),
      categoryCount: categoryCountData.length,
    });
  }, [categoryCountData.length, degreeMap, distData, graph, rankData, relativeSeed]);

  const rankingNarratives = useMemo(() => buildRankingNarratives({
    topHub: rankData[0],
    topThematicHub: thematicRankData[0],
    longestArticle: wordCountData[0],
    filteredUtilityCount,
  }), [filteredUtilityCount, rankData, thematicRankData, wordCountData]);

  const categoryNarratives = useMemo(() => {
    if (!graph) return [];
    return buildCategoryNarratives({
      categories: categoryCountData,
      nodeCount: graph.nodes.length,
      topCoverage: topCategoryCoverage(graph, categoryCountData, 5),
    });
  }, [categoryCountData, graph]);

  const connectionInsights = useMemo(() => buildConnectionInsights({
    records: degreeRecords,
    incoming: incomingRows,
    outgoing: outgoingRows,
    imbalances: imbalanceRows,
    bridges: bridgeRows,
  }), [bridgeRows, degreeRecords, imbalanceRows, incomingRows, outgoingRows]);

  const connectionNarratives = useMemo(() => buildConnectionNarratives({
    incoming: incomingRows,
    outgoing: outgoingRows,
    bridges: bridgeRows,
  }), [bridgeRows, incomingRows, outgoingRows]);

  const networkInsights = useMemo(() => {
    if (!graph) return [];
    const dominant = dominantDegreeBin(distData);
    const topHub = rankData[0];
    const topWordPage = wordCountData[0];
    const concentrated = degreeConcentration(degreeMap, 5);
    const isolated = [...degreeMap.values()].filter((value) => value === 0).length;

    return [
      {
        label: "Busca atual",
        value: relativeSeed,
        detail: "As análises abaixo são calculadas sobre o subgrafo gerado a partir dessa pesquisa.",
        tone: "zinc",
      },
      {
        label: "Escala do grafo",
        value: `${graph.nodes.length} artigos`,
        detail: `${graph.edges.length} ligações; densidade ${graphDensity(asGraphData(graph)).toFixed(4)}.`,
        tone: "blue",
      },
      {
        label: "Faixa dominante",
        value: dominant ? dominant.label : "-",
        detail: dominant
          ? `${dominant.count} artigos (${formatPercent(dominant.share)}) estão nessa faixa de grau.`
          : "Sem dados suficientes para calcular a distribuição.",
        tone: "green",
      },
      {
        label: "Nó mais conectado",
        value: topHub ? topHub.key : "-",
        detail: topHub ? `${topHub.degree} ligações no total.` : "Sem ranking disponível.",
        tone: "purple",
      },
      {
        label: "Concentração top 5",
        value: formatPercent(concentrated),
        detail: `${isolated} artigos sem ligações; ${topWordPage ? topWordPage.wordCount.toLocaleString("pt-BR") : 0} palavras no artigo mais longo.`,
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [degreeMap, distData, graph, rankData, relativeSeed, wordCountData]);

  const distributionInsights = useMemo(() => {
    if (!graph) return [];
    const dominant = dominantDegreeBin(distData);
    const isolated = [...degreeMap.values()].filter((value) => value === 0).length;
    const concentrated = degreeConcentration(degreeMap, 10);

    return [
      {
        label: "Faixa dominante",
        value: dominant ? dominant.label : "-",
        detail: dominant
          ? `${dominant.count} artigos representam ${formatPercent(dominant.share)} do total.`
          : "Sem distribuição disponível.",
        tone: "blue",
      },
      {
        label: "Artigos isolados",
        value: `${isolated}`,
        detail: "Nodos sem ligação em nenhum sentido no grafo de Wikipédia.",
        tone: "green",
      },
      {
        label: "Top 10 hubs",
        value: formatPercent(concentrated),
        detail: "Quanto os 10 artigos mais conectados concentram da rede.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [degreeMap, distData, graph]);

  const rankingInsights = useMemo(() => {
    if (!graph || rankData.length === 0) return [];
    const leader = rankData[0];
    const thematicLeader = thematicRankData[0];
    const leaderWordCount = wordCountData.find((page) => page.key === leader.key);

    return [
      {
        label: "Hub bruto",
        value: leader.key,
        detail: `${leader.degree} ligações totais${leaderWordCount ? ` · ${leaderWordCount.wordCount.toLocaleString("pt-BR")} palavras` : ""}.`,
        tone: "green",
      },
      {
        label: "Hub temático",
        value: thematicLeader ? thematicLeader.key : "-",
        detail: thematicLeader
          ? `${thematicLeader.totalDegree} ligações após remover nós utilitários.`
          : "Sem candidato temático após o filtro.",
        tone: "blue",
      },
      {
        label: "Nós filtrados",
        value: `${filteredUtilityCount}`,
        detail: "Identificadores, bases de citação, coordenadas e páginas de manutenção removidas do ranking temático.",
        tone: "zinc",
      },
      {
        label: "Top 5 hubs",
        value: formatPercent(degreeConcentration(degreeMap, 5)),
        detail: "Parcela da rede concentrada nos cinco artigos mais conectados.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [degreeMap, filteredUtilityCount, graph, rankData, thematicRankData, wordCountData]);

  const categoryInsights = useMemo(() => {
    if (!graph || categoryCountData.length === 0) return [];
    const topCategory = categoryCountData[0];
    const categoryCoverage = new Set(graph.nodes.flatMap((node) => node.attributes.categories)).size;
    const multiCategoryPages = graph.nodes.filter((node) => node.attributes.categories.length >= 3).length;
    const topFiveShare = topCategoryCoverage(graph, categoryCountData, 5);
    const rareCategories = rareCategoryCount(categoryCountData);

    return [
      {
        label: "Categoria líder",
        value: topCategory.category,
        detail: `${topCategory.count} artigos classificados nessa categoria.`,
        tone: "blue",
      },
      {
        label: "Categorias distintas",
        value: `${categoryCoverage}`,
        detail: "Total de categorias diferentes presentes nos artigos carregados.",
        tone: "green",
      },
      {
        label: "Artigos multitema",
        value: `${multiCategoryPages}`,
        detail: "Artigos com 3 ou mais categorias, bons candidatos a hubs semânticos.",
        tone: "purple",
      },
      {
        label: "Cobertura top 5",
        value: formatPercent(topFiveShare),
        detail: "Parcela dos artigos que aparece em pelo menos um dos cinco temas mais frequentes.",
        tone: "orange",
      },
      {
        label: "Categorias raras",
        value: `${rareCategories}`,
        detail: "Categorias com apenas um artigo, indicando nichos dentro da busca.",
        tone: "zinc",
      },
    ] satisfies InsightCardData[];
  }, [categoryCountData, graph]);

  async function calcReport() {
    if (!graph) return;
    setReportError(null);
    const key = relativeSeed;
    if (!key || key === "-") { setReportError("Defina um artigo de busca primeiro."); return; }
    if (!nodeMap.has(key)) { setReportError(`"${key}" não encontrado no subgrafo.`); return; }
    setReportRunning(true);
    setReportData(null);
    // Yield so the "calculating…" state actually paints before the sync work.
    await new Promise((r) => setTimeout(r, 0));
    const data = asGraphData(graph);
    const bfs = timedBfs(data, key, depth);
    await new Promise((r) => setTimeout(r, 0));
    const dfs = timedDfs(data, key, depth);
    setReportData({ bfs, dfs, origin: key, depth });
    setReportRunning(false);
  }

  if (!graph) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
          <h1 className="text-sm font-semibold text-zinc-800">Análises — Wikipedia</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Carregando…</p>
        </header>
        <div className="flex flex-1 items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-400">Carregando dados…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header with tabs */}
      <header className="shrink-0 border-b border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Análises — Wikipedia</h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              {graph.nodes.length} artigos · {graph.edges.length} ligações · busca: {relativeSeed}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Artigo</span>
            <input
              list="wiki-analytics-seeds"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="Chess"
              className="w-56 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-400"
            />
            <datalist id="wiki-analytics-seeds">
              {nodeKeys.map((key) => <option key={key} value={key} />)}
            </datalist>
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

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 bg-zinc-50">

        <InsightGrid items={networkInsights} />

        {tab === "dist" && (
          <Section
            title={`Distribuição de Graus · ${relativeSeed}`}
            subtitle="Número de artigos por faixa de grau no subgrafo da busca atual (escala logarítmica)"
            insights={distributionInsights}
          >
            <NarrativePanel items={overviewNarratives} />
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={distData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="label" tick={TICK} />
                <YAxis tick={TICK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="Artigos" fill="#1a1a1a" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "ranking" && (
          <Section
            title={`Rankings de Centralidade · ${relativeSeed}`}
            subtitle="Comparação entre hubs brutos e hubs temáticos filtrados no subgrafo da busca atual"
            insights={rankingInsights}
          >
            <NarrativePanel items={rankingNarratives} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold text-zinc-900">Hubs brutos por grau total</p>
                <ResponsiveContainer width="100%" height={Math.max(320, rankData.length * 22 + 60)}>
                  <BarChart data={rankData} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" tick={TICK} />
                    <YAxis
                      dataKey="key"
                      type="category"
                      tick={{ ...TICK, fontSize: 9 }}
                      width={160}
                      tickFormatter={(v: string) => truncateLabel(v, 22)}
                    />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Grau"]} />
                    <Bar dataKey="degree" name="Grau" fill="#1a1a1a" radius={[0, 3, 3, 0]}>
                      <LabelList dataKey="degree" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-zinc-900">Hubs temáticos filtrados</p>
                <ResponsiveContainer width="100%" height={Math.max(320, thematicRankData.length * 22 + 60)}>
                  <BarChart data={thematicRankData} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" tick={TICK} />
                    <YAxis
                      dataKey="key"
                      type="category"
                      tick={{ ...TICK, fontSize: 9 }}
                      width={160}
                      tickFormatter={(v: string) => truncateLabel(v, 22)}
                    />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Grau"]} />
                    <Bar dataKey="totalDegree" name="Grau" fill="#3f3f46" radius={[0, 3, 3, 0]}>
                      <LabelList dataKey="totalDegree" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold text-zinc-900">Artigos mais extensos</p>
              <ResponsiveContainer width="100%" height={Math.max(300, wordCountData.length * 26 + 60)}>
                <BarChart data={wordCountData} layout="vertical" margin={{ top: 8, right: 64, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" tick={TICK} />
                  <YAxis
                    dataKey="key"
                    type="category"
                    tick={{ ...TICK, fontSize: 9 }}
                    width={180}
                    tickFormatter={(v: string) => truncateLabel(v)}
                  />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v).toLocaleString("pt-BR"), "Palavras"]} />
                  <Bar dataKey="wordCount" name="Palavras" fill="#71717a" radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="wordCount" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        {tab === "categorias" && (
          <Section
            title={`Categorias Mais Frequentes · ${relativeSeed}`}
            subtitle="Top 20 categorias entre os artigos do subgrafo da busca atual"
            insights={categoryInsights}
          >
            <NarrativePanel items={categoryNarratives} />
            <ResponsiveContainer width="100%" height={Math.max(300, categoryData.length * 22 + 60)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={TICK} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tick={{ ...TICK, fontSize: 9 }}
                  width={180}
                  tickFormatter={(v: string) => truncateLabel(v)}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Artigos"]} />
                <Bar dataKey="count" name="Artigos" fill="#1a1a1a" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "conexoes" && (
          <Section
            title={`Conexões Estruturais · ${relativeSeed}`}
            subtitle="Entrada, saída, desequilíbrio e pontes semânticas no subgrafo da busca atual"
            insights={connectionInsights}
          >
            <NarrativePanel items={connectionNarratives} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ConnectionTable
                title="Mais recebem ligações"
                rows={incomingRows}
                columns={[
                  { key: "inDegree", label: "Entrada" },
                  { key: "totalDegree", label: "Total" },
                ]}
              />
              <ConnectionTable
                title="Mais enviam ligações"
                rows={outgoingRows}
                columns={[
                  { key: "outDegree", label: "Saída" },
                  { key: "totalDegree", label: "Total" },
                ]}
              />
              <ConnectionTable
                title="Maiores desequilíbrios"
                rows={imbalanceRows}
                columns={[
                  { key: "outDegree", label: "Saída" },
                  { key: "inDegree", label: "Entrada" },
                  { key: "balance", label: "Saldo" },
                ]}
              />
              <ConnectionTable
                title="Pontes semânticas"
                rows={bridgeRows}
                columns={[
                  { key: "totalDegree", label: "Grau" },
                  { key: "categoryCount", label: "Categorias" },
                  { key: "bridgeScore", label: "Score" },
                ]}
              />
            </div>
          </Section>
        )}

        {tab === "report" && (
          <Section
            title={`Report de Desempenho · ${relativeSeed}`}
            subtitle={`Tempo de execução de BFS e DFS limitados à profundidade ${depth} (definida no Mapa)`}
          >
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={calcReport}
                disabled={reportRunning}
                className="rounded bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {reportRunning ? "Calculando…" : "Calcular"}
              </button>
              <span className="text-[10px] text-zinc-500">
                Origem: <span className="font-semibold text-zinc-800">{relativeSeed}</span> ·
                profundidade: <span className="font-semibold text-zinc-800">{depth}</span> ·
                subgrafo: {graph.nodes.length} artigos
              </span>
              {reportError && <p className="text-xs text-red-500">{reportError}</p>}
            </div>

            {reportRunning && (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                Calculando…
              </div>
            )}

            {!reportRunning && reportData && (
              <>
                <p className="mb-3 text-xs text-zinc-600">
                  Origem: <span className="font-semibold text-zinc-900">{reportData.origin}</span> ·
                  profundidade máx: <span className="font-semibold text-zinc-900">{reportData.depth}</span>
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <ReportCard kind="BFS" report={reportData.bfs} />
                  <ReportCard kind="DFS" report={reportData.dfs} />
                </div>
                {!reportData.bfs.memSupported && (
                  <p className="mt-3 text-[11px] text-zinc-500">
                    Consumo de memória só está disponível em navegadores baseados em Chromium (Chrome / Edge / Brave).
                  </p>
                )}
              </>
            )}

            {!reportRunning && !reportData && !reportError && (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                Clique em Calcular para gerar o report
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function ReportCard({ kind, report }: { kind: "BFS" | "DFS"; report: RunReport }) {
  const fmt = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)} MB`);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold text-zinc-900">{kind}</p>
      <dl className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-zinc-500">Tempo</dt>
        <dd className="text-right font-semibold text-zinc-900 tabular-nums">{report.elapsedMs.toFixed(2)} ms</dd>

        <dt className="text-zinc-500">Alcançados</dt>
        <dd className="text-right font-semibold text-zinc-900 tabular-nums">{report.reachable}</dd>

        <dt className="text-zinc-500">Maior nível</dt>
        <dd className="text-right font-semibold text-zinc-900 tabular-nums">{report.maxLevel}</dd>

        <dt className="text-zinc-500">RAM base</dt>
        <dd className="text-right font-semibold text-zinc-900 tabular-nums">{fmt(report.memBaselineMB)}</dd>

        <dt className="text-zinc-500">RAM pico</dt>
        <dd className="text-right font-semibold text-zinc-900 tabular-nums">{fmt(report.memPeakMB)}</dd>

        <dt className="text-zinc-500">RAM média</dt>
        <dd className="text-right font-semibold text-zinc-900 tabular-nums">{fmt(report.memAverageMB)}</dd>
      </dl>
    </div>
  );
}
