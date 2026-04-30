import pytest

from src.graphs.algorithms import depth_first_search
from src.graphs.graph import AirportGraph


def _make_triangle() -> AirportGraph:
    g = AirportGraph()
    for airport in ("GRU", "GIG", "BSB"):
        g.add_airport(airport)
    g.add_connection("GRU", "GIG", cost=1.0, connection_type="regional")
    g.add_connection("GIG", "BSB", cost=1.0, connection_type="regional")
    g.add_connection("BSB", "GRU", cost=2.0, connection_type="hub")
    return g


def test_dfs_visits_all_airports():
    g = _make_triangle()
    visit_order, _ = depth_first_search(g, "GRU")
    assert set(visit_order) == {"GRU", "GIG", "BSB"}


def test_dfs_starts_at_origin():
    g = _make_triangle()
    visit_order, _ = depth_first_search(g, "GRU")
    assert visit_order[0] == "GRU"


def test_dfs_predecessors_form_valid_tree():
    g = _make_triangle()
    _, predecessors = depth_first_search(g, "GRU")
    assert predecessors["GRU"] is None
    for airport in ("GIG", "BSB"):
        assert predecessors[airport] in g.airports()


def test_dfs_predecessor_is_neighbor():
    g = _make_triangle()
    _, predecessors = depth_first_search(g, "GRU")
    for airport, predecessor in predecessors.items():
        if predecessor is not None:
            reachable = {c.destination for c in g.neighbors(predecessor)}
            assert airport in reachable


def test_dfs_single_airport():
    g = AirportGraph()
    g.add_airport("REC")
    visit_order, predecessors = depth_first_search(g, "REC")
    assert visit_order == ["REC"]
    assert predecessors == {"REC": None}


def test_dfs_visits_only_reachable_airports():
    g = AirportGraph()
    for airport in ("GRU", "GIG", "MAO"):
        g.add_airport(airport)
    g.add_connection("GRU", "GIG", cost=1.0)
    # MAO has no connections
    visit_order, _ = depth_first_search(g, "GRU")
    assert set(visit_order) == {"GRU", "GIG"}
    assert "MAO" not in visit_order


def test_dfs_unknown_origin_raises():
    g = _make_triangle()
    with pytest.raises(ValueError):
        depth_first_search(g, "MAO")


def test_dfs_each_airport_visited_once():
    g = _make_triangle()
    visit_order, _ = depth_first_search(g, "GRU")
    assert len(visit_order) == len(set(visit_order))
