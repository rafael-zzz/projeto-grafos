"""
graph_exporter.py

Merges nodes.csv + layout.csv + edges.csv and writes frontend/public/wiki_graph.json
in the same shape the frontend expects.
"""

import pandas as pd
import json
import os
import constants as c

nodes  = pd.read_csv(c.NODES_CSV)
layout = pd.read_csv(c.LAYOUT_CSV)
edges  = pd.read_csv(c.EDGES_CSV)

merged = nodes.merge(layout, on="title")

SKIP_PREFIXES = (
    "Articles_", "Short_", "CS1", "Pages_", "All_articles",
    "Use_", "Commons_", "Webarchive_", "Wikipedia_", "Harv_",
)

def parse_categories(raw):
    if not isinstance(raw, str):
        return []
    try:
        cats = json.loads(raw)
    except Exception:
        return []
    return [
        c.replace("_", " ")
        for c in cats
        if not any(c.startswith(s) for s in SKIP_PREFIXES)
    ][:6]

wiki_nodes = [
    {
        "key": row["title"],
        "attributes": {
            "label": row["title"],
            "title": row["title"],
            "url":   row["url"],
            "word_count": int(row["word_count"]),
            "categories": parse_categories(row.get("categories", "")),
            "x":    round(float(row["x"]), 5),
            "y":    round(float(row["y"]), 5),
            "z":    round(float(row["z"]), 5),
            "size": round(float(row["size"]), 2),
        },
    }
    for _, row in merged.iterrows()
]

wiki_edges = [
    {
        "key":    f"e{i}",
        "source": row["source_title"],
        "target": row["target_title"],
        "attributes": {"weight": round(float(row["weight"]), 4)},
    }
    for i, (_, row) in enumerate(edges.iterrows())
]

os.makedirs(c.FRONTEND_PUBLIC, exist_ok=True)
with open(c.WIKI_GRAPH_JSON, "w", encoding="utf-8") as f:
    json.dump({"nodes": wiki_nodes, "edges": wiki_edges}, f, ensure_ascii=False)

print(f"Exported {len(wiki_nodes)} nodes, {len(wiki_edges)} edges → {c.WIKI_GRAPH_JSON}")
