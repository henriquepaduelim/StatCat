# StatCat — Auditoria de Prontidão do MVP

## 1. Resumo Executivo
- MVP pode lançar hoje? **Não.**
- Top 3 riscos:
  1. **Fonte de verdade de eventos fragmentada** (`Event.team_id`, `Event.coach_id` e `EventTeamLink` coexistem) e endpoint `/api/v1/events/my-events` precisa reconciliar múltiplos caminhos; alta chance de regressão de visibilidade (backend/app/api/v1/endpoints/events.py).
  2. **Dependência de dados/credenciais externas na suíte E2E**: Playwright em produção usa secrets e eventos pré-existentes; login do coach já falhou por credencial inválida, mascarando bugs reais (frontend/e2e/helpers/env.ts, .github/workflows/e2e-prod.yml).
  3. **Dados duplicados/denormalizados** (`Team.coach_name`, `Athlete.email` x `User.email`) podem divergir e contaminar notificações/UX (backend/app/models/team.py, backend/app/models/athlete.py).
- Top 3 ações obrigatórias pré-lançamento:
  1. Simplificar o modelo de evento para uma única fonte de times (preferir `EventTeamLink`) e reescrever `/events` e `/events/my-events` para usar essa verdade única.
  2. Fortalecer testes de visibilidade de eventos (backend e E2E) cobrindo criador, participante direto, vínculo por time para `ADMIN/STAFF/COACH/ATHLETE`.
  3. Garantir credenciais e dados fixos para E2E em produção (secrets válidos + evento seeded), ou mover E2E para staging controlado.

## 2. Arquitetura Atual
- **Backend (FastAPI/SQLModel)**: Rotas em `backend/app/api/v1/endpoints`, modelos em `backend/app/models`, schemas em `backend/app/schemas`, Alembic em `backend/alembic`. Observabilidade ativa (Sentry/OTel) em `backend/app/main.py`.
- **Frontend (React/Vite/TS)**: API client e hooks em `frontend/src/api` e `frontend/src/hooks`; dashboards de eventos em `frontend/src/components/dashboard`; E2E em `frontend/e2e`.
- **CI**: Workflow `e2e-prod.yml` roda smoke e suíte completa Playwright contra `https://www.statcatsports.net` usando secrets.

## 3. Fluxos Críticos e Gates
- **Auth/Login**: `/auth/login` bloqueia usuários inativos, `must_change_password` e atletas não aprovados (`backend/app/api/v1/endpoints/auth.py:login_access_token`). `must_change_password` retorna 403 com header `X-Requires-Password-Setup`.
- **Athlete approval gate**: Atleta só loga se `athlete_status == APPROVED` (mesmo endpoint e enum em `backend/app/models/user.py`).
- **Coach onboarding**: Coaches criados via admin recebem senha temporária, mas o sistema não reforça `must_change_password` para COACH (risco de senha fraca reutilizada).
- **RBAC**: `UserRole` enum em `backend/app/models/user.py`; dependências de rota em `backend/app/api/deps.py`.

## 4. Eventos e Visibilidade
- **Modelo**: `Event` contém `team_id` (FK único), `coach_id` (FK único) e relação many-to-many `teams` via `EventTeamLink` (`backend/app/models/event.py`). Participantes via `EventParticipant` (`backend/app/models/event_participant.py`).
- **Criação**: `POST /events/` aceita `team_id`, `team_ids`, `invitee_ids`, `athlete_ids` e deriva convites de times/athletes (`backend/app/api/v1/endpoints/events.py:create_event`). Múltiplas entradas para o mesmo conceito.
- **Listagem geral**: `GET /events` filtra por `team_id` e datas, mas não faz RBAC de visibilidade (mesmo arquivo).
- **Visibilidade personalizada**: `GET /events/my-events` agrega criador, participante direto, atleta_id, `coach_id`, `team_id` e `EventTeamLink`, depois deduplica em memória (complexo e frágil). Fonte de verdade múltipla eleva risco de omissão ou duplicação.
- **Falhas prováveis**: divergência entre `team_id` e `EventTeamLink`; inconsistência se `team_ids` não refletirem `EventTeamLink`; RBAC implícito inexistente no `/events` aberto.

## 5. Contratos API ↔ UI
| Frontend chama | Backend responde | Risco |
| --- | --- | --- |
| `eventsApi.listMyEvents()` (`/events/my-events`) | retorna eventos agregados por múltiplos critérios | Se backend falhar em incluir times/links, UI exibe lista vazia; risco alto de regressão. |
| `eventsApi.createEvent` (payload com `team_id`, `team_ids`, `invitee_ids`, `athlete_ids`) | backend reconcilia várias listas | API expõe complexidade interna; fácil criar evento inconsistente. |
| `useEvents` (filtros `team_id`, `athlete_id`, datas) | `/events` não aplica RBAC | Coach/athlete podem ver eventos fora de escopo se a UI permitir filtro aberto. |
| `/auth/login` + `/auth/me` | envia `must_change_password`, `athlete_status` | UI deve tratar 403 + header `X-Requires-Password-Setup`; falta teste E2E para COACH com senha temporária. |

## 6. Banco e Migrações
- Alembic presente em `backend/alembic`, mas não foi verificado drift; risco **Médio** até rodar `alembic upgrade --check` ou equivalente.
- **Dados duplicados**: `Athlete.email` e `User.email` (backend/app/models/athlete.py vs user.py) — risco **Alto** de divergência.
- **Dados denormalizados**: `Team.coach_name` (backend/app/models/team.py) — risco **Médio** de exibir nomes desatualizados.

