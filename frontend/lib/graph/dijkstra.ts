import type { GraphData } from "./types";

export type DijkstraResult = {
  originKey: string;
  destKey: string | null;
  dist: Map<string, number>;
  prev: Map<string, string | null>;
};

export function runDijkstra(graph: GraphData, originKey: string): Pick<DijkstraResult, "dist" | "prev"> {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const node of graph.nodes) {
    dist.set(node.key, Infinity);
    prev.set(node.key, null);
    unvisited.add(node.key);
  }
  dist.set(originKey, 0);

  const adj = new Map<string, { target: string; weight: number }[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push({ target: edge.target, weight: edge.attributes.weight });
  }

  while (unvisited.size > 0) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const key of unvisited) {
      const d = dist.get(key)!;
      if (d < minDist) { minDist = d; u = key; }
    }
    if (u === null || minDist === Infinity) break;
    unvisited.delete(u);

    for (const { target, weight } of (adj.get(u) ?? [])) {
      if (!unvisited.has(target)) continue;
      const alt = dist.get(u)! + weight;
      if (alt < dist.get(target)!) {
        dist.set(target, alt);
        prev.set(target, u);
      }
    }
  }

  return { dist, prev };
}

export function getPath(prev: Map<string, string | null>, destKey: string): string[] {
  const path: string[] = [];
  let curr: string | null = destKey;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev.get(curr) ?? null;
  }
  return path;
}

export function getHighlightedEdges(
  prev: Map<string, string | null>,
  destKey: string | null
): Set<string> {
  const edges = new Set<string>();
  if (destKey) {
    let curr: string | null = destKey;
    while (curr !== null) {
      const p = prev.get(curr) ?? null;
      if (p !== null) edges.add(`${p}-${curr}`);
      curr = p;
    }
  } else {
    for (const [v, u] of prev.entries()) {
      if (u !== null) edges.add(`${u}-${v}`);
    }
  }
  return edges;
}
