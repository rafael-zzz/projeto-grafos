"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import type { WikiGraphData, WikiNode } from "@/lib/graph/wiki_types";
import type { GraphData } from "@/lib/graph/types";
import { runBfs } from "@/lib/graph/bfs";
import { runDfs } from "@/lib/graph/dfs";
import { bfsLevelDistribution } from "@/lib/graph/analytics";
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

const TICK         = { fontSize: 11, fill: "#3f3f46" } as const;
const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 11, borderColor: "#e4e4e7" },
  labelStyle:   { color: "#18181b", fontWeight: 600 },
  itemStyle:    { color: "#3f3f46" },
} as const;

// ─── Analytics helpers ────────────────────────────────────────────────────────
function wikiDegreeDistribution(graph: WikiGraphData) {
  const deg = new Map<string, number>(graph.nodes.map((n) => [n.key, 0]));
  for (const e of graph.edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
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
  const deg = new Map<string, number>(graph.nodes.map((n) => [n.key, 0]));
  for (const e of graph.edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  return [...deg.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, degree]) => ({ key, degree }));
}

function topCategories(nodes: WikiNode[], limit = 20) {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    for (const cat of node.attributes.categories) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
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
  title, subtitle, controls, children,
}: {
  title: string; subtitle: string; controls?: React.ReactNode; children: React.ReactNode;
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
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WikipediaAnalyticsView({ graph }: { graph: WikiGraphData | null }) {
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

  const distData      = useMemo(() => graph ? wikiDegreeDistribution(graph) : [],    [graph]);
  const rankData      = useMemo(() => graph ? topPages(graph)               : [],    [graph]);
  const categoryData  = useMemo(() => graph ? topCategories(graph.nodes)    : [],    [graph]);
  const bfsData       = useMemo(() => localBfs ? bfsLevelDistribution(localBfs) : [], [localBfs]);
  const dfsData       = useMemo(() => localDfs ? bfsLevelDistribution(localDfs) : [], [localDfs]);

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
              {graph.nodes.length} artigos · {graph.edges.length} ligações
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

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 bg-zinc-50">

        {tab === "dist" && (
          <Section
            title="Distribuição de Graus"
            subtitle="Número de artigos por faixa de grau (escala logarítmica)"
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
            title="Artigos Mais Ligados"
            subtitle="Top 20 artigos por grau total (entradas + saídas)"
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
            title="Categorias Mais Frequentes"
            subtitle="Top 20 categorias entre os artigos do grafo"
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
          <Section title="Distribuição por Nível BFS" subtitle="Artigos alcançados por nível a partir de uma origem">
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
                  <span className="font-semibold text-zinc-900">"{localBfs!.originKey}"</span>
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
                      onClick={(d: any) => setBfsSelectedLevel(bfsSelectedLevel === d.level ? null : d.level)}
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
          <Section title="Distribuição por Nível DFS" subtitle="Artigos visitados por profundidade a partir de uma origem">
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
                  <span className="font-semibold text-zinc-900">"{localDfs!.originKey}"</span>
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
                      onClick={(d: any) => setDfsSelectedLevel(dfsSelectedLevel === d.level ? null : d.level)}
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
