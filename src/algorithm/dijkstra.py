from graph.graph import Graph

def Dijkstra(graph: Graph, origin, destination):
    if origin.icao not in graph.nodes or destination.icao not in graph.nodes:
        return float('inf'), []

    for node in graph.nodes.values():
        for edge in node.edges:
            if edge.weight < 0:
                raise ValueError(f"Negative weight on edge {node.icao} -> {edge.destination.icao}: {edge.weight}")

    distances = {}
    predecessors = {}
    unvisited = []
    path = []

    for node in graph.nodes.values():
        distances[node.icao] = float('inf')
        unvisited.append(node)

    distances[origin.icao] = 0

    while unvisited:
        current_node = min(unvisited, key=lambda node: distances[node.icao])
        unvisited.remove(current_node)

        if current_node == destination:
            break

        for neighbor in current_node.edges:
            new_distance = distances[current_node.icao] + neighbor.weight
            if distances[neighbor.destination.icao] > new_distance:
                distances[neighbor.destination.icao] = new_distance
                predecessors[neighbor.destination.icao] = current_node.icao

    if destination.icao not in predecessors and origin.icao != destination.icao:
        return float('inf'), []

    current = destination.icao
    while True:
        path.append(current)
        if current == origin.icao:
            break
        current = predecessors[current]

    path.reverse()

    return distances[destination.icao], path
