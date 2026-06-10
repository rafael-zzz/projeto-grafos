"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  WikiGraphData, WikiNode, WikiEdge,
  WikiAdjacency, WikiPagesData,
} from "./wiki_types";
import {
  MAX_RENDERED_NODES_DEFAULT,
  MAX_DEPTH_DEFAULT,
} from "../../wiki_constants";

export type Algorithm = "bfs" | "dfs" | "ego" | "bf";

export type WikiGraphState = {
  subgraph: WikiGraphData | null;
  traversalOrder: string[];
  bfsGhostOrder: string[];
  nodeKeys: string[];
  loaded: boolean;
  seed: string;
  setSeed: (s: string) => void;
  depth: number;
  setDepth: (d: number) => void;
  maxNodes: number;
  setMaxNodes: (n: number) => void;
  algorithm: Algorithm;
  setAlgorithm: (a: Algorithm) => void;
  bfDest: string;
  setBfDest: (d: string) => void;
  hitNodeCap: boolean;
};

const DEFAULT_SEED = "Chess";

function resolveSeed(seed: string, pages: WikiPagesData): string {
  const trimmed = seed.trim();
  if (trimmed && pages[trimmed] !== undefined) return trimmed;

  const normalized = trimmed.toLocaleLowerCase();
  if (normalized) {
    const match = Object.keys(pages).find((key) => key.toLocaleLowerCase() === normalized);
    if (match) return match;
  }

  return DEFAULT_SEED;
}

function fibonacciSphere(n: number): [number, number, number][] {
  const golden = (1 + Math.sqrt(5)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const theta = 2 * Math.PI * i / golden;
    const phi   = Math.acos(1 - 2 * (i + 0.5) / n);
    return [
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
    ] as [number, number, number];
  });
}

function bfsTraverse(seed: string, maxDepth: number, maxNodes: number, adj: WikiAdjacency): Map<string, number> {
  const visited = new Map<string, number>();
  visited.set(seed, 0);
  const queue: [string, number][] = [[seed, 0]];
  while (queue.length > 0 && visited.size < maxNodes) {
    const [node, depth] = queue.shift()!;
    if (depth >= maxDepth) continue;
    for (const nb of (adj[node] ?? [])) {
      if (!visited.has(nb)) {
        visited.set(nb, depth + 1);
        if (visited.size < maxNodes) queue.push([nb, depth + 1]);
      }
    }
  }
  return visited;
}

function dfsTraverse(seed: string, maxDepth: number, maxNodes: number, adj: WikiAdjacency): Map<string, number> {
  const visited = new Map<string, number>();
  const seen    = new Set<string>([seed]);
  const stack: [string, number][] = [[seed, 0]];

  while (stack.length > 0 && visited.size < maxNodes) {
    const [node, depth] = stack.pop()!;
    visited.set(node, depth);
    if (depth >= maxDepth) continue;
    for (const nb of (adj[node] ?? [])) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push([nb, depth + 1]);
      }
    }
  }
  return visited;
}

function egoTraverse(seed: string, maxDepth: number, maxNodes: number, adj: WikiAdjacency): Map<string, number> {
  const visited = new Map<string, number>();
  visited.set(seed, 0);

  const level1 = [...(adj[seed] ?? [])]
    .sort((a, b) => (adj[b]?.length ?? 0) - (adj[a]?.length ?? 0));

  if (maxDepth >= 1) {
    for (const nb of level1) {
      if (visited.size >= maxNodes) break;
      visited.set(nb, 1);
    }
  }

  if (maxDepth > 1) {
    const queue: [string, number][] = [...visited.keys()]
      .filter((k) => k !== seed)
      .map((k) => [k, 1]);
    while (queue.length > 0 && visited.size < maxNodes) {
      const [node, d] = queue.shift()!;
      if (d >= maxDepth) continue;
      const nbs = [...(adj[node] ?? [])]
        .sort((a, b) => (adj[b]?.length ?? 0) - (adj[a]?.length ?? 0));
      for (const nb of nbs) {
        if (!visited.has(nb) && visited.size < maxNodes) {
          visited.set(nb, d + 1);
          queue.push([nb, d + 1]);
        }
      }
    }
  }
  return visited;
}

// BELLMAN-FORD
function bfTraverse(seed: string, dest: string, adj: WikiAdjacency, pages: WikiPagesData): Map<string, number> {
  const visited = new Map<string, number>();
  if (!dest || dest === seed) {
    visited.set(seed, 0);
    return visited;
  }

  const distances = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const hops = new Map<string, number>();

  let queue: { node: string, dist: number, hop: number }[] = [{ node: seed, dist: 0, hop: 0 }];
  const MAX_HOPS = 15;

  distances.set(seed, 0);
  hops.set(seed, 0);

  let iterations = 0;
  const MAX_ITERATIONS = 50000;

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const current = queue.shift()!;
    const u = current.node;

    iterations++;
    if (iterations > MAX_ITERATIONS) break;
    if (u === dest) break;

    const currentHop = current.hop;
    if (currentHop >= MAX_HOPS) continue;

    const distU = distances.get(u)!;
    if (distU < current.dist) continue;

    for (const v of (adj[u] ?? [])) {
      const vScore = (pages[v] as any)?.distrust_score ?? 50.0;

      const weight = 1.0 + vScore;
      const newDist = distU + weight;
      const currentVDist = distances.get(v) ?? Infinity;

      if (newDist < currentVDist) {
        distances.set(v, newDist);
        prev.set(v, u);
        hops.set(v, currentHop + 1);

        queue.push({ node: v, dist: newDist, hop: currentHop + 1 });
      }
    }
  }

  if ((distances.get(dest) ?? Infinity) === Infinity) {
    visited.set(seed, 0);
    return visited;
  }
  const path: string[] = [];
  let cur: string | null = dest;
  const pathSet = new Set<string>();

  while (cur !== null) {
    if (pathSet.has(cur)) break;
    path.unshift(cur);
    pathSet.add(cur);
    if (cur === seed) break;
    cur = prev.get(cur) ?? null;
  }

  if (path.length > 0 && path[0] !== seed) {
    path.unshift(seed);
  }

  path.forEach((k, i) => visited.set(k, i));
  return visited;
}

