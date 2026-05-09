PYTHON=python
SCRIPTS=scripts

.PHONY: install parse regions validate edges check all

install:
	$(PYTHON) -m pip install -r requirements.txt

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

all: install parse regions validate edges check