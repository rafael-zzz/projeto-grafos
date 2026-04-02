"use client";

import {
  useBrazilChoroplethMap,
  type BrazilAnyMapInputRow,
} from "@/hooks/useBrazilChoroplethMap";

import { BrazilMapLegend } from "./BrazilMapLegend";

export const DEFAULT_BRAZIL_MAP_SHELL_CLASS =
  "relative w-full min-h-[48dvh] flex-1";

export type BrazilAnyMapProps = {
  className?: string;
  data?: BrazilAnyMapInputRow[];
  mapAreaClassName?: string;
  showLegend?: boolean;
  legendClassName?: string;
};

export function BrazilAnyMap({
  className = "",
  data,
  mapAreaClassName,
  showLegend = true,
  legendClassName = "",
}: BrazilAnyMapProps) {
  const { containerId, containerRef } = useBrazilChoroplethMap({ data });

  const mapShellClasses = [
    DEFAULT_BRAZIL_MAP_SHELL_CLASS,
    mapAreaClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={[
        "flex min-h-dvh w-full max-w-[100vw] flex-col bg-transparent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={mapShellClasses}>
        <div
          id={containerId}
          ref={containerRef}
          className="absolute inset-0 bg-transparent"
        />
      </div>

      {showLegend ? (
        <div
          className={[
            "shrink-0 border-t border-zinc-200/90 bg-zinc-50/95 px-3 py-2.5 backdrop-blur-sm dark:border-zinc-700/90 dark:bg-zinc-950/95",
            "sm:px-4 sm:py-3",
            "supports-[padding:max(0px)]:pb-[max(0.625rem,env(safe-area-inset-bottom))]",
            legendClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <BrazilMapLegend className="mx-auto w-full max-w-5xl justify-center" />
        </div>
      ) : null}
    </div>
  );
}
