export {
  BrazilAnyMap,
  DEFAULT_BRAZIL_MAP_SHELL_CLASS,
  type BrazilAnyMapProps,
} from "./BrazilAnyMap";
export { BrazilMapLegend } from "./BrazilMapLegend";
export type { BrazilAnyMapInputRow } from "@/hooks/useBrazilChoroplethMap";
export type { BrazilMapDataRow } from "@/lib/brazil/brazilMapRows";
export { DEFAULT_BRAZIL_MAP_ROWS, enrichBrazilMapRows } from "@/lib/brazil/brazilMapRows";
export {
  applyBrazilMapInteractions,
  attachBrazilMapWheelZoom,
  attachSuppressBrowserContextMenu,
  DEFAULT_BRAZIL_MAP_INTERACTIONS,
  DEFAULT_BRAZIL_MAP_WHEEL_ZOOM,
  DEFAULT_WHEEL_ZOOM_DIVISOR,
  disableBrazilMapChartChrome,
  type BrazilMapInteractionOptions,
  type BrazilMapWheelZoomOptions,
} from "@/lib/anychart/brazilMapInteractions";
