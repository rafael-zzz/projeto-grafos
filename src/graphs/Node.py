from graphs.Edge import Edge
   
class Node: 
    def __init__(self, iata, name, city, value, region):
        self.iata = iata
        self.name = name
        self.city = city
        self.value = value
        self.region = region
        self.edges = []

    def add_edge(self, destination_node, weight):

        new_edge = Edge(self, destination_node, weight)
        self.edges.append(new_edge)
