import json

import visualization
from visualization import (
    DegreeRecord,
    RegionFlow,
    RegionMetric,
    build_degree_distribution,
    build_region_flow_matrix,
    load_degrees,
    load_region_flows,
    load_region_metrics,
    plot_degree_distribution,
    plot_region_flow_heatmap,
)


def test_load_degrees_converts_degree_to_int(tmp_path):
    path = tmp_path / "graus.csv"
    path.write_text("aeroporto,grau\nSBGR,59\nSBKP,63\n", encoding="utf-8")

    degrees = load_degrees(path)

    assert degrees[0].airport == "SBGR"
    assert degrees[0].degree == 59
    assert degrees[1].airport == "SBKP"
    assert degrees[1].degree == 63


def test_load_region_metrics_converts_json_values(tmp_path):
    path = tmp_path / "regioes.json"
    path.write_text(
        json.dumps({"Sudeste": {"ordem": 38, "tamanho": 105, "densidade": 0.1494}}),
        encoding="utf-8",
    )

    metrics = load_region_metrics(path)

    assert metrics[0].region == "Sudeste"
    assert metrics[0].order == 38
    assert metrics[0].size == 105
    assert metrics[0].density == 0.1494


def test_load_region_flows_converts_flight_count_to_int(tmp_path):
    path = tmp_path / "flight_regions.csv"
    path.write_text(
        "regiao_origem,regiao_destino,quantidade_voos\n"
        "Sudeste,Nordeste,9346\n"
        "Nordeste,Sudeste,9382\n",
        encoding="utf-8",
    )

    flows = load_region_flows(path)

    assert flows[0].origin == "Sudeste"
    assert flows[0].destination == "Nordeste"
    assert flows[0].flights == 9346
    assert flows[1].origin == "Nordeste"
    assert flows[1].destination == "Sudeste"
    assert flows[1].flights == 9382


def test_build_degree_distribution_groups_degrees_in_ranges():
    degrees = [
        DegreeRecord("A", 0),
        DegreeRecord("B", 4),
        DegreeRecord("C", 5),
        DegreeRecord("D", 11),
    ]

    labels, counts = build_degree_distribution(degrees, bin_size=5)

    assert labels == ["0-4", "5-9", "10-14"]
    assert counts == [2, 1, 1]


def test_build_region_flow_matrix_orders_regions_and_fills_missing_pairs():
    flows = [
        RegionFlow("Sudeste", "Nordeste", 10),
        RegionFlow("Nordeste", "Sudeste", 7),
        RegionFlow("Sudeste", "Sudeste", 3),
    ]

    regions, matrix = build_region_flow_matrix(flows)

    assert regions == ["Nordeste", "Sudeste"]
    assert matrix == [
        [0, 7],
        [10, 3],
    ]


def test_top_degrees_returns_highest_degrees_in_descending_order():
    degrees = [
        DegreeRecord("A", 2),
        DegreeRecord("B", 10),
        DegreeRecord("C", 7),
    ]

    result = viz.top_degrees(degrees, limit=2)

    assert result == [
        DegreeRecord("B", 10),
        DegreeRecord("C", 7),
    ]


def test_sort_regions_by_density_orders_from_highest_to_lowest():
    metrics = [
        RegionMetric("Norte", 36, 51, 0.081),
        RegionMetric("Sudeste", 38, 105, 0.1494),
        RegionMetric("Sul", 23, 30, 0.1186),
    ]

    result = viz.sort_regions_by_density(metrics)

    assert result == [
        RegionMetric("Sudeste", 38, 105, 0.1494),
        RegionMetric("Sul", 23, 30, 0.1186),
        RegionMetric("Norte", 36, 51, 0.081),
    ]


def test_plot_degree_distribution_writes_png(tmp_path):
    output = tmp_path / "distribuicao_graus.png"

    plot_degree_distribution(
        [DegreeRecord("A", 1), DegreeRecord("B", 7)],
        output,
    )

    assert output.exists()
    assert output.stat().st_size > 0


def test_plot_region_flow_heatmap_writes_png(tmp_path):
    output = tmp_path / "fluxo_regioes.png"

    plot_region_flow_heatmap(
        [RegionFlow("Sudeste", "Nordeste", 10)],
        output,
    )

    assert output.exists()
    assert output.stat().st_size > 0


def test_plot_degree_ranking_writes_png(tmp_path):
    output = tmp_path / "ranking_graus.png"

    viz.plot_degree_ranking(
        [
            DegreeRecord("SBKP", 63),
            DegreeRecord("SBCF", 59),
            DegreeRecord("SBGR", 59),
        ],
        output,
    )

    assert output.exists()
    assert output.stat().st_size > 0


def test_plot_region_density_writes_png(tmp_path):
    output = tmp_path / "densidade_regioes.png"

    viz.plot_region_density(
        [
            RegionMetric("Sudeste", 38, 105, 0.1494),
            RegionMetric("Norte", 36, 51, 0.081),
        ],
        output,
    )

    assert output.exists()
    assert output.stat().st_size > 0


def test_build_analysis_notes_summarizes_main_findings():
    notes = viz.build_analysis_notes(
        degrees=[
            DegreeRecord("SBKP", 63),
            DegreeRecord("SBCF", 59),
            DegreeRecord("SBBE", 25),
        ],
        metrics=[
            RegionMetric("Sudeste", 38, 105, 0.1494),
            RegionMetric("Norte", 36, 51, 0.081),
        ],
        flows=[
            RegionFlow("Sudeste", "Nordeste", 9346),
            RegionFlow("Nordeste", "Sudeste", 9382),
        ],
    )

    assert "# Notas analiticas da AVD" in notes
    assert "Aeroporto mais conectado: SBKP (grau 63)" in notes
    assert "Regiao com maior densidade: Sudeste (0.1494)" in notes
    assert "Maior fluxo regional: Nordeste -> Sudeste (9382 voos)" in notes


def test_write_analysis_notes_writes_markdown(tmp_path):
    output = tmp_path / "notas_analiticas.md"

    viz.write_analysis_notes(
        degrees=[DegreeRecord("SBKP", 63)],
        metrics=[RegionMetric("Sudeste", 38, 105, 0.1494)],
        flows=[RegionFlow("Sudeste", "Sudeste", 12000)],
        output_path=output,
    )

    assert output.exists()
    assert output.read_text(encoding="utf-8").startswith("# Notas analiticas")
