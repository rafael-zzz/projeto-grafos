from node2 import Node

class Graph:
    def __init__(self):
        self.nodes = {}

    def add_node(self, user_id: str):
        if user_id not in self.nodes:
            self.nodes[user_id] = Node(user_id)

    def add_edge(self, origin_id: str, destination_id: str, weight: float = 1.0):
        if origin_id in self.nodes and destination_id in self.nodes:
            node_destination = self.nodes[destination_id]
            self.nodes[origin_id].add_edge(node_destination, weight)
        else:
            print(f"Error: One of the nodes ({origin_id} or {destination_id}) doesnt exist")