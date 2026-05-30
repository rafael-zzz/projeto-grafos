from collections import deque


def BFS(_graph, origin):
    visited = set()
    levels = {}
    order = []
    queue = deque()

    queue.append(origin)
    visited.add(origin.get_id())
    levels[origin.get_id()] = 0

    while queue:
        node = queue.popleft()
        order.append(node.get_id())
        for edge in node.edges:
            neighbor = edge.destination
            if neighbor.get_id() not in visited:
                visited.add(neighbor.get_id())
                levels[neighbor.get_id()] = levels[node.get_id()] + 1
                queue.append(neighbor)

    return order, levels


def DFS(graph, origin=None):
    color = {node_id: "white" for node_id in graph.nodes}
    disc = {}
    fin = {}
    edge_types = []
    order = []
    has_cycle = False
    time = [0]

    def visit(node):
        nonlocal has_cycle
        nid = node.get_id()
        color[nid] = "gray"
        time[0] += 1
        disc[nid] = time[0]
        order.append(nid)
        for edge in node.edges:
            nb = edge.destination
            nbid = nb.get_id()
            if color[nbid] == "white":
                edge_types.append((nid, nbid, "tree"))
                visit(nb)
            elif color[nbid] == "gray":
                edge_types.append((nid, nbid, "back"))
                has_cycle = True
            else:
                if disc[nid] < disc[nbid]:
                    edge_types.append((nid, nbid, "forward"))
                else:
                    edge_types.append((nid, nbid, "cross"))
        color[nid] = "black"
        time[0] += 1
        fin[nid] = time[0]

    start_nodes = (
        [graph.nodes[origin]]
        if origin and origin in graph.nodes
        else list(graph.nodes.values())
    )
    for node in start_nodes:
        if color[node.get_id()] == "white":
            visit(node)

    return order, edge_types, has_cycle


def Dijkstra(graph, origin, destination):
    if origin.get_id() not in graph.nodes or destination.get_id() not in graph.nodes:
        return float("inf"), []

    for node in graph.nodes.values():
        for edge in node.edges:
            if edge.weight < 0:
                raise ValueError(
                    f"Negative weight on edge {node.get_id()} -> {edge.destination.get_id()}: {edge.weight}"
                )

    distances = {}
    predecessors = {}
    unvisited = []

    for node in graph.nodes.values():
        distances[node.get_id()] = float("inf")
        unvisited.append(node)

    distances[origin.get_id()] = 0

    while unvisited:
        current_node = min(unvisited, key=lambda node: distances[node.get_id()])
        unvisited.remove(current_node)

        if current_node == destination:
            break

        for neighbor in current_node.edges:
            new_distance = distances[current_node.get_id()] + neighbor.weight
            if distances[neighbor.destination.get_id()] > new_distance:
                distances[neighbor.destination.get_id()] = new_distance
                predecessors[neighbor.destination.get_id()] = current_node.get_id()

    if destination.get_id() not in predecessors and origin.get_id() != destination.get_id():
        return float("inf"), []

    path = []
    current = destination.get_id()
    while True:
        path.append(current)
        if current == origin.get_id():
            break
        current = predecessors[current]

    path.reverse()
    return distances[destination.get_id()], path


def BellmanFord(graph, origin, destination=None):
    distances = {node_id: float("inf") for node_id in graph.nodes}
    predecessors = {node_id: None for node_id in graph.nodes}
    distances[origin.get_id()] = 0

    n = len(graph.nodes)
    for _ in range(n - 1):
        updated = False
        for node_id, node in graph.nodes.items():
            if distances[node_id] == float("inf"):
                continue
            for edge in node.edges:
                new_dist = distances[node_id] + edge.weight
                dest_id = edge.destination.get_id()
                if new_dist < distances[dest_id]:
                    distances[dest_id] = new_dist
                    predecessors[dest_id] = node_id
                    updated = True
        if not updated:
            break

    for node_id, node in graph.nodes.items():
        if distances[node_id] == float("inf"):
            continue
        for edge in node.edges:
            if distances[node_id] + edge.weight < distances[edge.destination.get_id()]:
                raise ValueError("Graph contains a negative-weight cycle")

    if destination is None:
        return distances, predecessors

    dest_id = destination.get_id()
    if distances[dest_id] == float("inf"):
        return float("inf"), []

    path = []
    current = dest_id
    while current is not None:
        path.append(current)
        if current == origin.get_id():
            break
        current = predecessors[current]

    path.reverse()
    return distances[dest_id], path
