from __future__ import annotations

from pathlib import Path
from typing import Iterable

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

from graphs.algorithms import Dijkstra
from graphs.graph import Graph

DEFAULT_ROUTE_SPECS: list[tuple[str, str, str, str]] = [
    ("SBRF", "SBPA", "Recife → Porto Alegre", "#dc2626"),
    ("SBEG", "SBGR", "Manaus → São Paulo", "#2563eb"),
]


def mercator_project(lon: float, lat: float) -> tuple[float, float]:
    bounds = {"w": -74, "e": -28, "s": -34.5, "n": 5.5}

    def merc_y(latitude: float) -> float:
        return float(__import__("math").log(__import__("math").tan(__import__("math").pi / 4 + (latitude * __import__("math").pi) / 360)))

    merc_n = merc_y(bounds["n"])
    merc_s = merc_y(bounds["s"])
    x = ((lon - bounds["w"]) / (bounds["e"] - bounds["w"])) * 1800 - 900
    y = (1 - (merc_y(lat) - merc_s) / (merc_n - merc_s)) * 1500 - 750
    return x, y


def build_route_tree(
    graph: Graph,
    route_specs: Iterable[tuple[str, str, str, str]] = DEFAULT_ROUTE_SPECS,
) -> dict[str, object]:
    node_keys: set[str] = set()
    segment_map: dict[tuple[str, str], dict[str, object]] = {}
    route_summaries: list[dict[str, object]] = []

    for origin, destination, label, color in route_specs:
        if origin not in graph.nodes or destination not in graph.nodes:
            raise ValueError(f"Aeroporto ausente no grafo: {origin} -> {destination}")

        cost, path = Dijkstra(graph, graph.nodes[origin], graph.nodes[destination])
        if not path:
            raise ValueError(f"Nao foi possivel calcular o caminho {origin} -> {destination}")

        node_keys.update(path)
        route_summaries.append({
            "origin": origin,
            "destination": destination,
            "label": label,
            "color": color,
            "cost": cost,
            "path": path,
        })

        for start, end in zip(path, path[1:]):
            segment = segment_map.setdefault((start, end), {"source": start, "target": end, "routes": []})
            segment["routes"].append(label)

    node_map = {
        icao: {
            "icao": icao,
            "city": graph.nodes[icao].city,
            "region": graph.nodes[icao].region,
            "lat": graph.nodes[icao].lat,
            "lon": graph.nodes[icao].lon,
        }
        for icao in sorted(node_keys)
    }

    segments = []
    for segment in segment_map.values():
        routes = segment["routes"]
        segments.append({
            **segment,
            "shared": len(routes) > 1,
            "route_label": routes[0],
        })

    return {"nodes": node_map, "segments": segments, "routes": route_summaries}


