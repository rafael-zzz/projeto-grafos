"""
Arquivo: dataset_cleaning.py

Dataset: voos de Janeiro/26 do site da ANAC (VRA_20261.csv).

Esse código trata os dados dos voos

    - Removemos vôos internacionais, de cargueiros ou outras 
    modalidades especiais, deixando apenas os nacionais.

    Colunas removidas:

    - Código Tipo Linha - Já que só trabalhamos com vôos nacionais,
    essa coluna perde o sentido, já que seria tudo "N".

    - Código Justificativa - Tecnicamente deveria ser utilizado
    quando um vôo tem algum problema, mas na prática estava
    tudo como "N/A" no dataset.

    - Número Voo - Identificador do número do voo. Se repete diversas 
    vezes. Não encontramos utilidade para isso.

    - Código Autorização (DI) - Código da declaração de autorização do
    voo. Não encontramos utilidade para isso.

    Outras mudanças:

    Várias colunas foram renomeadas para facilitar o uso pelo código.
"""


import pandas as pd
import constants as c

# Carregando dados
df = pd.read_csv('VRA_20261.csv', sep=';', encoding='utf-8')

# Removendo todos os vôos que não são nacionais
df = df[df['Código Tipo Linha'].str.strip().str.upper() == 'N']

excluded_airports = ['SGBR', 'SKBO', 'HAAB', 'SAEZ', 'DNMM', 'SCEL', 'SABE', 'SACO', 'KMIA', 'KORD']

df = df[
    ~df['ICAO Aeródromo Origem'].isin(excluded_airports) &
    ~df['ICAO Aeródromo Destino'].isin(excluded_airports)
]

# Remoção de colunas
df = df.drop(columns=['Código Tipo Linha'])
df = df.drop(columns=['Código Justificativa'])
df = df.drop(columns=['Número Voo'])
df = df.drop(columns=['Código Autorização (DI)'])

# Renomeando colunas para ficar mais fácil trabalhar
df = df.rename(columns={
    'ICAO Aeródromo Origem': 'origem',
    'ICAO Aeródromo Destino': 'destino',
    'ICAO Empresa Aérea': 'empresa',
    'Partida Prevista': 'partida_prevista',
    'Partida Real': 'partida_real',
    'Chegada Prevista': 'chegada_prevista',
    'Chegada Real': 'chegada_real',
    'Situação Voo': 'situacao'
})

# Exportando o dataset limpo
df.to_csv(f'{c.out_path}clean.csv', sep=';', index=False)