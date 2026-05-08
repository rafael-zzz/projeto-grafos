PYTHON=python
SCRIPTS=scripts

.PHONY: check-venv install parse regions validate edges check all

check-venv:
	@$(PYTHON) -c "import sys; exit(0 if sys.prefix != sys.base_prefix else 1)" || (echo Ative a virtual environment primeiro. && exit 1)

install: check-venv
	$(PYTHON) -m pip install -r requirements.txt

parse: check-venv
	$(PYTHON) $(SCRIPTS)/dataset_cleaning.py

regions: check-venv
	$(PYTHON) $(SCRIPTS)/regions_builder.py

validate: check-venv
	$(PYTHON) $(SCRIPTS)/assist.py

edges: check-venv
	$(PYTHON) $(SCRIPTS)/edge_list_builder.py

check: check-venv
	$(PYTHON) $(SCRIPTS)/insight_builder.py

all: install parse regions validate edges check