import pandas as pd

cleaned = pd.read_csv('./output/cleaned.csv', sep=';')
regions = pd.read_csv('./output/airport_regions.csv')

airports_in_cleaned = set(cleaned['origem']).union(
    set(cleaned['destino'])
)

mapped_airports = set(regions['icao'])

missing = airports_in_cleaned - mapped_airports

if missing:
    print('Aeroportos faltando em airports_regions.csv:\n')

    for airport in sorted(missing):
        print(airport)

    print(f'\nTotal faltando: {len(missing)}')

else:
    print('Todos os aeroportos estão contemplados.')