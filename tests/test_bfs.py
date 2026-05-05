import pytest

from src.graphs.algorithms import breadth_first_search
from src.graphs.graph import AirportGraph


def _make_line() -> AirportGraph:
    g = AirportGraph()
    for airport in ("REC", "GRU", "BSB", "MAO"):
        g.add_airport(airport)
    g.add_connection("REC", "GRU", cost=2.0, connection_type="hub")
    g.add_connection("GRU", "BSB", cost=2.0, connection_type="hub")
    g.add_connection("BSB", "MAO", cost=2.0, connection_type="hub")
    return g


def _make_triangle() -> AirportGraph:
    g = AirportGraph()
    for airport in ("GRU", "GIG", "BSB"):
        g.add_airport(airport)
    g.add_connection("GRU", "GIG", cost=1.0, connection_type="regional")
    g.add_connection("GIG", "BSB", cost=1.0, connection_type="regional")
    g.add_connection("BSB", "GRU", cost=2.0, connection_type="hub")
    return g


def test_bfs_visits_all_airports():
    g = _make_triangle()
    visit_order, _ = breadth_first_search(g, "GRU")
    assert set(visit_order) == {"GRU", "GIG", "BSB"}


def test_bfs_starts_at_origin():
    g = _make_triangle()
    visit_order, _ = breadth_first_search(g, "GRU")
    assert visit_order[0] == "GRU"


def test_bfs_origin_is_layer_zero():
    g = _make_line()
    _, layers = breadth_first_search(g, "REC")
    assert layers["REC"] == 0


def test_bfs_layers_increase_by_one():
    g = _make_line()
    _, layers = breadth_first_search(g, "REC")
    assert layers["GRU"] == 1
    assert layers["BSB"] == 2
    assert layers["MAO"] == 3


def test_bfs_visits_closer_airports_first():
    g = _make_line()
    visit_order, layers = breadth_first_search(g, "REC")
    for i in range(len(visit_order) - 1):
        assert layers[visit_order[i]] <= layers[visit_order[i + 1]]


def test_bfs_each_airport_visited_once():
    g = _make_triangle()
    visit_order, _ = breadth_first_search(g, "GRU")
    assert len(visit_order) == len(set(visit_order))


def test_bfs_visits_only_reachable_airports():
    g = AirportGraph()
    for airport in ("GRU", "GIG", "MAO"):
        g.add_airport(airport)
    g.add_connection("GRU", "GIG", cost=1.0)
    visit_order, _ = breadth_first_search(g, "GRU")
    assert set(visit_order) == {"GRU", "GIG"}
    assert "MAO" not in visit_order


def test_bfs_single_airport():
    g = AirportGraph()
    g.add_airport("REC")
    visit_order, layers = breadth_first_search(g, "REC")
    assert visit_order == ["REC"]
    assert layers == {"REC": 0}


def test_bfs_unknown_origin_raises():
    g = _make_triangle()
    with pytest.raises(ValueError):
        breadth_first_search(g, "MAO")
