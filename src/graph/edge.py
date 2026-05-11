class Edge:
    def __init__(self, origin, destination, weight: float, flights: int = 1, connection_type: str = ""):
        self.origin = origin
        self.destination = destination
        self.weight = weight
        self.flights = flights
        self.connection_type = connection_type

    def __repr__(self):
        return f"Edge({self.origin.icao} -> {self.destination.icao}, peso={self.weight})"