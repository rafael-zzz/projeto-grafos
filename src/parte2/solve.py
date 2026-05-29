import os
import sys
import time
#Isso aqui é so um teste basicao pra testar minhas funcoes e temporario
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from parte2.io import load_wiki_graph
from graphs.algorithms import Dijkstra


def run_dijkstra(origin_id: str, destination_id: str) -> None:
    print("Carregando o grafo da Wikipedia a partir do CSV...")

    start_time = time.time()
    graph = load_wiki_graph()
    load_time = time.time() - start_time

    num_nodes = len(graph.nodes)
    num_edges = sum(len(n.edges) for n in graph.nodes.values())

    print(f"✅ Grafo carregado em {load_time:.3f} segundos!")
    print(f"📊 Estatísticas: {num_nodes} nós | {num_edges} arestas\n")

    if origin_id not in graph.nodes:
        print(f"❌ Erro: Nó de origem '{origin_id}' não encontrado.")
        return
    if destination_id not in graph.nodes:
        print(f"❌ Erro: Nó de destino '{destination_id}' não encontrado.")
        return

    origin = graph.nodes[origin_id]
    destination = graph.nodes[destination_id]

    print(f"Calculando o menor caminho de {origin_id} → {destination_id}...")

    start_calc = time.time()
    distance, path = Dijkstra(graph, origin, destination)
    calc_time = time.time() - start_calc

    if distance == float("inf"):
        print(f"🚫 Sem caminho possível de {origin_id} → {destination_id}")
    else:
        print("\n🎯 Resultado do Dijkstra:")
        print(f"   Origem  : {origin_id}")
        print(f"   Destino : {destination_id}")
        print(f"   Custo   : {distance:.6f}")
        print(f"   Caminho : {' -> '.join(path)}")
        print(f"   Tempo   : {calc_time:.4f} segundos")


if __name__ == "__main__":
    origin = sys.argv[1] if len(sys.argv) > 1 else "30"
    destination = sys.argv[2] if len(sys.argv) > 2 else "1412"

    run_dijkstra(origin, destination)