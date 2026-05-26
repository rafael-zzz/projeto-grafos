import csv
import json
from dataclasses import dataclass
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "out"
DEGREES_CSV = OUT_DIR / "graus.csv"
REGION_METRICS_JSON = OUT_DIR / "regioes.json"
REGION_FLOWS_CSV = OUT_DIR / "flight_regions.csv"
NOTES_MD = OUT_DIR / "notas_analiticas.md"


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


def top_degrees(
    degrees: list[DegreeRecord],
    limit: int = 10,
) -> list[DegreeRecord]:
    if limit <= 0:
        return []

    return sorted(degrees, key=lambda record: record.degree, reverse=True)[:limit]


def sort_regions_by_density(metrics: list[RegionMetric]) -> list[RegionMetric]:
    return sorted(metrics, key=lambda metric: metric.density, reverse=True)


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


def plot_degree_ranking(
    degrees: list[DegreeRecord],
    output_path: str | Path,
) -> None:
    plt = _load_pyplot()

    ranked_degrees = top_degrees(degrees)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(
        [record.airport for record in ranked_degrees],
        [record.degree for record in ranked_degrees],
        color="#0f766e",
    )
    ax.set_title("Aeroportos mais conectados")
    ax.set_xlabel("Grau")
    ax.set_ylabel("Aeroporto")
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=0.25)

    for index, record in enumerate(ranked_degrees):
        ax.text(
            record.degree + 0.5,
            index,
            str(record.degree),
            va="center",
            fontsize=8,
        )

    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def plot_region_density(
    metrics: list[RegionMetric],
    output_path: str | Path,
) -> None:
    plt = _load_pyplot()

    ordered_metrics = sort_regions_by_density(metrics)
    max_density = max((metric.density for metric in ordered_metrics), default=0)

    fig, ax = plt.subplots(figsize=(9, 6))
    ax.bar(
        [metric.region for metric in ordered_metrics],
        [metric.density for metric in ordered_metrics],
        color="#9333ea",
    )
    ax.set_title("Densidade dos subgrafos por regiao")
    ax.set_xlabel("Regiao")
    ax.set_ylabel("Densidade")
    ax.set_ylim(0, max_density * 1.2 if max_density else 1)
    ax.grid(axis="y", alpha=0.25)

    for index, metric in enumerate(ordered_metrics):
        ax.text(
            index,
            metric.density,
            f"{metric.density:.3f}",
            ha="center",
            va="bottom",
            fontsize=8,
        )

    fig.tight_layout()
    fig.savefig(output_path, dpi=160)
    plt.close(fig)


def build_analysis_notes(
    degrees: list[DegreeRecord],
    metrics: list[RegionMetric],
    flows: list[RegionFlow],
) -> str:
    top_airports = top_degrees(degrees)
    ordered_metrics = sort_regions_by_density(metrics)
    strongest_flow = max(flows, key=lambda flow: flow.flights, default=None)

    lines = [
        "# Notas analiticas da AVD",
        "",
        "## Leitura exploratoria",
        "- A distribuicao de graus ajuda a ver se a malha tem muitos aeroportos "
        "perifericos ou poucos hubs concentrando conexoes.",
    ]

    if strongest_flow is not None:
        lines.append(
            f"- Maior fluxo regional: {strongest_flow.origin} -> "
            f"{strongest_flow.destination} ({strongest_flow.flights} voos)."
        )

    lines.extend(
        [
            "",
            "## Leitura explanatoria",
        ]
    )

    if top_airports:
        top_airport = top_airports[0]
        lines.append(
            f"- Aeroporto mais conectado: {top_airport.airport} "
            f"(grau {top_airport.degree})."
        )

    if ordered_metrics:
        densest_region = ordered_metrics[0]
        least_dense_region = ordered_metrics[-1]
        lines.append(
            f"- Regiao com maior densidade: {densest_region.region} "
            f"({densest_region.density:.4f})."
        )
        lines.append(
            f"- Regiao com menor densidade: {least_dense_region.region} "
            f"({least_dense_region.density:.4f})."
        )

    lines.extend(
        [
            "",
            "## Arquivos gerados",
            "- out/distribuicao_graus.png",
            "- out/fluxo_regioes.png",
            "- out/ranking_graus.png",
            "- out/densidade_regioes.png",
        ]
    )

    return "\n".join(lines) + "\n"


def write_analysis_notes(
    degrees: list[DegreeRecord],
    metrics: list[RegionMetric],
    flows: list[RegionFlow],
    output_path: str | Path,
) -> None:
    Path(output_path).write_text(
        build_analysis_notes(degrees, metrics, flows),
        encoding="utf-8",
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    degrees = load_degrees(DEGREES_CSV)
    metrics = load_region_metrics(REGION_METRICS_JSON)
    flows = load_region_flows(REGION_FLOWS_CSV)

    plot_degree_distribution(degrees, OUT_DIR / "distribuicao_graus.png")
    plot_region_flow_heatmap(flows, OUT_DIR / "fluxo_regioes.png")
    plot_degree_ranking(degrees, OUT_DIR / "ranking_graus.png")
    plot_region_density(metrics, OUT_DIR / "densidade_regioes.png")
    write_analysis_notes(degrees, metrics, flows, NOTES_MD)


if __name__ == "__main__":
    main()
