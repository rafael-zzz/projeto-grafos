"""
Arquivo: insight_builder.py

Agora que temos todos os dados que precisamos, somos capazes de
extrair algumas informações interessantes.

Nesse caso, o número de voos na mesma região e entre diferentes
regiões.

"""


import pandas as pd
import constants as c

df = pd.read_csv(f'{c.out_path}clean.csv', sep=';')
regions = pd.read_csv(f'{c.out_path}airports.csv')

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

regional_flights.to_csv(f'{c.out_path}flight_regions.csv', index=False)