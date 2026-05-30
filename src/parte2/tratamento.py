import os
import csv

BASE_DIR = os.path.dirname(__file__)
TXT_PATH = os.path.join(BASE_DIR, "..", "..", "data", "wiki-Vote.txt")
CSV_PATH = os.path.join(BASE_DIR, "..", "..", "data", "wiki-Vote-weighted.csv")


def txt_to_weighted_csv(input_path: str, output_path: str):
    in_degree: dict[str, int] = {}

    with open(input_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith("#"):
                continue
            parts = line.strip().split("\t")
            if len(parts) != 2:
                continue

            destination = parts[1]
            in_degree[destination] = in_degree.get(destination, 0) + 1

    with open(input_path, 'r', encoding='utf-8') as f_in, \
            open(output_path, 'w', encoding='utf-8', newline='') as f_out:
        writer = csv.writer(f_out)
        writer.writerow(['from', 'to', 'weight'])

        for line in f_in:
            if line.startswith("#"):
                continue
            parts = line.strip().split("\t")
            if len(parts) != 2:
                continue

            origin, destination = parts[0], parts[1]
            weight = round(1.0 / (in_degree[destination] + 1), 6)

            writer.writerow([origin, destination, weight])

if __name__ == "__main__":
    txt_to_weighted_csv(TXT_PATH, CSV_PATH)