"""
Generates the required Part 2 analytical outputs from the Wikipedia graph.

Inputs:
  frontend/public/wiki_graph.json

Outputs:
  out/parte2_report.json
  out/parte2_distribuicao_graus.png
  out/parte2_hubs_brutos_vs_tematicos.png
  out/parte2_tempos_algoritmos.png
  out/parte2_bfs_camadas.png
  out/parte2_heatmap_distancias.png
  out/parte2_notas_analiticas.md
"""

from __future__ import annotations

import json
import math
import re
import sys
import textwrap
import time
from collections import Counter, deque
from pathlib import Path
from statistics import mean, median
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

SRC_DIR = Path(__file__).resolve().parents[1]
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from graphs.algorithms import BFS, DFS, BellmanFord, Dijkstra
from graphs.graph import Graph


ROOT = Path(__file__).resolve().parents[2]
GRAPH_JSON = ROOT / "frontend" / "public" / "wiki_graph.json"
OUT_DIR = ROOT / "out"

UTILITY_NODE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\bidentifier\b",
        r"^isbn\b",
        r"^doi\b",
        r"^issn\b",
        r"^jstor\b",
        r"^s2cid\b",
        r"^pmid\b",
        r"^pmc\b",
        r"\bwikidata\b",
        r"\bcoordinates\b",
        r"\bwayback machine\b",
        r"\binternet archive\b",
        r"\bshort description\b",
        r"\barticles? with\b",
        r"\ball articles\b",
        r"\bpages? using\b",
    ]
]


def is_utility_node(title: str) -> bool:
    return any(pattern.search(title) for pattern in UTILITY_NODE_PATTERNS)


def load_wiki_graph() -> dict[str, Any]:
    with GRAPH_JSON.open(encoding="utf-8") as file:
        return json.load(file)


def graph_edge_weights(graph_data: dict[str, Any]) -> list[float]:
    return [
        float(edge["attributes"].get("weight", 1.0))
        for edge in graph_data["edges"]
    ]


def build_algorithm_graph(graph_data: dict[str, Any], *, non_negative: bool = False) -> Graph:
    graph = Graph()
    for node in graph_data["nodes"]:
        title = node["key"]
        graph.add_node(title, title, "Wikipedia", 0.0, 0.0)

    weights = graph_edge_weights(graph_data)
    offset = abs(min(weights)) if non_negative and weights and min(weights) < 0 else 0.0

    for edge in graph_data["edges"]:
        weight = float(edge["attributes"].get("weight", 1.0))
        graph.add_edge(
            edge["source"],
            edge["target"],
            weight + offset,
        )

    return graph


def degree_records(graph_data: dict[str, Any]) -> list[dict[str, Any]]:
    nodes = graph_data["nodes"]
    in_degree = {node["key"]: 0 for node in nodes}
    out_degree = {node["key"]: 0 for node in nodes}

    for edge in graph_data["edges"]:
        out_degree[edge["source"]] += 1
        in_degree[edge["target"]] += 1

    records = []
    for node in nodes:
        key = node["key"]
        attrs = node["attributes"]
        in_d = in_degree[key]
        out_d = out_degree[key]
        records.append(
            {
                "key": key,
                "title": attrs["title"],
                "word_count": int(attrs.get("word_count", 0)),
                "categories": attrs.get("categories", []),
                "in_degree": in_d,
                "out_degree": out_d,
                "total_degree": in_d + out_d,
                "balance": out_d - in_d,
                "category_count": len(attrs.get("categories", [])),
                "is_utility": is_utility_node(key),
            }
        )
    return records


def adjacency(graph_data: dict[str, Any]) -> dict[str, list[str]]:
    adj = {node["key"]: [] for node in graph_data["nodes"]}
    for edge in graph_data["edges"]:
        adj.setdefault(edge["source"], []).append(edge["target"])
    return adj


def reachable_from(adj: dict[str, list[str]], source: str) -> set[str]:
    visited = {source}
    queue = deque([source])
    while queue:
        node = queue.popleft()
        for neighbor in adj.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return visited


def select_sources(records: list[dict[str, Any]], limit: int = 3) -> list[str]:
    thematic = [record for record in records if not record["is_utility"]]
    selected = sorted(
        thematic,
        key=lambda item: (-item["total_degree"], -item["word_count"], item["key"]),
    )[:limit]
    return [item["key"] for item in selected]


