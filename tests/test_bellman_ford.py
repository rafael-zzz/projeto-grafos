import pytest
from graphs.graph import Graph
from graphs.algorithms import BellmanFord


@pytest.fixture
def airport_graph():
    g = Graph()
    g.add_node("GRU", "Guarulhos", "Sudeste", 0.0, 0.0)
    g.add_node("SSA", "Salvador", "Nordeste", 0.0, 0.0)
    g.add_node("REC", "Recife", "Nordeste", 0.0, 0.0)
    g.add_node("FOR", "Fortaleza", "Nordeste", 0.0, 0.0)
    g.nodes["GRU"].add_edge(g.nodes["SSA"], 10)
    g.nodes["SSA"].add_edge(g.nodes["REC"], 5)
    g.nodes["GRU"].add_edge(g.nodes["REC"], 20)
    g.nodes["REC"].add_edge(g.nodes["FOR"], 8)
    return g


def test_shortest_path_positive_weights(airport_graph):
    dist, path = BellmanFord(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["FOR"])
    assert dist == 23
    assert path == ["GRU", "SSA", "REC", "FOR"]


def test_shortest_path_with_negative_weight():
    g = Graph()
    g.add_node("A", "A", "R1", 0.0, 0.0)
    g.add_node("B", "B", "R1", 0.0, 0.0)
    g.add_node("C", "C", "R1", 0.0, 0.0)
    g.nodes["A"].add_edge(g.nodes["B"], 4)
    g.nodes["A"].add_edge(g.nodes["C"], 2)
    g.nodes["C"].add_edge(g.nodes["B"], -1)
    dist, path = BellmanFord(g, g.nodes["A"], g.nodes["B"])
    assert dist == 1
    assert path == ["A", "C", "B"]


def test_same_origin_destination(airport_graph):
    dist, path = BellmanFord(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["GRU"])
    assert dist == 0
    assert path == ["GRU"]


def test_unreachable_destination(airport_graph):
    airport_graph.add_node("MAO", "Manaus", "Norte", 0.0, 0.0)
    dist, path = BellmanFord(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["MAO"])
    assert dist == float("inf")
    assert path == []


def test_detects_negative_cycle():
    g = Graph()
    g.add_node("A", "A", "R1", 0.0, 0.0)
    g.add_node("B", "B", "R1", 0.0, 0.0)
    g.add_node("C", "C", "R1", 0.0, 0.0)
    g.nodes["A"].add_edge(g.nodes["B"], 1)
    g.nodes["B"].add_edge(g.nodes["C"], -3)
    g.nodes["C"].add_edge(g.nodes["A"], 1)
    with pytest.raises(ValueError, match="negative-weight cycle"):
        BellmanFord(g, g.nodes["A"])


def test_all_distances_no_destination(airport_graph):
    distances, _ = BellmanFord(airport_graph, airport_graph.nodes["GRU"])
    assert distances["GRU"] == 0
    assert distances["SSA"] == 10
    assert distances["REC"] == 15
    assert distances["FOR"] == 23
