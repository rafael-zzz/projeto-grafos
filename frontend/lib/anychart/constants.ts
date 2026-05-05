export const ANYCHART_RELEASE_BASE = "https://cdn.anychart.com/releases/v8"; // base do anychart

export const ANYCHART_SCRIPTS = [ // scripts do anychart
  "https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.3.15/proj4.js",
  `${ANYCHART_RELEASE_BASE}/js/anychart-base.min.js`,
  `${ANYCHART_RELEASE_BASE}/js/anychart-ui.min.js`,
  `${ANYCHART_RELEASE_BASE}/js/anychart-exports.min.js`,
  `${ANYCHART_RELEASE_BASE}/js/anychart-map.min.js`,
  "https://cdn.anychart.com/geodata/2.2.0/countries/brazil/brazil.js",
] as const;

export const ANYCHART_STYLES = [ // estilos do anychart
  `${ANYCHART_RELEASE_BASE}/css/anychart-ui.min.css`,
  `${ANYCHART_RELEASE_BASE}/fonts/css/anychart-font.css`,
] as const;
