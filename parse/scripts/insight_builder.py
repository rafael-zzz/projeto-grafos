import pandas as pd

df = pd.read_csv('./output/cleaned.csv', sep=';')
regions = pd.read_csv('./output/airport_regions.csv')

icao_to_region = dict(zip(regions['icao'], regions['regiao']))

df['regiao_origem'] = df['origem'].map(icao_to_region)
df['regiao_destino'] = df['destino'].map(icao_to_region)

regional_flights = (
    df.groupby(
        ['regiao_origem', 'regiao_destino']
    )
    .size()
    .reset_index(name='quantidade_voos')
)

regional_flights.to_csv('./output/flight_regions.csv', index=False)