"""
adjacency_builder.py

Builds two compact JSON files consumed by the frontend BFS/DFS explorer:

  wiki_adjacency.json  { title: [neighbor_title, ...] }
  wiki_pages.json      { title: { word_count, url, categories, distrust_score } }

These are derived from the 2-core-cleaned dataset so every node has degree >= 2.
"""

import json
import os
import pandas as pd
import constants as c

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
        cat.replace("_", " ")
        for cat in cats
        if not any(cat.startswith(s) for s in SKIP_PREFIXES)
    ][:6]

print("Reading clean files...")
pages = pd.read_csv(c.CLEAN_PAGES_CSV)
links = pd.read_csv(c.CLEAN_LINKS_CSV)

print("Reading calculated top nodes...")
try:
    nodes = pd.read_csv(c.NODES_CSV)
    distrust_dict = dict(zip(nodes['title'], nodes['distrust_score']))
except FileNotFoundError:
    distrust_dict = {}

print(f"  {len(pages)} pages, {len(links)} edges")

adj = (
    links.groupby("source_title")["target_title"]
         .apply(list)
         .to_dict()
)

pages_meta = {
    row["title"]: {
        "word_count": int(row["word_count"]),
        "url": row["url"],
        "categories": parse_categories(row.get("categories", "")),
        "distrust_score": distrust_dict.get(row["title"], 50.0)
    }
    for _, row in pages.iterrows()
}

os.makedirs(c.FRONTEND_PUBLIC, exist_ok=True)

with open(c.WIKI_ADJACENCY_JSON, "w", encoding="utf-8") as f:
    json.dump(adj, f, ensure_ascii=False)

with open(c.WIKI_PAGES_JSON, "w", encoding="utf-8") as f:
    json.dump(pages_meta, f, ensure_ascii=False)

print(f"Written: {c.WIKI_ADJACENCY_JSON}  ({len(adj)} source nodes)")
print(f"Written: {c.WIKI_PAGES_JSON}  ({len(pages_meta)} pages)")