def export_route_tree_artifacts(
    graph: Graph,
    png_path: str = "../out/arvore_percurso.png",
    html_path: str = "../out/arvore_percurso.html",
    route_specs: Iterable[tuple[str, str, str, str]] = DEFAULT_ROUTE_SPECS,
) -> None:
    tree = build_route_tree(graph, route_specs)
    nodes: dict[str, dict[str, object]] = tree["nodes"]
    segments: list[dict[str, object]] = tree["segments"]
    routes: list[dict[str, object]] = tree["routes"]

    png_file = Path(png_path)
    html_file = Path(html_path)
    png_file.parent.mkdir(parents=True, exist_ok=True)
    html_file.parent.mkdir(parents=True, exist_ok=True)

    positions = {
        icao: mercator_project(float(node["lon"]), float(node["lat"]))
        for icao, node in nodes.items()
    }

    xs = [x for x, _ in positions.values()]
    ys = [y for _, y in positions.values()]
    x_pad = max((max(xs) - min(xs)) * 0.08, 50)
    y_pad = max((max(ys) - min(ys)) * 0.08, 50)

    fig, ax = plt.subplots(figsize=(14, 10), dpi=180)
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#ffffff")

    for segment in segments:
      source = str(segment["source"])
      target = str(segment["target"])
      x1, y1 = positions[source]
      x2, y2 = positions[target]
      color = "#111827" if segment["shared"] else next(
          route["color"] for route in routes if route["label"] == segment["route_label"]
      )
      width = 4.2 if segment["shared"] else 3.0
      ax.plot([x1, x2], [y1, y2], color=color, linewidth=width, alpha=0.92, zorder=1)

    for icao, node in nodes.items():
        x, y = positions[icao]
        incident_routes = [route["label"] for route in routes if icao in route["path"]]
        fill = "#111827" if len(incident_routes) > 1 else next(
            route["color"] for route in routes if icao in route["path"]
        )
        ax.scatter([x], [y], s=220, color=fill, edgecolors="#ffffff", linewidths=1.5, zorder=3)
        ax.text(
            x,
            y,
            icao,
            ha="center",
            va="center",
            fontsize=9,
            fontweight="bold",
            color="#ffffff",
            zorder=4,
        )

    legend_handles = [
        Patch(facecolor=route["color"], edgecolor="none", label=route["label"])
        for route in routes
    ]
    legend_handles.append(Line2D([0], [0], color="#111827", linewidth=4.2, label="Trecho compartilhado"))

    ax.legend(handles=legend_handles, loc="lower left", frameon=True, facecolor="white", framealpha=0.95)
    ax.set_title("Árvore de percurso — Recife → Porto Alegre e Manaus → São Paulo", fontsize=16, fontweight="bold", pad=18)
    ax.text(
        0.5,
        1.01,
        "Subgrafo com os caminhos mínimos obrigatórios; rótulos mostram os aeroportos e a espessura destaca os trechos do percurso.",
        transform=ax.transAxes,
        ha="center",
        va="bottom",
        fontsize=10,
        color="#475569",
    )

    ax.set_xlim(min(xs) - x_pad, max(xs) + x_pad)
    ax.set_ylim(min(ys) - y_pad, max(ys) + y_pad)
    ax.set_aspect("equal", adjustable="box")
    ax.axis("off")

    fig.tight_layout(rect=(0, 0, 1, 0.97))
    fig.savefig(png_file, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)

    route_lines = "\n".join(
        f"<li><strong>{route['label']}</strong>: {route['origin']} → {route['destination']} · custo {route['cost']:.4f} · {len(route['path']) - 1} trecho(s)</li>"
        for route in routes
    )

    html_file.write_text(
        f"""<!doctype html>
<html lang=\"pt-BR\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Árvore de percurso</title>
    <style>
      :root {{ color-scheme: light; }}
      body {{ margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #0f172a; }}
      .wrap {{ max-width: 1200px; margin: 0 auto; padding: 24px; }}
      .card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08); overflow: hidden; }}
      header {{ padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }}
      h1 {{ margin: 0; font-size: 22px; }}
      p {{ margin: 8px 0 0; color: #475569; }}
      ul {{ margin: 16px 0 0; padding-left: 20px; color: #334155; }}
      img {{ display: block; width: 100%; height: auto; }}
      .meta {{ padding: 16px 24px 24px; }}
      a {{ color: #0f766e; }}
    </style>
  </head>
  <body>
    <div class=\"wrap\">
      <div class=\"card\">
        <header>
          <h1>Árvore de percurso</h1>
          <p>Subgrafo dos caminhos mínimos obrigatórios de Recife → Porto Alegre e Manaus → São Paulo.</p>
        </header>
        <img src=\"arvore_percurso.png\" alt=\"Árvore de percurso com aeroportos rotulados\" />
        <div class=\"meta\">
          <strong>Rotas destacadas</strong>
          <ul>
            {route_lines}
          </ul>
          <p><a href=\"arvore_percurso.png\" target=\"_blank\" rel=\"noreferrer\">Abrir imagem em tamanho completo</a></p>
        </div>
      </div>
    </div>
  </body>
</html>
""",
        encoding="utf-8",
    )
