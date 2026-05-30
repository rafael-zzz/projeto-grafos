"""
Arquivo: edge_list_builder.py

Este código constrói o CSV que será utilizado para adicionar
as arestas ao nosso grafo.

As arestas são formadas por:
- Origem
- Destino
- Número de incidências (número de voos daquela origem para aquele destino)
- Peso dessa conexão
"""

import pandas as pd
from math import log1p
import constants as c

df = pd.read_csv(f'{c.out_path}clean.csv', sep=';')
regions = pd.read_csv(f'{c.out_path}airports.csv')

icao_to_region = dict(zip(regions['icao'], regions['regiao']))

df['regiao_origem'] = df['origem'].map(icao_to_region).fillna('desconhecido')
df['regiao_destino'] = df['destino'].map(icao_to_region).fillna('desconhecido')

df['tipo_conexao'] = (
    df['regiao_origem'] == df['regiao_destino']
).map({True: 'intrarregional', False: 'interregional'})

edge_df = (
    df.groupby(['origem', 'destino', 'tipo_conexao']).size().reset_index(name='quantidade')
)

edge_df['peso'] = edge_df['quantidade'].apply(
    lambda freq: round(1 / log1p(freq), 4)
)

edge_df.to_csv(f'{c.out_path}edges.csv', index=False)
