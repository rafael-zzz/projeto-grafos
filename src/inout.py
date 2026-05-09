import csv
import json
import os
from graph.graph import Graph
from graph_loader import build_graph_from_csv

AIRPORTS_CSV = "../out/airports.csv"
EDGES_CSV = "../out/edges.csv"

REGION_COLORS: dict[str, str] = {
    "Norte":        "#0d9488",
    "Nordeste":     "#ea580c",
    "Centro-Oeste": "#7c3aed",
    "Sudeste":      "#2563eb",
    "Sul":          "#16a34a",
}

def load_graph(
    airports_path: str = AIRPORTS_CSV,
    adjacencies_path: str = EDGES_CSV,
) -> Graph:
    if not os.path.exists(airports_path):
        raise FileNotFoundError(f"Airports file not found: {airports_path}")
    if not os.path.exists(adjacencies_path):
        raise FileNotFoundError(f"Adjacencies file not found: {adjacencies_path}")

    graph = build_graph_from_csv(airports_path, adjacencies_path)

    validate_graph(graph)
    return graph


def export_graph_json(
    graph: Graph,
    output_paths: list[str] | None = None,
) -> None:
    if output_paths is None:
        output_paths = ["../frontend/public/graph.json", "../out/graph.json"]

    degrees = {icao: len(node.edges) for icao, node in graph.nodes.items()}
    
    if not degrees:
        print("Aviso: Grafo vazio, não há o que exportar.")
        return

    max_degree = max(degrees.values())
    min_degree = min(degrees.values())

    def node_size(degree: int) -> float:
        if max_degree == min_degree:
            return 10.0
        return 6 + (degree - min_degree) / (max_degree - min_degree) * 14

    nodes = []
    for icao, node in graph.nodes.items():
        nodes.append({
            "key": icao,
            "attributes": {
                "label": icao,
                "city": node.city,
                "region": node.region,
                "x": node.lon,
                "y": node.lat,
                "size": round(node_size(degrees[icao]), 2),
                "color": REGION_COLORS.get(node.region, "#94a3b8"),
            },
        })

    edges = []
    for icao, node in graph.nodes.items():
        for edge in node.edges:
            edges.append({
                "key": f"{icao}-{edge.destination.icao}",
                "source": icao,
                "target": edge.destination.icao,
                "attributes": {
                    "weight": edge.weight,
                    "connection_type": edge.connection_type,
                    "flights": edge.flights,
                    "size": 1,
                    "color": "#94a3b8",
                },
            })

    payload = json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)

    for path in output_paths:
        dirname = os.path.dirname(path)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
            
        with open(path, "w", encoding="utf-8") as f:
            f.write(payload)
        print(f"Exported {len(nodes)} nodes and {len(edges)} edges → {path}")

def validate_graph(graph: Graph) -> None:
    if not graph.nodes:
        raise ValueError("Graph has no nodes")

    visited = set()

    def dfs(icao: str) -> None:
        visited.add(icao)
        for edge in graph.nodes[icao].edges:
            if edge.destination.icao not in visited:
                dfs(edge.destination.icao)

    start = next(iter(graph.nodes))
    dfs(start)

    disconnected = set(graph.nodes) - visited
    if disconnected:
        raise ValueError(f"Graph is not connected. Disconnected nodes: {disconnected}")


def load_routes(filepath: str = "../in/rotas.csv") -> list[tuple[str, str]]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Routes file not found: {filepath}")

    routes = []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            origin = row["origem"].strip().upper()
            destination = row["destino"].strip().upper()
            routes.append((origin, destination))
    return routes

def export_routes(results: list[dict[str, str]], filepath: str = "../out/distancias_rotas.csv") -> None:
    dirname = os.path.dirname(filepath)
    if dirname:
        os.makedirs(dirname, exist_ok=True)
        
    with open(filepath, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["origem", "destino", "custo", "caminho"])
        writer.writeheader()
        writer.writerows(results)
    print(f"Exported {len(results)} calculated routes → {filepath}")