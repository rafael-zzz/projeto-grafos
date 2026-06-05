import type { BfsResult } from "./bfs";
import type { InsightCardData } from "./analytics";
import { formatPercent, graphDensity } from "./analytics";
import type { GraphData } from "./types";
import type { WikiGraphData } from "./wiki_types";

export type WikiDegreeRecord = {
  key: string;
  title: string;
  categories: string[];
  wordCount: number;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  balance: number;
  absBalance: number;
  categoryCount: number;
  bridgeScore: number;
};

export type WikiNarrative = {
  title: string;
  body: string;
};

type PageRankRecord = {
  key: string;
  degree: number;
};

type WordCountRecord = {
  key: string;
  wordCount: number;
};

type CategoryRecord = {
  category: string;
  count: number;
};

const UTILITY_NODE_PATTERNS = [
  /\bidentifier\b/i,
  /^isbn\b/i,
  /^doi\b/i,
  /^issn\b/i,
  /^jstor\b/i,
  /^s2cid\b/i,
  /^pmid\b/i,
  /^pmc\b/i,
  /\bwikidata\b/i,
  /\bcoordinates\b/i,
  /\bwayback machine\b/i,
  /\binternet archive\b/i,
  /\bshort description\b/i,
  /\barticles? with\b/i,
  /\ball articles\b/i,
  /\bpages? using\b/i,
];

export function asGraphData(wiki: WikiGraphData): GraphData {
  return wiki as unknown as GraphData;
}

export function isUtilityWikiNode(key: string): boolean {
  return UTILITY_NODE_PATTERNS.some((pattern) => pattern.test(key));
}

export function wikiDegreeRecords(graph: WikiGraphData): WikiDegreeRecord[] {
  const inDegrees = new Map<string, number>(graph.nodes.map((node) => [node.key, 0]));
  const outDegrees = new Map<string, number>(graph.nodes.map((node) => [node.key, 0]));

  for (const edge of graph.edges) {
    outDegrees.set(edge.source, (outDegrees.get(edge.source) ?? 0) + 1);
    inDegrees.set(edge.target, (inDegrees.get(edge.target) ?? 0) + 1);
  }

  return graph.nodes.map((node) => {
    const inDegree = inDegrees.get(node.key) ?? 0;
    const outDegree = outDegrees.get(node.key) ?? 0;
    const totalDegree = inDegree + outDegree;
    const categoryCount = node.attributes.categories.length;
    return {
      key: node.key,
      title: node.attributes.title,
      categories: node.attributes.categories,
      wordCount: node.attributes.word_count,
      inDegree,
      outDegree,
      totalDegree,
      balance: outDegree - inDegree,
      absBalance: Math.abs(outDegree - inDegree),
      categoryCount,
      bridgeScore: totalDegree * Math.max(categoryCount, 1),
    };
  });
}