## 7. Cobertura de Testes
- **Backend**: Existem testes focados em convites/athletes (`backend/tests/test_athlete_invite.py`) e visibilidade de eventos para coach (`backend/tests/test_events_my_events.py`). Falta cobertura para ADMIN/STAFF/ATHLETE e para todos os modos de vínculo de evento. Não rodei pytest aqui.
- **Frontend**: Sem evidência de Vitest rodando em CI; React Query/Zustand hooks não têm testes aparentes.
- **E2E (Playwright)**: Suite depende de dados/creds externos (`frontend/e2e/.env.local`, workflow usa secrets). Falhas recentes por login de coach em produção mostram fragilidade do setup e não necessariamente do produto.

## 8. Riscos e Prioridades
- Bloqueador: Fonte de verdade de eventos fragmentada e `/events/my-events` complexo → eventos podem não aparecer ou aparecer indevidamente.
- Alto: Dados duplicados/denormalizados (`Athlete.email`, `Team.coach_name`); `/events` sem RBAC pode vazar dados se UI expuser filtros.
- Médio: E2E em produção depende de dados e secrets externos; pode gerar falsos negativos/positivos e não cobre criação/visibilidade ponta a ponta.
- Baixo: Alembic não checado para drift; ausência de testes unitários no frontend.

## 9. Plano de Ação
### Antes do lançamento (1–3 dias)
1. Consolidar modelo de eventos: usar somente `EventTeamLink` como vínculo; ajustar `EventCreate/EventUpdate` para receber apenas `team_ids`; reescrever `/events` e `/events/my-events` com lógica única e simples; adicionar testes de integração para todos os papéis e modos de vínculo.
2. Corrigir duplicidade/denormalização: escolher `User.email` como verdade e remover `Athlete.email` do contrato; eliminar `Team.coach_name` da API/DB.
3. Estabilizar E2E em CI: garantir secrets válidos e dados seed (evento, coach, athlete) ou mover E2E para staging controlado; adicionar pre-check de login via curl no workflow para falhar rápido.

### Depois do lançamento (dívida técnica)
1. Ampliar cobertura de testes frontend (hooks de eventos/auth) e adicionar testes E2E que criam dados on-the-fly.
2. Revisar RBAC em `/events` (listagem pública) para evitar vazamento se UI mudar.
3. Considerar refactor de onboarding de coach para forçar troca de senha inicial e cobrir com teste E2E.

## Plano detalhado para corrigir os problemas críticos

### 1) Consolidar a fonte de verdade de eventos (bloqueador)
- **Decisão de dados:** Tornar `EventTeamLink` a única associação evento↔time; manter `team_id`/`coach_id` apenas como colunas legadas até migração concluída.
- **Backend API:** Ajustar `EventCreate/EventUpdate` para receber somente `team_ids`; derivar participantes (coaches e atletas do roster) a partir desses times, além de convites explícitos.
- **Listagens:** Reescrever `/events` e `/events/my-events` usando um único conjunto de critérios:
  - Ver evento se: (a) `created_by_id == user`, (b) `EventParticipant.user_id == user`, (c) usuário pertence a time associado via `EventTeamLink` (coach ou athlete), (d) opcionalmente `coach_id == user` enquanto legado existir.
- **Testes backend:** Adicionar suite de integração cobrindo ADMIN/STAFF/COACH/ATHLETE com cenários: criador, participante direto, vínculo via time, atleta do roster e deduplicação.
- **Migração:** Criar migração que deixa `team_id`/`coach_id` nulos, mantendo-os apenas para leitura até refactor completo, e garante índices em `EventTeamLink`.

### 2) Remover dados duplicados/denormalizados que afetam notificações/UX
- **Athlete.email vs User.email:** Escolher `User.email` como verdade; ajustar schemas/serialização para não depender de `Athlete.email`; migrar dados e marcar `Athlete.email` como deprecado.
- **Team.coach_name:** Remover do contrato e do modelo; UI deve usar relacionamento `Team.coaches`/`CoachTeamLink`.
- **Testes:** Cobrir envio de convites/notificações após migração para garantir que emails sejam buscados da fonte única.

### 3) Estabilizar E2E e credenciais em produção (sinal de saúde)
- **Secrets válidos:** Revisar e atualizar `E2E_COACH_EMAIL/PASSWORD` (e demais) nos secrets do Actions; adicionar passo no workflow que valida login via `curl /auth/login` antes de rodar Playwright (falha rápida).
- **Dados determinísticos:** Seed controlado para evento usado no E2E (ou mover E2E para staging dedicado com fixtures conhecidas).
- **Teste funcional:** Incluir cenário E2E que cobre login de coach e visibilidade/RSVP de evento baseado no seed, reduzindo dependência de dados “vivos”.

## 10. Apêndice
- Comandos executados:
  - `ls .github/workflows`
  - `sed -n '1,200p'` em README.md, .github/workflows/e2e-prod.yml, backend/app/api/v1/endpoints/events.py, backend/app/models/event.py, backend/app/models/team.py, backend/app/models/athlete.py, backend/app/api/v1/endpoints/auth.py, frontend/e2e/helpers/env.ts, frontend/src/api/events.api.ts, frontend/src/hooks/useEvents.ts.
- Arquivos inspecionados:
  - README.md
  - .github/workflows/e2e-prod.yml
  - backend/app/main.py
  - backend/app/api/v1/endpoints/events.py, auth.py
  - backend/app/models/event.py, event_team_link.py, event_participant.py, team.py, athlete.py, user.py
  - backend/app/schemas/event.py
  - backend/tests/test_events_my_events.py, backend/tests/test_athlete_invite.py
  - frontend/src/api/events.api.ts, frontend/src/hooks/useEvents.ts
  - frontend/e2e/helpers/env.ts, frontend/e2e/rsvp-coach.spec.ts
  - frontend/src/components/dashboard (EventCalendarPanel, EventAvailabilityPanel)
