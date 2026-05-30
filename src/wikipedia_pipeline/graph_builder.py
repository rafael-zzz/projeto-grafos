"""
graph_builder.py

Reads clean_pages.csv and clean_links.csv (produced by dataset_cleaning.py),
computes degree for each page, keeps the top TOP_N_NODES pages by degree,
filters edges to those between kept pages, applies a per-node edge cap, and
writes nodes.csv + edges.csv.
"""

import pandas as pd
from math import log1p
import constants as c

print("Reading clean pages...")
pages = pd.read_csv(c.CLEAN_PAGES_CSV)
print(f"  {len(pages)} pages loaded")

print("Reading clean links...")
links = pd.read_csv(c.CLEAN_LINKS_CSV)
print(f"  {len(links)} links loaded")

out_deg = links.groupby("source_title").size().rename("out_degree")
in_deg  = links.groupby("target_title").size().rename("in_degree")

pages = pages.join(out_deg, on="title").join(in_deg, on="title")
pages["out_degree"] = pages["out_degree"].fillna(0).astype(int)
pages["in_degree"]  = pages["in_degree"].fillna(0).astype(int)
pages["degree"]     = pages["out_degree"] + pages["in_degree"]

top_pages  = pages.nlargest(c.TOP_N_NODES, "degree").reset_index(drop=True)
top_titles = set(top_pages["title"])
print(f"  Keeping top {c.TOP_N_NODES} nodes (min degree: {top_pages['degree'].min()})")

edges = links[
    links["source_title"].isin(top_titles) &
    links["target_title"].isin(top_titles)
]
edge_df = (
    edges.groupby(["source_title", "target_title"])
         .size()
         .reset_index(name="count")
)
edge_df["weight"] = edge_df["count"].apply(lambda freq: round(1 / log1p(freq), 4))

# Keep only the MAX_EDGES_PER_NODE highest-frequency outgoing edges per source.
edge_df = (
    edge_df.sort_values("weight")
           .groupby("source_title", group_keys=False)
           .head(c.MAX_EDGES_PER_NODE)
           .reset_index(drop=True)
)

top_pages.to_csv(c.NODES_CSV, index=False)
edge_df.to_csv(c.EDGES_CSV, index=False)

print(f"Written: {c.NODES_CSV} ({len(top_pages)} nodes)")
print(f"Written: {c.EDGES_CSV} ({len(edge_df)} edges)")
