import type { GraphData, GraphNode, GraphEdge } from "@/lib/graph/types";

let edgeId = 0;

function node(key: string): GraphNode {
  return {
    key,
    attributes: { label: key, city: key, region: "R1", x: 0, y: 0, size: 6, color: "#000" },
  };
}

function edge(source: string, target: string, weight: number): GraphEdge {
  return {
    key: `${source}-${target}-${edgeId++}`,
    source,
    target,
    attributes: { weight, connection_type: "test", flights: 1, size: 1, color: "#000" },
  };
}

export function buildGraph(
  nodeKeys: string[],
  edges: [string, string, number][],
): GraphData {
  edgeId = 0;
  return {
    nodes: nodeKeys.map(node),
    edges: edges.map(([s, t, w]) => edge(s, t, w)),
  };
}
