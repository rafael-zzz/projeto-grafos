interface AnyChartMapInteractivity {
  drag: (enabled: boolean) => AnyChartMapInteractivity;
  zoomOnDoubleClick: (enabled: boolean) => AnyChartMapInteractivity;
  zoomOnMouseWheel: (enabled: boolean) => AnyChartMapInteractivity;
  keyboardZoomAndMove: (enabled: boolean) => AnyChartMapInteractivity;
}

interface AnyChartMap {
  geoData: (data: unknown) => AnyChartMap;
  choropleth: (data?: unknown) => unknown;
  interactivity: () => AnyChartMapInteractivity;
  contextMenu: (opts?: { enabled?: boolean }) => unknown;
  credits: (enabled: boolean) => AnyChartMap;
  zoom: (
    factor: number,
    clientX?: number,
    clientY?: number,
    duration?: number,
  ) => AnyChartMap;
  container: (id: string | HTMLElement) => AnyChartMap;
  draw: () => AnyChartMap;
  dispose?: () => void;
  background: () => {
    fill: (color: string) => unknown;
  };
  unboundRegions: () => {
    fill: (color: string) => unknown;
    stroke?: (color: string) => unknown;
  };
}

interface AnyChartScales {
  ordinalColor: () => {
    colors: (c: string[]) => unknown;
    ranges: (r: Array<{ from: number; to: number } | Record<string, number>>) => unknown;
  };
}

interface AnyChartStatic {
  onDocumentReady: (fn: () => void) => void;
  choropleth: () => AnyChartMap;
  maps: {
    brazil: unknown;
  };
  scales: AnyChartScales;
}

declare global {
  interface Window {
    anychart: AnyChartStatic;
  }
}

export {};
