PYTHON=python3
SCRIPTS=src/airports_pipeline
WIKI=src/wikipedia_pipeline

.PHONY: parse regions validate edges check all wiki-build wiki-layout wiki-export wiki

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

wiki: wiki-clean wiki-build wiki-layout wiki-export wiki-adjacency
