class Edge:
    def __init__(self,origin,destination,weight):
        self.destination = destination
        self.origin = origin
        self.weight = weight
        self.justification = "mesma região" if origin == destination else "regiões diferentes"
        self.type = "regional" if origin == destination else "inter-regional"

class Graph:
    def init(self):
        self.nodes = {}


