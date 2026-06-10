@echo off
setlocal

:: ==========================================
:: CONFIGURAÇÕES DO PROJETO
:: ==========================================
set SCRIPTS=src\airports_pipeline
set WIKI=src\wikipedia_pipeline
set VENV=.venv
set VENV_PYTHON=%VENV%\Scripts\python.exe
set VENV_PIP=%VENV%\Scripts\pip.exe

:: ==========================================
:: MÁQUINA DE ESTADOS DO SCRIPT (Argumentos)
:: ==========================================
if "%~1"=="" goto help
if /I "%~1"=="help" goto help
if /I "%~1"=="venv" goto venv
if /I "%~1"=="parse" goto parse
if /I "%~1"=="regions" goto regions
if /I "%~1"=="validate" goto validate
if /I "%~1"=="edges" goto edges
if /I "%~1"=="check" goto check
if /I "%~1"=="solve" goto solve
if /I "%~1"=="all" goto all
if /I "%~1"=="wiki-clean" goto wiki_clean
if /I "%~1"=="wiki-build" goto wiki_build
if /I "%~1"=="wiki-layout" goto wiki_layout
if /I "%~1"=="wiki-export" goto wiki_export
if /I "%~1"=="wiki-adjacency" goto wiki_adjacency
if /I "%~1"=="wiki" goto wiki
if /I "%~1"=="frontend" goto frontend

echo Comando desconhecido: %1
goto help

:: ==========================================
:: IMPLEMENTAÇÃO DOS COMANDOS
:: ==========================================

:venv
if not exist "%VENV_PYTHON%" (
    echo Criando ambiente virtual...
    python -m venv %VENV%
    echo Instalando dependencias...
    "%VENV_PIP%" install -r requirements.txt
)
goto :eof

:parse
call :venv
echo Limpando dataset bruto...
"%VENV_PYTHON%" %SCRIPTS%\dataset_cleaning.py
goto :eof

:regions
call :venv
echo Construindo vertices...
"%VENV_PYTHON%" %SCRIPTS%\airports_builder.py
goto :eof

:validate
call :venv
echo Verificando cobertura...
"%VENV_PYTHON%" %SCRIPTS%\assist.py
goto :eof

:edges
call :venv
echo Construindo arestas...
"%VENV_PYTHON%" %SCRIPTS%\edge_list_builder.py
goto :eof

:check
call :venv
echo Extraindo fluxo regional...
"%VENV_PYTHON%" %SCRIPTS%\insight_builder.py
goto :eof

:solve
call :venv
echo Resolvendo caminhos minimos e gerando grafos...
"%VENV_PYTHON%" src\solve.py
goto :eof

:all
call :parse
call :regions
call :validate
call :edges
call :check
call :solve
echo.
echo === Pipeline de Aeroportos Concluido! ===
goto :eof

:wiki_clean
call :venv
echo Limpando dataset da Wikipedia...
"%VENV_PYTHON%" %WIKI%\dataset_cleaning.py
goto :eof

:wiki_build
call :venv
echo Construindo nodes e edges do top 400...
"%VENV_PYTHON%" %WIKI%\graph_builder.py
goto :eof

:wiki_layout
call :venv
echo Calculando posicoes na esfera 3D...
"%VENV_PYTHON%" %WIKI%\layout_builder.py
goto :eof

:wiki_export
call :venv
echo Exportando wiki_graph.json...
"%VENV_PYTHON%" %WIKI%\graph_exporter.py
goto :eof

:wiki_adjacency
call :venv
echo Construindo adjacencias e scores (wiki_pages.json)...
"%VENV_PYTHON%" %WIKI%\adjacency_builder.py
goto :eof

:wiki
echo Iniciando pipeline completo da Wikipedia...
call :wiki_clean
call :wiki_build
call :wiki_layout
call :wiki_export
call :wiki_adjacency
echo.
echo === Pipeline da Wikipedia Concluido! ===
goto :eof

:frontend
echo Iniciando Frontend Next.js...
cd frontend
if not exist "node_modules\" (
    echo Instalando dependencias do frontend...
    npm install
)
npm run dev
goto :eof

:help
echo.
echo =============== MENU DE COMANDOS =================
echo Uso: .\make.bat [comando]
echo.
echo Comandos Aeroportos:
echo   .\make.bat parse      - limpa o dataset bruto
echo   .\make.bat regions    - constroi os vertices
echo   .\make.bat validate   - verifica cobertura
echo   .\make.bat edges      - constroi as arestas
echo   .\make.bat check      - extrai fluxo regional
echo   .\make.bat solve      - gera JSONs finais
echo   .\make.bat all        - Roda todo o pipeline
echo.
echo Comandos Wikipedia:
echo   .\make.bat wiki-clean - limpa links e calcula core
echo   .\make.bat wiki-build - seleciona top 400
echo   .\make.bat wiki-layout- calcula 3D positions
echo   .\make.bat wiki-export- exporta json 3D
echo   .\make.bat wiki-adjacency - exporta scores para UI
echo   .\make.bat wiki       - Roda todo o pipeline
echo.
echo Frontend:
echo   .\make.bat frontend   - Inicia o Next.js
echo ==================================================
