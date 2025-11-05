#!/bin/bash
# Script para testar o setup de Alembic

echo "🔍 Verificando configuração do Alembic..."

cd backend

echo ""
echo "📋 Status atual das migrations:"
alembic current

echo ""
echo "📜 Histórico de migrations:"
alembic history --verbose

echo ""
echo "✅ Setup do Alembic está funcionando!"
echo ""
echo "💡 Comandos úteis:"
echo "  alembic upgrade head       - Aplicar todas as migrations"
echo "  alembic downgrade -1       - Reverter última migration"
echo "  alembic revision --autogenerate -m 'msg' - Criar nova migration"
echo "  alembic current            - Ver migration atual"
echo "  alembic history            - Ver histórico"
