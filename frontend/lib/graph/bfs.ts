import type { GraphData } from "./types";

export type BfsResult = {
  originKey: string;
  levels: Map<string, number>;
  prev: Map<string, string | null>;
  maxLevel: number;
};

export function runBfs(graph: GraphData, originKey: string): BfsResult {
  const levels = new Map<string, number>();
  const prev = new Map<string, string | null>();

  levels.set(originKey, 0);
  prev.set(originKey, null);

  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const queue: string[] = [originKey];
  while (queue.length > 0) {
    const u = queue.shift()!;
    const level = levels.get(u)!;
    for (const v of adj.get(u) ?? []) {
      if (!levels.has(v)) {
        levels.set(v, level + 1);
        prev.set(v, u);
        queue.push(v);
      }
    }
  }

  const maxLevel = levels.size > 1 ? Math.max(...levels.values()) : 0;
  return { originKey, levels, prev, maxLevel };
}

export function getBfsTreeEdges(prev: Map<string, string | null>): Set<string> {
  const edges = new Set<string>();
  for (const [v, u] of prev.entries()) {
    if (u !== null) edges.add(`${u}-${v}`);
  }
  return edges;
}

const LEVEL_COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

export function bfsLevelColor(level: number, _maxLevel: number): string {
  if (level === 0) return "#f59e0b"; // amber — origem
  return LEVEL_COLORS[(level - 1) % LEVEL_COLORS.length];
}
