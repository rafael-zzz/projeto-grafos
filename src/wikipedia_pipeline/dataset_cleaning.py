"""
dataset_cleaning.py

1. Removes links whose source or target is not a known page.
2. Removes pages with degree < 2 (isolated or leaf nodes) and their edges.
   This is applied iteratively until no more pages fall below the threshold,
   computing the 2-core of the graph.

Writes clean_links.csv and clean_pages.csv for the rest of the pipeline.
"""

import pandas as pd
import constants as c

print("Reading pages...")
pages = pd.read_csv(c.PAGES_CSV)
print(f"  {len(pages)} pages in pages_export.csv")

print("Reading links (large file, may take a moment)...")
links = pd.read_csv(c.LINKS_CSV, usecols=["source_title", "target_title"])
print(f"  {len(links)} raw links loaded")

known = set(pages["title"])
clean_links = links[
    links["source_title"].isin(known) &
    links["target_title"].isin(known)
].reset_index(drop=True)
print(f"  {len(clean_links)} internal links after removing unknown endpoints")

# Iteratively remove pages with degree < 2 until the graph stabilises.
# Each pass may expose new low-degree nodes created by earlier removals.
iteration = 0
while True:
    iteration += 1
    degree = (
        pd.concat([
            clean_links["source_title"].rename("title"),
            clean_links["target_title"].rename("title"),
        ])
        .value_counts()
        .rename("degree")
    )
    low = set(degree[degree < 2].index)
    if not low:
        break
    clean_links = clean_links[
        ~clean_links["source_title"].isin(low) &
        ~clean_links["target_title"].isin(low)
    ].reset_index(drop=True)

print(f"  {iteration} pass(es) to reach stable 2-core")

linked      = set(clean_links["source_title"]) | set(clean_links["target_title"])
clean_pages = pages[pages["title"].isin(linked)].reset_index(drop=True)

print(f"  {len(clean_pages)} pages remaining, {len(clean_links)} edges remaining")

clean_links.to_csv(c.CLEAN_LINKS_CSV, index=False)
clean_pages.to_csv(c.CLEAN_PAGES_CSV, index=False)

print(f"Written: {c.CLEAN_LINKS_CSV}")
print(f"Written: {c.CLEAN_PAGES_CSV}")
