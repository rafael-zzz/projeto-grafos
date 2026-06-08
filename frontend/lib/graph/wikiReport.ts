import type { GraphData } from "./types";

export type RunReport = {
  elapsedMs: number;
  reachable: number;
  maxLevel: number;
  memBaselineMB: number | null;
  memPeakMB: number | null;
  memAverageMB: number | null;
  memSupported: boolean;
};

export type DijkstraReport = {
  elapsedMs: number;
  origin: string;
  destination: string;
  cost: number | null;
  path: string[];
  memBaselineMB: number | null;
  memPeakMB: number | null;
  memSupported: boolean;
};

export type BellmanFordReport = {
  elapsedMs: number;
  origin: string;
  destination: string;
  cost: number | null;
  path: string[];
  negativeCycle: boolean;
  memBaselineMB: number | null;
  memPeakMB: number | null;
  memSupported: boolean;
};

type ChromeMemory = { usedJSHeapSize: number };
type PerfWithMemory = Performance & { memory?: ChromeMemory };

function getMemory(): ChromeMemory | null {
  const perf = performance as PerfWithMemory;
  return perf.memory && typeof perf.memory.usedJSHeapSize === "number"
    ? perf.memory
    : null;
}

const SAMPLE_EVERY = 50;

function buildAdj(graph: GraphData): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }
  return adj;
}

function summarize(
  elapsedMs: number,
  levels: Map<string, number>,
  baseline: number | null,
  samples: number[],
  memSupported: boolean,
): RunReport {
  const maxLevel = levels.size > 1 ? Math.max(...levels.values()) : 0;
  const peak = samples.length ? Math.max(...samples) : null;
  const avg = samples.length
    ? samples.reduce((a, b) => a + b, 0) / samples.length
    : null;
  const toMB = (n: number | null) =>
    n === null ? null : Math.round((n / (1024 * 1024)) * 100) / 100;
  return {
    elapsedMs,
    reachable: levels.size,
    maxLevel,
    memBaselineMB: toMB(baseline),
    memPeakMB: toMB(peak),
    memAverageMB: toMB(avg),
    memSupported,
  };
}

export function timedBfs(
  graph: GraphData,
  originKey: string,
  maxDepth: number,
): RunReport {
  const adj = buildAdj(graph);
  const memory = getMemory();
  const memSupported = memory !== null;
  const baseline = memory?.usedJSHeapSize ?? null;
  const samples: number[] = [];

  const levels = new Map<string, number>();
  levels.set(originKey, 0);

  const start = performance.now();
  const queue: string[] = [originKey];
  let head = 0;
  let counter = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const level = levels.get(u)!;
    if (level >= maxDepth) continue;
    for (const v of adj.get(u) ?? []) {
      if (!levels.has(v)) {
        levels.set(v, level + 1);
        queue.push(v);
      }
    }
    if (memory && ++counter % SAMPLE_EVERY === 0) {
      samples.push(memory.usedJSHeapSize);
    }
  }
  if (memory) samples.push(memory.usedJSHeapSize);
  const elapsedMs = performance.now() - start;

  return summarize(elapsedMs, levels, baseline, samples, memSupported);
}

export function timedDfs(
  graph: GraphData,
  originKey: string,
  maxDepth: number,
): RunReport {
  const adj = buildAdj(graph);
  const memory = getMemory();
  const memSupported = memory !== null;
  const baseline = memory?.usedJSHeapSize ?? null;
  const samples: number[] = [];

  const levels = new Map<string, number>();
  levels.set(originKey, 0);

  const start = performance.now();
  const stack: { node: string; depth: number }[] = [{ node: originKey, depth: 0 }];
  let counter = 0;
  while (stack.length > 0) {
    const { node: u, depth: d } = stack.pop()!;
    if (d >= maxDepth) continue;
    const neighbors = adj.get(u) ?? [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const v = neighbors[i];
      if (!levels.has(v)) {
        levels.set(v, d + 1);
        stack.push({ node: v, depth: d + 1 });
      }
    }
    if (memory && ++counter % SAMPLE_EVERY === 0) {
      samples.push(memory.usedJSHeapSize);
    }
  }
  if (memory) samples.push(memory.usedJSHeapSize);
  const elapsedMs = performance.now() - start;

  return summarize(elapsedMs, levels, baseline, samples, memSupported);
}

