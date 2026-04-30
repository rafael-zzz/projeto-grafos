import sys
import os

raiz_do_projeto = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

pasta_src = os.path.join(raiz_do_projeto, 'src')
sys.path.append(pasta_src)

from graphs.Graph import Graph
from graphs.algorithms import Dijkstra
from graphs.Node import Node

g = Graph()

# Lembre-se da assinatura: add_node(iata, name, city, value, region)
g.add_node("GRU", "Guarulhos", "São Paulo", 100, "Sudeste")
g.add_node("SSA", "Dep. Luís Eduardo Magalhães", "Salvador", 80, "Nordeste")
g.add_node("REC", "Guararapes", "Recife", 90, "Nordeste")
g.add_node("FOR", "Pinto Martins", "Fortaleza", 70, "Nordeste")

#  Adicionar as arestas (Voos) com pesos
g.nodes["GRU"].add_edge(g.nodes["SSA"], 10)
g.nodes["SSA"].add_edge(g.nodes["REC"], 5)
g.nodes["GRU"].add_edge(g.nodes["REC"], 20)
g.nodes["REC"].add_edge(g.nodes["FOR"], 8)

origem = g.nodes["GRU"]
destino = g.nodes["FOR"]

distancia_total, rota = Dijkstra(g, origem, destino)

print(f"--- TESTE DE ROTA ---")
print(f"Origem: {origem.city} ({origem.iata})")
print(f"Destino: {destino.city} ({destino.iata})")
print(f"Custo total: {distancia_total}")
print(f"Caminho: {' -> '.join(rota)}")

# Validação esperada:
# O caminho mais curto deve ser GRU -> SSA -> REC -> FOR (Custo: 10+5+8 = 23)
# Em vez de GRU -> REC -> FOR (Custo: 20+8 = 28)