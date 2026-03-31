import type { AdjacencyRow, AirportNode } from "../types";

export function validateEdgesAgainstNodes(
  nodes: AirportNode[],
  edges: AdjacencyRow[],
): void {
  const ids = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    const o = e.origem.toUpperCase();
    const d = e.destino.toUpperCase();
    if (!ids.has(o)) {
      throw new Error(`Aresta referencia origem inexistente: ${o}`);
    }
    if (!ids.has(d)) {
      throw new Error(`Aresta referencia destino inexistente: ${d}`);
    }
    if (o === d) {
      throw new Error(`Self-loop não permitido: ${o}`);
    }
  }
}
