from graphs.Graph import Graph


def Dijkstra(graph: Graph, origin, destination):
    if origin.iata not in graph.nodes or destination.iata not in graph.nodes:
        return float('inf'), []

    for node in graph.nodes.values():
        for edge in node.edges:
            if edge.weight < 0:
                raise ValueError(f"Negative weight on edge {node.iata} -> {edge.destination.iata}: {edge.weight}")

    distances = {}
    predecessors = {}
    unvisited = []
    path = []

    for node in graph.nodes.values():
        distances[node.iata] = float('inf')
        unvisited.append(node)

    distances[origin.iata] = 0

    while unvisited:
        current_node = min(unvisited, key=lambda node: distances[node.iata])
        unvisited.remove(current_node)

        if current_node == destination:
            break

        for neighbor in current_node.edges:
            new_distance = distances[current_node.iata] + neighbor.weight
            if distances[neighbor.destination.iata] > new_distance:
                distances[neighbor.destination.iata] = new_distance
                predecessors[neighbor.destination.iata] = current_node.iata

    if destination.iata not in predecessors and origin.iata != destination.iata:
        return float('inf'), []

    current = destination.iata
    while True:
        path.append(current)
        if current == origin.iata:
            break
        current = predecessors[current]

    path.reverse()

    return distances[destination.iata], path
