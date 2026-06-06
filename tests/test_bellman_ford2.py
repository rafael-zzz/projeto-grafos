import pytest
import os
import pandas as pd
from graphs.graph import Graph
from graphs.algorithms import BellmanFord

NODES_CSV = "data/wikipedia/nodes.csv"
EDGES_CSV = "data/wikipedia/edges.csv"

@pytest.fixture
def real_wiki_graph():
    if not os.path.exists(NODES_CSV) or not os.path.exists(EDGES_CSV):
        pytest.skip(f"Ficheiros reais não encontrados em {NODES_CSV}. Execute o pipeline primeiro.")

    g = Graph()

    nodes_df = pd.read_csv(NODES_CSV)
    for _, row in nodes_df.iterrows():
        title = str(row['title'])
        g.add_node(icao=title, city=title, region="Wikipedia", lat=0.0, lon=0.0)

    edges_df = pd.read_csv(EDGES_CSV)
    for _, row in edges_df.iterrows():
        source = str(row['source_title'])
        target = str(row['target_title'])
        weight = float(row['weight'])

        g.add_edge(origin_icao=source, destination_icao=target, weight=weight)

    return g


def test_real_dataset_is_loaded(real_wiki_graph):
    assert len(real_wiki_graph.nodes) > 0
    has_edges = any(len(node.edges) > 0 for node in real_wiki_graph.nodes.values())
    assert has_edges is True


def test_bellman_ford_known_path(real_wiki_graph):
    origem = "Wayback Machine"
    destino = "ISBN (identifier)"

    if origem in real_wiki_graph.nodes and destino in real_wiki_graph.nodes:
        try:
            dist, path = BellmanFord(
                real_wiki_graph,
                real_wiki_graph.nodes[origem],
                real_wiki_graph.nodes[destino]
            )
            if path:
                assert path[0] == origem
                assert path[-1] == destino
        except ValueError as e:
            assert str(e) == "Graph contains a negative-weight cycle"


def test_real_graph_negative_cycles(real_wiki_graph):
    first_node_id = list(real_wiki_graph.nodes.keys())[0]
    origin_node = real_wiki_graph.nodes[first_node_id]

    try:
        BellmanFord(real_wiki_graph, origin_node)
    except ValueError as e:
        assert "negative-weight cycle" in str(e)


def test_distance_to_self_is_always_zero(real_wiki_graph):
    test_node_id = list(real_wiki_graph.nodes.keys())[0]
    node = real_wiki_graph.nodes[test_node_id]

    try:
        dist, path = BellmanFord(real_wiki_graph, node, node)
        assert dist == 0
        assert path == [test_node_id]
    except ValueError as e:
        assert "negative-weight cycle" in str(e)

    real_wiki_graph.add_node("Artigo_Isolado_Self", "Self", "Wiki", 0.0, 0.0)
    node_iso = real_wiki_graph.nodes["Artigo_Isolado_Self"]

    dist, path = BellmanFord(real_wiki_graph, node_iso, node_iso)
    assert dist == 0
    assert path == ["Artigo_Isolado_Self"]


def test_unreachable_ghost_article(real_wiki_graph):
    origin_id = list(real_wiki_graph.nodes.keys())[0]
    origin = real_wiki_graph.nodes[origin_id]

    ghost_id = "Artigo_Fantasma_Isolado"
    real_wiki_graph.add_node(ghost_id, ghost_id, "Wiki", 0.0, 0.0)
    target = real_wiki_graph.nodes[ghost_id]

    try:
        dist, path = BellmanFord(real_wiki_graph, origin, target)
        assert dist == float('inf')
        assert path == []
    except ValueError as e:
        assert "negative-weight cycle" in str(e)

    real_wiki_graph.add_node("Origem_Isolada", "Origem", "Wiki", 0.0, 0.0)
    iso_origin = real_wiki_graph.nodes["Origem_Isolada"]

    dist, path = BellmanFord(real_wiki_graph, iso_origin, target)
    assert dist == float('inf')
    assert path == []


def test_bellman_ford_global_distances(real_wiki_graph):
    origin_id = list(real_wiki_graph.nodes.keys())[0]
    origin = real_wiki_graph.nodes[origin_id]

    try:
        distances, predecessors = BellmanFord(real_wiki_graph, origin)

        assert len(distances) == len(real_wiki_graph.nodes)
        assert distances[origin_id] == 0
        assert predecessors[origin_id] is None

    except ValueError as e:
        assert "negative-weight cycle" in str(e)