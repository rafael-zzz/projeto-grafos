import os
import sys
from graphs.graph import Graph
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
WIKI_VOTE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "wiki-Vote.txt")


def load_wiki_graph(path: str = WIKI_VOTE_PATH) -> Graph:
    raw_edges: list[tuple[str, str]] = []
    node_ids: set[str] = set()

    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                continue
            parts = line.strip().split("\t")
            if len(parts) != 2:
                continue
            a, b = parts[0], parts[1]
            raw_edges.append((a, b))
            node_ids.add(a)
            node_ids.add(b)

    # calcula o peso de entrada pra definir os pesos
    in_degree: dict[str, int] = {n: 0 for n in node_ids}
    for _, b in raw_edges:
        in_degree[b] += 1

    graph = Graph()
    for node_id in node_ids:
        graph.add_node(icao=node_id, city="", region="", lat=0.0, lon=0.0)

    for a, b in raw_edges:
        weight = 1.0 / (in_degree[b] + 1)
        graph.add_edge(origin_icao=a, destination_icao=b, weight=round(weight, 6))

    return graph
