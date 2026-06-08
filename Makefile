PYTHON=python3
SCRIPTS=src/airports_pipeline
WIKI=src/wikipedia_pipeline
VENV=.venv

.PHONY: parse regions validate edges check all wiki-build wiki-layout wiki-export wiki frontend

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

all: parse regions validate edges check

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
	$(PYTHON) -m venv $(VENV) && \
	. $(VENV)/bin/activate && \
	pip install -r requirements.txt && \
	python $(WIKI)/dataset_cleaning.py && \
	python $(WIKI)/graph_builder.py && \
	python $(WIKI)/layout_builder.py && \
	python $(WIKI)/graph_exporter.py && \
	python $(WIKI)/adjacency_builder.py && \
	deactivate

frontend:
	cd frontend && \
	if [ ! -d node_modules ]; then npm i; fi && \
	npm run dev
