#!/usr/bin/env python3
import sys
import os

from graphs.io import load_graph, export_routes, load_routes
from graphs.algorithms import BFS, DFS, Dijkstra, BellmanFord
from solve import solve


def cmd_solve(_args):
    solve()


def cmd_bfs(args):
    if not args:
        print("Uso: cli.py bfs <ICAO>")
        sys.exit(1)
    origin = args[0].upper()
    graph = load_graph()
    if origin not in graph.nodes:
        print(f"Aeroporto '{origin}' nao encontrado.")
        sys.exit(1)
    order, levels = BFS(graph, graph.nodes[origin])
    print(f"BFS a partir de {origin}:")
    for icao in order:
        print(f"  {icao}  (nivel {levels[icao]})")


def cmd_dfs(args):
    origin = args[0].upper() if args else None
    graph = load_graph()
    if origin and origin not in graph.nodes:
        print(f"Aeroporto '{origin}' nao encontrado.")
        sys.exit(1)
    order, edge_types, has_cycle = DFS(graph, origin)
    print(f"DFS {'a partir de ' + origin if origin else '(todos os nos)'}:")
    print(f"  Ordem de visita: {' -> '.join(order)}")
    print(f"  Tem ciclo: {'sim' if has_cycle else 'nao'}")
    back_edges = [(u, v) for u, v, t in edge_types if t == "back"]
    if back_edges:
        print(f"  Arestas de retorno: {back_edges}")


def cmd_dijkstra(args):
    if len(args) < 2:
        print("Uso: cli.py dijkstra <ORIG> <DEST>")
        sys.exit(1)
    orig, dest = args[0].upper(), args[1].upper()
    graph = load_graph()
    for icao in [orig, dest]:
        if icao not in graph.nodes:
            print(f"Aeroporto '{icao}' nao encontrado.")
            sys.exit(1)
    dist, path = Dijkstra(graph, graph.nodes[orig], graph.nodes[dest])
    if dist == float("inf"):
        print(f"Sem caminho de {orig} para {dest}.")
    else:
        print(f"Menor caminho {orig} -> {dest}:")
        print(f"  Rota:  {' -> '.join(path)}")
        print(f"  Custo: {dist:.4f}")


def cmd_bellman_ford(args):
    if len(args) < 2:
        print("Uso: cli.py bellman-ford <ORIG> <DEST>")
        sys.exit(1)
    orig, dest = args[0].upper(), args[1].upper()
    graph = load_graph()
    for icao in [orig, dest]:
        if icao not in graph.nodes:
            print(f"Aeroporto '{icao}' nao encontrado.")
            sys.exit(1)
    try:
        dist, path = BellmanFord(graph, graph.nodes[orig], graph.nodes[dest])
    except ValueError as e:
        print(f"Erro: {e}")
        sys.exit(1)
    if dist == float("inf"):
        print(f"Sem caminho de {orig} para {dest}.")
    else:
        print(f"Menor caminho {orig} -> {dest} (Bellman-Ford):")
        print(f"  Rota:  {' -> '.join(path)}")
        print(f"  Custo: {dist:.4f}")


def cmd_routes(_args):
    try:
        graph = load_graph()
        routes = load_routes()
    except FileNotFoundError as e:
        print(f"Erro: {e}")
        print("Certifique-se de que o arquivo 'data/rotas.csv' existe com colunas 'origem' e 'destino'.")
        sys.exit(1)

    results = []
    print(f"Calculando {len(routes)} rotas...")

    for origin, destination in routes:
        if origin not in graph.nodes or destination not in graph.nodes:
            print(f"  Aviso: Par {origin} -> {destination} ignorado (aeroporto nao encontrado no grafo).")
            continue

        dist, path = Dijkstra(graph, graph.nodes[origin], graph.nodes[destination])

        path_str = " -> ".join(path) if dist != float("inf") else "Sem caminho"

        results.append({
            'origem': origin,
            'destino': destination,
            'custo': f"{dist:.4f}" if dist != float("inf") else "inf",
            'caminho': path_str
        })

    export_routes(results)


COMMANDS = {
    "solve": (cmd_solve, []),
    "bfs": (cmd_bfs, None),
    "dfs": (cmd_dfs, None),
    "dijkstra": (cmd_dijkstra, None),
    "bellman-ford": (cmd_bellman_ford, None),
    "routes": (cmd_routes, []),
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
<<<<<<< HEAD
        print("Uso: python3 cli.py [solve|bfs|dfs|dijkstra|routes] [args...]")
=======
        print("Uso: python3 cli.py [solve|bfs|dfs|dijkstra|bellman-ford|routes] [args...]")
>>>>>>> main
        sys.exit(0 if len(sys.argv) < 2 else 1)

    cmd = sys.argv[1]
    rest = sys.argv[2:]
    fn, _ = COMMANDS[cmd]
    fn(rest)


if __name__ == "__main__":
    main()
