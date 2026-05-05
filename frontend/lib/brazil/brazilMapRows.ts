import {
  MACRO_REGION_LABEL,
  STATE_DISPLAY_NAME,
  STATE_ID_TO_MACRO_REGION,
} from "./brazilMacroRegions";

export type BrazilMapDataRow = {
  id: string;
  value: number;
  stateName: string;
  regionName: string;
  regionCode: number;
  metric?: number;
};

function rowForState(id: string): BrazilMapDataRow {
  const regionCode = STATE_ID_TO_MACRO_REGION[id];
  const stateName = STATE_DISPLAY_NAME[id] ?? id;
  const regionName = MACRO_REGION_LABEL[regionCode];
  return {
    id,
    value: regionCode,
    stateName,
    regionName,
    regionCode,
  };
}

const ALL_STATE_IDS = Object.keys(STATE_ID_TO_MACRO_REGION);

export const DEFAULT_BRAZIL_MAP_ROWS: BrazilMapDataRow[] = ALL_STATE_IDS.map(
  rowForState,
);

export function enrichBrazilMapRows(
  rows: { id: string; value: number }[],
): BrazilMapDataRow[] {
  return rows.map((r) => {
    const regionCode = STATE_ID_TO_MACRO_REGION[r.id];
    const stateName = STATE_DISPLAY_NAME[r.id] ?? r.id;
    const regionName = MACRO_REGION_LABEL[regionCode];
    return {
      id: r.id,
      value: regionCode,
      metric: r.value,
      stateName,
      regionName,
      regionCode,
    };
  });
}
