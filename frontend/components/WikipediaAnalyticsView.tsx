"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { WikiGraphData, WikiNode } from "@/lib/graph/wiki_types";
import type { GraphData } from "@/lib/graph/types";
import { runBfs } from "@/lib/graph/bfs";
import { runDfs } from "@/lib/graph/dfs";
import {
  bfsLevelDistribution,
  degreeConcentration,
  dominantDegreeBin,
  formatPercent,
  graphDensity,
  type InsightCardData,
} from "@/lib/graph/analytics";
import type { BfsResult } from "@/lib/graph/bfs";
import type { DfsResult } from "@/lib/graph/dfs";

type Tab = "dist" | "ranking" | "categorias" | "bfs" | "dfs";

const TABS: { id: Tab; label: string }[] = [
  { id: "dist",       label: "Distribuição" },
  { id: "ranking",    label: "Ranking"      },
  { id: "categorias", label: "Categorias"   },
  { id: "bfs",        label: "BFS"          },
  { id: "dfs",        label: "DFS"          },
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
function levelFromBarClick(data: unknown): number | null {
  const item = data as { level?: unknown; payload?: { level?: unknown } };
  const level = typeof item.level === "number" ? item.level : item.payload?.level;
  return typeof level === "number" ? level : null;
}

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

function topCategoryCounts(nodes: WikiNode[], limit = 10) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const category of node.attributes.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([category, count]) => ({ category, count }));
}

function topCategories(nodes: WikiNode[], limit = 20) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const cat of node.attributes.categories) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([category, count]) => ({ category, count }));
}

// Cast WikiGraphData to GraphData-compatible for reusing bfs/dfs utilities
// (both only access .edges[].source and .edges[].target at runtime)
function asGraphData(wiki: WikiGraphData): GraphData {
  return wiki as unknown as GraphData;
}

