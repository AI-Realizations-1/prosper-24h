import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const hasProvidedCreds = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
  const email = process.env.E2E_EMAIL ?? `e2e-${Date.now()}@prosper.local`;
  const password = process.env.E2E_PASSWORD ?? 'TestPassword123!';

  await page.goto('/login');

  if (hasProvidedCreds) {
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
  } else {
    await page.getByRole('button', { name: 'Inscription' }).click();
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.getByRole('button', { name: /s'inscrire/i }).click();
  }

  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
