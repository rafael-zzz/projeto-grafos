"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BRAZIL_MACRO_REGION,
  MACRO_REGION_CHOROPLETH_COLORS,
  STATE_ID_TO_MACRO_REGION,
} from "@/lib/brazil/brazilMacroRegions";
import type { GraphData } from "@/lib/graph/types";
import { AirportPanel } from "@/components/AirportPanel";

// ─── GeoJSON ─────────────────────────────────────────────────────────────────
type GeoRing = number[][];
type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry:
    | { type: "Polygon"; coordinates: GeoRing[] }
    | { type: "MultiPolygon"; coordinates: GeoRing[][] };
};
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

// ─── Mercator projection ──────────────────────────────────────────────────────
const VW = 900;
const VH = 870;
const B = { w: -74, e: -28, s: -34.5, n: 5.5 };

function mercY(lat: number) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}
const MERC_N = mercY(B.n);
const MERC_S = mercY(B.s);

function project(lon: number, lat: number): [number, number] {
  const x = ((lon - B.w) / (B.e - B.w)) * VW;
  const y = (1 - (mercY(lat) - MERC_S) / (MERC_N - MERC_S)) * VH;
  return [x, y];
}

function ringToD(ring: GeoRing): string {
  return (
    ring
      .map(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

function featureToD(f: GeoFeature): string {
  if (f.geometry.type === "Polygon")
    return f.geometry.coordinates.map(ringToD).join("");
  return f.geometry.coordinates.flatMap((poly) => poly.map(ringToD)).join("");
}

// ─── IBGE numeric code → BR.XX ───────────────────────────────────────────────
const IBGE_TO_STATE: Record<string, string> = {
  "11": "BR.RO", "12": "BR.AC", "13": "BR.AM", "14": "BR.RR", "15": "BR.PA",
  "16": "BR.AP", "17": "BR.TO", "21": "BR.MA", "22": "BR.PI", "23": "BR.CE",
  "24": "BR.RN", "25": "BR.PB", "26": "BR.PE", "27": "BR.AL", "28": "BR.SE",
  "29": "BR.BA", "31": "BR.MG", "32": "BR.ES", "33": "BR.RJ", "35": "BR.SP",
  "41": "BR.PR", "42": "BR.SC", "43": "BR.RS", "50": "BR.MS", "51": "BR.MT",
  "52": "BR.GO", "53": "BR.DF",
};

function stateColor(f: GeoFeature): string {
  const id = IBGE_TO_STATE[String(f.properties.codarea ?? "")];
  if (!id) return "#e4e4e7";
  return MACRO_REGION_CHOROPLETH_COLORS[STATE_ID_TO_MACRO_REGION[id]] ?? "#e4e4e7";
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const REGION_COLORS: Record<string, string> = {
  Norte:          MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.NORTE],
  Nordeste:       MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.NORDESTE],
  "Centro-Oeste": MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.CENTRO_OESTE],
  Sudeste:        MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.SUDESTE],
  Sul:            MACRO_REGION_CHOROPLETH_COLORS[BRAZIL_MACRO_REGION.SUL],
};

// ─── SVG coordinate helper ────────────────────────────────────────────────────
function toSVG(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  return [x, y];
}

// ─── Component ────────────────────────────────────────────────────────────────
type Tooltip = { x: number; y: number; label: string; city: string; region: string } | null;
type Transform = { x: number; y: number; scale: number };

const IBGE_GEO_URL =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo+json&resolucao=5";

