import Papa from "papaparse";
import type { AdjacencyRow, AirportRow } from "../types";

function parseNumber(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (Number.isNaN(n)) {
    throw new Error(`Peso inválido: ${raw}`);
  }
  return n;
}

export async function loadAirportCsv(url: string): Promise<AirportRow[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao carregar aeroportos: ${res.status}`);
  }
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length > 0) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`CSV aeroportos: ${msg}`);
  }
  return parsed.data.map((row) => ({
    iata: row.iata?.trim() ?? "",
    cidade: row.cidade?.trim() ?? "",
    regiao: row.regiao?.trim() ?? "",
  }));
}

export async function loadAdjacencyCsv(url: string): Promise<AdjacencyRow[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao carregar adjacências: ${res.status}`);
  }
  const text = await res.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length > 0) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`CSV adjacências: ${msg}`);
  }
  return parsed.data.map((row) => ({
    origem: row.origem?.trim() ?? "",
    destino: row.destino?.trim() ?? "",
    tipo_conexao: row.tipo_conexao?.trim() ?? "",
    justificativa: row.justificativa?.trim() ?? "",
    peso: parseNumber(row.peso ?? ""),
  }));
}
