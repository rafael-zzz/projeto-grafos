export type WikiNodeAttrs = {
  label: string;
  title: string;
  url: string;
  word_count: number;
  categories: string[];
  x: number;
  y: number;
  z: number;
  size: number;
};

export type WikiNode = { key: string; attributes: WikiNodeAttrs };

export type WikiEdge = {
  key: string;
  source: string;
  target: string;
  attributes: { weight: number };
};

export type WikiGraphData = { nodes: WikiNode[]; edges: WikiEdge[] };

export type WikiPageMeta = {
  word_count: number;
  url: string;
  categories: string[];
};

export type WikiAdjacency = Record<string, string[]>;
export type WikiPagesData = Record<string, WikiPageMeta>;