function buildSubgraph(
  seed: string, depth: number, maxNodes: number, algorithm: Algorithm,
  adj: WikiAdjacency, pages: WikiPagesData, bfDest: string,
): { graph: WikiGraphData; traversalOrder: string[]; bfsGhostOrder: string[] } {
  const effectiveSeed = resolveSeed(seed, pages);

  const visited = algorithm === "bfs"
    ? bfsTraverse(effectiveSeed, depth, maxNodes, adj)
    : algorithm === "dfs"
    ? dfsTraverse(effectiveSeed, depth, maxNodes, adj)
    : algorithm === "bf"
    ? bfTraverse(effectiveSeed, bfDest.trim(), adj, pages)
    : egoTraverse(effectiveSeed, depth, maxNodes, adj);

  const traversalOrder = [...visited.keys()];
  const nodeSet = new Set(traversalOrder);

  let bfsGhostOrder: string[] = [];
  let positionOrder: string[] | null = null;
  if (algorithm === "dfs") {
    const bfsVisited = bfsTraverse(effectiveSeed, depth, maxNodes, adj);
    const bfsInSubgraph = [...bfsVisited.keys()].filter((k) => nodeSet.has(k));
    bfsGhostOrder = bfsInSubgraph;
    const dfsOnly = traversalOrder.filter((k) => !bfsVisited.has(k));
    positionOrder = [...bfsInSubgraph, ...dfsOnly];
  }

  const degrees = new Map<string, number>([...nodeSet].map((k) => [k, 0]));
  const edges: WikiEdge[] = [];
  let ei = 0;
  for (const src of nodeSet) {
    for (const tgt of (adj[src] ?? [])) {
      if (nodeSet.has(tgt)) {
        const tgtScore = (pages[tgt] as any)?.distrust_score ?? 0;
        edges.push({ key: `e${ei++}`, source: src, target: tgt, attributes: { weight: 1.0 + tgtScore } });
        degrees.set(src, (degrees.get(src) ?? 0) + 1);
        degrees.set(tgt, (degrees.get(tgt) ?? 0) + 1);
      }
    }
  }

  const degVals      = [...degrees.values()];
  const minDeg       = Math.min(...degVals, 0);
  const maxDeg       = Math.max(...degVals, 1);
  const nodeList     = [...visited.keys()];
  const posList      = positionOrder ?? nodeList;
  const positions    = fibonacciSphere(Math.max(posList.length, 1));
  const positionIdx  = new Map(posList.map((key, i) => [key, i]));

  const nodes: WikiNode[] = nodeList.map((key) => {
    const meta = pages[key] ?? { word_count: 0, url: "", categories: [] };
    const deg  = degrees.get(key) ?? 0;
    const size = 2 + 12 * (deg - minDeg) / (maxDeg - minDeg + 1e-9);
    const [x, y, z] = positions[positionIdx.get(key) ?? 0];
    return {
      key,
      attributes: {
        label: key, title: key,
        url: meta.url,
        word_count: meta.word_count,
        categories: meta.categories,
        distrust_score: (meta as any).distrust_score ?? 0,
        x: parseFloat(x.toFixed(5)),
        y: parseFloat(y.toFixed(5)),
        z: parseFloat(z.toFixed(5)),
        size: parseFloat(size.toFixed(2)),
      },
    };
  });

  return { graph: { nodes, edges }, traversalOrder, bfsGhostOrder };
}

export function useWikiGraph(): WikiGraphState {
  const [adj,       setAdj]       = useState<WikiAdjacency | null>(null);
  const [pagesData, setPagesData] = useState<WikiPagesData | null>(null);
  const [seed,      setSeed]      = useState(DEFAULT_SEED);
  const [depth,     setDepth]     = useState(MAX_DEPTH_DEFAULT);
  const [maxNodes,  setMaxNodes]  = useState(MAX_RENDERED_NODES_DEFAULT);
  const [algorithm, setAlgorithm] = useState<Algorithm>("bfs");
  const [bfDest,    setBfDest]    = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/wiki_adjacency.json").then((r) => r.json()),
      fetch("/wiki_pages.json").then((r) => r.json()),
    ]).then(([a, p]: [WikiAdjacency, WikiPagesData]) => {
      setAdj(a);
      setPagesData(p);
    });
  }, []);

  const nodeKeys = useMemo(
    () => pagesData ? Object.keys(pagesData).sort() : [],
    [pagesData],
  );

  const result = useMemo(() => {
    if (!adj || !pagesData) return null;
    return buildSubgraph(seed, depth, maxNodes, algorithm, adj, pagesData, bfDest);
  }, [adj, pagesData, seed, depth, maxNodes, algorithm, bfDest]);

  const hitNodeCap = result !== null && result.graph.nodes.length >= maxNodes;

  return {
    subgraph: result?.graph ?? null,
    traversalOrder: result?.traversalOrder ?? [],
    bfsGhostOrder: result?.bfsGhostOrder ?? [],
    nodeKeys, loaded: !!adj && !!pagesData,
    seed, setSeed, depth, setDepth,
    maxNodes, setMaxNodes, algorithm, setAlgorithm,
    bfDest, setBfDest,
    hitNodeCap,
  };
}