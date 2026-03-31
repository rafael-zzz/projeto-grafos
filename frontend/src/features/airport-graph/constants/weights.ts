/**
 * Régua de pesos das arestas (documentação para relatório / Seção de pesos).
 *
 * O **peso** representa o “custo” ou esforço relativo da conexão no modelo do grupo:
 * conexões regionais têm menor peso; hubs nacionais têm peso maior por concentrarem
 * tráfego de longo alcance; conexões de curta distância entre regiões ficam no meio-termo.
 *
 * | Valor | Significado |
 * |-------|-------------|
 * | **1.0** | **Regional**: aeroportos da mesma região (malha intra-região). Reflete voos
 *           típicos de curto/médio curso dentro do mesmo macro-eixo geográfico. |
 * | **1.5** | **Curta distância (inter-região)**: ligação direta entre regiões vizinhas ou
 *           por hub muito frequente, com justificativa operacional (ex.: Sul–Sudeste). |
 * | **2.0** | **Hub**: conexão que costura regiões distintas via eixo de alto fluxo
 *           (GRU, BSB), representando corredores nacionais. |
 *
 * Valores maiores implicam arestas “mais caras” no grafo ponderado (ex.: espessura ou cor
 * na visualização).
 */
export const WEIGHT_REGIONAL = 1.0;
export const WEIGHT_SHORT_INTERREGIONAL = 1.5;
export const WEIGHT_HUB = 2.0;

export const WEIGHT_LABELS: Record<number, string> = {
  [WEIGHT_REGIONAL]: "regional (1.0)",
  [WEIGHT_SHORT_INTERREGIONAL]: "curta distância inter-região (1.5)",
  [WEIGHT_HUB]: "hub nacional (2.0)",
};
