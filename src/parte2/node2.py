from edge2 import Edge

class Node:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.edges = []

    def add_edge(self, destination, weight: float = 1.0):
        new_edge = Edge(self, destination, weight)
        self.edges.append(new_edge)

    def get_id(self) -> str:
        return self.user_id

    def __repr__(self):
        return f"Node(User ID: {self.user_id})"