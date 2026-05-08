#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from graphs.io import load_graph, export_routes, load_routes
from graphs.algorithms import BFS, DFS, Dijkstra
from solve import solve


def cmd_solve(_args):
    solve()


def cmd_bfs(args):
    if not args:
        print("Uso: cli.py bfs <IATA>")
        sys.exit(1)
    origin_iata = args[0].upper()
    graph = load_graph()
    if origin_iata not in graph.nodes:
        print(f"Aeroporto '{origin_iata}' nao encontrado.")
        sys.exit(1)
    order, levels = BFS(graph, graph.nodes[origin_iata])
    print(f"BFS a partir de {origin_iata}:")
    for iata in order:
        print(f"  {iata}  (nivel {levels[iata]})")


def cmd_dfs(args):
    origin_iata = args[0].upper() if args else None
    graph = load_graph()
    if origin_iata and origin_iata not in graph.nodes:
        print(f"Aeroporto '{origin_iata}' nao encontrado.")
        sys.exit(1)
    order, edge_types, has_cycle = DFS(graph, origin_iata)
    print(f"DFS {'a partir de ' + origin_iata if origin_iata else '(todos os nos)'}:")
    print(f"  Ordem de visita: {' -> '.join(order)}")
    print(f"  Tem ciclo: {'sim' if has_cycle else 'nao'}")
    back_edges = [(u, v) for u, v, t in edge_types if t == "back"]
    if back_edges:
        print(f"  Arestas de retorno: {back_edges}")


def cmd_dijkstra(args):
    if len(args) < 2:
        print("Uso: cli.py dijkstra <ORIG> <DEST>")
        sys.exit(1)
    orig_iata, dest_iata = args[0].upper(), args[1].upper()
    graph = load_graph()
    for iata in [orig_iata, dest_iata]:
        if iata not in graph.nodes:
            print(f"Aeroporto '{iata}' nao encontrado.")
            sys.exit(1)
    dist, path = Dijkstra(graph, graph.nodes[orig_iata], graph.nodes[dest_iata])
    if dist == float("inf"):
        print(f"Sem caminho de {orig_iata} para {dest_iata}.")
    else:
        print(f"Menor caminho {orig_iata} -> {dest_iata}:")
        print(f"  Rota:  {' -> '.join(path)}")
        print(f"  Custo: {dist:.4f}")


def cmd_routes(_args):
    try:
        graph = load_graph()
        routes = load_routes()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Make sure to create the file 'data/rotas.csv' with columns 'origem' and 'destino'.")
        sys.exit(1)

    results = []
    print(f"Calculating {len(routes)} routes...")

    for origin, destination in routes:
        if origin not in graph.nodes or destination not in graph.nodes:
            print(f"  Warning: Pair {origin} -> {destination} ignored (airport not found in graph).")
            continue

        dist, path = Dijkstra(graph, graph.nodes[origin], graph.nodes[destination])

        path_str = " -> ".join(path) if dist != float("inf") else "No path"

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
    "routes": (cmd_routes, []),
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print("Uso: python3 cli.py [solve|bfs|dfs|dijkstra] [args...]")
        sys.exit(0 if len(sys.argv) < 2 else 1)

    cmd = sys.argv[1]
    rest = sys.argv[2:]
    fn, _ = COMMANDS[cmd]
    fn(rest)


if __name__ == "__main__":
    main()
