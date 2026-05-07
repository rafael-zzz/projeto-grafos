import json
import csv
import os
from typing import Any

from graphs.metrics_calculator import calculate_base_metrics

def export_global_metrics_json(nodes: list[Any] | set[Any], edges: list[Any] | set[Any], output_path: str = "out/global.json") -> None:

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    order, size, density = calculate_base_metrics(nodes, edges)
    
    data = {"ordem": order,"tamanho": size, "densidade": round(density, 4)}
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
def export_regions_metrics_json(regions_data: dict[str, tuple[list[Any] | set[Any], list[Any] | set[Any]]], output_path: str = "out/regioes.json") -> None:

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    result = {}
    for region_name, (v, e) in regions_data.items():
        order, size, density = calculate_base_metrics(v, e)
        result[region_name] = {"ordem": order, "tamanho": size, "densidade": round(density, 4)}
        
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=4, ensure_ascii=False)
        
def export_degrees_csv(degrees: dict[str, int], output_path: str = "out/graus.csv") -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    rows = sorted(degrees.items(), key=lambda x: x[1], reverse=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["aeroporto", "grau"])
        writer.writerows(rows)

def export_ego_metrics(ego_data: dict[str, tuple[int, list[Any] | set[Any], list[Any] | set[Any]]], csv_path: str = "out/ego_aeroportos.csv", json_path: str = "out/ego_aeroportos.json") -> None:

    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    
    table_data = []
    
    for airport, (degree, v_ego, e_ego) in ego_data.items():
        order_ego, size_ego, density_ego = calculate_base_metrics(v_ego, e_ego)
        
        table_data.append({ "aeroporto": airport, "grau": degree, "ordem_ego": order_ego, "tamanho_ego": size_ego, "densidade_ego": round(density_ego, 4)})
        
    columns = ["aeroporto", "grau", "ordem_ego", "tamanho_ego", "densidade_ego"]

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(table_data)

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(table_data, f, indent=4, ensure_ascii=False)
