import pandas as pd
import math
import ast
import constants as c

"""
graph_builder.py
Reads clean_pages.csv and clean_links.csv (produced by dataset_cleaning.py),
computes degree for each page, keeps the top TOP_N_NODES pages by degree,
filters edges to those between kept pages, applies a per-node edge cap, and
writes nodes.csv + edges.csv.
"""

print("Reading clean pages...")
pages = pd.read_csv(c.CLEAN_PAGES_CSV)
print(f"  {len(pages)} pages loaded")

print("Reading clean links...")
links = pd.read_csv(c.CLEAN_LINKS_CSV)
print(f"  {len(links)} links loaded")

out_deg = links.groupby("source_title").size().rename("out_degree")
in_deg = links.groupby("target_title").size().rename("in_degree")

pages = pages.join(out_deg, on="title").join(in_deg, on="title")
pages["out_degree"] = pages["out_degree"].fillna(0).astype(int)
pages["in_degree"] = pages["in_degree"].fillna(0).astype(int)
pages["degree"] = pages["out_degree"] + pages["in_degree"]

top_pages = pages.nlargest(c.TOP_N_NODES, "degree").reset_index(drop=True)
top_titles = set(top_pages["title"])
print(f"  Keeping top {c.TOP_N_NODES} nodes (min degree: {top_pages['degree'].min()})")

print("  Calculating  distrust score...")

BAD_TAGS = [
    'dead', 'unsourced', 'needing', 'unfit', 'errors', 'failed',
    'lacking', 'technical', 'expert', 'original_research', 'dated',
    'incomplete', 'cleanup', 'dispute', 'clarification', 'unreferenced',
    'sources', 'accuracy', 'neutrality', 'stub', 'pov'
]

GOOD_TAGS = [
    'protected', 'good_articles', 'featured_articles'
]


def extract_tags_weight(categories_str):
    weight = 0
    if pd.notna(categories_str):
        try:
            categories_list = ast.literal_eval(categories_str)
            for cat in categories_list:
                cat_lower = cat.lower()
                if any(bad_tag in cat_lower for bad_tag in BAD_TAGS):
                    weight -= 1
                elif any(good_tag in cat_lower for good_tag in GOOD_TAGS):
                    weight += 1
        except Exception:
            pass
    return weight


def calculate_distrust(row):
    in_degree = row['in_degree']
    tags_weight = extract_tags_weight(row.get('categories', ''))

    mentions_trust = -5 * math.log10(in_degree + 1)

    if tags_weight < 0:
        tags_effect = (abs(tags_weight) ** 2) / 10
    else:
        tags_effect = -2 * tags_weight

    return round(mentions_trust + tags_effect, 4)


top_pages['distrust_score'] = top_pages.apply(calculate_distrust, axis=1)

edges = links[
    links["source_title"].isin(top_titles) &
    links["target_title"].isin(top_titles)
    ].copy()

edge_df = (
    edges.groupby(["source_title", "target_title"])
    .size()
    .reset_index(name="count")
)

distrust_dict = dict(zip(top_pages['title'], top_pages['distrust_score']))


def calculate_edge_weight(row):
    target = row['target_title']
    target_distrust = distrust_dict.get(target, 0)
    final_weight =target_distrust
    return round(final_weight, 4)


edge_df["weight"] = edge_df.apply(calculate_edge_weight, axis=1)

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