// ─── Level airport list (reused for Wikipedia articles) ───────────────────────
function LevelArticleList({
  level, articles, onClose,
}: {
  level: number; articles: { key: string }[]; onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
        <span className="text-xs font-bold text-zinc-900">
          {level === 0 ? "Origem" : `Nível ${level}`}
        </span>
        <span className="text-xs text-zinc-500">· {articles.length} artigo{articles.length !== 1 ? "s" : ""}</span>
        <button onClick={onClose} className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600">✕</button>
      </div>
      <ul className="grid max-h-48 grid-cols-1 gap-0 overflow-y-auto sm:grid-cols-2">
        {articles.map(({ key }) => (
          <li key={key} className="truncate border-b border-zinc-100 px-4 py-2 text-xs text-zinc-700 even:bg-white odd:bg-zinc-50">
            {key}
          </li>
        ))}
      </ul>
    </div>
  );
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

// ─── Main component ───────────────────────────────────────────────────────────
export function WikipediaAnalyticsView({
  graph,
  seed,
}: {
  graph: WikiGraphData | null;
  seed: string;
}) {
  const [tab, setTab] = useState<Tab>("dist");

  // BFS state
  const [bfsOrigin,        setBfsOrigin]        = useState("");
  const [localBfs,         setLocalBfs]         = useState<BfsResult | null>(null);
  const [bfsError,         setBfsError]         = useState<string | null>(null);
  const [bfsSelectedLevel, setBfsSelectedLevel] = useState<number | null>(null);

  // DFS state
  const [dfsOrigin,        setDfsOrigin]        = useState("");
  const [localDfs,         setLocalDfs]         = useState<DfsResult | null>(null);
  const [dfsError,         setDfsError]         = useState<string | null>(null);
  const [dfsSelectedLevel, setDfsSelectedLevel] = useState<number | null>(null);

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
  const categoryCountData = useMemo(() => graph ? topCategoryCounts(graph.nodes) : [], [graph]);
  const bfsData       = useMemo(() => localBfs ? bfsLevelDistribution(localBfs) : [], [localBfs]);
  const dfsData       = useMemo(() => localDfs ? bfsLevelDistribution(localDfs) : [], [localDfs]);
  const degreeMap     = useMemo(() => graph ? wikiDegreeMap(graph) : new Map<string, number>(), [graph]);

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
    const runnerUp = rankData[1];
    const leaderWordCount = wordCountData.find((page) => page.key === leader.key);
    const gap = leader && runnerUp ? leader.degree - runnerUp.degree : 0;

    return [
      {
        label: "Líder do ranking",
        value: leader.key,
        detail: `${leader.degree} ligações totais${leaderWordCount ? ` · ${leaderWordCount.wordCount.toLocaleString("pt-BR")} palavras` : ""}.`,
        tone: "green",
      },
      {
        label: "Folga para o 2º",
        value: runnerUp ? `${gap}` : "-",
        detail: runnerUp ? `Diferença para ${runnerUp.key}.` : "Sem segundo colocado para comparar.",
        tone: "blue",
      },
      {
        label: "Top 5 hubs",
        value: formatPercent(degreeConcentration(degreeMap, 5)),
        detail: "Parcela da rede concentrada nos cinco artigos mais conectados.",
        tone: "orange",
      },
    ] satisfies InsightCardData[];
  }, [degreeMap, graph, rankData, wordCountData]);

  const categoryInsights = useMemo(() => {
    if (!graph || categoryCountData.length === 0) return [];
    const topCategory = categoryCountData[0];
    const categoryCoverage = new Set(graph.nodes.flatMap((node) => node.attributes.categories)).size;
    const multiCategoryPages = graph.nodes.filter((node) => node.attributes.categories.length >= 3).length;

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
    ] satisfies InsightCardData[];
  }, [categoryCountData, graph]);

  const bfsInsights = useMemo(() => {
    if (!graph || !localBfs || bfsData.length === 0) return [];
    const reached = localBfs.levels.size;
    const widestLevel = [...bfsData].sort((a, b) => b.count - a.count)[0];

    return [
      {
        label: "Alcance",
        value: `${reached}/${graph.nodes.length}`,
        detail: `${formatPercent(reached / graph.nodes.length)} dos artigos foram alcançados.`,
        tone: "blue",
      },
      {
        label: "Profundidade máxima",
        value: `${localBfs.maxLevel}`,
        detail: "Maior nível encontrado a partir do artigo de origem.",
        tone: "purple",
      },
      {
        label: "Camada mais larga",
        value: widestLevel ? widestLevel.label : "-",
        detail: widestLevel ? `${widestLevel.count} artigos nesse nível.` : "Sem distribuição por nível.",
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
        detail: `${formatPercent(visited / graph.nodes.length)} dos artigos entraram na árvore DFS.`,
        tone: "blue",
      },
      {
        label: "Maior profundidade",
        value: `${localDfs.maxLevel}`,
        detail: "Profundidade máxima atingida pela travessia.",
        tone: "purple",
      },
      {
        label: "Última camada",
        value: deepestLevel ? deepestLevel.label : "-",
        detail: deepestLevel ? `${deepestLevel.count} artigo(s) no nível mais profundo.` : "Sem distribuição por profundidade.",
        tone: "green",
      },
    ] satisfies InsightCardData[];
  }, [dfsData, graph, localDfs]);

  function calcBfs() {
    if (!graph) return;
    setBfsError(null);
    const key = bfsOrigin.trim();
    if (!key) { setBfsError("Informe o artigo de origem."); return; }
    if (!nodeMap.has(key)) { setBfsError(`"${key}" não encontrado.`); return; }
    setLocalBfs(runBfs(asGraphData(graph), key));
    setBfsSelectedLevel(null);
  }

  function calcDfs() {
    if (!graph) return;
    setDfsError(null);
    const key = dfsOrigin.trim();
    if (!key) { setDfsError("Informe o artigo de origem."); return; }
    if (!nodeMap.has(key)) { setDfsError(`"${key}" não encontrado.`); return; }
    setLocalDfs(runDfs(asGraphData(graph), key));
    setDfsSelectedLevel(null);
  }

  function articlesAtLevel(levels: Map<string, number>, level: number) {
    return [...levels.entries()]
      .filter(([, l]) => l === level)
      .map(([key]) => ({ key }))
      .sort((a, b) => a.key.localeCompare(b.key));
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
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Análises — Wikipedia</h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              {graph.nodes.length} artigos · {graph.edges.length} ligações · busca: {relativeSeed}
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

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 bg-zinc-50">

        <InsightGrid items={networkInsights} />

        {tab === "dist" && (
          <Section
            title={`Distribuição de Graus · ${relativeSeed}`}
            subtitle="Número de artigos por faixa de grau no subgrafo da busca atual (escala logarítmica)"
            insights={distributionInsights}
          >
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
            title={`Artigos Mais Ligados · ${relativeSeed}`}
            subtitle="Top 20 artigos por grau total no subgrafo da busca atual"
            insights={rankingInsights}
          >
            <ResponsiveContainer width="100%" height={Math.max(300, rankData.length * 22 + 60)}>
              <BarChart data={rankData} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={TICK} />
                <YAxis
                  dataKey="key"
                  type="category"
                  tick={{ ...TICK, fontSize: 9 }}
                  width={160}
                  tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Grau"]} />
                <Bar dataKey="degree" name="Grau" fill="#1a1a1a" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="degree" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "categorias" && (
          <Section
            title={`Categorias Mais Frequentes · ${relativeSeed}`}
            subtitle="Top 20 categorias entre os artigos do subgrafo da busca atual"
            insights={categoryInsights}
          >
            <ResponsiveContainer width="100%" height={Math.max(300, categoryData.length * 22 + 60)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={TICK} />
                <YAxis
                  dataKey="category"
                  type="category"
                  tick={{ ...TICK, fontSize: 9 }}
                  width={180}
                  tickFormatter={(v: string) => v.length > 26 ? v.slice(0, 26) + "…" : v}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [v, "Artigos"]} />
                <Bar dataKey="count" name="Artigos" fill="#1a1a1a" radius={[0, 3, 3, 0]}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: "#374151" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {tab === "bfs" && (
          <Section
            title={`Distribuição por Nível BFS · ${relativeSeed}`}
            subtitle="Artigos alcançados por nível a partir da busca atual"
            insights={bfsInsights}
          >
            <div className="mb-4 flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Artigo de origem</label>
                <input
                  list="wiki-bfs-nodes"
                  value={bfsOrigin}
                  onChange={(e) => setBfsOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcBfs()}
                  placeholder="Ex: Underwater exploration"
                  className="w-64 rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                />
                <datalist id="wiki-bfs-nodes">
                  {graph.nodes.map((n) => <option key={n.key} value={n.key} />)}
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
                  <span className="font-semibold text-zinc-900">{localBfs!.levels.size - 1}</span> artigos alcançados a partir de{" "}
                  <span className="font-semibold text-zinc-900">{localBfs!.originKey}</span>
                  {bfsSelectedLevel === null && <span className="ml-2 text-zinc-400">· clique em uma barra para ver os artigos</span>}
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bfsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={TICK} />
                    <YAxis tick={TICK} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar
                      dataKey="count"
                      name="Artigos"
                      fill="#1a1a1a"
                      radius={[3, 3, 0, 0]}
                      cursor="pointer"
                      onClick={(d) => {
                        const level = levelFromBarClick(d);
                        if (level !== null) setBfsSelectedLevel(bfsSelectedLevel === level ? null : level);
                      }}
                    >
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {bfsSelectedLevel !== null && (
                  <LevelArticleList
                    level={bfsSelectedLevel}
                    articles={articlesAtLevel(localBfs!.levels, bfsSelectedLevel)}
                    onClose={() => setBfsSelectedLevel(null)}
                  />
                )}
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                Selecione um artigo de origem e clique em Calcular
              </div>
            )}
          </Section>
        )}

        {tab === "dfs" && (
          <Section
            title={`Distribuição por Nível DFS · ${relativeSeed}`}
            subtitle="Artigos visitados por profundidade a partir da busca atual"
            insights={dfsInsights}
          >
            <div className="mb-4 flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Artigo de origem</label>
                <input
                  list="wiki-dfs-nodes"
                  value={dfsOrigin}
                  onChange={(e) => setDfsOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && calcDfs()}
                  placeholder="Ex: Underwater exploration"
                  className="w-64 rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
                />
                <datalist id="wiki-dfs-nodes">
                  {graph.nodes.map((n) => <option key={n.key} value={n.key} />)}
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
                  <span className="font-semibold text-zinc-900">{localDfs!.levels.size - 1}</span> artigos visitados a partir de{" "}
                  <span className="font-semibold text-zinc-900">{localDfs!.originKey}</span>
                  {dfsSelectedLevel === null && <span className="ml-2 text-zinc-400">· clique em uma barra para ver os artigos</span>}
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dfsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="label" tick={TICK} />
                    <YAxis tick={TICK} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar
                      dataKey="count"
                      name="Artigos"
                      fill="#1a1a1a"
                      radius={[3, 3, 0, 0]}
                      cursor="pointer"
                      onClick={(d) => {
                        const level = levelFromBarClick(d);
                        if (level !== null) setDfsSelectedLevel(dfsSelectedLevel === level ? null : level);
                      }}
                    >
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#374151" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {dfsSelectedLevel !== null && (
                  <LevelArticleList
                    level={dfsSelectedLevel}
                    articles={articlesAtLevel(localDfs!.levels, dfsSelectedLevel)}
                    onClose={() => setDfsSelectedLevel(null)}
                  />
                )}
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                Selecione um artigo de origem e clique em Calcular
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
