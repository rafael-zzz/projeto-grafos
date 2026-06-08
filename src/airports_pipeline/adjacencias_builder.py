import csv
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

AIRPORTS_CSV = os.path.join(ROOT, "out", "airports.csv")
EDGES_CSV    = os.path.join(ROOT, "out", "edges.csv")
OUTPUT_CSV   = os.path.join(ROOT, "data", "airports", "adjacencias_aeroportos.csv")


def build_adjacencias():
    regioes: dict[str, str] = {}
    with open(AIRPORTS_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            regioes[row["icao"].strip()] = row["regiao"].strip()

    rows = []
    with open(EDGES_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            origem  = row["origem"].strip()
            destino = row["destino"].strip()

            if origem == destino:
                continue

            tipo       = row["tipo_conexao"].strip()
            quantidade = row["quantidade"].strip()
            peso       = row["peso"].strip()

            reg_orig = regioes.get(origem, "?")
            reg_dest = regioes.get(destino, "?")

            ops = int(quantidade)
            ops_str = f"{ops} operação" if ops == 1 else f"{ops} operações"

            if tipo == "intrarregional":
                justificativa = f"voo dentro da região {reg_orig} com {ops_str} em jan/2026"
            else:
                justificativa = f"voo de {reg_orig} para {reg_dest} com {ops_str} em jan/2026"

            rows.append({
                "origem":        origem,
                "destino":       destino,
                "tipo_conexao":  tipo,
                "justificativa": justificativa,
                "peso":          peso,
            })

    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["origem", "destino", "tipo_conexao", "justificativa", "peso"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Gerado: {OUTPUT_CSV} ({len(rows)} arestas)")


if __name__ == "__main__":
    build_adjacencias()
