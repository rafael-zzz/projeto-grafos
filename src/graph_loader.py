"""
Arquivo: graph_loader.py

Mapeia os nomes das colunas dos CSVs nos atributos dos grafos.

"""

import pandas as pd
from graph.graph import Graph

def build_graph_from_csv(nodes_path, edges_path):
    g = Graph()
    
    df_nodes = pd.read_csv(nodes_path)
    for _, row in df_nodes.iterrows():
        g.add_node(
            icao=row['icao'],
            city=row['cidade'],
            region=row['regiao'],
            lat=float(row['lat']),
            lon=float(row['lon'])
        )
        
    df_edges = pd.read_csv(edges_path)
    for _, row in df_edges.iterrows():
        g.add_edge(
            origin_icao=row['origem'],
            destination_icao=row['destino'],
            weight=float(row['peso']),
            flights=int(row['quantidade']),
            connection_type=row['tipo_conexao']
        )
        
    return g