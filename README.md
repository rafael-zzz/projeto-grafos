# Projeto Grafos — Malha Aérea Brasileira

Modelagem e análise da malha aérea nacional usando grafos. O dataset é composto por voos domésticos de janeiro de 2026 (fonte: ANAC). Cada aeroporto é um vértice e cada rota operada é uma aresta ponderada pelo inverso do log da frequência de voos.

## Pré-requisitos

```bash
# Criar o ambiente virtual e instalar dependências(MAC)
make venv
# Criar o ambiente virtual e instalar dependências(WINDOWS)
.\make.bat venv

# Ou manualmente:
python3 -m venv .venv
pip install -r requirements.txt
```

## Pipeline de dados — Aeroportos

Os arquivos de saída são gerados a partir do dataset bruto (`data/airports/aeroportos_data.csv`). Execute os alvos do Makefile **na ordem**:

```bash
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

```

Gera os arquivos em `out/`:
- `global.json` — ordem, tamanho, densidade do grafo
- `regioes.json` — mesmas métricas por região
- `graus.csv` — grau de cada aeroporto
- `ego_aeroportos.csv` — métricas de rede ego por aeroporto
- `graph.json` — exportado também para `frontend/public/`
- `arvore_percurso.png` / `arvore_percurso.html` — árvore de percurso dos caminhos obrigatórios
- `data/airports/adjacencias_aeroportos.csv` — arestas com justificativa (gerado por `src/airports_pipeline/adjacencias_builder.py`)

## CLI

Todos os comandos são executados a partir da **raiz do projeto** com o venv ativo:

```bash
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
```

## Testes

### Backend — Python (35 testes)

```bash
.venv/bin/python3 -m pytest tests/
```

Cobre BFS, DFS, Dijkstra, Bellman-Ford e geração de árvore de percurso.

### Frontend — TypeScript / Jest (40 testes)

```bash
cd frontend
npm test
```

Cobre os mesmos algoritmos implementados em TypeScript: BFS, DFS, Dijkstra e Bellman-Ford.

## Frontend

```bash
#(MAC)
make frontend
#(WINDOWS)
.\make.bat frontend
```

Requer que `frontend/public/graph.json` tenha sido gerado via `python3 src/cli.py solve`.

## Pipeline Wikipedia

O grafo interativo da Wikipedia é gerado a partir de `data/wikipedia/pages_export.csv` e `data/wikipedia/links_export.csv`.

### Extração do dataset (apenas na primeira vez)

O dataset está dividido em dois arquivos (`wikipedia.zip` + `wikipedia.z01`).

**Mac/Linux** — o Makefile extrai automaticamente:
```bash
make wiki
```

**Windows** — extraia manualmente com [7-Zip](https://www.7-zip.org/) antes de rodar o pipeline:
1. Clique com o botão direito em `wikipedia.zip` → 7-Zip → Extrair aqui
2. Mova a pasta `wikipedia/` para dentro de `data/`
3. Execute o pipeline:
```bash
.\make.bat wiki
```

### Etapas do pipeline

```bash
make wiki-clean      # filtra links internos e calcula 2-core → data/wikipedia/clean_*.csv
make wiki-build      # seleciona top-400 vértices por grau    → data/wikipedia/nodes.csv + edges.csv
make wiki-layout     # posições na esfera de Fibonacci         → data/wikipedia/layout.csv
make wiki-export     # exporta grafo estático                  → frontend/public/wiki_graph.json
make wiki-adjacency  # exporta mapa de adjacência e metadados  → frontend/public/wiki_adjacency.json
make wiki-viz        # gera relatório e visualizações Parte 2  → out/parte2_*

.\make.bat wiki-clean      # filtra links internos e calcula 2-core → data/wikipedia/clean_*.csv
.\make.bat wiki-build      # seleciona top-400 vértices por grau    → data/wikipedia/nodes.csv + edges.csv
.\make.bat wiki-layout     # posições na esfera de Fibonacci         → data/wikipedia/layout.csv
.\make.bat wiki-export     # exporta grafo estático                  → frontend/public/wiki_graph.json
.\make.bat wiki-adjacency  # exporta mapa de adjacência e metadados  → frontend/public/wiki_adjacency.json
.\make.bat wiki-viz        # gera relatório e visualizações Parte 2  → out/parte2_*

```

> **Nota:** `frontend/public/wiki_adjacency.json` (~14 MB) está no `.gitignore` por ser um arquivo grande e gerado. Após clonar o repositório, rode `make wiki-adjacency` (ou `make wiki` completo) para recriá-lo. Os demais arquivos (`wiki_graph.json`, `wiki_pages.json`) estão versionados e não precisam ser regerados.

Saídas analíticas da Parte 2 geradas em `out/`:
- `parte2_report.json` — resumo do dataset, execuções de BFS/DFS/Dijkstra/Bellman-Ford e tempos.
- `parte2_distribuicao_graus.png` — distribuição de graus do subgrafo Wikipedia.
- `parte2_hubs_brutos_vs_tematicos.png` — comparação entre hubs brutos e hubs filtrados.
- `parte2_tempos_algoritmos.png` — comparação visual de desempenho dos algoritmos.
- `parte2_bfs_camadas.png` — camadas BFS a partir de uma fonte temática.
- `parte2_heatmap_distancias.png` — custos de Dijkstra entre hubs temáticos.
- `parte2_notas_analiticas.md` — notas interpretativas para apoiar o PDF/apresentação.
