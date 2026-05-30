"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  WikiGraphData, WikiNode, WikiEdge,
  WikiAdjacency, WikiPagesData,
} from "./wiki_types";

export type Algorithm = "bfs" | "dfs" | "ego";

export type WikiGraphState = {
  subgraph: WikiGraphData | null;
  traversalOrder: string[];
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
  hitNodeCap: boolean;
};

const DEFAULT_SEED = "Chess";

// ─── Fibonacci sphere (same math as Python layout_builder.py) ────────────────
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

// ─── Traversals ───────────────────────────────────────────────────────────────
function bfsTraverse(
  seed: string, maxDepth: number, maxNodes: number, adj: WikiAdjacency,
): Map<string, number> {
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

function dfsTraverse(
  seed: string, maxDepth: number, maxNodes: number, adj: WikiAdjacency,
): Map<string, number> {
  const visited = new Map<string, number>();
  visited.set(seed, 0);
  const stack: [string, number][] = [[seed, 0]];
  while (stack.length > 0 && visited.size < maxNodes) {
    const [node, depth] = stack.pop()!;
    if (depth >= maxDepth) continue;
    for (const nb of (adj[node] ?? [])) {
      if (!visited.has(nb)) {
        visited.set(nb, depth + 1);
        if (visited.size < maxNodes) stack.push([nb, depth + 1]);
      }
    }
  }
  return visited;
}

// Ego network: seed first, then alters sorted by degree (most connected first),
// then deeper levels if maxDepth > 1. Sorting by degree makes hub structure
// visible in the animation — highest-degree alters appear before peripheral ones.
function egoTraverse(
  seed: string, maxDepth: number, maxNodes: number, adj: WikiAdjacency,
): Map<string, number> {
  const visited = new Map<string, number>();
  visited.set(seed, 0);

  // Level 1: direct neighbors sorted by out-degree descending
  const level1 = [...(adj[seed] ?? [])]
    .sort((a, b) => (adj[b]?.length ?? 0) - (adj[a]?.length ?? 0));

  for (const nb of level1) {
    if (visited.size >= maxNodes) break;
    visited.set(nb, 1);
  }

  // Deeper levels via BFS from level-1 nodes, also sorted by degree
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


function buildSubgraph(
  seed: string,
  depth: number,
  maxNodes: number,
  algorithm: Algorithm,
  adj: WikiAdjacency,
  pages: WikiPagesData,
): { graph: WikiGraphData; traversalOrder: string[] } {
  const effectiveSeed = pages[seed] !== undefined ? seed : DEFAULT_SEED;

  const visited = algorithm === "bfs"
    ? bfsTraverse(effectiveSeed, depth, maxNodes, adj)
    : algorithm === "dfs"
    ? dfsTraverse(effectiveSeed, depth, maxNodes, adj)
    : egoTraverse(effectiveSeed, depth, maxNodes, adj);

  // Insertion order of visited Map = discovery order = animation sequence
  const traversalOrder = [...visited.keys()];
  const nodeSet = new Set(traversalOrder);

  // Build edge list + compute degrees in one pass
  const degrees = new Map<string, number>([...nodeSet].map((k) => [k, 0]));
  const edges: WikiEdge[] = [];
  let ei = 0;
  for (const src of nodeSet) {
    for (const tgt of (adj[src] ?? [])) {
      if (nodeSet.has(tgt)) {
        edges.push({ key: `e${ei++}`, source: src, target: tgt, attributes: { weight: 1 } });
        degrees.set(src, (degrees.get(src) ?? 0) + 1);
        degrees.set(tgt, (degrees.get(tgt) ?? 0) + 1);
      }
    }
  }

  const degVals  = [...degrees.values()];
  const minDeg   = Math.min(...degVals, 0);
  const maxDeg   = Math.max(...degVals, 1);
  const nodeList = [...visited.keys()];
  const positions = fibonacciSphere(Math.max(nodeList.length, 1));

  const nodes: WikiNode[] = nodeList.map((key, i) => {
    const meta = pages[key] ?? { word_count: 0, url: "", categories: [] };
    const deg  = degrees.get(key) ?? 0;
    const size = 2 + 12 * (deg - minDeg) / (maxDeg - minDeg + 1e-9);
    const [x, y, z] = positions[i];
    return {
      key,
      attributes: {
        label: key, title: key,
        url: meta.url,
        word_count: meta.word_count,
        categories: meta.categories,
        x: parseFloat(x.toFixed(5)),
        y: parseFloat(y.toFixed(5)),
        z: parseFloat(z.toFixed(5)),
        size: parseFloat(size.toFixed(2)),
      },
    };
  });

  return { graph: { nodes, edges }, traversalOrder };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWikiGraph(): WikiGraphState {
  const [adj,       setAdj]       = useState<WikiAdjacency | null>(null);
  const [pagesData, setPagesData] = useState<WikiPagesData | null>(null);
  const [seed,      setSeed]      = useState(DEFAULT_SEED);
  const [depth,     setDepth]     = useState(3);
  const [maxNodes,  setMaxNodes]  = useState(800);
  const [algorithm, setAlgorithm] = useState<Algorithm>("bfs");

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
    return buildSubgraph(seed, depth, maxNodes, algorithm, adj, pagesData);
  }, [adj, pagesData, seed, depth, maxNodes, algorithm]);

  const hitNodeCap = result !== null && result.graph.nodes.length >= maxNodes;

  return {
    subgraph: result?.graph ?? null,
    traversalOrder: result?.traversalOrder ?? [],
    nodeKeys, loaded: !!adj && !!pagesData,
    seed, setSeed, depth, setDepth,
    maxNodes, setMaxNodes, algorithm, setAlgorithm,
    hitNodeCap,
  };
}
