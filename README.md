# Projeto Grafos — Malha Aérea Brasileira

Modelagem e análise da malha aérea nacional usando grafos. O dataset é composto por voos domésticos de janeiro de 2026 (fonte: ANAC). Cada aeroporto é um vértice e cada rota operada é uma aresta ponderada pelo inverso do log da frequência de voos.

## Pré-requisitos

bash
# Criar o ambiente virtual e instalar dependências(mac)
make venv

#Criar ambiente virtual e instalar dependências(windows)
.\make.bat venv
# Ou manualmente:
python3 -m venv .venv
pip install -r requirements.txt


## Pipeline de dados — Aeroportos

Os arquivos de saída são gerados a partir do dataset bruto (data/airports/aeroportos_data.csv). Execute os alvos do Makefile *na ordem*:

bash
#(MAC)
make parse      # limpa o dataset bruto
make regions    # constrói os vértices
make validate   # verifica cobertura de aeroportos
make edges      # constrói as arestas
make check      # extrai fluxo regional

# ou tudo de uma vez:
make all
#(WINDOWS)
.\make.bat parse
.\make.bat regions
.\make.bat validate
.\make.bat edges
.\make.bat check

# ou tudo de uma vez:
.\make.bat all




Gera os arquivos em out/:
- global.json — ordem, tamanho, densidade do grafo
- regioes.json — mesmas métricas por região
- graus.csv — grau de cada aeroporto
- ego_aeroportos.csv — métricas de rede ego por aeroporto
- graph.json — exportado também para frontend/public/
- arvore_percurso.png / arvore_percurso.html — árvore de percurso dos caminhos obrigatórios
- data/airports/adjacencias_aeroportos.csv — arestas com justificativa (gerado por src/airports_pipeline/adjacencias_builder.py)

## CLI

Todos os comandos são executados a partir da *raiz do projeto* com o venv ativo:

bash
# Gerar todos os arquivos de saída (métricas, graph.json, etc.)
.venv/bin/python3 src/cli.py solve

# BFS a partir de um aeroporto
.venv/bin/python3 src/cli.py bfs SBGR

# DFS (origem opcional; sem argumento percorre todo o grafo)
.venv/bin/python3 src/cli.py dfs SBBR
.venv/bin/python3 src/cli.py dfs

# Menor caminho — Dijkstra (pesos não-negativos)
.venv/bin/python3 src/cli.py dijkstra SBGR SBRF

# Menor caminho — Bellman-Ford (suporta pesos negativos)
.venv/bin/python3 src/cli.py bellman-ford SBGR SBRF

# Calcular rotas em lote a partir de data/airports/rotas.csv → out/distancias_rotas.csv
.venv/bin/python3 src/cli.py routes


## Testes

bash
pytest tests/


## Frontend

bash
#(MAC)
make frontend
#(WINDOWS)
.\make.bat frontend


Requer que frontend/public/graph.json tenha sido gerado via python3 src/cli.py solve.

## Pipeline Wikipedia

O grafo interativo da Wikipedia é gerado a partir de data/wikipedia/pages_export.csv e data/wikipedia/links_export.csv.

### Extração do dataset (apenas na primeira vez)

O dataset está dividido em dois arquivos (wikipedia.zip + wikipedia.z01).

*Mac/Linux* — o Makefile extrai automaticamente:
bash
#(MAC)
make wiki
#(WINDOWS)
.\make.bat wiki


*Windows* — extraia manualmente com [7-Zip](https://www.7-zip.org/) antes de rodar o pipeline:
1. Clique com o botão direito em wikipedia.zip → 7-Zip → Extrair aqui
2. Mova a pasta wikipedia/ para dentro de data/
3. Execute o pipeline:
bash
make wiki


### Etapas do pipeline

bash
make wiki-clean      # filtra links internos e calcula 2-core → data/wikipedia/clean_*.csv
make wiki-build      # seleciona top-400 vértices por grau    → data/wikipedia/nodes.csv + edges.csv
make wiki-layout     # posições na esfera de Fibonacci         → data/wikipedia/layout.csv
make wiki-export     # exporta grafo estático                  → frontend/public/wiki_graph.json
make wiki-adjacency  # exporta mapa de adjacência e metadados  → frontend/public/wiki_adjacency.json

*Nota:* frontend/public/wiki_adjacency.json (~14 MB) está no .gitignore. Após clonar o repositório, rode make wiki-adjacency (ou make wiki completo) para recriá-lo.