export const BRAZIL_MACRO_REGION = {
  NORTE: 1,
  NORDESTE: 2,
  CENTRO_OESTE: 3,
  SUDESTE: 4,
  SUL: 5,
} as const;

export type BrazilMacroRegionCode =
  (typeof BRAZIL_MACRO_REGION)[keyof typeof BRAZIL_MACRO_REGION];

export const MACRO_REGION_LABEL: Record<BrazilMacroRegionCode, string> = {
  [BRAZIL_MACRO_REGION.NORTE]: "Norte",
  [BRAZIL_MACRO_REGION.NORDESTE]: "Nordeste",
  [BRAZIL_MACRO_REGION.CENTRO_OESTE]: "Centro-Oeste",
  [BRAZIL_MACRO_REGION.SUDESTE]: "Sudeste",
  [BRAZIL_MACRO_REGION.SUL]: "Sul",
};

export const MACRO_REGION_CHOROPLETH_COLORS: Record<
  BrazilMacroRegionCode,
  string
> = {
  [BRAZIL_MACRO_REGION.NORTE]: "#0d9488",
  [BRAZIL_MACRO_REGION.NORDESTE]: "#ea580c",
  [BRAZIL_MACRO_REGION.CENTRO_OESTE]: "#7c3aed",
  [BRAZIL_MACRO_REGION.SUDESTE]: "#2563eb",
  [BRAZIL_MACRO_REGION.SUL]: "#16a34a",
};

export const STATE_ID_TO_MACRO_REGION: Record<
  string,
  BrazilMacroRegionCode
> = {
  "BR.AC": BRAZIL_MACRO_REGION.NORTE,
  "BR.AP": BRAZIL_MACRO_REGION.NORTE,
  "BR.AM": BRAZIL_MACRO_REGION.NORTE,
  "BR.PA": BRAZIL_MACRO_REGION.NORTE,
  "BR.RO": BRAZIL_MACRO_REGION.NORTE,
  "BR.RR": BRAZIL_MACRO_REGION.NORTE,
  "BR.TO": BRAZIL_MACRO_REGION.NORTE,
  "BR.AL": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.BA": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.CE": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.MA": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.PB": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.PE": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.PI": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.RN": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.SE": BRAZIL_MACRO_REGION.NORDESTE,
  "BR.DF": BRAZIL_MACRO_REGION.CENTRO_OESTE,
  "BR.GO": BRAZIL_MACRO_REGION.CENTRO_OESTE,
  "BR.MT": BRAZIL_MACRO_REGION.CENTRO_OESTE,
  "BR.MS": BRAZIL_MACRO_REGION.CENTRO_OESTE,
  "BR.ES": BRAZIL_MACRO_REGION.SUDESTE,
  "BR.MG": BRAZIL_MACRO_REGION.SUDESTE,
  "BR.RJ": BRAZIL_MACRO_REGION.SUDESTE,
  "BR.SP": BRAZIL_MACRO_REGION.SUDESTE,
  "BR.PR": BRAZIL_MACRO_REGION.SUL,
  "BR.RS": BRAZIL_MACRO_REGION.SUL,
  "BR.SC": BRAZIL_MACRO_REGION.SUL,
};

export const STATE_DISPLAY_NAME: Record<string, string> = {
  "BR.AC": "Acre",
  "BR.AL": "Alagoas",
  "BR.AP": "Amapá",
  "BR.AM": "Amazonas",
  "BR.BA": "Bahia",
  "BR.CE": "Ceará",
  "BR.DF": "Distrito Federal",
  "BR.ES": "Espírito Santo",
  "BR.GO": "Goiás",
  "BR.MA": "Maranhão",
  "BR.MT": "Mato Grosso",
  "BR.MS": "Mato Grosso do Sul",
  "BR.MG": "Minas Gerais",
  "BR.PA": "Pará",
  "BR.PB": "Paraíba",
  "BR.PR": "Paraná",
  "BR.PE": "Pernambuco",
  "BR.PI": "Piauí",
  "BR.RJ": "Rio de Janeiro",
  "BR.RN": "Rio Grande do Norte",
  "BR.RS": "Rio Grande do Sul",
  "BR.RO": "Rondônia",
  "BR.RR": "Roraima",
  "BR.SC": "Santa Catarina",
  "BR.SP": "São Paulo",
  "BR.SE": "Sergipe",
  "BR.TO": "Tocantins",
};
