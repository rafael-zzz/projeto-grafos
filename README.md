# projeto-grafos

## Setup

```bash
cd src
python3 solve.py
```

Gera os arquivos em `out/`:
- `global.json` — ordem, tamanho, densidade do grafo
- `regioes.json` — mesmas métricas por região
- `graus.csv` — grau de cada aeroporto
- `ego_aeroportos.csv` / `.json` — métricas de rede ego por aeroporto
- `graph.json` — exportado também para `frontend/public/`

## CLI

```bash
# Gerar todos os arquivos de saída
python3 src/cli.py solve

# BFS a partir de um aeroporto
python3 src/cli.py bfs GRU

# DFS (origem opcional)
python3 src/cli.py dfs BSB
python3 src/cli.py dfs

# Menor caminho entre dois aeroportos (Dijkstra)
python3 src/cli.py dijkstra RBR GIG

#Menor caminho entre cinco pares de aeroportos
python src/cli.py routes
```

## Frontend

```bash
cd frontend
npm run dev
```
