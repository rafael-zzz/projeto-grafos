import json

from avd_visualizations import (
    load_degrees,
    load_region_flows,
    load_region_metrics,
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
