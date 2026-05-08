## parse.py
# Trata os dados dos vôos
##

import pandas as pd

# Carregando dados
df = pd.read_csv('VRA_20261.csv', sep=';', encoding='utf-8')

# Removendo todos os vôos que não são nacionais
df = df[df['Código Tipo Linha'].str.strip().str.upper() == 'N']

# Aeroportos internacionais para excluir do dataset
excluded_airports = ['SGBR', 'SKBO', 'HAAB', 'SAEZ', 'DNMM', 'SCEL', 'SABE', 'SACO', 'KMIA', 'KORD']

# Passando outra olhada pra ver se sobrou algum internacional errado (marcado como N)
df = df[
    ~df['ICAO Aeródromo Origem'].isin(excluded_airports) &
    ~df['ICAO Aeródromo Destino'].isin(excluded_airports)
]

# Remove a coluna de código do tipo de linha já que perdeu o sentido (todos os outros foram removidos)
df = df.drop(columns=['Código Tipo Linha'])

# Remove a coluna de Código Justificativa porque é praticamente tudo N/A
df = df.drop(columns=['Código Justificativa'])

# Remove coluna de número do voo porque não tem pra quê
df = df.drop(columns=['Número Voo'])

# Remove coluna Código Autorização (DI) pelo mesmo motivo
df = df.drop(columns=['Código Autorização (DI)'])

# Renomeia colunas para ficar mais fácil trabalhar
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

# Exporta o dataset limpo
df.to_csv('./output/cleaned.csv', sep=';', index=False)