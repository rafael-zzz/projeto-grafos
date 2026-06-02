"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WikiGraphData, WikiNode } from "@/lib/graph/wiki_types";
import type { WikiGraphState } from "@/lib/graph/useWikiGraph";

const DEPTH_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const EDGE_BUCKETS  = 4;
const FADE_FRAMES   = 15; // frames to fade a node in (~250ms at 60fps)

// ─── 3-D helpers ─────────────────────────────────────────────────────────────
function rotatePoint(
  x: number, y: number, z: number, rx: number, ry: number,
): [number, number, number] {
  const x1 =  x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y2 = y  * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = y  * Math.sin(rx) + z1 * Math.cos(rx);
  return [x1, y2, z2];
}

// ─── Article panel ────────────────────────────────────────────────────────────
function ArticlePanel({ node, onClose }: { node: WikiNode; onClose: () => void }) {
  const a = node.attributes;
  return (
    <motion.div
      key="panel"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white"
    >
      <div className="flex items-start justify-between border-b border-zinc-100 px-4 py-3">
        <p className="text-xs font-bold leading-tight text-zinc-900">{a.title}</p>
        <button onClick={onClose} className="ml-2 shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Palavras</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">{a.word_count.toLocaleString("pt-BR")}</p>
        </div>
        {a.categories.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Categorias</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {a.categories.map((cat) => (
                <span key={cat} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">{cat}</span>
              ))}
            </div>
          </div>
        )}
        <a href={a.url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 rounded border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">
          Abrir no Wikipedia ↗
        </a>
      </div>
    </motion.div>
  );
}

