export type BrazilMapInteractionOptions = {
  drag: boolean;
  zoomOnDoubleClick: boolean;
  zoomOnMouseWheel: boolean;
  keyboardZoomAndMove: boolean;
};

export const DEFAULT_BRAZIL_MAP_INTERACTIONS: BrazilMapInteractionOptions = {
  drag: true,
  zoomOnDoubleClick: false,
  zoomOnMouseWheel: true,
  keyboardZoomAndMove: false,
};

export const DEFAULT_WHEEL_ZOOM_DIVISOR = 72;

export type MapInteractivityApi = {
  drag?: (enabled: boolean) => unknown;
  zoomOnDoubleClick?: (enabled: boolean) => unknown;
  zoomOnMouseWheel?: (enabled: boolean) => unknown;
  keyboardZoomAndMove?: (enabled: boolean) => unknown;
};

type MapWithZoom = {
  zoom: (factor: number, clientX?: number, clientY?: number) => unknown;
  interactivity: () => MapInteractivityApi;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

export type BrazilMapWheelZoomOptions = {
  divisor: number;
  minFactor: number;
  maxFactor: number;
};

export const DEFAULT_BRAZIL_MAP_WHEEL_ZOOM: BrazilMapWheelZoomOptions = {
  divisor: DEFAULT_WHEEL_ZOOM_DIVISOR,
  minFactor: 0.65,
  maxFactor: 2.35,
};

export function attachBrazilMapWheelZoom(
  map: MapWithZoom,
  container: HTMLElement,
  options: Partial<BrazilMapWheelZoomOptions> = {},
): () => void {
  const o = { ...DEFAULT_BRAZIL_MAP_WHEEL_ZOOM, ...options };
  map.interactivity().zoomOnMouseWheel?.(false);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = clamp(1 - e.deltaY / o.divisor, o.minFactor, o.maxFactor);
    if (factor === 1) return;
    map.zoom(factor, e.clientX, e.clientY);
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  return () => container.removeEventListener("wheel", onWheel);
}

type MapWithInteractivity = {
  interactivity: () => MapInteractivityApi;
};

export function applyBrazilMapInteractions(
  map: MapWithInteractivity,
  options: Partial<BrazilMapInteractionOptions> = {},
): void {
  const o = { ...DEFAULT_BRAZIL_MAP_INTERACTIONS, ...options };
  const i = map.interactivity();
  i.drag?.(o.drag);
  i.zoomOnDoubleClick?.(o.zoomOnDoubleClick);
  i.zoomOnMouseWheel?.(o.zoomOnMouseWheel);
  i.keyboardZoomAndMove?.(o.keyboardZoomAndMove);
}

type MapWithChrome = {
  contextMenu?: (opts: { enabled: boolean }) => unknown;
  credits?: (enabled: boolean) => unknown;
};

export function disableBrazilMapChartChrome(map: MapWithChrome): void {
  map.contextMenu?.({ enabled: false });
  map.credits?.(false);
}

export function attachSuppressBrowserContextMenu(
  container: HTMLElement,
): () => void {
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };
  container.addEventListener("contextmenu", onContextMenu);
  return () => container.removeEventListener("contextmenu", onContextMenu);
}
