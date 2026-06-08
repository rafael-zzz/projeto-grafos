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
  // Iterative DFS with explicit stack — recursion blows for large depths
  const stack: { node: string; depth: number }[] = [{ node: originKey, depth: 0 }];
  let counter = 0;
  while (stack.length > 0) {
    const { node: u, depth: d } = stack.pop()!;
    if (d >= maxDepth) continue;
    const neighbors = adj.get(u) ?? [];
    // Push reversed so traversal order matches recursive DFS
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