def select_pairs(graph_data: dict[str, Any], records: list[dict[str, Any]], limit: int = 5) -> list[tuple[str, str]]:
    adj = adjacency(graph_data)
    candidates = [
        record["key"]
        for record in sorted(
            [record for record in records if not record["is_utility"]],
            key=lambda item: (-item["total_degree"], item["key"]),
        )
    ][:18]

    pairs: list[tuple[str, str]] = []
    for i, source in enumerate(candidates):
        reached = reachable_from(adj, source)
        for target in candidates[i + 1 :] + candidates[:i]:
            if source != target and target in reached:
                pairs.append((source, target))
                break
        if len(pairs) == limit:
            break

    return pairs


def run_timed(label: str, func, *args) -> dict[str, Any]:
    start = time.perf_counter()
    result = func(*args)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return {"label": label, "elapsed_ms": elapsed_ms, "result": result}


def summarize_bfs(graph: Graph, sources: list[str]) -> list[dict[str, Any]]:
    rows = []
    for source in sources:
        timed = run_timed(f"BFS {source}", BFS, graph, graph.nodes[source])
        order, levels = timed["result"]
        level_counts = Counter(levels.values())
        rows.append(
            {
                "source": source,
                "visited": len(order),
                "max_level": max(levels.values()) if levels else 0,
                "level_counts": dict(sorted(level_counts.items())),
                "time_ms": round(timed["elapsed_ms"], 4),
            }
        )
    return rows


def summarize_dfs(graph: Graph, sources: list[str]) -> list[dict[str, Any]]:
    rows = []
    for source in sources:
        timed = run_timed(f"DFS {source}", DFS, graph, source)
        order, edge_types, has_cycle = timed["result"]
        type_counts = Counter(edge_type for _, _, edge_type in edge_types)
        rows.append(
            {
                "source": source,
                "visited": len(order),
                "has_cycle": bool(has_cycle),
                "edge_type_counts": dict(sorted(type_counts.items())),
                "time_ms": round(timed["elapsed_ms"], 4),
            }
        )
    return rows


def summarize_shortest_paths(graph: Graph, pairs: list[tuple[str, str]], algorithm_name: str) -> list[dict[str, Any]]:
    algorithm = Dijkstra if algorithm_name == "Dijkstra" else BellmanFord
    rows = []
    for source, target in pairs:
        start = time.perf_counter()
        try:
            distance, path = algorithm(graph, graph.nodes[source], graph.nodes[target])
            error = None
        except ValueError as exc:
            distance, path = float("inf"), []
            error = str(exc)
        elapsed_ms = (time.perf_counter() - start) * 1000
        row = {
            "source": source,
            "target": target,
            "distance": None if math.isinf(distance) else round(float(distance), 4),
            "path_length": len(path),
            "path": path,
            "time_ms": round(elapsed_ms, 4),
        }
        if error:
            row["error"] = error
        rows.append(row)
    return rows


def build_negative_case_report() -> dict[str, Any]:
    no_cycle = Graph()
    for key in ["A", "B", "C", "D"]:
        no_cycle.add_node(key, key, "Synthetic", 0.0, 0.0)
    no_cycle.add_edge("A", "B", 1)
    no_cycle.add_edge("B", "C", -2)
    no_cycle.add_edge("A", "C", 4)
    no_cycle.add_edge("C", "D", 2)
    distance, path = BellmanFord(no_cycle, no_cycle.nodes["A"], no_cycle.nodes["D"])

    negative_cycle = Graph()
    for key in ["A", "B", "C"]:
        negative_cycle.add_node(key, key, "Synthetic", 0.0, 0.0)
    negative_cycle.add_edge("A", "B", 1)
    negative_cycle.add_edge("B", "C", -2)
    negative_cycle.add_edge("C", "A", -2)

    try:
        BellmanFord(negative_cycle, negative_cycle.nodes["A"])
        detected = False
        error = None
    except ValueError as exc:
        detected = True
        error = str(exc)

    try:
        Dijkstra(no_cycle, no_cycle.nodes["A"], no_cycle.nodes["D"])
        dijkstra_rejected_negative = False
    except ValueError:
        dijkstra_rejected_negative = True

    return {
        "negative_weight_without_negative_cycle": {
            "source": "A",
            "target": "D",
            "distance": distance,
            "path": path,
        },
        "negative_cycle": {
            "detected": detected,
            "error": error,
        },
        "dijkstra_negative_weight_rejection": dijkstra_rejected_negative,
    }


