# Plataforma Combine Futebol

Stack inicial para coletar métricas de testes físicos e técnicos de atletas de futebol, gerar relatórios e disponibilizar um painel personalizável para clubes.

## Visão geral do monorepo

```
.
├── backend/   # API FastAPI + SQLModel
└── frontend/  # Dashboard React + TypeScript
```

---

## Requisitos de ferramentas

- **Python 3.11+** – recomendado usar [`pyenv`](https://github.com/pyenv/pyenv) ou [`uv`](https://github.com/astral-sh/uv) para gerenciar versões/virtualenv.
- **Node.js 18+** – instale via [nvm](https://github.com/nvm-sh/nvm) para alternar versões facilmente.
- **npm** (vem com o Node) ou **pnpm** (opcional) para instalar dependências do frontend.
- **Poetry** ou **pip** padrão para gerenciar dependências do backend.
- **Docker** (opcional) caso queira orquestrar com containers mais adiante.
- **PostgreSQL** (opcional neste momento; o projeto inicia com SQLite, mas já está preparado para migração).

---

## Backend (FastAPI)

1. Entre na pasta e crie um ambiente virtual:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```
2. Instale dependências:
   ```bash
   pip install --upgrade pip
   pip install -e .
   ```
   > Alternativa: `pip install fastapi uvicorn[standard] sqlmodel alembic python-multipart pydantic[email] passlib[bcrypt] python-jose[cryptography] boto3 jinja2`
3. Copie o arquivo de variáveis e ajuste conforme o ambiente:
   ```bash
   cp .env.example .env
   ```
4. (Opcional) Ajuste as origens de CORS no `.env` (`BACKEND_CORS_ORIGINS`) se o frontend rodar em outra URL. Também é possível alterar `MEDIA_ROOT` para definir onde os uploads locais serão armazenados.

5. Se estiver evoluindo o esquema e usando SQLite, remova `combine.db` antes de subir o servidor para que as novas colunas/tabelas sejam criadas automaticamente (futuramente migraremos para Alembic).

6. Execute o servidor de desenvolvimento:
   ```bash
   uvicorn app.main:app --reload
   ```
7. Documentação interativa disponível em `http://localhost:8000/docs`.

### Recursos de backend já disponíveis

- CRUD de **clientes** com dados de identidade visual para aplicar temas.
- Cadastro de **testes**, **sessões** e resultados dos atletas (dados seed gerados automaticamente).
- Upload de foto de perfil (`POST /athletes/{id}/photo`) com armazenamento local em `MEDIA_ROOT`.
- Endpoint de relatório consolidado por atleta (`GET /reports/athletes/{id}`) agrupando sessões e métricas.

### Próximos incrementos sugeridos

- Configurar autenticação (JWT) e perfis por clube.
- Integrar armazenamento de mídia (S3/MinIO) para fotos dos atletas.
- Configurar Alembic para migrações do banco.

---

## Frontend (React + Vite + Tailwind)

1. Entre na pasta e instale as dependências:
   ```bash
   cd frontend
   npm install
   # ou: pnpm install / yarn install
   ```
2. Rode o servidor local:
   ```bash
   npm run dev
   ```
   O Vite sobe em `http://localhost:5173` com proxy para a API (`/api` → `http://localhost:8000`).

### Pontos de evolução

- Criar componentes reutilizáveis para cards de métricas, tabelas e gráficos.
- Adicionar formulários de criação de sessões/testes direto no frontend.
- Implementar upload de vídeos e anexos nos relatórios.
- Adicionar testes unitários (React Testing Library) e checagens de qualidade (ESLint/Prettier).

---

## Próximos passos gerais

- Desenhar o modelo de dados completo (Atleta, Teste, Sessão, Métrica, Cliente, Avaliador).
- Definir estratégia de geração de relatórios (HTML → PDF com WeasyPrint/ReportLab ou serviço externo).
- Implementar upload e versionamento de imagens (perfil, provas) usando S3 ou armazenamento compatível.
- Planejar deploy (Docker + Render/Railway/Heroku) com banco gerenciado.
- Criar um roadmap do MVP para validar com clubes antes de ampliar funcionalidades.
