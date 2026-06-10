# Notas analiticas - Parte 2 (Wikipedia)

## Leitura geral
- O grafo analisado tem 400 artigos e 3152 ligacoes direcionadas.
- A densidade e 0.0197, indicando um subgrafo esparso, mas com hubs bem definidos.
- O maior hub bruto e ISBN (identifier) (330 ligacoes).
- O maior hub tematico filtrado e Parthian Empire (150 ligacoes).

## Visualizacoes geradas
- `out/parte2_distribuicao_graus.png`: mostra concentracao de muitos artigos com grau baixo e poucos hubs.
- `out/parte2_hubs_brutos_vs_tematicos.png`: separa hubs utilitarios da Wikipedia de artigos tematicos relevantes.
- `out/parte2_tempos_algoritmos.png`: compara o custo pratico dos algoritmos nas tarefas executadas.
- `out/parte2_bfs_camadas.png`: mostra como o BFS expande o grafo por camadas a partir da fonte escolhida.
- `out/parte2_heatmap_distancias.png`: compara custos de caminhos minimos entre hubs tematicos.

## Discussao critica
- BFS e adequado para alcance e camadas quando os pesos nao importam.
- DFS e adequado para explorar profundidade, classificar arestas e detectar ciclos.
- Dijkstra e adequado para caminhos minimos com pesos nao negativos; por isso usamos uma copia deslocada do grafo assinado.
- Bellman-Ford e mais caro, mas cobre pesos negativos e detecta ciclos negativos no grafo assinado.
- O peso da Wikipedia vem do distrust_score do artigo de destino; pesos negativos indicam paginas mais confiaveis/centrais pela regra atual.
