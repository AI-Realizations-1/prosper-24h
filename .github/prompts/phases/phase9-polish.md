# Prompt Agent — Phase 9 : Polish & Production Readiness

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- **Phase 8 complétée** : hardening, tests unitaires (12/12), CI/CD GitHub Actions
- Commit de référence : `0158520` (feat: Phase 8 — Hardening, tests et CI/CD)
- Limites Phase 8 à adresser : 4 livrables ci-dessous

## Périmètre Phase 9

| Livrable | Description |
|----------|-------------|
| E2E-01 | Tests Playwright — flux login → création étude → Atelier 1 |
| E2E-02 | Seuil couverture code 70% enforced en CI |
| E2E-03 | Migration secrets CI vers GitHub Secrets |
| E2E-04 | Export auth — fetch+Blob avec Bearer token |

---

## ÉTAPE 1 — E2E-01 : Tests Playwright

### 1a — Installer Playwright dans apps/e2e/

```bash
mkdir -p ~/projects/Prosper/apps/e2e
cd ~/projects/Prosper/apps/e2e
pnpm init
pnpm add -D @playwright/test
npx playwright install chromium --with-deps
```

Créer `apps/e2e/package.json` complet :

```json
{
  "name": "@prosper/e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "^1.43.0"
  }
}
```

### 1b — Créer `apps/e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm --filter web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
```

> ⚠️ L'API doit exposer `GET /api/health` → `{ ok: true }`. Si ce n'est pas le cas, ajouter dans `apps/api/src/index.ts` **avant** les routes existantes :
> ```typescript
> app.get('/api/health', (_, res) => res.json({ ok: true }));
> ```

### 1c — Créer `apps/e2e/tests/auth.setup.ts`

```typescript
import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL ?? 'test@prosper.local');
  await page.getByLabel(/mot de passe/i).fill(process.env.E2E_PASSWORD ?? 'TestPassword123!');
  await page.getByRole('button', { name: /connexion/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
```

### 1d — Créer `apps/e2e/tests/studies.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Flux études — Atelier 1', () => {
  test('créer une étude et ajouter une valeur métier', async ({ page }) => {
    // Accueil dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /tableau de bord/i })).toBeVisible();

    // Créer une étude
    await page.getByRole('button', { name: /créer une étude/i }).click();
    await page.getByLabel(/nom de l'étude/i).fill('Étude E2E Playwright');
    await page.getByRole('button', { name: /créer|valider|confirmer/i }).last().click();

    // Naviguer vers Atelier 1
    await page.getByRole('link', { name: /atelier 1/i }).click();
    await expect(page.getByRole('heading', { name: /valeurs métier/i })).toBeVisible();

    // Ajouter une valeur métier
    await page.getByRole('button', { name: /ajouter/i }).click();
    await page.getByLabel(/nom/i).fill('Processus facturation');
    await page.getByLabel(/description/i).fill('Gestion des factures clients');
    await page.getByRole('button', { name: /enregistrer|sauvegarder|créer/i }).last().click();

    // Vérifier la présence dans la liste
    await expect(page.getByText('Processus facturation')).toBeVisible();
  });
});
```

### 1e — Créer `apps/e2e/.gitignore`

```
playwright/.auth/
playwright-report/
test-results/
node_modules/
```

---

## ÉTAPE 2 — E2E-02 : Seuil couverture code 70%

### 2a — Remplacer `apps/api/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/index.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
```

### 2b — Remplacer `apps/web/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**', 'src/main.tsx'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
```

---

## ÉTAPE 3 — E2E-03 : Migration GitHub Secrets

### 3a — Modifier `.github/workflows/ci.yml`

Remplacer le step `Generate Prisma client` :

```yaml
      - name: Generate Prisma client
        working-directory: apps/api
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: pnpm prisma migrate deploy && pnpm prisma generate
```

Remplacer les steps `Test API` et `Test Web` :

```yaml
      - name: Test API (coverage)
        working-directory: apps/api
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET }}
        run: pnpm test:coverage

      - name: Test Web (coverage)
        working-directory: apps/web
        run: pnpm test:coverage

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Test E2E
        working-directory: apps/e2e
        env:
          E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
        run: pnpm test:e2e
