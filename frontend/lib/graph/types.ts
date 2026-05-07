export type NodeAttrs = {
  label: string;
  city: string;
  region: string;
  x: number;
  y: number;
  size: number;
  color: string;
};

export type GraphNode = { key: string; attributes: NodeAttrs };
export type GraphEdge = {
  key: string;
  source: string;
  target: string;
  attributes: {
    weight: number;
    tipo_conexao: string;
    justificativa: string;
  };
};
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };
