SCRIPTS    = src/airports_pipeline
WIKI       = src/wikipedia_pipeline
VENV       = .venv
WIKI_ZIP   = data/wikipedia.zip
WIKI_FULL  = data/wikipedia_full.zip
WIKI_DIR   = data/wikipedia

ifeq ($(OS),Windows_NT)
    _WIN := 1
else
    _WIN := $(if $(filter win windows WIN WINDOWS,$(OS)),1,0)
endif

ifeq ($(_WIN),1)
    PYTHON      := python
    VENV_PYTHON := $(VENV)\Scripts\python
    VENV_PIP    := $(VENV)\Scripts\pip
    VENV_CREATE := python -m venv $(VENV)
    FRONTEND    := cd frontend && (if not exist node_modules npm i) && npm run dev
else
    PYTHON      := python3
    VENV_PYTHON := $(VENV)/bin/python3
    VENV_PIP    := $(VENV)/bin/pip
    VENV_CREATE := python3 -m venv $(VENV)
    FRONTEND    := cd frontend && ([ -d node_modules ] || npm i) && npm run dev
endif

.PHONY: venv parse regions validate edges check solve all \
        wiki-unzip wiki-clean wiki-build wiki-layout wiki-export wiki-adjacency wiki-viz wiki \
        frontend

venv:
	@if [ ! -f $(VENV_PYTHON) ]; then \
		$(VENV_CREATE); \
		$(VENV_PIP) install -r requirements.txt; \
	fi

parse: venv
	$(VENV_PYTHON) $(SCRIPTS)/dataset_cleaning.py

regions: venv
	$(VENV_PYTHON) $(SCRIPTS)/airports_builder.py

validate: venv
	$(VENV_PYTHON) $(SCRIPTS)/assist.py

edges: venv
	$(VENV_PYTHON) $(SCRIPTS)/edge_list_builder.py

check: venv
	$(VENV_PYTHON) $(SCRIPTS)/insight_builder.py

solve: venv
	$(VENV_PYTHON) src/solve.py

all: parse regions validate edges check solve

wiki-unzip:
	zip -s 0 $(WIKI_ZIP) --out $(WIKI_FULL)
	unzip -o $(WIKI_FULL) -d data/
	rm -f $(WIKI_FULL)

wiki-clean:
	$(VENV_PYTHON) $(WIKI)/dataset_cleaning.py

wiki-build:
	$(VENV_PYTHON) $(WIKI)/graph_builder.py

wiki-layout:
	$(VENV_PYTHON) $(WIKI)/layout_builder.py

wiki-export:
	$(VENV_PYTHON) $(WIKI)/graph_exporter.py

wiki-adjacency:
	$(VENV_PYTHON) $(WIKI)/adjacency_builder.py

wiki-viz: venv
	$(VENV_PYTHON) $(WIKI)/visualization.py

wiki:
	[ -f $(WIKI_DIR)/pages_export.csv ] || $(MAKE) wiki-unzip
	@if [ ! -f $(VENV_PYTHON) ]; then \
		$(VENV_CREATE); \
		$(VENV_PIP) install -r requirements.txt; \
	fi
	$(VENV_PYTHON) $(WIKI)/dataset_cleaning.py
	$(VENV_PYTHON) $(WIKI)/graph_builder.py
	$(VENV_PYTHON) $(WIKI)/layout_builder.py
	$(VENV_PYTHON) $(WIKI)/graph_exporter.py
	$(VENV_PYTHON) $(WIKI)/adjacency_builder.py
	$(VENV_PYTHON) $(WIKI)/visualization.py

frontend:
	$(FRONTEND)
