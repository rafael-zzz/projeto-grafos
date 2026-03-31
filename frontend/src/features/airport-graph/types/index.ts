export type AirportRow = {
  iata: string;
  cidade: string;
  regiao: string;
};

export type AdjacencyRow = {
  origem: string;
  destino: string;
  tipo_conexao: string;
  justificativa: string;
  peso: number;
};

export type AirportNode = {
  id: string;
  label: string;
  cidade: string;
  regiao: string;
};
