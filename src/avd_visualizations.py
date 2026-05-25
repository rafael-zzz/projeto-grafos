import csv
import json
from dataclasses import dataclass
from pathlib import Path


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
