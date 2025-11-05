#!/bin/bash

# Ativa o ambiente virtual
source .venv/bin/activate

# Inicia o backend
uvicorn app.main:app --reload
