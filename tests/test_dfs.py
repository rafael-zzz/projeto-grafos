import pytest
from graphs.Graph import Graph
from graphs.algorithms import DFS


@pytest.fixture
def graph_without_cycle():
    g = Graph()
    for iata in ["A", "B", "C", "D"]:
        g.add_node(iata, iata, iata, 1, "R1")
    g.nodes["A"].add_edge(g.nodes["B"], 1)
    g.nodes["B"].add_edge(g.nodes["C"], 1)
    g.nodes["A"].add_edge(g.nodes["D"], 1)
    return g


@pytest.fixture
def graph_with_cycle():
    g = Graph()
    for iata in ["A", "B", "C"]:
        g.add_node(iata, iata, iata, 1, "R1")
    g.nodes["A"].add_edge(g.nodes["B"], 1)
    g.nodes["B"].add_edge(g.nodes["C"], 1)
    g.nodes["C"].add_edge(g.nodes["A"], 1)
    return g


def test_detects_cycle(graph_with_cycle):
    _, _, has_cycle = DFS(graph_with_cycle)
    assert has_cycle is True


def test_no_cycle(graph_without_cycle):
    _, _, has_cycle = DFS(graph_without_cycle)
    assert has_cycle is False


def test_all_nodes_visited(graph_without_cycle):
    order, _, _ = DFS(graph_without_cycle)
    assert set(order) == {"A", "B", "C", "D"}


def test_classifies_tree_edges(graph_without_cycle):
    _, edge_types, _ = DFS(graph_without_cycle)
    tree_edges = {(u, v) for u, v, t in edge_types if t == "tree"}
    assert ("A", "B") in tree_edges
    assert ("B", "C") in tree_edges


def test_classifies_back_edge(graph_with_cycle):
    _, edge_types, _ = DFS(graph_with_cycle)
    back_edges = [(u, v, t) for u, v, t in edge_types if t == "back"]
    assert len(back_edges) >= 1
