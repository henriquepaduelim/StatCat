# E2E (Prod) – StatCat

## O que o workflow faz
- Roda Playwright contra a URL de produção (`https://www.statcatsports.net`).
- Executa smoke primeiro; se falhar, interrompe.
- Executa a suíte completa (RSVP será ignorado se o evento não for fornecido).
- Sempre publica artefatos: `playwright-report` e `test-results` (traces/screenshots/videos).

## Como disparar
- Manualmente via **Actions > E2E (Prod) > Run workflow**.
- Automático em pushes para `main`.

## Segredos obrigatórios (definir em Settings > Secrets and variables > Actions)
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_ATHLETE_EMAIL`
- `E2E_ATHLETE_PASSWORD`
- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`
- `E2E_EVENT_NAME` (opcional; se ausente, specs de RSVP fazem skip)

## Como os envs são usados
- `E2E_BASE_URL` é fixo para produção (`https://www.statcatsports.net`).
- Credenciais só entram via secrets; não são logadas.
- `E2E_EVENT_NAME` aponta para um evento já existente contendo o atleta e o coach configurados.

## Comandos usados pelo workflow
- `npm ci` (frontend)
- `npx playwright install --with-deps`
- `npx playwright test e2e/smoke.spec.ts`
- `npm run e2e` (suíte completa)

## Artefatos
- `playwright-report` (HTML)
- `playwright-results` (traces, screenshots, vídeos)

## Notas de segurança
- Nenhum dado é criado/alterado além do que os testes já executam; RSVP specs dependem de um evento pré-criado.
- Sem secrets em código, apenas via GitHub Secrets.
