from collections import deque

from src.graphs.graph import GraphProtocol


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
