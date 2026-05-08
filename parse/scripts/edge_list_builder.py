import pandas as pd

## Criação do dataset que vai ser utilizado no frontend para arestas

# Dataset limpo
df = pd.read_csv('./output/cleaned.csv', sep=';')

# Regiões
regions = pd.read_csv('./output/airport_regions.csv')

# Função para conversão
iata_to_region = dict(zip(regions['icao'], regions['regiao']))

# Aplica a função no dataset (map)
df['regiao_origem'] = df['origem'].map(iata_to_region)
df['regiao_destino'] = df['destino'].map(iata_to_region)

# Classifica se é intra ou inter
def classify_connection(row):
    if row['regiao_origem'] == row['regiao_destino']:
        return 'intrarregional'
    return 'interregional'

df['tipo_conexao'] = df.apply(classify_connection, axis=1)

# Conta adjacências (vôos)
adjacency_counts = (
    df.groupby(
        [
            'origem',
            'destino',
            'tipo_conexao'
        ]
    )
    .size()
    .reset_index(name='quantidade')
)

# Renomeia colunas
adjacency_counts.columns = [
    'origem',
    'destino',
    'tipo_conexao',
    'quantidade'
]

# Exporta a contagem e tipo de adjacência
adjacency_counts.to_csv('./output/edges.csv', index=False)