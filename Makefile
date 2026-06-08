SCRIPTS    = src/airports_pipeline
WIKI       = src/wikipedia_pipeline
VENV       = .venv
WIKI_ZIP   = data/wikipedia.zip
WIKI_Z01   = data/wikipedia.z01
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

.PHONY: parse regions validate edges check solve all \
        wiki-unzip wiki-clean wiki-build wiki-layout wiki-export wiki-adjacency wiki \
        frontend

parse:
	$(PYTHON) $(SCRIPTS)/dataset_cleaning.py

regions:
	$(PYTHON) $(SCRIPTS)/airports_builder.py

validate:
	$(PYTHON) $(SCRIPTS)/assist.py

edges:
	$(PYTHON) $(SCRIPTS)/edge_list_builder.py

check:
	$(PYTHON) $(SCRIPTS)/insight_builder.py

solve:
	$(PYTHON) src/solve.py

all: parse regions validate edges check solve

wiki-unzip:
	@echo "Merging split zip..."
	zip -s 0 $(WIKI_ZIP) --out $(WIKI_FULL)
	@echo "Extracting..."
	unzip -o $(WIKI_FULL) -d data/
	@echo "Cleaning up merged zip..."
	rm -f $(WIKI_FULL)
	@echo "Done → $(WIKI_DIR)/"

wiki-clean:
	$(PYTHON) $(WIKI)/dataset_cleaning.py

wiki-build:
	$(PYTHON) $(WIKI)/graph_builder.py

wiki-layout:
	$(PYTHON) $(WIKI)/layout_builder.py

wiki-export:
	$(PYTHON) $(WIKI)/graph_exporter.py

wiki-adjacency:
	$(PYTHON) $(WIKI)/adjacency_builder.py

wiki:
	@[ -f $(WIKI_DIR)/pages_export.csv ] || $(MAKE) wiki-unzip
	$(VENV_CREATE)
	$(VENV_PIP) install -r requirements.txt
	$(VENV_PYTHON) $(WIKI)/dataset_cleaning.py
	$(VENV_PYTHON) $(WIKI)/graph_builder.py
	$(VENV_PYTHON) $(WIKI)/layout_builder.py
	$(VENV_PYTHON) $(WIKI)/graph_exporter.py
	$(VENV_PYTHON) $(WIKI)/adjacency_builder.py

frontend:
	$(FRONTEND)
