import type { AirportNode, AirportRow } from "../types";

export function normalizeAirports(rows: AirportRow[]): AirportNode[] {
  const out: AirportNode[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.iata.toUpperCase();
    if (!id) continue;
    if (seen.has(id)) {
      throw new Error(`IATA duplicado no CSV de aeroportos: ${id}`);
    }
    seen.add(id);
    out.push({
      id,
      label: id,
      cidade: row.cidade,
      regiao: row.regiao,
    });
  }
  if (out.length === 0) {
    throw new Error("Nenhum aeroporto válido no CSV.");
  }
  return out;
}
