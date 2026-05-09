from collections import deque
from graph.graph import Graph

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
