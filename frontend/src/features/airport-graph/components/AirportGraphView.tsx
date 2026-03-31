"use client";

import { useEffect, useRef } from "react";
import Sigma from "sigma";
import type { UndirectedGraph } from "graphology";

type AirportGraphViewProps = {
  graph: UndirectedGraph;
  className?: string;
};

export function AirportGraphView({ graph, className }: AirportGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sigma = new Sigma(graph, container, {
      renderLabels: true,
      renderEdgeLabels: false,
      labelSize: 13,
      labelDensity: 0.85,
      labelGridCellSize: 60,
      zIndex: true,
      defaultNodeColor: "#64748b",
      defaultEdgeColor: "#94a3b8",
      minCameraRatio: 0.35,
      maxCameraRatio: 2.5,
    });

    let draggedNode: string | null = null;
    let isDragging = false;

    const handleDownNode = (e: { node: string }) => {
      isDragging = true;
      draggedNode = e.node;
      graph.setNodeAttribute(draggedNode, "highlighted", true);
      if (!sigma.getCustomBBox()) {
        sigma.setCustomBBox(sigma.getBBox());
      }
    };

    const handleMoveBody = (e: {
      event: {
        x: number;
        y: number;
        preventSigmaDefault(): void;
        original: Event;
      };
      preventSigmaDefault(): void;
    }) => {
      if (!isDragging || !draggedNode) return;
      const pos = sigma.viewportToGraph(e.event);
      graph.setNodeAttribute(draggedNode, "x", pos.x);
      graph.setNodeAttribute(draggedNode, "y", pos.y);
      e.preventSigmaDefault();
      e.event.preventSigmaDefault();
      e.event.original.preventDefault();
      e.event.original.stopPropagation();
    };

    const handleUp = () => {
      if (draggedNode && graph.hasNode(draggedNode)) {
        graph.setNodeAttribute(draggedNode, "highlighted", false);
      }
      isDragging = false;
      draggedNode = null;
    };

    sigma.on("downNode", handleDownNode);
    sigma.on("moveBody", handleMoveBody);
    sigma.on("upNode", handleUp);
    sigma.on("upStage", handleUp);

    const ro = new ResizeObserver(() => {
      sigma.refresh();
    });
    ro.observe(container);

    return () => {
      sigma.off("downNode", handleDownNode);
      sigma.off("moveBody", handleMoveBody);
      sigma.off("upNode", handleUp);
      sigma.off("upStage", handleUp);
      ro.disconnect();
      sigma.kill();
    };
  }, [graph]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", minHeight: 480 }}
    />
  );
}
