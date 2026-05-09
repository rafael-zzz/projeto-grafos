import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from graph.graph import Graph
from algorithm.dijkstra import Dijkstra

@pytest.fixture
def airport_graph():
    g = Graph()
    g.add_node("GRU", "Guarulhos", "São Paulo", 100, "Sudeste")
    g.add_node("SSA", "Dep. Luís Eduardo Magalhães", "Salvador", 80, "Nordeste")
    g.add_node("REC", "Guararapes", "Recife", 90, "Nordeste")
    g.add_node("FOR", "Pinto Martins", "Fortaleza", 70, "Nordeste")
    g.nodes["GRU"].add_edge(g.nodes["SSA"], 10)
    g.nodes["SSA"].add_edge(g.nodes["REC"], 5)
    g.nodes["GRU"].add_edge(g.nodes["REC"], 20)
    g.nodes["REC"].add_edge(g.nodes["FOR"], 8)
    return g


def test_shortest_path(airport_graph):
    dist, route = Dijkstra(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["FOR"])
    assert dist == 23
    assert route == ["GRU", "SSA", "REC", "FOR"]


def test_prefers_indirect_cheaper_path(airport_graph):
    dist, route = Dijkstra(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["REC"])
    assert dist == 15
    assert route == ["GRU", "SSA", "REC"]


def test_same_origin_destination(airport_graph):
    dist, route = Dijkstra(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["GRU"])
    assert dist == 0
    assert route == ["GRU"]


def test_unreachable_destination(airport_graph):
    airport_graph.add_node("MAO", "Eduardo Gomes", "Manaus", 60, "Norte")
    dist, route = Dijkstra(airport_graph, airport_graph.nodes["GRU"], airport_graph.nodes["MAO"])
    assert dist == float('inf')
    assert route == []


def test_rejects_negative_weight():
    g = Graph()
    g.add_node("A", "A", "A", 1, "R1")
    g.add_node("B", "B", "B", 1, "R1")
    g.nodes["A"].add_edge(g.nodes["B"], -5)
    with pytest.raises(ValueError):
        Dijkstra(g, g.nodes["A"], g.nodes["B"])
