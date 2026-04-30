from graphs.Graph import Graph
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