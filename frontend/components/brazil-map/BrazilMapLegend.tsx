import {
  BRAZIL_MACRO_REGION,
  type BrazilMacroRegionCode,
  MACRO_REGION_LABEL,
} from "@/lib/brazil/brazilMacroRegions";

const MACRO_REGION_SWATCH_BG: Record<BrazilMacroRegionCode, string> = {
  [BRAZIL_MACRO_REGION.NORTE]: "bg-[#0d9488]",
  [BRAZIL_MACRO_REGION.NORDESTE]: "bg-[#ea580c]",
  [BRAZIL_MACRO_REGION.CENTRO_OESTE]: "bg-[#7c3aed]",
  [BRAZIL_MACRO_REGION.SUDESTE]: "bg-[#2563eb]",
  [BRAZIL_MACRO_REGION.SUL]: "bg-[#16a34a]",
};

const ORDER: (keyof typeof BRAZIL_MACRO_REGION)[] = [
  "NORTE",
  "NORDESTE",
  "CENTRO_OESTE",
  "SUDESTE",
  "SUL",
];

export function BrazilMapLegend({ className = "" }: { className?: string }) {
  return (
    <ul
      className={[
        "flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.7rem] leading-tight text-zinc-600 sm:gap-x-5 sm:text-sm dark:text-zinc-400",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Legenda das macrorregiões"
    >
      {ORDER.map((key) => {
        const code = BRAZIL_MACRO_REGION[key];
        return (
          <li key={key} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span
              className={[
                "size-2.5 shrink-0 rounded-sm ring-1 ring-zinc-300/80 sm:size-3 dark:ring-zinc-600",
                MACRO_REGION_SWATCH_BG[code],
              ].join(" ")}
            />
            <span className="truncate">{MACRO_REGION_LABEL[code]}</span>
          </li>
        );
      })}
    </ul>
  );
}
