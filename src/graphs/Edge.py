class Edge:
    def __init__(self, origin, destination, weight, tipo_conexao="", justificativa=""):
        self.origin = origin
        self.destination = destination
        self.weight = weight
        self.tipo_conexao = tipo_conexao
        self.justificativa = justificativa
