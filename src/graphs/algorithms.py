from collections import deque

from graphs.Graph import Graph
from src.graphs.graph import GraphProtocol

#retorna um int e uma lista
def Dijkstra(grafo:Graph, origem, destino):
    if origem.iata not in grafo.nodes or destino.iata not in grafo.nodes:
        return float('inf'), []
    distancias = {}
    predecessores = {}
    naovisitadas = []
    caminho = []

    for node in grafo.nodes.values():
        distancias[node.iata] = float('inf')
        naovisitadas.append(node)

    
    distancias[origem.iata] = 0

    while naovisitadas:
        no_atual = min(naovisitadas, key=lambda node: distancias[node.iata])
        naovisitadas.remove(no_atual)

        if no_atual == destino:
            break

        for vizinho in no_atual.edges:
            nova_distancia = distancias[no_atual.iata] + vizinho.weight
            if distancias[vizinho.destination.iata] > nova_distancia:
                distancias[vizinho.destination.iata] = nova_distancia
                predecessores[vizinho.destination.iata] = no_atual.iata

    if destino.iata not in predecessores and origem.iata != destino.iata:
        return float('inf'), []

    atual = destino.iata
    while True:
        caminho.append(atual)
        if atual == origem.iata:
            break
        atual = predecessores[atual]

    caminho.reverse()

    return distancias[destino.iata], caminho


def breadth_first_search(
    graph: GraphProtocol, origin: str
) -> tuple[list[str], dict[str, int]]:
    if not graph.has_node(origin):
        raise ValueError(f"Unknown node: {origin}")

    visited: set[str] = {origin}
    visit_order: list[str] = []
    layers: dict[str, int] = {origin: 0}
    queue: deque[str] = deque([origin])

    while queue:
        node = queue.popleft()
        visit_order.append(node)
        for connection in graph.neighbors(node):
            if connection.destination not in visited:
                visited.add(connection.destination)
                layers[connection.destination] = layers[node] + 1
                queue.append(connection.destination)

    return visit_order, layers
