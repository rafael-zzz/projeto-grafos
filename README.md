# Projeto Grafos — Malha Aérea Brasileira

Modelagem e análise da malha aérea nacional usando grafos. O dataset é composto por voos domésticos de janeiro de 2026 (fonte: ANAC). Cada aeroporto é um vértice e cada rota operada é uma aresta ponderada pelo inverso do log da frequência de voos.

## Pré-requisitos

```bash
pip install -r requirements.txt
```

## Pipeline de dados

Os arquivos `data/airports.csv` e `data/edges.csv` são gerados a partir do dataset bruto (`data/aeroportos_data.csv`). Execute os alvos do Makefile **na ordem**:

```bash
make parse      # limpa o dataset bruto → data/clean.csv
make regions    # constrói os vértices  → data/airports.csv
make validate   # verifica cobertura de aeroportos
make edges      # constrói as arestas   → data/edges.csv
make check      # extrai fluxo regional → data/flight_regions.csv

# ou tudo de uma vez:
make all
```

Gera os arquivos em `out/`:
- `global.json` — ordem, tamanho, densidade do grafo
- `regioes.json` — mesmas métricas por região
- `graus.csv` — grau de cada aeroporto
- `ego_aeroportos.csv` / `.json` — métricas de rede ego por aeroporto
- `graph.json` — exportado também para `frontend/public/`
- `arvore_percurso.png` / `arvore_percurso.html` — árvore de percurso dos caminhos obrigatórios

## CLI

Todos os comandos são executados a partir da **raiz do projeto**:

```bash
# Gerar todos os arquivos de saída (métricas, graph.json, etc.)
python3 src/cli.py solve

# BFS a partir de um aeroporto
python3 src/cli.py bfs SBGR

# DFS (origem opcional; sem argumento percorre todo o grafo)
python3 src/cli.py dfs SBBR
python3 src/cli.py dfs

# Menor caminho — Dijkstra (pesos não-negativos)
python3 src/cli.py dijkstra SBGR SBRF

# Menor caminho — Bellman-Ford (suporta pesos negativos)
python3 src/cli.py bellman-ford SBGR SBRF

# Calcular rotas em lote a partir de data/rotas.csv → out/distancias_rotas.csv
python3 src/cli.py routes
```

## Visualizações

Gera os gráficos analíticos em `out/`:

```bash
python3 src/visualization.py
```

## Testes

```bash
pytest tests/
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Requer que `out/graph.json` (ou `frontend/public/graph.json`) tenha sido gerado via `python3 src/cli.py solve`.
