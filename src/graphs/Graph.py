from graphs.Node import Node

class Graph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, iata, name, city, value, region):
        if iata not in self.nodes:
            self.nodes[iata] = Node(iata, name, city, value, region)

    def add_edge(self, origin_iata, destination_iata, weight, tipo_conexao="", justificativa=""):
        if origin_iata in self.nodes and destination_iata in self.nodes:
            self.nodes[origin_iata].add_edge(
                self.nodes[destination_iata], weight, tipo_conexao, justificativa
            )
