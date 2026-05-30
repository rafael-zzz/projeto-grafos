PYTHON=python3
SCRIPTS=src/airports_pipeline

.PHONY: parse regions validate edges check all

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
