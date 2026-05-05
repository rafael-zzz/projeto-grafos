import { useEffect, useId, useMemo, useRef } from "react";

import { createBrazilChoroplethMap } from "@/lib/anychart/createBrazilChoroplethMap";
import { loadAnyChartScripts } from "@/lib/anychart/loadAnyChartScripts";
import {
  DEFAULT_BRAZIL_MAP_ROWS,
  enrichBrazilMapRows,
  type BrazilMapDataRow,
} from "@/lib/brazil/brazilMapRows";

export type BrazilAnyMapInputRow =
  | BrazilMapDataRow
  | { id: string; value: number };

function normalizeRows(
  data: BrazilAnyMapInputRow[] | undefined,
): BrazilMapDataRow[] {
  if (!data?.length) return DEFAULT_BRAZIL_MAP_ROWS;
  const first = data[0];
  if (
    first &&
    "stateName" in first &&
    "regionName" in first &&
    "regionCode" in first
  ) {
    return data as BrazilMapDataRow[];
  }
  return enrichBrazilMapRows(data as { id: string; value: number }[]);
}

type UseBrazilChoroplethMapOptions = {
  data?: BrazilAnyMapInputRow[];
};

export function useBrazilChoroplethMap({
  data,
}: UseBrazilChoroplethMapOptions) {
  const reactId = useId();
  const containerId = `anymap-br-${reactId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ dispose?: () => void } | null>(null);

  const rows = useMemo(() => normalizeRows(data), [data]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadAnyChartScripts();
      } catch {
        return;
      }
      if (cancelled || typeof window === "undefined" || !window.anychart) {
        return;
      }

      window.anychart.onDocumentReady(() => {
        if (cancelled || !containerRef.current) return;

        const chart = createBrazilChoroplethMap(containerId, rows);
        chartRef.current = chart;
      });
    })();

    return () => {
      cancelled = true;
      chartRef.current?.dispose?.();
      chartRef.current = null;
    };
  }, [containerId, rows]);

  return { containerId, containerRef };
}
