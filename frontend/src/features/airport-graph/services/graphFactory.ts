import { UndirectedGraph } from "graphology";
import type { AdjacencyRow, AirportNode } from "../types";
import { REGION_COLORS } from "../constants/regionStyles";
import { assertGraphConnected } from "./graphConnectivity";

const DEFAULT_NODE_SIZE = 12;
const EDGE_BASE = 2;

function regionAnchor(regiao: string): { x: number; y: number } {
  const map: Record<string, { x: number; y: number }> = {
    Nordeste: { x: 0.12, y: 0.22 },
    Sudeste: { x: 0.52, y: 0.48 },
    "Centro-Oeste": { x: 0.38, y: 0.62 },
    Sul: { x: 0.72, y: 0.72 },
    Norte: { x: 0.28, y: 0.12 },
  };
  return map[regiao] ?? { x: 0.5, y: 0.5 };
}

/**
 * Posiciona nós por região (ancoragem + pequeno deslocamento) para leitura geográfica aproximada.
 */
function applyRegionalLayout(
  graph: UndirectedGraph,
  nodes: AirportNode[],
): void {
  const byRegion = new Map<string, AirportNode[]>();
  for (const n of nodes) {
    const list = byRegion.get(n.regiao) ?? [];
    list.push(n);
    byRegion.set(n.regiao, list);
  }
  for (const [, list] of byRegion) {
    const anchor = regionAnchor(list[0].regiao);
    const n = list.length;
    list.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(n, 1);
      const r = 0.06 + (i % 3) * 0.015;
      graph.setNodeAttribute(node.id, "x", anchor.x + Math.cos(angle) * r);
      graph.setNodeAttribute(node.id, "y", anchor.y + Math.sin(angle) * r);
    });
  }
}

function edgeColor(tipo: string): string {
  if (tipo === "regional") return "#64748b";
  if (tipo === "hub") return "#dc2626";
  if (tipo === "curta_distancia") return "#7c3aed";
  return "#94a3b8";
}

export function buildAirportGraph(
  nodes: AirportNode[],
  edges: AdjacencyRow[],
): UndirectedGraph {
  const graph = new UndirectedGraph();

  for (const node of nodes) {
    const color = REGION_COLORS[node.regiao] ?? "#6b7280";
    graph.addNode(node.id, {
      label: node.label,
      cidade: node.cidade,
      regiao: node.regiao,
      size: DEFAULT_NODE_SIZE,
      color,
    });
  }

  for (const e of edges) {
    const u = e.origem.toUpperCase();
    const v = e.destino.toUpperCase();
    if (graph.hasEdge(u, v)) {
      throw new Error(`Aresta duplicada entre ${u} e ${v}`);
    }
    graph.addEdge(u, v, {
      tipo_conexao: e.tipo_conexao,
      justificativa: e.justificativa,
      peso: e.peso,
      size: EDGE_BASE + e.peso,
      color: edgeColor(e.tipo_conexao),
      label: `${e.tipo_conexao} (${e.peso})`,
    });
  }

  applyRegionalLayout(graph, nodes);
  assertGraphConnected(graph);
  return graph;
}