```

> Note : le bloc `services.postgres` conserve ses variables `POSTGRES_USER/PASSWORD/DB` en clair — elles définissent le service local CI, pas des secrets applicatifs.

### 3b — Documenter les secrets dans `.github/prompts/README.md`

Ajouter en fin de fichier :

```markdown
## Secrets GitHub requis (Settings → Secrets → Actions)

| Secret | Valeur pour l'environnement CI |
|--------|-------------------------------|
| `DATABASE_URL` | `postgresql://prosper:prosper@localhost:5432/prosper` |
| `JWT_SECRET` | valeur aléatoire ≥ 32 caractères |
| `JWT_REFRESH_SECRET` | valeur aléatoire ≥ 32 caractères |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `E2E_EMAIL` | email du compte de test E2E (créer manuellement) |
| `E2E_PASSWORD` | mot de passe du compte de test E2E |
```

---

## ÉTAPE 4 — E2E-04 : Export auth fetch+Blob

Modifier `apps/web/src/components/StudySummaryPanel.tsx`.

Remplacer le bloc `{/* Exports */}` (contenant les deux `<a href=...>`) par :

```tsx
        {/* Exports */}
        {tab === 'exports' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={{
                padding: '10px 20px', background: '#ef4444', color: 'white',
                borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer',
              }}
              onClick={async () => {
                const res = await fetch(`/api/studies/${studyId}/export/pdf`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `etude-${studyId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Télécharger PDF
            </button>
            <button
              style={{
                padding: '10px 20px', background: '#16a34a', color: 'white',
                borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer',
              }}
              onClick={async () => {
                const res = await fetch(`/api/studies/${studyId}/export/excel`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `etude-${studyId}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Télécharger Excel
            </button>
          </div>
        )}
```

---

## ÉTAPE 5 — Validation locale

```bash
cd ~/projects/Prosper

# Couverture API (doit passer le seuil 70%)
pnpm --filter api test:coverage

# Couverture Web (doit passer le seuil 70%)
pnpm --filter web test:coverage

# Build pour que Playwright puisse démarrer les serveurs
pnpm --filter api build
pnpm --filter web build

# Tests E2E (démarrage automatique api + web via webServer)
pnpm --filter e2e test:e2e
```

Si le seuil 70% bloque sur des fichiers non testables, ajuster la liste `exclude` dans les `vitest.config.ts` concernés.

---

## ÉTAPE 6 — Commit et RETEX

```bash
cd ~/projects/Prosper
git add -A
git commit -m "feat: Phase 9 — E2E Playwright, couverture 70%, secrets CI, export auth"
git push origin main
```

Puis créer le RETEX :

```bash
cat > RETEX/phase9-polish-$(date +%Y-%m-%d).md << 'EOF'
# RETEX — Phase 9 : Polish & Production Readiness
Date : $(date +%Y-%m-%d)

## Résumé
- Étapes exécutées : toutes (1 à 6)

## État final
- [ ] E2E-01 : Playwright setup + test flux login→étude→Atelier 1
- [ ] E2E-02 : Seuil couverture 70% (api + web) enforced en CI
- [ ] E2E-03 : GitHub Secrets migrés dans le workflow
- [ ] E2E-04 : Export PDF/Excel avec Bearer token (fetch+Blob)
- [ ] Build API ✅ / Build Web ✅ / Tests coverage ✅ / E2E ✅
- [ ] Commit poussé sur GitHub

## Limites connues
<!-- À compléter après exécution -->
EOF

git add RETEX/
git commit -m "docs: add RETEX for Phase 9 polish"
git push origin main
```

---

## Contraintes

1. Ne pas modifier les services métier (Ateliers 1-5, transverses).
2. `apps/e2e/` est automatiquement inclus dans le workspace pnpm (`apps/*`).
3. Le step E2E en CI nécessite que les secrets `E2E_EMAIL` et `E2E_PASSWORD` correspondent à un compte existant en base — créer le compte de test manuellement ou via un seed CI dédié avant le premier run.
4. Si le seuil 70% bloque, ajuster `exclude` dans `vitest.config.ts` pour exclure les fichiers sans logique testable (routes Express, `main.tsx`).
5. Pas de Docker dans ce projet.
