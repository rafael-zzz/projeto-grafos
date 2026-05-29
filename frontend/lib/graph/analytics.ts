import type { GraphData } from "./types";
import type { BfsResult } from "./bfs";

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
