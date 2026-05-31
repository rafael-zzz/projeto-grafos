import type { GraphData } from "./types";
import type { BfsResult } from "./bfs";

export type InsightCardData = {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "orange" | "purple" | "zinc";
};

export type DirectionalDegreeRecord = {
  key: string;
  city: string;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  balance: number;
  absBalance: number;
};

export type ReciprocityStats = {
  reciprocalEdges: number;
  reciprocalPairs: number;
  oneWayEdges: number;
  reciprocityRate: number;
};

export type RouteFrequencyStats = {
  count: number;
  average: number;
  median: number;
  min: number;
  max: number;
  weakest: { source: string; target: string; flights: number; weight: number } | null;
  strongest: { source: string; target: string; flights: number; weight: number } | null;
};

export type RegionalFlowSummary = {
  region: string;
  incoming: number;
  outgoing: number;
  internal: number;
  externalIn: number;
  externalOut: number;
  netExternal: number;
};

export function computeOutDegrees(graph: GraphData): Map<string, number> {
  const degrees = new Map<string, number>(graph.nodes.map((n) => [n.key, 0]));
  for (const edge of graph.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
  }
  return degrees;
}

export function computeInDegrees(graph: GraphData): Map<string, number> {
  const degrees = new Map<string, number>(graph.nodes.map((n) => [n.key, 0]));
  for (const edge of graph.edges) {
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  return degrees;
}

export function computeDegrees(graph: GraphData): Map<string, number> {
  return computeOutDegrees(graph);
}

export function computeTotalDegrees(graph: GraphData): Map<string, number> {
  const outDegrees = computeOutDegrees(graph);
  const inDegrees = computeInDegrees(graph);
  return new Map(
    graph.nodes.map((node) => [
      node.key,
      (outDegrees.get(node.key) ?? 0) + (inDegrees.get(node.key) ?? 0),
    ]),
  );
}

export function directionalDegreeRecords(graph: GraphData): DirectionalDegreeRecord[] {
  const outDegrees = computeOutDegrees(graph);
  const inDegrees = computeInDegrees(graph);
  const cityMap = new Map(graph.nodes.map((n) => [n.key, n.attributes.city]));

  return graph.nodes.map((node) => {
    const outDegree = outDegrees.get(node.key) ?? 0;
    const inDegree = inDegrees.get(node.key) ?? 0;
    const balance = outDegree - inDegree;
    return {
      key: node.key,
      city: cityMap.get(node.key) ?? node.key,
      inDegree,
      outDegree,
      totalDegree: inDegree + outDegree,
      balance,
      absBalance: Math.abs(balance),
    };
  });
}

export function degreeDistribution(
  degrees: Map<string, number>,
  binSize = 5,
): { label: string; count: number }[] {
  const vals = [...degrees.values()];
  if (!vals.length) return [];
  const max = Math.max(...vals);
  const bins: { label: string; count: number }[] = [];
  for (let start = 0; start <= max; start += binSize) {
    const end = start + binSize - 1;
    bins.push({ label: `${start}-${end}`, count: vals.filter((v) => v >= start && v <= end).length });
  }
  return bins;
}

export function topAirports(
  degrees: Map<string, number>,
  graph: GraphData,
  limit = 15,
): { key: string; city: string; degree: number }[] {
  const cityMap = new Map(graph.nodes.map((n) => [n.key, n.attributes.city]));
  return [...degrees.entries()]
    .map(([key, degree]) => ({ key, city: cityMap.get(key) ?? key, degree }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, limit);
}

export function regionalMetrics(
  graph: GraphData,
): { region: string; airports: number; edges: number; density: number }[] {
  const nodesByRegion = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    const r = node.attributes.region;
    if (!nodesByRegion.has(r)) nodesByRegion.set(r, new Set());
    nodesByRegion.get(r)!.add(node.key);
  }
  return [...nodesByRegion.entries()].map(([region, nodes]) => {
    const n = nodes.size;
    const intraEdges = graph.edges.filter((e) => nodes.has(e.source) && nodes.has(e.target)).length;
    const possible = n > 1 ? n * (n - 1) : 1;
    return { region, airports: n, edges: intraEdges, density: intraEdges / possible };
  });
}

export function regionalFlowMatrix(
  graph: GraphData,
): { regions: string[]; matrix: number[][] } {
  const regions = [...new Set(graph.nodes.map((n) => n.attributes.region))].sort();
  const idx = new Map(regions.map((r, i) => [r, i]));
  const matrix = Array.from({ length: regions.length }, () =>
    new Array<number>(regions.length).fill(0),
  );
  const nodeRegion = new Map(graph.nodes.map((n) => [n.key, n.attributes.region]));
  for (const edge of graph.edges) {
    const src = nodeRegion.get(edge.source);
    const dst = nodeRegion.get(edge.target);
    if (src !== undefined && dst !== undefined) {
      matrix[idx.get(src)!][idx.get(dst)!]++;
    }
  }
  return { regions, matrix };
}

export function bfsLevelDistribution(
  bfsResult: BfsResult,
): { level: number; label: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const level of bfsResult.levels.values()) {
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, count]) => ({
      level,
      label: level === 0 ? "Origem" : `Nível ${level}`,
      count,
    }));
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatRouteCost(value: number): string {
  return value.toFixed(4);
}

