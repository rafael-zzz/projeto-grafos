from collections import deque
from .graph import Graph


def BFS(graph: Graph, origin):
    visited = set()
    levels = {}
    order = []
    queue = deque()

    queue.append(origin)
    visited.add(origin.icao)
    levels[origin.icao] = 0

    while queue:
        node = queue.popleft()
        order.append(node.icao)
        for edge in node.edges:
            neighbor = edge.destination
            if neighbor.icao not in visited:
                visited.add(neighbor.icao)
                levels[neighbor.icao] = levels[node.icao] + 1
                queue.append(neighbor)

    return order, levels


def DFS(graph: Graph, origin=None):
    color = {icao: "white" for icao in graph.nodes}
    disc = {}
    fin = {}
    edge_types = []
    order = []
    has_cycle = False
    time = [0]

    def visit(node):
        nonlocal has_cycle
        color[node.icao] = "gray"
        time[0] += 1
        disc[node.icao] = time[0]
        order.append(node.icao)
        for edge in node.edges:
            nb = edge.destination
            if color[nb.icao] == "white":
                edge_types.append((node.icao, nb.icao, "tree"))
                visit(nb)
            elif color[nb.icao] == "gray":
                edge_types.append((node.icao, nb.icao, "back"))
                has_cycle = True
            else:
                if disc[node.icao] < disc[nb.icao]:
                    edge_types.append((node.icao, nb.icao, "forward"))
                else:
                    edge_types.append((node.icao, nb.icao, "cross"))
        color[node.icao] = "black"
        time[0] += 1
        fin[node.icao] = time[0]

    start_nodes = (
        [graph.nodes[origin]]
        if origin and origin in graph.nodes
        else list(graph.nodes.values())
    )
    for node in start_nodes:
        if color[node.icao] == "white":
            visit(node)

    return order, edge_types, has_cycle


def Dijkstra(graph: Graph, origin, destination):
    if origin.icao not in graph.nodes or destination.icao not in graph.nodes:
        return float("inf"), []

    for node in graph.nodes.values():
        for edge in node.edges:
            if edge.weight < 0:
                raise ValueError(
                    f"Negative weight on edge {node.icao} -> {edge.destination.icao}: {edge.weight}"
                )

    distances = {}
    predecessors = {}
    unvisited = []

    for node in graph.nodes.values():
        distances[node.icao] = float("inf")
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
        return float("inf"), []

    path = []
    current = destination.icao
    while True:
        path.append(current)
        if current == origin.icao:
            break
        current = predecessors[current]

    path.reverse()
    return distances[destination.icao], path


def BellmanFord(graph: Graph, origin, destination=None):
    distances = {icao: float("inf") for icao in graph.nodes}
    predecessors = {icao: None for icao in graph.nodes}
    distances[origin.icao] = 0

    n = len(graph.nodes)
    for _ in range(n - 1):
        updated = False
        for icao, node in graph.nodes.items():
            if distances[icao] == float("inf"):
                continue
            for edge in node.edges:
                new_dist = distances[icao] + edge.weight
                if new_dist < distances[edge.destination.icao]:
                    distances[edge.destination.icao] = new_dist
                    predecessors[edge.destination.icao] = icao
                    updated = True
        if not updated:
            break

    for icao, node in graph.nodes.items():
        if distances[icao] == float("inf"):
            continue
        for edge in node.edges:
            if distances[icao] + edge.weight < distances[edge.destination.icao]:
                raise ValueError("Graph contains a negative-weight cycle")

    if destination is None:
        return distances, predecessors

    if distances[destination.icao] == float("inf"):
        return float("inf"), []

    path = []
    current = destination.icao
    while current is not None:
        path.append(current)
        if current == origin.icao:
            break
        current = predecessors[current]

    path.reverse()
    return distances[destination.icao], path
