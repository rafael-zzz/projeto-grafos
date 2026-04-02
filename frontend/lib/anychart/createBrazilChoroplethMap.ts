import {
  applyBrazilMapInteractions,
  attachSuppressBrowserContextMenu,
  disableBrazilMapChartChrome,
} from "@/lib/anychart/brazilMapInteractions";
import type { BrazilMapDataRow } from "@/lib/brazil/brazilMapRows";
import {
  BRAZIL_MACRO_REGION,
  MACRO_REGION_CHOROPLETH_COLORS,
} from "@/lib/brazil/brazilMacroRegions";

type BrazilChoroplethHandle = { dispose: () => void };

const MACRO_REGION_VALUE_RANGES: Array<{ from: number; to: number }> = [
  { from: 0.5, to: 1.5 },
  { from: 1.5, to: 2.5 },
  { from: 2.5, to: 3.5 },
  { from: 3.5, to: 4.5 },
  { from: 4.5, to: 5.5 },
];

export function createBrazilChoroplethMap(
  containerId: string,
  rows: BrazilMapDataRow[],
): BrazilChoroplethHandle {
  const ac = window.anychart;
  const map = ac.choropleth();
  map.geoData(ac.maps.brazil);
  map.background().fill("transparent");

  const unbound = map.unboundRegions();
  unbound.fill("#e4e4e7");
  unbound.stroke?.("#d4d4d8");

  const scale = ac.scales.ordinalColor();
  scale.ranges(MACRO_REGION_VALUE_RANGES);
  scale.colors([
    MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.NORTE],
    MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.NORDESTE],
    MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.CENTRO_OESTE],
    MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.SUDESTE],
    MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.SUL],
  ]);

  const series = map.choropleth(rows) as {
    colorScale: (s: unknown) => void;
    tooltip: () => {
      titleFormat: (f: string) => void;
      format: (f: string | (() => string)) => void;
    };
    labels: (v: boolean) => void;
    hovered: () => { fill: (c: string) => void };
  };

  series.colorScale(scale);
  series.labels(false);

  series.tooltip().titleFormat("{%stateName}");
  series.tooltip().format(function (this: {
    getData: (k: string) => string | number | undefined;
  }) {
    const region = String(this.getData("regionName") ?? "");
    const metric = this.getData("metric");
    const lines = [`Macrorregião: ${region}`];
    if (metric !== undefined && metric !== null && String(metric) !== "") {
      lines.push(`Indicador: ${metric}`);
    }
    return lines.join("\n");
  });

  series.hovered().fill("#fde68a");

  applyBrazilMapInteractions(map);
  disableBrazilMapChartChrome(map);

  map.container(containerId);
  map.draw();

  const containerEl = document.getElementById(containerId);
  const detachContextMenu =
    containerEl !== null
      ? attachSuppressBrowserContextMenu(containerEl)
      : undefined;

  return {
    dispose: () => {
      detachContextMenu?.();
      map.dispose?.();
    },
  };
}
