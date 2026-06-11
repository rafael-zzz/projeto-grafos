# Projeto Grafos — Malha Aérea Brasileira

Modelagem e análise da malha aérea nacional usando grafos. O dataset é composto por voos domésticos de janeiro de 2026 (fonte: ANAC). Cada aeroporto é um vértice e cada rota operada é uma aresta ponderada pelo inverso do log da frequência de voos.

---

## 1. Pré-requisitos

Crie o ambiente virtual e instale as dependências antes de qualquer outro passo.

| Mac / Linux | Windows |
|---|---|
| `make venv` | `.\make.bat venv` |

> O target `venv` só cria o ambiente se ele ainda não existir. Rodar novamente é seguro.

---

## 2. Pipeline de Aeroportos

Gera o grafo a partir do dataset bruto da ANAC (`data/airports/aeroportos_data.csv`).

**Tudo de uma vez (recomendado):**

| Mac / Linux | Windows |
|---|---|
| `make all` | `.\make.bat all` |

**Etapas individuais, na ordem:**

| Etapa | Mac / Linux | Windows | O que faz |
|---|---|---|---|
| 1 | `make parse` | `.\make.bat parse` | Limpa o dataset bruto |
| 2 | `make regions` | `.\make.bat regions` | Constrói os vértices (aeroportos + regiões) |
| 3 | `make validate` | `.\make.bat validate` | Verifica cobertura de aeroportos |
| 4 | `make edges` | `.\make.bat edges` | Constrói as arestas com pesos |
| 5 | `make check` | `.\make.bat check` | Extrai fluxo regional |
| 6 | `make solve` | `.\make.bat solve` | Gera métricas e exporta `graph.json` |

**Arquivos gerados em `out/` e `frontend/public/`:**

- `graph.json` — grafo completo (exportado também para `frontend/public/`)
- `global.json` — ordem, tamanho e densidade do grafo
- `regioes.json` — métricas por região
- `graus.csv` — grau de cada aeroporto
- `ego_aeroportos.csv` — métricas de rede ego por aeroporto
- `arvore_percurso.png` / `arvore_percurso.html` — árvore de percurso dos caminhos obrigatórios
- `data/airports/adjacencias_aeroportos.csv` — arestas com justificativa

---

## 3. CLI — Algoritmos

Executar da **raiz do projeto** com o venv já criado.

| Comando | Mac / Linux | Windows |
|---|---|---|
| Gerar todos os outputs | `.venv/bin/python3 src/cli.py solve` | `python src\cli.py solve` |
| BFS a partir de um aeroporto | `.venv/bin/python3 src/cli.py bfs SBGR` | `python src\cli.py bfs SBGR` |
| DFS a partir de um aeroporto | `.venv/bin/python3 src/cli.py dfs SBBR` | `python src\cli.py dfs SBBR` |
| DFS em todo o grafo | `.venv/bin/python3 src/cli.py dfs` | `python src\cli.py dfs` |
| Dijkstra entre dois aeroportos | `.venv/bin/python3 src/cli.py dijkstra SBGR SBRF` | `python src\cli.py dijkstra SBGR SBRF` |
| Bellman-Ford entre dois aeroportos | `.venv/bin/python3 src/cli.py bellman-ford SBGR SBRF` | `python src\cli.py bellman-ford SBGR SBRF` |
| Calcular rotas em lote | `.venv/bin/python3 src/cli.py routes` | `python src\cli.py routes` |

> `routes` lê `data/airports/rotas.csv` e exporta resultados em `out/distancias_rotas.csv`.

---

## 4. Frontend

> Requer que `frontend/public/graph.json` tenha sido gerado pelo pipeline de aeroportos (`make all`).

| Mac / Linux | Windows |
|---|---|
| `make frontend` | `.\make.bat frontend` |

Sobe o Next.js em `http://localhost:3000`.

---

## 5. Pipeline Wikipedia

Gera o grafo interativo da Wikipedia a partir de `data/wikipedia/pages_export.csv` e `data/wikipedia/links_export.csv`.

### Extração do dataset (apenas na primeira vez)

O dataset está dividido em dois arquivos (`wikipedia.zip` + `wikipedia.z01`).

**Mac/Linux** — extração automática pelo Makefile:

| Mac / Linux | Windows |
|---|---|
| `make wiki` | Ver abaixo |

**Windows** — extração manual antes de rodar o pipeline:
1. Instale o [7-Zip](https://www.7-zip.org/) (`winget install 7zip.7zip`)
2. Clique com o botão direito em `wikipedia.zip` → 7-Zip → Extrair aqui
3. Mova a pasta `wikipedia/` para dentro de `data/`
4. Execute: `.\make.bat wiki`

### Etapas individuais

| Etapa | Mac / Linux | Windows | O que faz |
|---|---|---|---|
| Limpeza | `make wiki-clean` | `.\make.bat wiki-clean` | Filtra links internos e calcula 2-core → `data/wikipedia/clean_*.csv` |
| Grafo | `make wiki-build` | `.\make.bat wiki-build` | Seleciona top-400 vértices por grau → `nodes.csv` + `edges.csv` |
| Layout | `make wiki-layout` | `.\make.bat wiki-layout` | Posições na esfera de Fibonacci → `layout.csv` |
| Exportação | `make wiki-export` | `.\make.bat wiki-export` | Exporta grafo estático → `frontend/public/wiki_graph.json` |
| Adjacência | `make wiki-adjacency` | `.\make.bat wiki-adjacency` | Exporta mapa de adjacência → `frontend/public/wiki_adjacency.json` |
| Visualizações | `make wiki-viz` | `.\make.bat wiki-viz` | Gera relatório e gráficos → `out/parte2_*` |

> `wiki_adjacency.json` (~14 MB) está no `.gitignore`. Após clonar, rode `make wiki-adjacency` para recriá-lo.

**Arquivos gerados em `out/`:**

- `parte2_report.json` — resumo do dataset e tempos de execução dos algoritmos
- `parte2_distribuicao_graus.png` — distribuição de graus do subgrafo Wikipedia
- `parte2_hubs_brutos_vs_tematicos.png` — comparação entre hubs brutos e hubs filtrados
- `parte2_tempos_algoritmos.png` — comparação visual de desempenho dos algoritmos
- `parte2_bfs_camadas.png` — camadas BFS a partir de uma fonte temática
- `parte2_heatmap_distancias.png` — custos de Dijkstra entre hubs temáticos
- `parte2_notas_analiticas.md` — notas interpretativas para apoiar o PDF/apresentação

---

## 6. Testes

### Backend — Python (35 testes)

| Mac / Linux | Windows |
|---|---|
| `.venv/bin/python3 -m pytest tests/` | `python -m pytest tests\` |

Cobre BFS, DFS, Dijkstra, Bellman-Ford e geração de árvore de percurso.

### Frontend — TypeScript / Jest (40 testes)

```bash
cd frontend
npm install -D ts-node   # apenas na primeira vez
npm test
```

Cobre os mesmos algoritmos implementados em TypeScript: BFS, DFS, Dijkstra e Bellman-Ford.