export function graphDensity(graph: GraphData): number {
  const order = graph.nodes.length;
  if (order < 2) return 0;
  return graph.edges.length / (order * (order - 1));
}

export function degreeConcentration(
  degrees: Map<string, number>,
  limit = 5,
): number {
  const total = [...degrees.values()].reduce((sum, degree) => sum + degree, 0);
  if (total === 0) return 0;

  const topTotal = [...degrees.values()]
    .sort((a, b) => b - a)
    .slice(0, limit)
    .reduce((sum, degree) => sum + degree, 0);

  return topTotal / total;
}

export function dominantDegreeBin(
  distribution: { label: string; count: number }[],
): { label: string; count: number; share: number } | null {
  const total = distribution.reduce((sum, bin) => sum + bin.count, 0);
  if (total === 0) return null;

  const dominant = distribution.reduce((best, bin) =>
    bin.count > best.count ? bin : best,
  );

  return {
    label: dominant.label,
    count: dominant.count,
    share: dominant.count / total,
  };
}

export function strongestRegionalFlow(
  flowData: { regions: string[]; matrix: number[][] },
): { origin: string; destination: string; count: number } | null {
  let strongest: { origin: string; destination: string; count: number } | null = null;

  flowData.matrix.forEach((row, rowIndex) => {
    row.forEach((count, colIndex) => {
      if (!strongest || count > strongest.count) {
        strongest = {
          origin: flowData.regions[rowIndex],
          destination: flowData.regions[colIndex],
          count,
        };
      }
    });
  });

  return strongest;
}

export function reciprocalRouteStats(graph: GraphData): ReciprocityStats {
  const directedEdges = new Set(graph.edges.map((edge) => `${edge.source}->${edge.target}`));
  const reciprocalPairs = new Set<string>();
  let reciprocalEdges = 0;

  for (const edge of graph.edges) {
    if (directedEdges.has(`${edge.target}->${edge.source}`)) {
      reciprocalEdges++;
      reciprocalPairs.add([edge.source, edge.target].sort().join("|"));
    }
  }

  const total = graph.edges.length;
  return {
    reciprocalEdges,
    reciprocalPairs: reciprocalPairs.size,
    oneWayEdges: total - reciprocalEdges,
    reciprocityRate: total === 0 ? 0 : reciprocalEdges / total,
  };
}

export function routeFrequencyStats(graph: GraphData): RouteFrequencyStats {
  const edgesWithFlights = graph.edges
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      flights: edge.attributes.flights,
      weight: edge.attributes.weight,
    }))
    .filter((edge) => Number.isFinite(edge.flights));

  if (edgesWithFlights.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      weakest: null,
      strongest: null,
    };
  }

  const sorted = [...edgesWithFlights].sort((a, b) => a.flights - b.flights);
  const flights = sorted.map((edge) => edge.flights);
  const middle = Math.floor(flights.length / 2);
  const median = flights.length % 2 === 0
    ? (flights[middle - 1] + flights[middle]) / 2
    : flights[middle];
  const total = flights.reduce((sum, flightCount) => sum + flightCount, 0);

  return {
    count: sorted.length,
    average: total / sorted.length,
    median,
    min: sorted[0].flights,
    max: sorted[sorted.length - 1].flights,
    weakest: sorted[0],
    strongest: sorted[sorted.length - 1],
  };
}

