import csv
import json
import os
from graphs.Graph import Graph

AIRPORTS_CSV = "data/aeroportos_data.csv"
ADJACENCIES_CSV = "data/adjacencias_aeroportos_treated.csv"

AIRPORT_COORDS: dict[str, tuple[float, float]] = {
    "REC": (-8.13,  -34.92),
    "SSA": (-12.91, -38.33),
    "FOR": (-3.78,  -38.53),
    "NAT": (-5.77,  -35.25),
    "JPA": (-7.15,  -34.95),
    "GRU": (-23.43, -46.47),
    "CGH": (-23.90, -46.66),
    "GIG": (-22.81, -43.25),
    "CNF": (-19.63, -43.97),
    "VIX": (-20.26, -40.29),
    "BSB": (-15.87, -47.92),
    "GYN": (-16.63, -49.22),
    "CWB": (-25.53, -49.18),
    "FLN": (-27.67, -48.55),
    "POA": (-29.99, -51.18),
    "MAO": (-3.04,  -60.05),
    "BEL": (-1.38,  -48.48),
    "PVH": (-8.71,  -63.90),
    "RBR": (-9.87,  -67.90),
    "THE": (-5.06,  -42.82),
}

REGION_COLORS: dict[str, str] = {
    "Norte":        "#0d9488",
    "Nordeste":     "#ea580c",
    "Centro-Oeste": "#7c3aed",
    "Sudeste":      "#2563eb",
    "Sul":          "#16a34a",
}


def load_graph(
    airports_path: str = AIRPORTS_CSV,
    adjacencies_path: str = ADJACENCIES_CSV,
) -> Graph:
    if not os.path.exists(airports_path):
        raise FileNotFoundError(f"Airports file not found: {airports_path}")
    if not os.path.exists(adjacencies_path):
        raise FileNotFoundError(f"Adjacencies file not found: {adjacencies_path}")

    graph = Graph()

    with open(airports_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            iata = row["iata"].strip()
            city = row["cidade"].strip()
            region = row["regiao"].strip()
            graph.add_node(iata, iata, city, 0, region)

    with open(adjacencies_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            origin = row["origem"].strip()
            dest = row["destino"].strip()
            weight = float(row["peso"])
            graph.add_edge(origin, dest, weight)
            graph.add_edge(dest, origin, weight)

    validate_graph(graph)
    return graph


def export_graph_json(
    graph: Graph,
    output_paths: list[str] | None = None,
) -> None:
    if output_paths is None:
        output_paths = ["frontend/public/graph.json", "out/graph.json"]

    degrees = {iata: len(node.edges) for iata, node in graph.nodes.items()}
    max_degree = max(degrees.values())
    min_degree = min(degrees.values())

    def node_size(degree: int) -> float:
        if max_degree == min_degree:
            return 10.0
        return 6 + (degree - min_degree) / (max_degree - min_degree) * 14

    nodes = []
    for iata, node in graph.nodes.items():
        lat, lon = AIRPORT_COORDS.get(iata, (0.0, 0.0))
        nodes.append({
            "key": iata,
            "attributes": {
                "label": iata,
                "city": node.city,
                "region": node.region,
                "x": lon,
                "y": -lat,
                "size": round(node_size(degrees[iata]), 2),
                "color": REGION_COLORS.get(node.region, "#94a3b8"),
            },
        })

    seen: set[tuple[str, str]] = set()
    edges = []
    for iata, node in graph.nodes.items():
        for edge in node.edges:
            pair = tuple(sorted([iata, edge.destination.iata]))
            if pair in seen:
                continue
            seen.add(pair)
            edges.append({
                "key": f"{pair[0]}-{pair[1]}",
                "source": pair[0],
                "target": pair[1],
                "attributes": {
                    "weight": edge.weight,
                    "size": 1,
                    "color": "#94a3b8",
                },
            })

    payload = json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)

    for path in output_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(payload)
        print(f"Exported {len(nodes)} nodes and {len(edges)} edges → {path}")


def validate_graph(graph: Graph) -> None:
    if not graph.nodes:
        raise ValueError("Graph has no nodes")

    visited = set()

    def dfs(iata: str) -> None:
        visited.add(iata)
        for edge in graph.nodes[iata].edges:
            if edge.destination.iata not in visited:
                dfs(edge.destination.iata)

    start = next(iter(graph.nodes))
    dfs(start)

    disconnected = set(graph.nodes) - visited
    if disconnected:
        raise ValueError(f"Graph is not connected. Disconnected nodes: {disconnected}")
