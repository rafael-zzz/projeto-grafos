import pandas as pd
import airportsdata

icaos = {
    'SSUV', 'SBUY', 'SBIP', 'SBPL', 'SNVS', 'SBSI', 'SNCL', 'SNTS', 'SBNF',
    'SWLB', 'SIMK', 'SBIH', 'SNTO', 'SBTF', 'SBTC', 'SBJV', 'SNAB', 'SNBA',
    'SBTT', 'SBPP', 'SNMZ', 'SBTB', 'SBVG', 'SNSS', 'SBSM', 'SDSC', 'SWBC',
    'SBJD', 'SBPK', 'SBCX', 'SBGP', 'SBUR', 'SBUA', 'SBZM', 'SBCH', 'SBUG',
    'SBOI', 'SBRP', 'SBIZ', 'SNRU', 'SBMK', 'SWGN', 'SNJM', 'SBTU', 'SWPI',
    'SJZA', 'SBSR', 'SBNM', 'SBGV', 'SSGY', 'SBBH', 'SNHS', 'SBFN', 'SSUM',
    'SBSO', 'SDOW', 'SBJE', 'SSOU', 'SBDN', 'SBBW', 'SBUL', 'SNLN', 'SBJA',
    'SBAX', 'SWBR', 'SBMA', 'SBSN', 'SSVL', 'SBAQ', 'SBBZ', 'SNDV', 'SBPB',
    'SBPS', 'SBJU', 'SBHT', 'SNPD', 'SBKP', 'SBMY', 'SBAT', 'SBIL', 'SNGI',
    'SBPF', 'SBJR', 'SBLO', 'SNCP', 'SDCO', 'SBCG', 'SBSJ', 'SBSL', 'SNGN',
    'SBCA', 'SBJI', 'SBML', 'SNZR', 'SWYN', 'SBCN', 'SBBV', 'SBAR', 'SBVH',
    'SBCZ', 'SBPO', 'SBMG', 'SBPJ', 'SBKG', 'SBRD', 'SBLE', 'SBDO', 'SDLO',
    'SNSM', 'SBMO', 'SBCJ', 'SBFI', 'SSKW', 'SNBR', 'SBAU', 'SBDB', 'SBMQ',
    'SNEB', 'SBMD', 'SBAE', 'SWMW', 'SBCY', 'SBVC', 'SBRF', 'SBSV', 'SBFZ',
    'SBSG', 'SBJP', 'SBGR', 'SBSP', 'SBGL', 'SBRJ', 'SBCF', 'SBVT', 'SBBR',
    'SBGO', 'SBCT', 'SBFL', 'SBPA', 'SBEG', 'SBBE', 'SBPV', 'SBRB', 'SBTE'
}

airports = airportsdata.load()

REGIOES = {
    'AC': 'Norte',
    'AL': 'Nordeste',
    'AP': 'Norte',
    'AM': 'Norte',
    'BA': 'Nordeste',
    'CE': 'Nordeste',
    'DF': 'Centro-Oeste',
    'ES': 'Sudeste',
    'GO': 'Centro-Oeste',
    'MA': 'Nordeste',
    'MT': 'Centro-Oeste',
    'MS': 'Centro-Oeste',
    'MG': 'Sudeste',
    'PA': 'Norte',
    'PB': 'Nordeste',
    'PR': 'Sul',
    'PE': 'Nordeste',
    'PI': 'Nordeste',
    'RJ': 'Sudeste',
    'RN': 'Nordeste',
    'RS': 'Sul',
    'RO': 'Norte',
    'RR': 'Norte',
    'SC': 'Sul',
    'SP': 'Sudeste',
    'SE': 'Nordeste',
    'TO': 'Norte',

    'Acre': 'Norte',
    'Alagoas': 'Nordeste',
    'Amapá': 'Norte',
    'Amazonas': 'Norte',
    'Bahia': 'Nordeste',
    'Ceará': 'Nordeste',
    'Distrito Federal': 'Centro-Oeste',
    'Espírito Santo': 'Sudeste',
    'Goiás': 'Centro-Oeste',
    'Maranhão': 'Nordeste',
    'Mato Grosso': 'Centro-Oeste',
    'Mato Grosso do Sul': 'Centro-Oeste',
    'Minas Gerais': 'Sudeste',
    'Pará': 'Norte',
    'Paraíba': 'Nordeste',
    'Paraná': 'Sul',
    'Pernambuco': 'Nordeste',
    'Piauí': 'Nordeste',
    'Rio de Janeiro': 'Sudeste',
    'Rio Grande do Norte': 'Nordeste',
    'Rio Grande do Sul': 'Sul',
    'Rondônia': 'Norte',
    'Roraima': 'Norte',
    'Santa Catarina': 'Sul',
    'São Paulo': 'Sudeste',
    'Sergipe': 'Nordeste',
    'Tocantins': 'Norte'
}

