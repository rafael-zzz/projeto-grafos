import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from parte2.io import load_wiki_graph
from graphs.algorithms import Dijkstra



def run_dijkstra(origin_id: str, destination_id: str) -> None:
    graph = load_wiki_graph()
    print(f"  {len(graph.nodes)} nós | {sum(len(n.edges) for n in graph.nodes.values())} arestas\n")

    if origin_id not in graph.nodes:
        print(f"Nó de origem '{origin_id}' não encontrado.")
        return
    if destination_id not in graph.nodes:
        print(f"Nó de destino '{destination_id}' não encontrado.")
        return

    origin = graph.nodes[origin_id]
    destination = graph.nodes[destination_id]

    distance, path = Dijkstra(graph, origin, destination)

    if distance == float("inf"):
        print(f"Sem caminho de {origin_id} → {destination_id}")
    else:
        print(f"Dijkstra: {origin_id} → {destination_id}")
        print(f"  Custo : {distance:.6f}")
        print(f"  Caminho: {' -> '.join(path)}")


if __name__ == "__main__":
    origin = sys.argv[1] if len(sys.argv) > 1 else "30"
    destination = sys.argv[2] if len(sys.argv) > 2 else "1412"
    run_dijkstra(origin, destination)