def performance_summary(
    bfs_rows: list[dict[str, Any]],
    dfs_rows: list[dict[str, Any]],
    dijkstra_rows: list[dict[str, Any]],
    bellman_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    groups = [
        ("BFS", bfs_rows),
        ("DFS", dfs_rows),
        ("Dijkstra", dijkstra_rows),
        ("Bellman-Ford", bellman_rows),
    ]
    summary = []
    for name, rows in groups:
        values = [row["time_ms"] for row in rows]
        summary.append(
            {
                "algorithm": name,
                "tasks": len(rows),
                "mean_ms": round(mean(values), 4) if values else 0,
                "median_ms": round(median(values), 4) if values else 0,
                "max_ms": round(max(values), 4) if values else 0,
            }
        )
    return summary


def wrap_label(label: str, width: int = 22) -> str:
    return "\n".join(textwrap.wrap(label, width=width, break_long_words=False)) or label


def save_degree_distribution(records: list[dict[str, Any]], path: Path) -> None:
    degrees = [record["total_degree"] for record in records]
    max_degree = max(degrees)
    bins = range(0, max_degree + 6, 5)

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(degrees, bins=bins, color="#2563eb", edgecolor="white")
    ax.set_title("Parte 2 - Distribuicao de graus no grafo Wikipedia")
    ax.set_xlabel("Grau total (entrada + saida)")
    ax.set_ylabel("Quantidade de artigos")
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def save_hub_comparison(records: list[dict[str, Any]], path: Path) -> None:
    raw = sorted(records, key=lambda item: (-item["total_degree"], item["key"]))[:8]
    thematic = sorted(
        [record for record in records if not record["is_utility"]],
        key=lambda item: (-item["total_degree"], item["key"]),
    )[:8]

    fig, axes = plt.subplots(1, 2, figsize=(13, 6), sharex=True)
    for ax, rows, title, color in [
        (axes[0], raw, "Hubs brutos", "#7c3aed"),
        (axes[1], thematic, "Hubs tematicos filtrados", "#059669"),
    ]:
        labels = [wrap_label(row["key"], 24) for row in reversed(rows)]
        values = [row["total_degree"] for row in reversed(rows)]
        ax.barh(labels, values, color=color)
        ax.set_title(title)
        ax.set_xlabel("Grau total")
        ax.grid(axis="x", alpha=0.25)
        for i, value in enumerate(values):
            ax.text(value + 0.8, i, str(value), va="center", fontsize=9)

    fig.suptitle("Parte 2 - Hubs da Wikipedia: bruto vs tematico", y=1.02)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)


