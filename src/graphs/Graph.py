from Node import Node

class Graph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, iata, name, city, value, region):
        if iata not in self.nodes:
            new_node = Node(iata, name, city, value, region)
            self.nodes[iata] = new_node

    def add_edge(self, origin_iata, destination_iata,weight):
        if origin_iata in self.nodes and destination_iata in self.nodes:
            origin_node = self.nodes[origin_iata]
            destination_node = self.nodes[destination_iata]
            origin_node.add_edge(destination_node,weight)