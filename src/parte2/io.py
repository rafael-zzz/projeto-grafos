import os
import sys
import csv
from graph2 import Graph

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
WIKI_CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "wiki-Vote-weighted.csv")


def load_wiki_graph(path: str = WIKI_CSV_PATH) -> Graph:
    graph = Graph()

    with open(path, mode='r', encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)

        for row in reader:
            if len(row) != 3:
                continue

            origin, destination, weight_str = row

            weight = float(weight_str)

            graph.add_node(user_id=origin)
            graph.add_node(user_id=destination)
            graph.add_edge(origin_id=origin, destination_id=destination, weight=weight)

    return graph