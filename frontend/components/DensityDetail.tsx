"use client";

import { useState } from "react";

export function DensityDetail({
  size,
  order,
  density,
}: {
  size: number;
  order: number;
  density: number;
}) {
  const [open, setOpen] = useState(false);
  const denominator = order * (order - 1);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-left"
        title="Ver cálculo"
      >
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">Densidade</span>
        <span className="text-[9px] text-zinc-300">{open ? "▲" : "▼"}</span>
      </button>
      <span className="text-xl font-bold text-zinc-800">{density.toFixed(6)}</span>
      {open && (
        <div className="mt-1 rounded bg-zinc-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-zinc-500">
          <div className="text-zinc-400">tamanho</div>
          <div className="border-b border-zinc-200 pb-0.5 text-zinc-400">ordem × (ordem − 1)</div>
          <div className="pt-0.5">
            {size} / ({order} × {order - 1})
          </div>
          <div>
            = {size} / {denominator}
          </div>
          <div className="font-semibold text-zinc-700">= {density.toFixed(6)}</div>
        </div>
      )}
    </div>
  );
}
