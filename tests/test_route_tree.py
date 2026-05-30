from graphs.graph import Graph
from route_tree import build_route_tree


def test_build_route_tree_merges_mandatory_paths():
    graph = Graph()
    graph.add_node("REC", "Recife", "Nordeste", 0, 0)
    graph.add_node("SSA", "Salvador", "Nordeste", 1, 1)
    graph.add_node("POA", "Porto Alegre", "Sul", 2, 2)
    graph.add_node("MAO", "Manaus", "Norte", 3, 3)
    graph.add_node("GRU", "São Paulo", "Sudeste", 4, 4)

    graph.nodes["REC"].add_edge(graph.nodes["SSA"], 1)
    graph.nodes["SSA"].add_edge(graph.nodes["POA"], 1)
    graph.nodes["MAO"].add_edge(graph.nodes["GRU"], 1)

    tree = build_route_tree(
        graph,
        [
            ("REC", "POA", "Recife → Porto Alegre", "#dc2626"),
            ("MAO", "GRU", "Manaus → São Paulo", "#2563eb"),
        ],
    )

    assert set(tree["nodes"]) == {"REC", "SSA", "POA", "MAO", "GRU"}
    assert tree["routes"][0]["path"] == ["REC", "SSA", "POA"]
    assert tree["routes"][1]["path"] == ["MAO", "GRU"]
    assert len(tree["segments"]) == 3