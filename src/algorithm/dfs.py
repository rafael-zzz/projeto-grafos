from graph.graph import Graph

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