export function topIncoming(records: WikiDegreeRecord[], limit = 10): WikiDegreeRecord[] {
  return [...records]
    .sort((a, b) => b.inDegree - a.inDegree || b.totalDegree - a.totalDegree || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function topOutgoing(records: WikiDegreeRecord[], limit = 10): WikiDegreeRecord[] {
  return [...records]
    .sort((a, b) => b.outDegree - a.outDegree || b.totalDegree - a.totalDegree || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function topImbalances(records: WikiDegreeRecord[], limit = 10): WikiDegreeRecord[] {
  return [...records]
    .sort((a, b) => b.absBalance - a.absBalance || b.totalDegree - a.totalDegree || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function semanticBridgeCandidates(records: WikiDegreeRecord[], limit = 10): WikiDegreeRecord[] {
  return [...records]
    .filter((record) => record.totalDegree > 0 && record.categoryCount > 0)
    .sort((a, b) => b.bridgeScore - a.bridgeScore || b.totalDegree - a.totalDegree || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function topThematicPages(records: WikiDegreeRecord[], limit = 20): WikiDegreeRecord[] {
  return [...records]
    .filter((record) => !isUtilityWikiNode(record.key))
    .sort((a, b) => b.totalDegree - a.totalDegree || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function rareCategoryCount(categories: CategoryRecord[]): number {
  return categories.filter((category) => category.count === 1).length;
}

export function topCategoryCoverage(graph: WikiGraphData, categories: CategoryRecord[], limit = 5): number {
  if (graph.nodes.length === 0 || categories.length === 0) return 0;
  const topCategories = new Set(categories.slice(0, limit).map((category) => category.category));
  const coveredArticles = graph.nodes.filter((node) =>
    node.attributes.categories.some((category) => topCategories.has(category)),
  ).length;
  return coveredArticles / graph.nodes.length;
}

export function buildOverviewNarratives({
  graph,
  seed,
  dominantBin,
  topHub,
  concentration,
  categoryCount,
}: {
  graph: WikiGraphData;
  seed: string;
  dominantBin: { label: string; count: number; share: number } | null;
  topHub: PageRankRecord | undefined;
  concentration: number;
  categoryCount: number;
}): WikiNarrative[] {
  const density = graphDensity(asGraphData(graph));
  const densityText = density >= 0.08
    ? "bem densa"
    : density >= 0.04
      ? "moderadamente conectada"
      : "mais esparsa";
  const concentrationText = concentration >= 0.15
    ? "com dependência perceptível dos principais hubs"
    : "sem depender excessivamente de poucos hubs";

  return [
    {
      title: `Leitura rápida de ${seed}`,
      body: `A busca gerou uma rede ${densityText}, com ${graph.nodes.length} artigos e ${graph.edges.length} ligações. Isso indica um recorte ${concentrationText}.`,
    },
    {
      title: "Centro estrutural",
      body: topHub
        ? `${topHub.key} é o artigo mais conectado deste subgrafo, com ${topHub.degree} ligações. Ele funciona como ponto de passagem importante dentro do recorte.`
        : "O subgrafo ainda não tem um hub estrutural claro.",
    },
    {
      title: "Forma da distribuição",
      body: dominantBin
        ? `A faixa dominante é ${dominantBin.label}, reunindo ${dominantBin.count} artigos (${formatPercent(dominantBin.share)}). Quanto maior essa faixa, mais conectada é a vizinhança da busca.`
        : "Não há dados suficientes para interpretar a distribuição de graus.",
    },
    {
      title: "Amplitude temática",
      body: `${categoryCount} categorias aparecem nos artigos carregados. Esse número ajuda a medir se a busca abriu uma vizinhança especializada ou atravessou vários temas.`,
    },
  ];
}

export function buildRankingNarratives({
  topHub,
  topThematicHub,
  longestArticle,
  filteredUtilityCount,
}: {
  topHub: PageRankRecord | undefined;
  topThematicHub: WikiDegreeRecord | undefined;
  longestArticle: WordCountRecord | undefined;
  filteredUtilityCount: number;
}): WikiNarrative[] {
  if (!topHub || !longestArticle) return [];

  const sameThematicLeader = topHub.key === topThematicHub?.key;
  return [
    {
      title: "Bruto vs temático",
      body: topThematicHub
        ? sameThematicLeader
          ? `${topHub.key} lidera tanto no ranking bruto quanto no filtrado, então ele parece central estruturalmente e semanticamente.`
          : `${topHub.key} lidera o ranking bruto, enquanto ${topThematicHub.key} lidera o ranking filtrado. Isso separa hubs técnicos da Wikipedia de artigos mais relevantes para o tema.`
        : "O filtro temático não encontrou candidatos suficientes depois de remover nós utilitários.",
    },
    {
      title: "Filtro aplicado",
      body: `${filteredUtilityCount} nós utilitários foram removidos do ranking filtrado. Exemplos comuns são identificadores, bases de citação, coordenadas e páginas de manutenção.`,
    },
    {
      title: "Centralidade não é tamanho",
      body: topThematicHub?.key === longestArticle.key
        ? `${longestArticle.key} é ao mesmo tempo o maior hub temático e o artigo mais extenso do recorte.`
        : `${topThematicHub?.key ?? topHub.key} lidera em conexões temáticas, enquanto ${longestArticle.key} lidera em palavras. Isso separa importância estrutural de profundidade textual.`,
    },
  ];
}

export function buildCategoryNarratives({
  categories,
  nodeCount,
  topCoverage,
}: {
  categories: CategoryRecord[];
  nodeCount: number;
  topCoverage: number;
}): WikiNarrative[] {
  if (categories.length === 0 || nodeCount === 0) return [];
  const top = categories[0];
  const rare = rareCategoryCount(categories);
  const thematicText = topCoverage >= 0.6
    ? "mais especializado"
    : topCoverage >= 0.35
      ? "tematicamente misto"
      : "bem distribuído entre temas";

  return [
    {
      title: "Tema dominante",
      body: `${top.category} aparece em ${top.count} artigos e dá uma pista do assunto que mais organiza esse subgrafo.`,
    },
    {
      title: "Perfil temático",
      body: `Os 5 temas mais frequentes aparecem em ${formatPercent(topCoverage)} dos artigos, então o recorte parece ${thematicText}. Há ${rare} categorias raras, úteis para identificar nichos.`,
    },
  ];
}

export function buildConnectionInsights({
  records,
  incoming,
  outgoing,
  imbalances,
  bridges,
}: {
  records: WikiDegreeRecord[];
  incoming: WikiDegreeRecord[];
  outgoing: WikiDegreeRecord[];
  imbalances: WikiDegreeRecord[];
  bridges: WikiDegreeRecord[];
}): InsightCardData[] {
  const mostIncoming = incoming[0];
  const mostOutgoing = outgoing[0];
  const mostUnbalanced = imbalances[0];
  const bestBridge = bridges[0];
  const averageDegree = records.length === 0
    ? 0
    : records.reduce((sum, record) => sum + record.totalDegree, 0) / records.length;

  return [
    {
      label: "Grau médio",
      value: averageDegree.toFixed(1),
      detail: "Média de ligações por artigo no subgrafo atual.",
      tone: "zinc",
    },
    {
      label: "Mais recebe links",
      value: mostIncoming ? mostIncoming.key : "-",
      detail: mostIncoming ? `${mostIncoming.inDegree} entradas; ${mostIncoming.totalDegree} ligações totais.` : "Sem entradas calculadas.",
      tone: "blue",
    },
    {
      label: "Mais envia links",
      value: mostOutgoing ? mostOutgoing.key : "-",
      detail: mostOutgoing ? `${mostOutgoing.outDegree} saídas; ${mostOutgoing.totalDegree} ligações totais.` : "Sem saídas calculadas.",
      tone: "green",
    },
    {
      label: "Maior desequilíbrio",
      value: mostUnbalanced ? mostUnbalanced.key : "-",
      detail: mostUnbalanced ? `${mostUnbalanced.outDegree} saídas e ${mostUnbalanced.inDegree} entradas.` : "Sem desequilíbrio calculado.",
      tone: "orange",
    },
    {
      label: "Ponte semântica",
      value: bestBridge ? bestBridge.key : "-",
      detail: bestBridge ? `${bestBridge.totalDegree} ligações em ${bestBridge.categoryCount} categorias.` : "Sem ponte calculada.",
      tone: "purple",
    },
  ];
}

export function buildConnectionNarratives({
  incoming,
  outgoing,
  bridges,
}: {
  incoming: WikiDegreeRecord[];
  outgoing: WikiDegreeRecord[];
  bridges: WikiDegreeRecord[];
}): WikiNarrative[] {
  const receiver = incoming[0];
  const sender = outgoing[0];
  const bridge = bridges[0];

  return [
    {
      title: "Entrada vs saída",
      body: receiver && sender
        ? `${receiver.key} é o maior receptor de ligações, enquanto ${sender.key} é o maior emissor. Essa diferença ajuda a separar artigos de referência de artigos que abrem caminhos.`
        : "Não há ligações suficientes para comparar entrada e saída.",
    },
    {
      title: "Pontes do subgrafo",
      body: bridge
        ? `${bridge.key} combina alto grau e diversidade de categorias, então é um bom candidato a ponte entre assuntos diferentes da busca.`
        : "Nenhum candidato claro a ponte semântica foi encontrado neste recorte.",
    },
  ];
}

export function buildTraversalNarratives({
  kind,
  graph,
  result,
  levelData,
}: {
  kind: "BFS" | "DFS";
  graph: WikiGraphData;
  result: BfsResult | null;
  levelData: { level: number; label: string; count: number }[];
}): WikiNarrative[] {
  if (!result || levelData.length === 0) return [];

  const reached = result.levels.size;
  const widestLevel = [...levelData].sort((a, b) => b.count - a.count)[0];
  const action = kind === "BFS"
    ? "expande a rede por proximidade, camada por camada"
    : "percorre caminhos profundos antes de voltar para explorar alternativas";

  return [
    {
      title: `${kind} a partir de ${result.originKey}`,
      body: `${kind} alcançou ${reached} de ${graph.nodes.length} artigos (${formatPercent(reached / graph.nodes.length)}). Esse algoritmo ${action}.`,
    },
    {
      title: "Camada crítica",
      body: widestLevel
        ? `${widestLevel.label} é a camada mais larga, com ${widestLevel.count} artigos. Ela mostra onde a expansão da busca ganha mais volume.`
        : "A travessia ainda não tem uma camada dominante.",
    },
  ];
}
