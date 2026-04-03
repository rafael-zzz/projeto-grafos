class Edge:
    def init(self, destination, weight, origin):
        self.destination = destination
        self.weight = weight
        self.origin = origin
        self.justification = "mesma região" if origin == destination else "regiões diferentes"
        self.type = "regional" if origin == destination else "inter-regional"

class Graph:
    def init(self):
        self.nodes = {}