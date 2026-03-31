import type { UndirectedGraph } from "graphology";

/**
 * Verifica se o grafo não-direcionado é conexo (um único componente).
 */
export function assertGraphConnected(graph: UndirectedGraph): void {
  const nodes = graph.nodes();
  if (nodes.length === 0) {
    throw new Error("Grafo vazio.");
  }
  const start = nodes[0];
  const visited = new Set<string>();
  const stack: string[] = [start];
  while (stack.length > 0) {
    const u = stack.pop()!;
    if (visited.has(u)) continue;
    visited.add(u);
    graph.forEachNeighbor(u, (v) => {
      if (!visited.has(v)) stack.push(v);
    });
  }
  if (visited.size !== nodes.length) {
    throw new Error(
      "Grafo desconexo: existem aeroportos sem caminho entre si. Ajuste o CSV de adjacências.",
    );
  }
}