export function BrazilAirportMap() {
  const [geo, setGeo] = useState<GeoCollection | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tr, setTr] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const trRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);

  function applyTransform(updater: (prev: Transform) => Transform) {
    setTr((prev) => {
      const next = updater(prev);
      trRef.current = next;
      return next;
    });
  }

  useEffect(() => {
    Promise.all([
      fetch(IBGE_GEO_URL).then((r) => r.json()),
      fetch("/graph.json").then((r) => r.json()),
    ]).then(([geoData, graphData]: [GeoCollection, GraphData]) => {
      setGeo(geoData);
      setGraph(graphData);
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const [cx, cy] = toSVG(svgRef.current!, e.clientX, e.clientY);
    applyTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * factor, 0.5), 12);
      return {
        scale: newScale,
        x: cx - (cx - prev.x) * (newScale / prev.scale),
        y: cy - (cy - prev.y) * (newScale / prev.scale),
      };
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const [sx, sy] = toSVG(svgRef.current!, e.clientX, e.clientY);
    drag.current = { sx, sy, tx: trRef.current.x, ty: trRef.current.y };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    const [cx, cy] = toSVG(svgRef.current!, e.clientX, e.clientY);
    applyTransform((prev) => ({
      ...prev,
      x: d.tx + (cx - d.sx),
      y: d.ty + (cy - d.sy),
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    drag.current = null;
  }, []);

  if (!geo || !graph) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Carregando mapa…</p>
      </div>
    );
  }

  const nodeMap = new Map(
    graph.nodes.map((n) => [
      n.key,
      { ...n.attributes, pos: project(n.attributes.x, -n.attributes.y) },
    ])
  );

  const { x: tx, y: ty, scale } = tr;

  return (
    <div className="flex h-dvh w-full flex-col bg-zinc-50">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-800">Rede de Aeroportos do Brasil</h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          {graph.nodes.length} aeroportos · {graph.edges.length} conexões · dados: janeiro/2026
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Map */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <svg
            ref={svgRef}
            className="h-full w-full cursor-grab active:cursor-grabbing select-none"
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 6 6" refX="6" refY="3" markerUnits="strokeWidth" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" fillOpacity="0.7" />
              </marker>
            </defs>
            <g transform={`translate(${tx},${ty}) scale(${scale})`}>
              {geo.features.map((f, i) => (
                <path
                  key={i}
                  d={featureToD(f)}
                  fill={stateColor(f)}
                  fillOpacity={0.25}
                  stroke="#fff"
                  strokeWidth={1 / scale}
                />
              ))}

              {graph.edges.map((e) => {
                const s = nodeMap.get(e.source);
                const d = nodeMap.get(e.target);
                if (!s || !d) return null;
                const dx = d.pos[0] - s.pos[0];
                const dy = d.pos[1] - s.pos[1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) return null;
                const r = 6 / scale;
                return (
                  <line
                    key={e.key}
                    x1={s.pos[0]} y1={s.pos[1]}
                    x2={d.pos[0] - (dx / dist) * r}
                    y2={d.pos[1] - (dy / dist) * r}
                    stroke="#94a3b8"
                    strokeWidth={1 / scale}
                    strokeOpacity={0.45}
                    markerEnd="url(#arrow)"
                  />
                );
              })}

              {graph.nodes.map((n) => {
                const nd = nodeMap.get(n.key)!;
                const color = REGION_COLORS[nd.region] ?? "#94a3b8";
                const [px, py] = nd.pos;
                const r = 6 / scale;
                const isSelected = n.key === selectedKey;
                return (
                  <g
                    key={n.key}
                    className="cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setSelectedKey(n.key === selectedKey ? null : n.key)}
                    onMouseEnter={(e) => {
                      const rect = svgRef.current!.getBoundingClientRect();
                      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: nd.label, city: nd.city, region: nd.region });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <circle
                      cx={px} cy={py} r={r}
                      fill={color}
                      stroke={isSelected ? "#1e293b" : "#fff"}
                      strokeWidth={isSelected ? 2 / scale : 1.5 / scale}
                    />
                    <text
                      x={px} y={py - r - 2 / scale}
                      textAnchor="middle"
                      fontSize={10 / scale}
                      fontWeight="600"
                      fill="#1e293b"
                      pointerEvents="none"
                    >
                      {nd.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {tooltip && !selectedKey && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-md"
              style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
            >
              <p className="text-sm font-semibold text-zinc-800">{tooltip.label}</p>
              <p className="text-xs text-zinc-500">{tooltip.city} · {tooltip.region}</p>
            </div>
          )}

          {/* Map zoom controls */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
            <button
              onClick={() => applyTransform((t) => ({ ...t, scale: Math.min(t.scale * 1.3, 12) }))}
              className="flex size-8 items-center justify-center rounded border border-zinc-200 bg-white text-sm font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
            >
              +
            </button>
            <button
              onClick={() => applyTransform((t) => ({ ...t, scale: Math.max(t.scale / 1.3, 0.5) }))}
              className="flex size-8 items-center justify-center rounded border border-zinc-200 bg-white text-sm font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
            >
              −
            </button>
            <button
              onClick={() => applyTransform(() => ({ x: 0, y: 0, scale: 1 }))}
              className="flex size-8 items-center justify-center rounded border border-zinc-200 bg-white text-sm text-zinc-600 shadow-sm hover:bg-zinc-50"
              title="Resetar zoom"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Detail panel — animated slide-in from right */}
        <AnimatePresence>
          {selectedKey && (
            <motion.div
              key={selectedKey}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="shrink-0 overflow-hidden"
            >
              <AirportPanel
                nodeKey={selectedKey}
                graph={graph}
                onClose={() => setSelectedKey(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 py-2.5">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {Object.entries(REGION_COLORS).map(([region, color]) => (
            <li key={region} className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-zinc-600">{region}</span>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
