#!/bin/bash

# Script de Teste Automatizado - Sistema de Eventos
# Verifica se a correção de participantes está funcionando

echo "🧪 Teste Automatizado - Sistema de Eventos"
echo "=========================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de verificação
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Verificar Backend
echo "1️⃣  Verificando Backend..."
curl -s http://localhost:8000/docs > /dev/null 2>&1
check "Backend respondendo em http://localhost:8000"

# 2. Verificar Frontend
echo ""
echo "2️⃣  Verificando Frontend..."
curl -s http://localhost:5173 > /dev/null 2>&1
check "Frontend respondendo em http://localhost:5173"

# 3. Verificar Arquivos Modificados
echo ""
echo "3️⃣  Verificando Arquivos..."

cd /Users/henriquepmachado/Documents/Python_projetos

# Backend Schema
if grep -q "athlete_ids" backend/app/schemas/event.py; then
    echo -e "${GREEN}✅ backend/app/schemas/event.py - campo athlete_ids presente${NC}"
else
    echo -e "${RED}❌ backend/app/schemas/event.py - campo athlete_ids NÃO encontrado${NC}"
fi

# Backend Endpoint
if grep -q "for athlete_id in event_in.athlete_ids" backend/app/api/v1/endpoints/events.py; then
    echo -e "${GREEN}✅ backend/app/api/v1/endpoints/events.py - loop athlete_ids presente${NC}"
else
    echo -e "${RED}❌ backend/app/api/v1/endpoints/events.py - loop athlete_ids NÃO encontrado${NC}"
fi

# Frontend Types
if grep -q "athlete_ids" frontend/src/types/event.ts; then
    echo -e "${GREEN}✅ frontend/src/types/event.ts - tipo athlete_ids presente${NC}"
else
    echo -e "${RED}❌ frontend/src/types/event.ts - tipo athlete_ids NÃO encontrado${NC}"
fi

# Frontend Dashboard
if grep -q "athlete_ids: eventForm.inviteeIds" frontend/src/pages/Dashboard.tsx; then
    echo -e "${GREEN}✅ frontend/src/pages/Dashboard.tsx - envio de athlete_ids correto${NC}"
else
    echo -e "${RED}❌ frontend/src/pages/Dashboard.tsx - envio de athlete_ids NÃO encontrado${NC}"
fi

# 4. Verificar Banco de Dados
echo ""
echo "4️⃣  Verificando Último Evento no Banco..."

cd backend

if [ -f "combine.db" ]; then
    LAST_EVENT=$(sqlite3 combine.db "SELECT id, name, status FROM events ORDER BY id DESC LIMIT 1;" 2>/dev/null)
    
    if [ ! -z "$LAST_EVENT" ]; then
        echo -e "${YELLOW}📊 Último evento: $LAST_EVENT${NC}"
        
        EVENT_ID=$(echo $LAST_EVENT | cut -d'|' -f1)
        
        echo ""
        echo "Participantes do evento $EVENT_ID:"
        sqlite3 combine.db "SELECT id, athlete_id, status FROM event_participants WHERE event_id=$EVENT_ID;" 2>/dev/null | while read line; do
            STATUS=$(echo $line | cut -d'|' -f3)
            if [ "$STATUS" = "invited" ]; then
                echo -e "${GREEN}✅ $line${NC}"
            else
                echo -e "${YELLOW}⚠️  $line (status: $STATUS - esperado: invited)${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  Nenhum evento encontrado no banco${NC}"
    fi
else
    echo -e "${RED}❌ Banco de dados combine.db não encontrado${NC}"
fi

echo ""
echo "=========================================="
echo "🏁 Teste Concluído!"
echo ""
echo "📝 Próximos Passos:"
echo "1. Se backend/frontend não estão rodando, inicie-os:"
echo "   Terminal 1: cd backend && uvicorn app.main:app --reload"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "2. Crie um novo evento no Dashboard"
echo "3. Verifique se contador mostra 🟡 X (pendentes)"
echo "4. Execute este script novamente para verificar o banco"
echo ""
