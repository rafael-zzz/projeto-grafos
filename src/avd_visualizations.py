import csv
import json
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "out"
DEGREES_CSV = OUT_DIR / "graus.csv"
REGION_METRICS_JSON = OUT_DIR / "regioes.json"
REGION_FLOWS_CSV = OUT_DIR / "flight_regions.csv"


@dataclass(frozen=True)
class DegreeRecord:
    airport: str
    degree: int


@dataclass(frozen=True)
class RegionMetric:
    region: str
    order: int
    size: int
    density: float


@dataclass(frozen=True)
class RegionFlow:
    origin: str
    destination: str
    flights: int


def load_degrees(path: str | Path) -> list[DegreeRecord]:
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [
            DegreeRecord(
                airport=row["aeroporto"],
                degree=int(row["grau"]),
            )
            for row in reader
        ]


def load_region_metrics(path: str | Path) -> list[RegionMetric]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    return [
        RegionMetric(
            region=region,
            order=int(values["ordem"]),
            size=int(values["tamanho"]),
            density=float(values["densidade"]),
        )
        for region, values in data.items()
    ]


def load_region_flows(path: str | Path) -> list[RegionFlow]:
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [
            RegionFlow(
                origin=row["regiao_origem"],
                destination=row["regiao_destino"],
                flights=int(row["quantidade_voos"]),
            )
            for row in reader
        ]


def build_degree_distribution(
    degrees: list[DegreeRecord],
    bin_size: int = 5,
) -> tuple[list[str], list[int]]:
    if bin_size <= 0:
        raise ValueError("bin_size must be greater than zero")
    if not degrees:
        return [], []

    max_degree = max(record.degree for record in degrees)
    labels = []
    counts = []

    for start in range(0, max_degree + 1, bin_size):
        end = start + bin_size - 1
        labels.append(f"{start}-{end}")
        counts.append(
            sum(start <= record.degree <= end for record in degrees)
        )

    return labels, counts


def build_region_flow_matrix(
    flows: list[RegionFlow],
) -> tuple[list[str], list[list[int]]]:
    regions = sorted(
        {flow.origin for flow in flows} | {flow.destination for flow in flows}
    )
    index = {region: i for i, region in enumerate(regions)}
    matrix = [[0 for _ in regions] for _ in regions]

    for flow in flows:
        row = index[flow.origin]
        col = index[flow.destination]
        matrix[row][col] += flow.flights

    return regions, matrix


def _load_pyplot():
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    return plt


def plot_degree_distribution(
    degrees: list[DegreeRecord],
    output_path: str | Path,
) -> None:
    plt = _load_pyplot()

    labels, counts = build_degree_distribution(degrees)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(labels, counts, color="#2563eb")
    ax.set_title("Distribuição dos graus dos aeroportos")
    ax.set_xlabel("Faixa de grau")
    ax.set_ylabel("Quantidade de aeroportos")
    ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def plot_region_flow_heatmap(
    flows: list[RegionFlow],
    output_path: str | Path,
) -> None:
    plt = _load_pyplot()

    regions, matrix = build_region_flow_matrix(flows)

    fig, ax = plt.subplots(figsize=(9, 7))
    image = ax.imshow(matrix, cmap="Blues")
    ax.set_title("Fluxo de voos entre regiões")
    ax.set_xlabel("Região de destino")
    ax.set_ylabel("Região de origem")
    ax.set_xticks(range(len(regions)), labels=regions, rotation=30, ha="right")
    ax.set_yticks(range(len(regions)), labels=regions)

    for row_idx, row in enumerate(matrix):
        for col_idx, value in enumerate(row):
            ax.text(col_idx, row_idx, str(value), ha="center", va="center", fontsize=8)

    fig.colorbar(image, ax=ax, label="Quantidade de voos")
    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    degrees = load_degrees(DEGREES_CSV)
    flows = load_region_flows(REGION_FLOWS_CSV)

    plot_degree_distribution(degrees, OUT_DIR / "distribuicao_graus.png")
    plot_region_flow_heatmap(flows, OUT_DIR / "fluxo_regioes.png")


if __name__ == "__main__":
    main()