rows = []

for icao in sorted(icaos):
    airport = airports.get(icao)

    if not airport:
        print(f'ICAO não encontrado: {icao}')
        continue

    cidade = airport.get('city', '').strip()
    estado = airport.get('subd', '').strip()

    regiao = REGIOES.get(estado, 'Desconhecida')

    rows.append({
        'icao': icao,
        'cidade': cidade,
        'regiao': regiao
    })

result = pd.DataFrame(rows)

# O resultado disso aí em cima tem alguns problemas.
# Arrumar o dataset depois fazendo isso aqui:

# Arrumar brasília para Centro-Oeste
# Oiapoque para Norte
# Guaira para Sul

# Adicionar SBDO, SBJI, SBPO, SBRD, SBSI, SBSO, SBUY, SNBA

# icao,cidade,regiao
# SBDO,Dourados,Centro-Oeste
# SBJI,Ji-Paraná,Norte
# SBPO,Ponta Porã,Centro-Oeste
# SBRD,Rondonópolis,Centro-Oeste
# SBSI,Sinop,Centro-Oeste
# SBSO,Passo Fundo,Sul
# SBUY,Uruguaiana,Sul
# SNBA,Barreiras,Nordeste

# Correções manuais
correcoes = {
    'Brasília': 'Centro-Oeste',
    'Brasilia': 'Centro-Oeste', 
    'Oiapoque': 'Norte',
    'Guaira': 'Sul',
    'Guaíra': 'Sul'
}

for cidade, nova_regiao in correcoes.items():
    result.loc[result['cidade'] == cidade, 'regiao'] = nova_regiao

# Adicionando os aeroportos que faltam
extras = [
    {'icao': 'SBDO', 'cidade': 'Dourados', 'regiao': 'Centro-Oeste'},
    {'icao': 'SBJI', 'cidade': 'Ji-Paraná', 'regiao': 'Norte'},
    {'icao': 'SBPO', 'cidade': 'Ponta Porã', 'regiao': 'Centro-Oeste'},
    {'icao': 'SBRD', 'cidade': 'Rondonópolis', 'regiao': 'Centro-Oeste'},
    {'icao': 'SBSI', 'cidade': 'Sinop', 'regiao': 'Centro-Oeste'},
    {'icao': 'SBSO', 'cidade': 'Passo Fundo', 'regiao': 'Sul'},
    {'icao': 'SBUY', 'cidade': 'Uruguaiana', 'regiao': 'Sul'},
    {'icao': 'SNBA', 'cidade': 'Barreiras', 'regiao': 'Nordeste'}
]

extras_df = pd.DataFrame(extras)

# Junta o original com os que faltam
result = pd.concat([result, extras_df], ignore_index=True)

# Remover duplicatas por ICAO caso existam
result = result.drop_duplicates(subset='icao', keep='last')

# Ordenar por icao
result = result.sort_values(by='icao')

# Exportar
result.to_csv('./output/airport_regions.csv', index=False)