export function routeFrequencyDistribution(
  graph: GraphData,
  binSize = 100,
): { label: string; count: number }[] {
  const flightCounts = graph.edges
    .map((edge) => edge.attributes.flights)
    .filter((flights) => Number.isFinite(flights));

  if (flightCounts.length === 0) return [];

  const max = Math.max(...flightCounts);
  const bins: { label: string; count: number }[] = [];

  for (let start = 0; start <= max; start += binSize) {
    const end = start + binSize - 1;
    bins.push({
      label: `${start}-${end}`,
      count: flightCounts.filter((flights) => flights >= start && flights <= end).length,
    });
  }

  return bins.filter((bin) => bin.count > 0);
}

export function regionalFlowBalance(
  flowData: { regions: string[]; matrix: number[][] },
): { internal: number; external: number; internalShare: number } {
  let internal = 0;
  let external = 0;

  flowData.matrix.forEach((row, rowIndex) => {
    row.forEach((count, colIndex) => {
      if (rowIndex === colIndex) internal += count;
      else external += count;
    });
  });

  const total = internal + external;
  return {
    internal,
    external,
    internalShare: total === 0 ? 0 : internal / total,
  };
}

export function regionalFlowSummary(graph: GraphData): RegionalFlowSummary[] {
  const regions = [...new Set(graph.nodes.map((n) => n.attributes.region))].sort();
  const summary = new Map<string, RegionalFlowSummary>(
    regions.map((region) => [
      region,
      {
        region,
        incoming: 0,
        outgoing: 0,
        internal: 0,
        externalIn: 0,
        externalOut: 0,
        netExternal: 0,
      },
    ]),
  );
  const nodeRegion = new Map(graph.nodes.map((n) => [n.key, n.attributes.region]));

  for (const edge of graph.edges) {
    const sourceRegion = nodeRegion.get(edge.source);
    const targetRegion = nodeRegion.get(edge.target);
    if (!sourceRegion || !targetRegion) continue;

    const source = summary.get(sourceRegion)!;
    const target = summary.get(targetRegion)!;
    source.outgoing++;
    target.incoming++;

    if (sourceRegion === targetRegion) {
      source.internal++;
    } else {
      source.externalOut++;
      target.externalIn++;
    }
  }

  return [...summary.values()].map((item) => ({
    ...item,
    netExternal: item.externalOut - item.externalIn,
  }));
}

export function lowConnectivityAirports(
  graph: GraphData,
  limit = 10,
): DirectionalDegreeRecord[] {
  return directionalDegreeRecords(graph)
    .filter((record) => record.totalDegree > 0)
    .sort((a, b) => a.totalDegree - b.totalDegree || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function topDegreeImbalances(
  graph: GraphData,
  limit = 12,
): DirectionalDegreeRecord[] {
  return directionalDegreeRecords(graph)
    .sort((a, b) => b.absBalance - a.absBalance || b.totalDegree - a.totalDegree)
    .slice(0, limit);
}

export function networkInsightCards(graph: GraphData): InsightCardData[] {
  const outDegrees = computeOutDegrees(graph);
  const inDegrees = computeInDegrees(graph);
  const topOut = topAirports(outDegrees, graph, 1)[0];
  const topIn = topAirports(inDegrees, graph, 1)[0];
  const concentration = degreeConcentration(outDegrees, 5);

  return [
    {
      label: "Escala da rede",
      value: `${graph.nodes.length} nós`,
      detail: `${graph.edges.length} conexões direcionadas; densidade ${graphDensity(graph).toFixed(4)}.`,
      tone: "blue",
    },
    {
      label: "Maior emissor",
      value: topOut ? topOut.key : "-",
      detail: topOut ? `${topOut.city}, com ${topOut.degree} conexões de saída.` : "Sem conexões de saída.",
      tone: "green",
    },
    {
      label: "Maior receptor",
      value: topIn ? topIn.key : "-",
      detail: topIn ? `${topIn.city}, com ${topIn.degree} conexões de entrada.` : "Sem conexões de entrada.",
      tone: "purple",
    },
    {
      label: "Concentração",
      value: formatPercent(concentration),
      detail: "Participação dos 5 maiores hubs no total de conexões de saída.",
      tone: "orange",
    },
  ];
}
