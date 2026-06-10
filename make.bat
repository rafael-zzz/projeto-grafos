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
if /I "%~1"=="wiki-viz" goto wiki_viz
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
call