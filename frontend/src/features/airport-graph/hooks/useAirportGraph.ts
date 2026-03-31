"use client";

import { useEffect, useState } from "react";
import type { UndirectedGraph } from "graphology";
import { loadAdjacencyCsv, loadAirportCsv } from "../services/loadCsv";
import { normalizeAirports } from "../services/normalizeAirports";
import { validateEdgesAgainstNodes } from "../services/validateEdges";
import { buildAirportGraph } from "../services/graphFactory";

export type AirportGraphState =
  | { status: "loading" }
  | { status: "ready"; graph: UndirectedGraph }
  | { status: "error"; message: string };

const DEFAULT_AIRPORTS_URL = "/data/aeroportos_data.csv";
const DEFAULT_ADJACENCY_URL = "/data/adjacencias_aeroportos.csv";

export function useAirportGraph(options?: {
  airportsUrl?: string;
  adjacencyUrl?: string;
}): AirportGraphState {
  const [state, setState] = useState<AirportGraphState>({ status: "loading" });

  useEffect(() => {
    const airportsUrl = options?.airportsUrl ?? DEFAULT_AIRPORTS_URL;
    const adjacencyUrl = options?.adjacencyUrl ?? DEFAULT_ADJACENCY_URL;
    let cancelled = false;

    (async () => {
      setState({ status: "loading" });
      try {
        const [airportRows, edgeRows] = await Promise.all([
          loadAirportCsv(airportsUrl),
          loadAdjacencyCsv(adjacencyUrl),
        ]);
        if (cancelled) return;
        const nodes = normalizeAirports(airportRows);
        validateEdgesAgainstNodes(nodes, edgeRows);
        const graph = buildAirportGraph(nodes, edgeRows);
        if (cancelled) return;
        setState({ status: "ready", graph });
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Erro desconhecido ao montar o grafo.";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [options?.airportsUrl, options?.adjacencyUrl]);

  return state;
}
