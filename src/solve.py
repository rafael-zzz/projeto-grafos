import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from graphs.io import load_graph, export_graph_json
from metrics.metrics_exporter import (
    export_global_metrics_json,
    export_regions_metrics_json,
    export_ego_metrics,
    export_degrees_csv,
)
from route_tree import export_route_tree_artifacts


def _directed_edges(graph):
    edges = []
    for icao, node in graph.nodes.items():
        for edge in node.edges:
            edges.append(edge)
    return edges


def _build_regions_data(graph):
    region_nodes: dict[str, set[str]] = {}
    for icao, node in graph.nodes.items():
        region_nodes.setdefault(node.region, set()).add(icao)

    regions_data = {}
    for region, node_keys in region_nodes.items():
        region_edges = []
        for icao in node_keys:
            for edge in graph.nodes[icao].edges:
                if edge.destination.icao in node_keys:
                    region_edges.append(edge)
        regions_data[region] = (list(node_keys), region_edges)
    return regions_data


def _build_ego_data(graph):
    ego_data = {}
    for icao, node in graph.nodes.items():
        neighbors = {edge.destination.icao for edge in node.edges}
        v_ego = {icao} | neighbors
        e_ego = []
        for n_icao in v_ego:
            for edge in graph.nodes[n_icao].edges:
                if edge.destination.icao in v_ego:
                    e_ego.append(edge)
        ego_data[icao] = (len(node.edges), list(v_ego), e_ego)
    return ego_data


def solve():
    graph = load_graph()

    all_nodes = list(graph.nodes.values())
    all_edges = _directed_edges(graph)

    export_graph_json(graph)
    print(f"Metricas globais: {len(all_nodes)} nos, {len(all_edges)} arestas")

    export_global_metrics_json(all_nodes, all_edges)

    regions_data = _build_regions_data(graph)
    export_regions_metrics_json(regions_data)

    ego_data = _build_ego_data(graph)
    export_ego_metrics(ego_data)

    export_route_tree_artifacts(graph)

    degrees = {icao: len(node.edges) for icao, node in graph.nodes.items()}
    export_degrees_csv(degrees)


if __name__ == "__main__":
    solve()
