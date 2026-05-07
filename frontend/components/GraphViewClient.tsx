"use client";

import dynamic from "next/dynamic";

const BrazilAirportMap = dynamic(
  () => import("@/components/BrazilAirportMap").then((m) => m.BrazilAirportMap),
  { ssr: false }
);

export function GraphViewClient() {
  return <BrazilAirportMap />;
}
