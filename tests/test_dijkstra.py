import sys
import os

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src_path = os.path.join(project_root, 'src')
sys.path.append(src_path)

from graphs.Graph import Graph
from graphs.algorithms import Dijkstra
from graphs.Node import Node

g = Graph()

g.add_node("GRU", "Guarulhos", "São Paulo", 100, "Sudeste")
g.add_node("SSA", "Dep. Luís Eduardo Magalhães", "Salvador", 80, "Nordeste")
g.add_node("REC", "Guararapes", "Recife", 90, "Nordeste")
g.add_node("FOR", "Pinto Martins", "Fortaleza", 70, "Nordeste")

g.nodes["GRU"].add_edge(g.nodes["SSA"], 10)
g.nodes["SSA"].add_edge(g.nodes["REC"], 5)
g.nodes["GRU"].add_edge(g.nodes["REC"], 20)
g.nodes["REC"].add_edge(g.nodes["FOR"], 8)

origin = g.nodes["GRU"]
destination = g.nodes["FOR"]

total_distance, route = Dijkstra(g, origin, destination)

print(f"--- ROUTE TEST ---")
print(f"Origin: {origin.city} ({origin.iata})")
print(f"Destination: {destination.city} ({destination.iata})")
print(f"Total cost: {total_distance}")
print(f"Path: {' -> '.join(route)}")
