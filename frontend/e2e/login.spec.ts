/// <reference types="node" />
/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.APP_URL ?? 'http://localhost:5173';
const API_BASE = process.env.API_URL ?? 'http://127.0.0.1:8000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@statcat.com';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'marvin123';

async function ensureAdminToken(request: any) {
  const login = await request.post(`${API_BASE}/api/v1/auth/login`, {
    form: { username: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  if (login.ok()) {
    return (await login.json()).access_token;
  }
  throw new Error(
    `Admin login failed. Configure ADMIN_EMAIL/ADMIN_PASS envs with a valid admin. Status: ${login.status()}`
  );
}

test('login admin e vê dashboard', async ({ page }) => {
  const adminToken = await ensureAdminToken(page.request);
  await page.goto(BASE_URL);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: /password|senha/i }).fill(ADMIN_PASS);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/dashboard|player-profile/i, { timeout: 15000 });
  await expect(page.locator('body')).toContainText(/dashboard|insights|player profile/i);
});

test('admin cria atleta via modal', async ({ page }) => {
  const adminToken = await ensureAdminToken(page.request);
  const uniqueEmail = `e2e.${Date.now()}@example.com`;
  const uniquePhone = `+1555${Math.floor(Math.random() * 9000000) + 1000000}`;
  const today = new Date().toISOString().slice(0, 10);

  // Login
  await page.goto(BASE_URL);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: /password|senha/i }).fill(ADMIN_PASS);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/dashboard/i, { timeout: 10000 });

  // Navega para Athletes e abre modal de novo atleta
  await page.goto(`${BASE_URL}/athletes`);
  await page.getByRole('button', { name: /new athlete/i }).click();

  const stepOneModal = page.getByRole('dialog');
  await stepOneModal.getByLabel(/first name/i).fill('E2E');
  await stepOneModal.getByLabel(/last name/i).fill('Playwright');
  await stepOneModal.getByLabel(/^email/i).fill(uniqueEmail);
  await stepOneModal.getByLabel(/phone/i).fill(uniquePhone);
  await stepOneModal.getByRole('button', { name: /continue/i }).click();

  // Step 2 abre; preencher campos obrigatórios e concluir
  const stepTwoDialog = page.getByRole('dialog');
  await stepTwoDialog.locator('#birth_date').fill(today);
  await stepTwoDialog.locator('#gender').selectOption('male');
  await stepTwoDialog.locator('#address_line1').fill('123 E2E Street');
  await stepTwoDialog.locator('#city').fill('Test City');
  await stepTwoDialog.locator('#province').fill('Test State');
  await stepTwoDialog.locator('#postal_code').fill('12345');
  await stepTwoDialog.locator('#country').fill('Testland');
  await stepTwoDialog.locator('#emergency_contact_name').fill('E2E Contact');
  await stepTwoDialog.locator('#emergency_contact_relationship').fill('Tester');
  await stepTwoDialog.locator('#emergency_contact_phone').fill('+15551112222');
  await stepTwoDialog.getByRole('button', { name: /complete registration/i }).click();

  // Verifica se o atleta aparece na lista
  await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 15000 });
});

test('atleta só acessa após aprovação do admin', async ({ page }) => {
  const athleteEmail = `athlete.${Date.now()}@example.com`;
  const athletePass = 'E2e!12345';
  const today = new Date().toISOString().slice(0, 10);

  // Signup público de atleta (status INCOMPLETE)
  const signupRes = await page.request.post(`${API_BASE}/api/v1/auth/signup-athlete`, {
    data: {
      full_name: 'E2E Athlete',
      email: athleteEmail,
      password: athletePass,
      first_name: 'E2E',
      last_name: 'Athlete',
      birth_date: today,
      gender: 'male',
      phone: '+15550001111',
    },
  });
  expect(signupRes.ok()).toBeTruthy();
  const signupData = await signupRes.json();
  const athleteId = signupData.athlete_id;

  // Login deve falhar enquanto está pendente/aprovação
  const loginPending = await page.request.post(`${API_BASE}/api/v1/auth/login`, {
    form: { username: athleteEmail, password: athletePass },
  });
  expect(loginPending.status()).toBe(403);

  // Admin aprova o atleta
  const adminToken = await ensureAdminToken(page.request);

  const approve = await page.request.post(`${API_BASE}/api/v1/athletes/${athleteId}/approve`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(approve.ok()).toBeTruthy();

  // Login do atleta agora deve funcionar
  const loginApproved = await page.request.post(`${API_BASE}/api/v1/auth/login`, {
    form: { username: athleteEmail, password: athletePass },
  });
  if (!loginApproved.ok()) {
    const body = await loginApproved.text();
    throw new Error(`Athlete login failed after approval. Status: ${loginApproved.status()} Body: ${body}`);
  }

  // Valida via UI que consegue entrar
  await page.goto(BASE_URL);
  await page.getByLabel(/email/i).fill(athleteEmail);
  await page.getByRole('textbox', { name: /password|senha/i }).fill(athletePass);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/player-profile|dashboard/i, { timeout: 10000 });
});
