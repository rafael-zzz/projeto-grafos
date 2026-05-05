from collections import deque
from graphs.Graph import Graph


def BFS(graph: Graph, origin):
    visited = set()
    levels = {}
    order = []
    queue = deque()

    queue.append(origin)
    visited.add(origin.iata)
    levels[origin.iata] = 0

    while queue:
        node = queue.popleft()
        order.append(node.iata)
        for edge in node.edges:
            neighbor = edge.destination
            if neighbor.iata not in visited:
                visited.add(neighbor.iata)
                levels[neighbor.iata] = levels[node.iata] + 1
                queue.append(neighbor)

    return order, levels


def DFS(graph: Graph, origin_iata=None):
    color = {iata: "white" for iata in graph.nodes}
    disc = {}
    fin = {}
    edge_types = []
    order = []
    has_cycle = False
    time = [0]

    def visit(node):
        nonlocal has_cycle
        color[node.iata] = "gray"
        time[0] += 1
        disc[node.iata] = time[0]
        order.append(node.iata)
        for edge in node.edges:
            nb = edge.destination
            if color[nb.iata] == "white":
                edge_types.append((node.iata, nb.iata, "tree"))
                visit(nb)
            elif color[nb.iata] == "gray":
                edge_types.append((node.iata, nb.iata, "back"))
                has_cycle = True
            else:
                if disc[node.iata] < disc[nb.iata]:
                    edge_types.append((node.iata, nb.iata, "forward"))
                else:
                    edge_types.append((node.iata, nb.iata, "cross"))
        color[node.iata] = "black"
        time[0] += 1
        fin[node.iata] = time[0]

    start_nodes = (
        [graph.nodes[origin_iata]]
        if origin_iata and origin_iata in graph.nodes
        else list(graph.nodes.values())
    )
    for node in start_nodes:
        if color[node.iata] == "white":
            visit(node)

    return order, edge_types, has_cycle


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
