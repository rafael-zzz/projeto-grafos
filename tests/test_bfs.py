import pytest
from graphs.graph import Graph
from graphs.algorithms import BFS


@pytest.fixture
def linear_graph():
    g = Graph()
    for icao in ["A", "B", "C", "D"]:
        g.add_node(icao, icao, "R1", 0.0, 0.0)
    g.nodes["A"].add_edge(g.nodes["B"], 1)
    g.nodes["B"].add_edge(g.nodes["C"], 1)
    g.nodes["C"].add_edge(g.nodes["D"], 1)
    return g


@pytest.fixture
def branching_graph():
    g = Graph()
    for icao in ["A", "B", "C", "D", "E"]:
        g.add_node(icao, icao, "R1", 0.0, 0.0)
    g.nodes["A"].add_edge(g.nodes["B"], 1)
    g.nodes["A"].add_edge(g.nodes["C"], 1)
    g.nodes["B"].add_edge(g.nodes["D"], 1)
    g.nodes["C"].add_edge(g.nodes["E"], 1)
    return g


def test_correct_levels_linear_graph(linear_graph):
    _, levels = BFS(linear_graph, linear_graph.nodes["A"])
    assert levels["A"] == 0
    assert levels["B"] == 1
    assert levels["C"] == 2
    assert levels["D"] == 3


def test_all_nodes_visited(linear_graph):
    order, _ = BFS(linear_graph, linear_graph.nodes["A"])
    assert set(order) == {"A", "B", "C", "D"}


def test_correct_levels_branching_graph(branching_graph):
    _, levels = BFS(branching_graph, branching_graph.nodes["A"])
    assert levels["A"] == 0
    assert levels["B"] == 1
    assert levels["C"] == 1
    assert levels["D"] == 2
    assert levels["E"] == 2


def test_bfs_order_by_level(branching_graph):
    order, _ = BFS(branching_graph, branching_graph.nodes["A"])
    assert order.index("B") < order.index("D")
    assert order.index("C") < order.index("E")


def test_isolated_node():
    g = Graph()
    g.add_node("X", "X", "R1", 0.0, 0.0)
    order, levels = BFS(g, g.nodes["X"])
    assert order == ["X"]
    assert levels["X"] == 0