export function timedDijkstra(
  graph: GraphData,
  originKey: string,
  destinationKey: string,
): DijkstraReport {
  const memory = getMemory();
  const memSupported = memory !== null;
  const baseline = memory?.usedJSHeapSize ?? null;
  const toMB = (n: number | null) =>
    n === null ? null : Math.round((n / (1024 * 1024)) * 100) / 100;

  const dist = new Map<string, number>(graph.nodes.map((n) => [n.key, Infinity]));
  const prev = new Map<string, string | null>(graph.nodes.map((n) => [n.key, null]));
  const visited = new Set<string>();
  dist.set(originKey, 0);

  // Adjacency with weights
  const adj = new Map<string, { target: string; weight: number }[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push({ target: edge.target, weight: edge.attributes.weight ?? 1 });
  }

  const start = performance.now();

  while (true) {
    // Pick unvisited node with smallest distance
    let u: string | null = null;
    let minDist = Infinity;
    for (const [k, d] of dist) {
      if (!visited.has(k) && d < minDist) { minDist = d; u = k; }
    }
    if (u === null || u === destinationKey) break;
    visited.add(u);
    for (const { target, weight } of adj.get(u) ?? []) {
      const newDist = minDist + weight;
      if (newDist < (dist.get(target) ?? Infinity)) {
        dist.set(target, newDist);
        prev.set(target, u);
      }
    }
  }

  const elapsedMs = performance.now() - start;
  const peak = memory?.usedJSHeapSize ?? null;
  const rawCost = dist.get(destinationKey) ?? Infinity;
  const cost = rawCost === Infinity ? null : rawCost;
  const path: string[] = [];

  if (cost !== null) {
    let cur: string | null = destinationKey;
    while (cur !== null) {
      path.unshift(cur);
      if (cur === originKey) break;
      cur = prev.get(cur) ?? null;
    }
  }

  return {
    elapsedMs,
    origin: originKey,
    destination: destinationKey,
    cost,
    path,
    memBaselineMB: toMB(baseline),
    memPeakMB: toMB(peak),
    memSupported,
  };
}

export function timedBellmanFord(
  graph: GraphData,
  originKey: string,
  destinationKey: string,
): BellmanFordReport {
  const memory = getMemory();
  const memSupported = memory !== null;
  const baseline = memory?.usedJSHeapSize ?? null;
  const toMB = (n: number | null) =>
    n === null ? null : Math.round((n / (1024 * 1024)) * 100) / 100;

  const nodes = graph.nodes.map((n) => n.key);
  const dist = new Map<string, number>(nodes.map((k) => [k, Infinity]));
  const prev = new Map<string, string | null>(nodes.map((k) => [k, null]));
  dist.set(originKey, 0);

  const start = performance.now();
  const n = nodes.length;
  let negativeCycle = false;

  for (let i = 0; i < n - 1; i++) {
    let updated = false;
    for (const edge of graph.edges) {
      const d = dist.get(edge.source);
      if (d === undefined || d === Infinity) continue;
      const newDist = d + (edge.attributes.weight ?? 1);
      if (newDist < (dist.get(edge.target) ?? Infinity)) {
        dist.set(edge.target, newDist);
        prev.set(edge.target, edge.source);
        updated = true;
      }
    }
    if (!updated) break;
  }

  for (const edge of graph.edges) {
    const d = dist.get(edge.source);
    if (d !== undefined && d !== Infinity) {
      if (d + (edge.attributes.weight ?? 1) < (dist.get(edge.target) ?? Infinity)) {
        negativeCycle = true;
        break;
      }
    }
  }

  const elapsedMs = performance.now() - start;
  const peak = memory?.usedJSHeapSize ?? null;
  const rawCost = dist.get(destinationKey) ?? Infinity;
  const cost = rawCost === Infinity ? null : rawCost;
  const path: string[] = [];

  if (!negativeCycle && cost !== null) {
    let cur: string | null = destinationKey;
    while (cur !== null) {
      path.unshift(cur);
      if (cur === originKey) break;
      cur = prev.get(cur) ?? null;
    }
  }

  return {
    elapsedMs,
    origin: originKey,
    destination: destinationKey,
    cost,
    path,
    negativeCycle,
    memBaselineMB: toMB(baseline),
    memPeakMB: toMB(peak),
    memSupported,
  };
}
