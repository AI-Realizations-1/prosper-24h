import { test, expect } from '@playwright/test';

test.describe('Flux etudes - Atelier 1', () => {
  test('creer une etude et ajouter une valeur metier', async ({ page }) => {
    await page.goto('/dashboard');

    if (await page.getByRole('heading', { name: 'Connexion' }).isVisible()) {
      const hasProvidedCreds = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
      const email = process.env.E2E_EMAIL ?? `e2e-spec-${Date.now()}@prosper.local`;
      const password = process.env.E2E_PASSWORD ?? 'TestPassword123!';

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
    }

    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible();

    // Récupérer le token via le cookie de session (refresh httpOnly + CSRF)
    const csrfRes = await page.request.get('http://localhost:3001/api/auth/csrf');
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const refreshRes = await page.request.post('http://localhost:3001/api/auth/refresh', {
      headers: { 'X-CSRF-Token': csrfToken },
    });
    expect(refreshRes.ok()).toBeTruthy();
    const { accessToken } = (await refreshRes.json()) as { accessToken: string };
    expect(accessToken).toBeTruthy();

    const createStudyRes = await page.request.post('http://localhost:3001/api/studies', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Etude E2E Playwright ${Date.now()}`,
        description: 'Creation automatique E2E',
        scope: 'Perimetre E2E',
      },
    });
    expect(createStudyRes.ok()).toBeTruthy();

    const createdStudy = (await createStudyRes.json()) as { id: string };
    await page.goto(`/study/${createdStudy.id}/atelier-1`);
    await expect(page.getByRole('heading', { name: /valeurs metier|valeurs métier/i })).toBeVisible();

    await page.getByPlaceholder('Nom').fill('Processus facturation');
    await page.getByPlaceholder('Description').fill('Gestion des factures clients');
    await page.getByRole('button', { name: 'Ajouter' }).first().click();

    await expect(page.getByText('Processus facturation')).toBeVisible();
  });
});
