class Edge:
    def __init__(self, origin, destination, weight: float = 1.0):
        self.origin = origin
        self.destination = destination
        self.weight = weight

    def __repr__(self):
        return f"Edge({self.origin.user_id} -> {self.destination.user_id}, peso={self.weight})"