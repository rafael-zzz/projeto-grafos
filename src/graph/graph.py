from .node import Node

class Graph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, icao: str, city: str, region: str, lat: float, lon: float):
        if icao not in self.nodes:
            self.nodes[icao] = Node(icao, city, region, lat, lon)

    def add_edge(self, origin_icao: str, destination_icao: str, weight: float, flights: int = 1, connection_type: str = ""):
        if origin_icao in self.nodes and destination_icao in self.nodes:
            node_destination = self.nodes[destination_icao]
            self.nodes[origin_icao].add_edge(node_destination, weight, flights, connection_type)
        else:
            print(f"Erro: Um dos nós ({origin_icao} ou {destination_icao}) não existe no grafo.")