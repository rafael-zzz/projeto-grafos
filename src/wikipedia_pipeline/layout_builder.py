"""
layout_builder.py

Assigns each node a position on a unit sphere using the Fibonacci sphere
algorithm (evenly distributed points), then scales node size by degree.
Writes layout.csv with columns: title, x, y, z, size.
"""

import pandas as pd
import numpy as np
import constants as c

nodes = pd.read_csv(c.NODES_CSV)
n = len(nodes)

# Fibonacci sphere: evenly distributes n points across a unit sphere surface
golden  = (1 + 5 ** 0.5) / 2
indices = np.arange(n, dtype=float)
theta   = 2 * np.pi * indices / golden
phi     = np.arccos(1 - 2 * (indices + 0.5) / n)

nodes["x"] = np.sin(phi) * np.cos(theta)
nodes["y"] = np.sin(phi) * np.sin(theta)
nodes["z"] = np.cos(phi)

deg      = nodes["degree"].astype(float)
deg_min  = deg.min()
deg_max  = deg.max()
nodes["size"] = (
    c.MIN_NODE_SIZE
    + (c.MAX_NODE_SIZE - c.MIN_NODE_SIZE)
    * (deg - deg_min) / (deg_max - deg_min + 1e-9)
).round(2)

layout = nodes[["title", "x", "y", "z", "size"]]
layout.to_csv(c.LAYOUT_CSV, index=False)
print(f"Written: {c.LAYOUT_CSV} ({n} nodes with sphere coordinates)")
