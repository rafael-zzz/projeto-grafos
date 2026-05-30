from .edge import Edge

class Node:
    def __init__(self, icao: str, city: str = None, region: str = None, lat: float = None, lon: float = None):
        self.icao = icao
        self.city = city
        self.region = region
        self.lat = lat
        self.lon = lon
        self.edges = []

    def add_edge(self, destination, weight: float, flights: int = 1, connection_type: str = ""):
        new_edge = Edge(self, destination, weight, flights, connection_type)
        self.edges.append(new_edge)

    def __repr__(self):
        return f"Node({self.icao}{f', {self.city}' if self.city else ''})"

    def get_id(self) -> str:
        return self.icao