def save_algorithm_times(summary: list[dict[str, Any]], path: Path) -> None:
    labels = [item["algorithm"] for item in summary]
    values = [max(item["mean_ms"], 0.001) for item in summary]

    fig, ax = plt.subplots(figsize=(8.5, 5))
    bars = ax.bar(labels, values, color=["#2563eb", "#7c3aed", "#f97316", "#dc2626"])
    ax.set_title("Parte 2 - Tempo medio por algoritmo")
    ax.set_ylabel("Tempo medio por tarefa (ms)")
    ax.grid(axis="y", alpha=0.25)
    if max(values) / max(min(values), 0.001) > 20:
        ax.set_yscale("log")
        ax.set_ylabel("Tempo medio por tarefa (ms, escala log)")
    for bar, value in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height(),
            f"{value:.3f}",
            ha="center",
            va="bottom",
            fontsize=9,
        )
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def save_bfs_levels(bfs_row: dict[str, Any], path: Path) -> None:
    levels = list(bfs_row["level_counts"].keys())
    counts = list(bfs_row["level_counts"].values())

    fig, ax = plt.subplots(figsize=(8.5, 5))
    ax.bar([str(level) for level in levels], counts, color="#0891b2")
    ax.set_title(f"Parte 2 - Camadas BFS a partir de {bfs_row['source']}")
    ax.set_xlabel("Nivel BFS")
    ax.set_ylabel("Artigos alcancados")
    ax.grid(axis="y", alpha=0.25)
    for i, count in enumerate(counts):
        ax.text(i, count, str(count), ha="center", va="bottom", fontsize=9)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def save_distance_heatmap(graph: Graph, nodes: list[str], path: Path) -> None:
    matrix: list[list[float]] = []
    for source in nodes:
        row = []
        for target in nodes:
            distance, _ = Dijkstra(graph, graph.nodes[source], graph.nodes[target])
            row.append(float(distance))
        matrix.append(row)

    finite_values = [value for row in matrix for value in row if math.isfinite(value)]
    max_finite = max(finite_values) if finite_values else 1.0
    plot_matrix = [
        [value if math.isfinite(value) else max_finite * 1.15 for value in row]
        for row in matrix
    ]

    fig, ax = plt.subplots(figsize=(8.2, 6.6))
    image = ax.imshow(plot_matrix, cmap="YlGnBu")
    ax.set_title("Parte 2 - Heatmap de distancias por Dijkstra")
    ax.set_xticks(range(len(nodes)))
    ax.set_yticks(range(len(nodes)))
    ax.set_xticklabels([wrap_label(node, 14) for node in nodes], rotation=35, ha="right")
    ax.set_yticklabels([wrap_label(node, 16) for node in nodes])
    for i, row in enumerate(matrix):
        for j, value in enumerate(row):
            label = "inf" if not math.isfinite(value) else f"{value:.2f}"
            ax.text(j, i, label, ha="center", va="center", fontsize=8)
    fig.colorbar(image, ax=ax, fraction=0.046, pad=0.04, label="Custo acumulado")
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def write_notes(report: dict[str, Any], paths: dict[str, str], path: Path) -> None:
    top_raw = report["rankings"]["top_raw_hubs"][0]
    top_thematic = report["rankings"]["top_thematic_hubs"][0]
    lines = [
        "# Notas analiticas - Parte 2 (Wikipedia)",
        "",
        "## Leitura geral",
        f"- O grafo analisado tem {report['dataset']['nodes']} artigos e {report['dataset']['edges']} ligacoes direcionadas.",
        f"- A densidade e {report['dataset']['density']:.4f}, indicando um subgrafo esparso, mas com hubs bem definidos.",
        f"- O maior hub bruto e {top_raw['key']} ({top_raw['total_degree']} ligacoes).",
        f"- O maior hub tematico filtrado e {top_thematic['key']} ({top_thematic['total_degree']} ligacoes).",
        "",
        "## Visualizacoes geradas",
        f"- `{paths['degree_distribution']}`: mostra concentracao de muitos artigos com grau baixo e poucos hubs.",
        f"- `{paths['hub_comparison']}`: separa hubs utilitarios da Wikipedia de artigos tematicos relevantes.",
        f"- `{paths['algorithm_times']}`: compara o custo pratico dos algoritmos nas tarefas executadas.",
        f"- `{paths['bfs_levels']}`: mostra como o BFS expande o grafo por camadas a partir da fonte escolhida.",
        f"- `{paths['distance_heatmap']}`: compara custos de caminhos minimos entre hubs tematicos.",
        "",
        "## Discussao critica",
        "- BFS e adequado para alcance e camadas quando os pesos nao importam.",
        "- DFS e adequado para explorar profundidade, classificar arestas e detectar ciclos.",
        "- Dijkstra e adequado para caminhos minimos com pesos nao negativos; por isso usamos uma copia deslocada do grafo assinado.",
        "- Bellman-Ford e mais caro, mas cobre pesos negativos e detecta ciclos negativos no grafo assinado.",
        "- O peso da Wikipedia vem do distrust_score do artigo de destino; pesos negativos indicam paginas mais confiaveis/centrais pela regra atual.",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    graph_data = load_wiki_graph()
    graph = build_algorithm_graph(graph_data)
    dijkstra_graph = build_algorithm_graph(graph_data, non_negative=True)
    weights = graph_edge_weights(graph_data)
    records = degree_records(graph_data)
    sources = select_sources(records, limit=3)
    pairs = select_pairs(graph_data, records, limit=5)

    bfs_rows = summarize_bfs(graph, sources)
    dfs_rows = summarize_dfs(graph, sources)
    dijkstra_rows = summarize_shortest_paths(dijkstra_graph, pairs, "Dijkstra")
    bellman_rows = summarize_shortest_paths(graph, pairs, "Bellman-Ford")
    negative_cases = build_negative_case_report()
    perf = performance_summary(bfs_rows, dfs_rows, dijkstra_rows, bellman_rows)

    total_degrees = [record["total_degree"] for record in records]
    density = len(graph_data["edges"]) / (len(graph_data["nodes"]) * (len(graph_data["nodes"]) - 1))
    top_raw = sorted(records, key=lambda item: (-item["total_degree"], item["key"]))[:10]
    top_thematic = sorted(
        [record for record in records if not record["is_utility"]],
        key=lambda item: (-item["total_degree"], item["key"]),
    )[:10]
    utility_count = sum(1 for record in records if record["is_utility"])

    output_paths = {
        "degree_distribution": "out/parte2_distribuicao_graus.png",
        "hub_comparison": "out/parte2_hubs_brutos_vs_tematicos.png",
        "algorithm_times": "out/parte2_tempos_algoritmos.png",
        "bfs_levels": "out/parte2_bfs_camadas.png",
        "distance_heatmap": "out/parte2_heatmap_distancias.png",
        "report": "out/parte2_report.json",
        "notes": "out/parte2_notas_analiticas.md",
    }

    report = {
        "dataset": {
            "name": "Wikipedia static subgraph",
            "source_file": str(GRAPH_JSON.relative_to(ROOT)),
            "nodes": len(graph_data["nodes"]),
            "edges": len(graph_data["edges"]),
            "type": "directed_weighted",
            "density": density,
            "degree": {
                "min": min(total_degrees),
                "max": max(total_degrees),
                "mean": round(mean(total_degrees), 4),
                "median": median(total_degrees),
            },
            "utility_nodes_detected": utility_count,
            "weight_rule": "target article distrust_score, inherited from src/wikipedia_pipeline/graph_builder.py",
            "weight": {
                "min": min(weights) if weights else None,
                "max": max(weights) if weights else None,
                "has_negative": any(weight < 0 for weight in weights),
                "dijkstra_transform": "Dijkstra uses a non-negative shifted copy of the signed graph.",
            },
        },
        "rankings": {
            "top_raw_hubs": top_raw,
            "top_thematic_hubs": top_thematic,
        },
        "algorithm_runs": {
            "sources": sources,
            "pairs": [{"source": source, "target": target} for source, target in pairs],
            "bfs": bfs_rows,
            "dfs": dfs_rows,
            "dijkstra": dijkstra_rows,
            "bellman_ford": {
                "signed_graph": bellman_rows,
                "negative_cases": negative_cases,
            },
        },
        "performance_summary": perf,
        "visualizations": output_paths,
        "insights": [
            "Raw hubs are dominated by utility/reference pages; thematic filtering gives a better narrative ranking.",
            "BFS exposes reachability by layers, while DFS is better for cycle and edge-classification behavior.",
            "Dijkstra is the practical choice for non-negative weighted paths; Bellman-Ford is slower but necessary for negative weights and negative-cycle detection.",
        ],
    }

    save_degree_distribution(records, OUT_DIR / "parte2_distribuicao_graus.png")
    save_hub_comparison(records, OUT_DIR / "parte2_hubs_brutos_vs_tematicos.png")
    save_algorithm_times(perf, OUT_DIR / "parte2_tempos_algoritmos.png")
    save_bfs_levels(bfs_rows[0], OUT_DIR / "parte2_bfs_camadas.png")
    heatmap_nodes = [record["key"] for record in top_thematic[:5]]
    save_distance_heatmap(dijkstra_graph, heatmap_nodes, OUT_DIR / "parte2_heatmap_distancias.png")

    with (OUT_DIR / "parte2_report.json").open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)
    write_notes(report, output_paths, OUT_DIR / "parte2_notas_analiticas.md")

    print("Generated Part 2 outputs:")
    for path in output_paths.values():
        print(f"- {path}")


if __name__ == "__main__":
    main()
