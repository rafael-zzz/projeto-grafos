import csv
import math
import os

INPUT_PATH = "data/aeroportos-rotas-janeiro.csv"
OUTPUT_PATH = "data/adjacencias_aeroportos_treated.csv"

ICAO_TO_IATA = {
    "SBBE": "BEL",
    "SBPV": "PVH",
    "SBRB": "RBR",
    "SBTE": "THE",
}

AIRPORT_REGIONS = {
    "REC": "Nordeste",  "SSA": "Nordeste",  "FOR": "Nordeste",
    "NAT": "Nordeste",  "JPA": "Nordeste",  "THE": "Nordeste",
    "GRU": "Sudeste",   "CGH": "Sudeste",   "GIG": "Sudeste",
    "CNF": "Sudeste",   "VIX": "Sudeste",
    "BSB": "Centro-Oeste", "GYN": "Centro-Oeste",
    "CWB": "Sul",       "FLN": "Sul",       "POA": "Sul",
    "MAO": "Norte",     "BEL": "Norte",     "PVH": "Norte",  "RBR": "Norte",
}

OUR_AIRPORTS = set(AIRPORT_REGIONS.keys())


def normalize(code):
    return ICAO_TO_IATA.get(code, code)


def main():
    pairs = {}

    with open(INPUT_PATH, encoding="utf-8-sig") as f:
        next(f)
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            if row["Código Tipo Linha"].strip() != "N":
                continue
            if row["Situação Voo"].strip() != "REALIZADO":
                continue

            origin = normalize(row["ICAO Aeródromo Origem"].strip())
            dest = normalize(row["ICAO Aeródromo Destino"].strip())

            if origin not in OUR_AIRPORTS or dest not in OUR_AIRPORTS:
                continue
            if origin == dest:
                continue

            pair = tuple(sorted([origin, dest]))
            pairs[pair] = pairs.get(pair, 0) + 1

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["origem", "destino", "tipo_conexao", "justificativa", "peso"])

        for (origin, dest), freq in sorted(pairs.items()):
            region_o = AIRPORT_REGIONS[origin]
            region_d = AIRPORT_REGIONS[dest]

            if region_o == region_d:
                tipo = "regional"
                justificativa = f"mesma regiao ({region_o}) - {freq} voos em janeiro/2026"
            else:
                tipo = "inter-regional"
                justificativa = f"{region_o} <-> {region_d} - {freq} voos em janeiro/2026"

            peso = round(1 / math.log(freq + 1), 4)

            writer.writerow([origin, dest, tipo, justificativa, peso])

    print(f"{len(pairs)} arestas geradas -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