// ─── Globe ────────────────────────────────────────────────────────────────────
export function WikipediaGlobe({ wikiState }: { wikiState: WikiGraphState }) {
  const {
    subgraph, traversalOrder, bfsGhostOrder, nodeKeys, loaded,
    seed, setSeed, depth, setDepth,
    maxNodes, setMaxNodes, algorithm, setAlgorithm,
    hitNodeCap,
  } = wikiState;

  // ── React state — drives UI controls + article panel only ────────────────
  const [step,           setStep]           = useState(0);
  const [playing,        setPlaying]        = useState(false);
  const [speed,          setSpeed]          = useState(12);
  const [maxEdgesPerNode,setMaxEdgesPerNode] = useState(8);
  const [selectedKey,    setSelectedKey]    = useState<string | null>(null);

  // ── Render refs — read every frame by the RAF loop, never cause re-renders
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const rotRef           = useRef({ x: 0.4, y: 0.3 });
  const scaleRef         = useRef(1);
  const graphRef         = useRef<WikiGraphData | null>(null);
  const nodeMapRef       = useRef(new Map<string, WikiNode>());
  const traversalRef     = useRef<string[]>([]);
  const visibleSetRef    = useRef(new Set<string>());
  const bfsGhostSetRef   = useRef(new Set<string>());
  const stepRef          = useRef(0);
  const nodeEnteredAtRef = useRef(new Map<string, number>());
  const maxEdgesRef      = useRef(8);
  const algorithmRef     = useRef(algorithm);
  const selectedKeyRef   = useRef<string | null>(null);
  // Projected positions stored each frame for click hit-testing
  const projectedRef     = useRef(new Map<string, { px: number; py: number }>());

  // Drag refs
  const dragRef = useRef<{ sx: number; sy: number; rx: number; ry: number } | null>(null);
  const didDrag = useRef(false);

  // ── Sync refs from React state/props ────────────────────────────────────
  useEffect(() => {
    graphRef.current = subgraph;
    nodeMapRef.current = subgraph
      ? new Map(subgraph.nodes.map((n) => [n.key, n]))
      : new Map();
  }, [subgraph]);

  useEffect(() => { maxEdgesRef.current    = maxEdgesPerNode; }, [maxEdgesPerNode]);
  useEffect(() => { algorithmRef.current   = algorithm;       }, [algorithm]);
  useEffect(() => { selectedKeyRef.current = selectedKey;     }, [selectedKey]);
  useEffect(() => { bfsGhostSetRef.current = new Set(bfsGhostOrder); }, [bfsGhostOrder]);

  // ── Reset + autoplay when traversal changes ──────────────────────────────
  useEffect(() => {
    traversalRef.current     = traversalOrder;
    visibleSetRef.current    = new Set(traversalOrder.slice(0, 1));
    nodeEnteredAtRef.current = new Map(traversalOrder[0] ? [[traversalOrder[0], 0]] : []);
    stepRef.current          = 0;

    const resetTimer = window.setTimeout(() => {
      setStep(0);
      setSelectedKey(null);
      setPlaying(traversalOrder.length > 0);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [traversalOrder]);

  // ── Animation tick ───────────────────────────────────────────────────────
  useEffect(() => {
    const total = traversalOrder.length;
    if (!playing || step >= total - 1) return;

    const npt = Math.max(1, Math.floor(total / 150));
    const timer = setTimeout(() => {
      setStep((s) => {
        const next = Math.min(s + npt, total - 1);
        const order = traversalRef.current;
        for (let i = s + 1; i <= next; i++) {
          const key = order[i];
          if (key && !nodeEnteredAtRef.current.has(key))
            nodeEnteredAtRef.current.set(key, next);
        }
        visibleSetRef.current = new Set(order.slice(0, next + 1));
        stepRef.current = next;
        return next;
      });
      if (step + npt >= total - 1) setPlaying(false);
    }, speed);
    return () => clearTimeout(timer);
  }, [playing, step, traversalOrder, speed]);

  // ── RAF render loop — runs continuously, never restarts ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas as HTMLCanvasElement;
    let rafId: number;

    function draw() {
      const graph = graphRef.current;
      const ctx   = c.getContext("2d");
      if (!ctx) { rafId = requestAnimationFrame(draw); return; }

      // Resize canvas buffer to match CSS size
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w || c.height !== h) {
        c.width  = w;
        c.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      if (!graph || !graph.nodes.length) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      const cx       = w / 2;
      const cy       = h / 2;
      const canvasR  = Math.min(w, h) * 0.42 * scaleRef.current;
      const { x: rx, y: ry } = rotRef.current;
      const visibleSet    = visibleSetRef.current;
      const bfsGhostSet   = bfsGhostSetRef.current;
      const curStep       = stepRef.current;
      const nodeEnteredAt = nodeEnteredAtRef.current;
      const maxEdges      = maxEdgesRef.current;
      const alg           = algorithmRef.current;
      const egoNode       = traversalRef.current[0] ?? null;
      const selKey        = selectedKeyRef.current;
      const BASE_R        = 290; // matches original SVG sizing
      const isDfsMode     = alg === "dfs" && bfsGhostSet.size > 0;

      // Globe background — transparent fill so the watermark shows through
      ctx.beginPath();
      ctx.arc(cx, cy, canvasR, 0, Math.PI * 2);
      ctx.strokeStyle = "#d4d4d4";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Project visible nodes + BFS ghost nodes
      const projected = new Map<string, { px: number; py: number; pz: number }>();
      for (const node of graph.nodes) {
        const inVisible = visibleSet.has(node.key);
        const inGhost   = isDfsMode && bfsGhostSet.has(node.key);
        if (!inVisible && !inGhost) continue;
        const [x2, y2, pz] = rotatePoint(
          node.attributes.x, node.attributes.y, node.attributes.z, rx, ry,
        );
        projected.set(node.key, {
          px: cx + x2 * canvasR,
          py: cy + y2 * canvasR,
          pz,
        });
      }
      // Store for click hit-testing (visible nodes only)
      projectedRef.current = new Map(
        [...projected.entries()]
          .filter(([k]) => visibleSet.has(k))
          .map(([k, v]) => [k, { px: v.px, py: v.py }]),
      );

      // ── Ghost edges (BFS background, DFS mode only) ───────────────
      if (isDfsMode) {
        ctx.strokeStyle = "rgba(160,160,160,0.07)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        const ghostDrawn = new Map<string, number>();
        for (const edge of graph.edges) {
          if (visibleSet.has(edge.source) || visibleSet.has(edge.target)) continue;
          if (!bfsGhostSet.has(edge.source) || !bfsGhostSet.has(edge.target)) continue;
          const count = ghostDrawn.get(edge.source) ?? 0;
          if (count >= maxEdges) continue;
          const src = projected.get(edge.source);
          const tgt = projected.get(edge.target);
          if (!src || !tgt) continue;
          ghostDrawn.set(edge.source, count + 1);
          ctx.moveTo(src.px, src.py);
          ctx.lineTo(tgt.px, tgt.py);
        }
        ctx.stroke();
      }

      // ── Normal edges ─────────────────────────────────────────────
      const buckets: [number, number, number, number][][] =
        Array.from({ length: EDGE_BUCKETS }, () => []);
      const drawn = new Map<string, number>();

      for (const edge of graph.edges) {
        if (!visibleSet.has(edge.source) || !visibleSet.has(edge.target)) continue;
        const count = drawn.get(edge.source) ?? 0;
        if (count >= maxEdges) continue;
        const src = projected.get(edge.source);
        const tgt = projected.get(edge.target);
        if (!src || !tgt) continue;
        const minZ = Math.min(src.pz, tgt.pz);
        if (minZ < -0.6) continue;
        const t      = (minZ + 0.6) / 1.6;
        const bucket = Math.min(Math.floor(t * EDGE_BUCKETS), EDGE_BUCKETS - 1);
        buckets[bucket].push([src.px, src.py, tgt.px, tgt.py]);
        drawn.set(edge.source, count + 1);
      }
      for (let b = 0; b < EDGE_BUCKETS; b++) {
        const alpha = 0.04 + 0.18 * ((b + 0.5) / EDGE_BUCKETS);
        ctx.strokeStyle = `rgba(17,17,17,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of buckets[b]) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }

      // ── Nodes (back → front): ghosts then visible ────────────────
      const sorted = [...projected.entries()].sort(([, a], [, b]) => a.pz - b.pz);

      for (const [key, { px, py, pz }] of sorted) {
        const node = nodeMapRef.current.get(key);
        if (!node) continue;

        const isGhostOnly = isDfsMode && bfsGhostSet.has(key) && !visibleSet.has(key);

        if (isGhostOnly) {
          const depthT = (pz + 1) / 2;
          const nodeR  = node.attributes.size * (canvasR / BASE_R) * (0.5 + 0.5 * depthT) * 0.8;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(nodeR, 0.5), 0, Math.PI * 2);
          ctx.globalAlpha = 0.07 + 0.06 * depthT;
          ctx.fillStyle   = "#888888";
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        const isEgo      = alg === "ego" && key === egoNode;
        const isSelected = key === selKey;
        const depthT     = (pz + 1) / 2;
        const nodeR      = node.attributes.size * (canvasR / BASE_R) * (0.5 + 0.5 * depthT)
          * (isEgo ? 1.6 : isSelected ? 2.2 : 1);

        const depthOpacity = isEgo ? 1 : pz < 0 ? 0.15 + 0.55 * depthT : 0.7 + 0.3 * depthT;
        const enteredAt    = nodeEnteredAt.get(key) ?? 0;
        const fadeT        = Math.min(1, (curStep - enteredAt + 1) / FADE_FRAMES);
        const finalAlpha   = depthOpacity * fadeT;

        ctx.beginPath();
        ctx.arc(px, py, Math.max(nodeR, 0.5), 0, Math.PI * 2);

        if (isEgo) {
          ctx.globalAlpha = fadeT;
          ctx.fillStyle   = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth   = 2;
          ctx.stroke();
        } else if (isSelected) {
          ctx.globalAlpha = 1;
          ctx.fillStyle   = "#000000";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth   = 1.5;
          ctx.stroke();
        } else {
          ctx.globalAlpha = finalAlpha;
          ctx.fillStyle   = "#1a1a1a";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []); // starts on mount, canvas is always in DOM

  // ── Mouse handlers — update refs directly, no React setState ────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    didDrag.current = false;
    dragRef.current = { sx: e.clientX, sy: e.clientY, rx: rotRef.current.x, ry: rotRef.current.y };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    didDrag.current = true;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    rotRef.current = {
      x: dragRef.current.rx - dy * 0.005,
      y: dragRef.current.ry - dx * 0.005,
    };
  }, []);

  const onMouseUp    = useCallback(() => { dragRef.current = null; }, []);
  const onMouseLeave = useCallback(() => { dragRef.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    scaleRef.current = Math.min(Math.max(
      scaleRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.4,
    ), 4);
  }, []);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (didDrag.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let closest: string | null = null;
    let minDist = 24;
    for (const [key, { px, py }] of projectedRef.current) {
      const d = Math.hypot(mx - px, my - py);
      if (d < minDist) { minDist = d; closest = key; }
    }
    setSelectedKey((prev) => (prev === closest ? null : closest));
  }, []);

  // ── Derived for UI controls ───────────────────────────────────────────────
  const total      = traversalOrder.length;
  const isComplete = step >= total - 1;
  const progress   = total > 1 ? step / (total - 1) : 1;

  function handlePlayPause() {
    if (isComplete) {
      const order = traversalRef.current;
      visibleSetRef.current    = new Set(order.slice(0, 1));
      nodeEnteredAtRef.current = new Map(order[0] ? [[order[0], 0]] : []);
      stepRef.current          = 0;
      setStep(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }

  function handleReset() {
    const order = traversalRef.current;
    visibleSetRef.current    = new Set(order.slice(0, 1));
    nodeEnteredAtRef.current = new Map(order[0] ? [[order[0], 0]] : []);
    stepRef.current          = 0;
    setStep(0);
    setPlaying(true);
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  // Note: canvas is always rendered so the RAF loop can start on mount.
  // A loading overlay is shown on top until data is ready.

  const graph        = subgraph;
  const selectedNode = selectedKey && graph
    ? (graph.nodes.find((n) => n.key === selectedKey) ?? null)
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-zinc-200 bg-white">

        {!loaded ? (
          <div className="px-4 py-3">
            <h1 className="text-sm font-semibold text-zinc-800">Grafo Wikipedia</h1>
            <p className="mt-0.5 text-xs text-zinc-500">Carregando dados…</p>
          </div>
        ) : (
          <>
        {/* Row 1: title + stats + algorithm toggle */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">Grafo Wikipedia</h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              {graph?.nodes.length ?? 0} nós · {graph?.edges.length ?? 0} arestas
              {hitNodeCap && <span className="ml-2 font-medium text-amber-600">· limitado a {maxNodes} nós</span>}
            </p>
          </div>
          <div className="flex overflow-hidden rounded border border-zinc-200 text-[11px] font-semibold">
            {(["bfs", "dfs", "ego"] as const).map((a, i) => (
              <button key={a} onClick={() => { setAlgorithm(a); if (a === "ego" && depth > 2) setDepth(1); }}
                className={`px-3 py-1.5 uppercase transition-colors ${
                  algorithm === a ? "bg-zinc-800 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"
                } ${i > 0 ? "border-l border-zinc-200" : ""}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: seed + depth + max nodes + edges/node */}
        <div className="flex flex-wrap items-center gap-4 border-t border-zinc-100 bg-zinc-50 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Artigo</span>
            <input list="wiki-globe-seeds" value={seed} onChange={(e) => setSeed(e.target.value)}
              placeholder="Chess"
              className="w-52 rounded border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-400" />
            <datalist id="wiki-globe-seeds">
              {nodeKeys.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {algorithm === "ego" ? "Ordem" : "Profundidade"}
            </span>
            <div className="flex gap-0.5">
              {DEPTH_OPTIONS.map((d) => (
                <button key={d} onClick={() => setDepth(d)}
                  title={d > 3 ? "Profundidades altas podem gerar subgrafos muito grandes" : undefined}
                  className={`relative flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold transition-colors ${
                    depth === d ? "bg-zinc-800 text-white" : "bg-white text-zinc-500 hover:bg-zinc-100 border border-zinc-200"
                  }`}>
                  {d}
                  {d > 3 && (
                    <span className={`absolute -right-0.5 -top-0.5 flex h-2 w-2 items-center justify-center rounded-full text-[7px] ${
                      depth === d ? "bg-amber-400 text-amber-900" : "bg-amber-300 text-amber-800"
                    }`}>!</span>
                  )}
                </button>
              ))}
            </div>
            {depth > 3 && <span className="text-[10px] text-amber-600 font-medium">pode ser lento</span>}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Máx. nós</span>
            <input type="number" min={50} max={2000} step={50} value={maxNodes}
              onChange={(e) => setMaxNodes(Math.max(50, Math.min(2000, Number(e.target.value))))}
              className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Arestas/nó</span>
            <input type="number" min={0} max={50} step={1} value={maxEdgesPerNode}
              onChange={(e) => setMaxEdgesPerNode(Math.max(0, Math.min(50, Number(e.target.value))))}
              className="w-16 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-400" />
          </div>
        </div>

        {/* Row 3: animation controls */}
        <div className="flex items-center gap-3 border-t border-zinc-100 px-4 py-2">
          <button onClick={handlePlayPause}
            className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-white hover:bg-zinc-700 transition-colors text-xs">
            {playing ? "⏸" : isComplete ? "↺" : "▶"}
          </button>
          <button onClick={handleReset}
            className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 transition-colors text-xs">
            ↺
          </button>
          <div className="relative flex-1 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
            <div className="h-full rounded-full bg-zinc-800 transition-all duration-75"
              style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-[10px] tabular-nums text-zinc-500 shrink-0">
            {Math.min(step + 1, total)} / {total}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-zinc-400">Lento</span>
            <input type="range" min={5} max={200} step={5}
              value={205 - speed}
              onChange={(e) => setSpeed(205 - Number(e.target.value))}
              className="w-20 h-1 accent-zinc-800" />
            <span className="text-[10px] text-zinc-400">Rápido</span>
          </div>
        </div>
          </>
        )}
      </header>

      {/* ── Canvas + panel ─────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
        <div className="relative min-w-0 flex-1 overflow-hidden bg-white">
          {/* Wikipedia logo watermark */}
          <img
            src="/wiki_logo.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-[0.07]"
          />
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onWheel={onWheel}
            onClick={onCanvasClick}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <p className="text-sm text-zinc-400">Carregando grafo…</p>
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {loaded && selectedNode && (
            <ArticlePanel key={selectedNode.key} node={selectedNode} onClose={() => setSelectedKey(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
