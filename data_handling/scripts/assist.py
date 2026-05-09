"""
Arquivo: assist.py

Ajuda no debug, verificando se todos os aeroportos do dataset
original são contemplados na conversão de regiões.
"""


import pandas as pd
import constants as c

clean = pd.read_csv(f'{c.out_path}clean.csv', sep=';')
regions = pd.read_csv(f'{c.out_path}airports.csv')

airports_in_clean = set(clean['origem']).union(
    set(clean['destino'])
)

mapped_airports = set(regions['icao'])

missing = airports_in_clean - mapped_airports

if missing:
    print('Aeroportos faltando em airports.csv:\n')

    for airport in sorted(missing):
        print(airport)

    print(f'\nTotal faltando: {len(missing)}')

else:
    print('Todos os aeroportos estão contemplados.')