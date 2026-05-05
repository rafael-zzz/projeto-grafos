from typing import Any

def calculate_base_metrics(node: list[Any] | set[Any], edges: list[Any] | set[Any]) -> tuple[int, int, float]: 

    order = len(node)
    size = len(edges)
    
    if order < 2:
        density = 0.0
    else:
        density = (2 * size) / (order * (order - 1))
        
    return order, size, density ## retorna a ordem, o tamanho e a densidade do grafo/subgrafo