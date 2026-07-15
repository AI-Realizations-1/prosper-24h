# RETEX — Phase 8 : Hardening, Tests et CI/CD (H-01 à H-05)

**Date :** 2026-04-27  
**Commit :** `0158520`  
**Durée d'exécution :** Session unique (~1h)  
**Statut :** ✅ Livré

---

## 1. Objectifs de la phase

Sécuriser, tester et industrialiser l'application Prosper EBIOS RM avant toute mise en production.

| Livrable | Intitulé |
|----------|----------|
| H-01 | Hardening sécurité API (helmet, rate-limit, CORS strict, handler d'erreur global) |
| H-02 | Proxy Vite dev paramétrable (VITE_API_URL) |
| H-03 | Tests unitaires API — 3 suites, 7 tests |
| H-04 | Tests unitaires Frontend — 2 suites, 5 tests |
| H-05 | CI/CD GitHub Actions (lint + build + test) |

---

## 2. Ce qui a été livré

### Backend (apps/api)

#### `apps/api/src/index.ts` (modifié)
- `helmet()` activé pour les headers HTTP de sécurité (XSS, clickjacking, HSTS, etc.)
- CORS strict : liste blanche via `process.env.CORS_ORIGIN` (séparateurs `,`), refus avec `new Error('Not allowed by CORS')` si origine inconnue
- Rate-limiting global : 100 req/min par IP (`express-rate-limit`, `standardHeaders: true`, `legacyHeaders: false`)
- Rate-limiting renforcé sur `/api/auth` : 10 req/min par IP
- Handler d'erreur global Express (`(err, req, res, _next)`) : retourne `500 { error: 'Internal server error' }` sans fuite de stack trace

#### `apps/api/.env.example` (mis à jour)
- Ajout de `CORS_ORIGIN=http://localhost:5173`
- Tous les secrets JWT listés avec des valeurs d'exemple explicites

#### Suites de tests API (`apps/api/src/tests/`)

| Fichier | Cas couverts |
|---------|-------------|
| `AuditLogService.test.ts` | `log()` crée l'entrée avec les bons paramètres ; `getByStudy()` retourne les entrées du journal |
| `StudyService.duplicate.test.ts` | Refus de duplication si l'utilisateur n'est pas propriétaire ; autorisation si propriétaire |
| `checkCoherence.test.ts` | Résultat cohérent en l'absence d'anomalie ; avertissement BV sans SA associé ; signal des risques en statut PENDING |

Outillage : `vitest@2`, `@vitest/coverage-v8@2`, configuration via `vitest.config.ts` dédié (environnement `node`).

---

### Frontend (apps/web)

#### `apps/web/vite.config.ts` (modifié)
- Proxy `/api` → `process.env.VITE_API_URL ?? 'http://localhost:3001'`
- Permet de pointer vers un environnement de staging sans modifier le code

#### `apps/web/.env.example` (créé)
- `VITE_API_URL=http://localhost:3001`

#### Suites de tests Web (`apps/web/src/tests/`)

| Fichier | Cas couverts |
|---------|-------------|
| `DashboardPage.test.tsx` | Titre principal affiché ; bouton "Créer une étude" présent ; bouton "Importer JSON" présent |
| `StudySummaryPanel.test.tsx` | Onglets Synthèse / Cohérence / Journal / Exports visibles ; KPI métier affichés |

- `setup.ts` : import de `@testing-library/jest-dom` pour les matchers DOM
- `vitest.config.ts` dédié : environnement `jsdom`, `globals: true`, `setupFiles`
- Mocks complets de `useStudySummary`, `useCoherence`, `useAuditLog`, `AuthContext`
- Mock fetch TypeScript-safe : `(globalThis as typeof globalThis & { fetch: unknown }).fetch = vi.fn()`

Outillage : `vitest@2`, `@testing-library/react@16`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.

---

### Infrastructure

#### `.github/workflows/ci.yml` (créé)
Pipeline complet :
1. Service PostgreSQL 16 (variables `POSTGRES_*` injectées)
2. Installation pnpm v10 + cache
3. `pnpm install --frozen-lockfile`
4. `pnpm prisma migrate deploy` (migration non-destructive en CI)
5. `pnpm --filter api lint` / `pnpm --filter web lint`
6. `pnpm --filter api build` / `pnpm --filter web build`
7. `pnpm --filter api test` / `pnpm --filter web test`

#### `turbo.json` (modifié)
- Tâche `test` ajoutée : `"dependsOn": ["^build"]`, `"cache": false`

---

## 3. Décisions techniques notables

### vitest@2 obligatoire (pas @4)
`vitest@4` requiert Vite 6 (`./module-runner`). Ce projet utilise Vite 5.4 → downgrade impératif vers `vitest@2.x` dans les deux apps. Documenté dans les `package.json`.

### Pattern `vi.hoisted()` pour les mocks Prisma
vitest hisse (`hoist`) automatiquement tous les appels `vi.mock()` en tête de fichier. Les variables `const mockXxx = vi.fn()` déclarées ensuite ne sont donc pas encore initialisées au moment où `vi.mock()` s'exécute → `ReferenceError`. Solution : déclarer les mocks via `vi.hoisted()` :

```typescript
const { mockCreate, mockFindMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
}));
vi.mock('@prisma/client', () => ({ PrismaClient: vi.fn().mockImplementation(() => ({ ... })) }));
```

### `vitest.config.ts` dédié obligatoire
La configuration vitest dans la clé `"vitest"` de `package.json` n'est pas lue par vitest v2. Un fichier `vitest.config.ts` explicite est requis pour que `environment: 'jsdom'` et `setupFiles` soient pris en compte.

### Correction préalable de `useFearEvents.ts`
Le lint Web bloquait sur `A3Form.tsx` : référence à `fetchAll` et `FearEvent` non exportés par `useFearEvents`. Résolution avant les tests : ajout de l'interface `FearEvent`, exposition de `fetchAll` via `useCallback`, typage explicite du state. Correction dans le scope minimal requis pour débloquer le lint.

---

## 4. Builds

| Package | Outil | Résultat |
|---------|-------|----------|
| `@prosper/api` | `tsc` | ✅ 0 erreur |
| `@prosper/web` | `vite build` | ✅ 0 erreur, ~226 kB bundle |

---

## 5. Tests

| Suite | Env | Tests | Résultat |
|-------|-----|-------|----------|
| `AuditLogService.test.ts` | node | 2/2 | ✅ |
| `StudyService.duplicate.test.ts` | node | 2/2 | ✅ |
| `checkCoherence.test.ts` | node | 3/3 | ✅ |
| `DashboardPage.test.tsx` | jsdom | 3/3 | ✅ |
| `StudySummaryPanel.test.tsx` | jsdom | 2/2 | ✅ |
| **Total** | | **12/12** | ✅ |

---

## 6. Fichiers modifiés / créés

| Fichier | Type |
|---------|------|
| `apps/api/src/index.ts` | Modifié (helmet + rate-limit + CORS strict + error handler) |
| `apps/api/.env.example` | Modifié (ajout CORS_ORIGIN) |
| `apps/api/vitest.config.ts` | Nouveau |
| `apps/api/src/tests/AuditLogService.test.ts` | Nouveau |
| `apps/api/src/tests/StudyService.duplicate.test.ts` | Nouveau |
| `apps/api/src/tests/checkCoherence.test.ts` | Nouveau |
| `apps/web/vite.config.ts` | Modifié (proxy VITE_API_URL) |
| `apps/web/.env.example` | Nouveau |
| `apps/web/vitest.config.ts` | Nouveau |
| `apps/web/src/tests/setup.ts` | Nouveau |
| `apps/web/src/tests/DashboardPage.test.tsx` | Nouveau |
| `apps/web/src/tests/StudySummaryPanel.test.tsx` | Nouveau |
| `apps/web/src/hooks/useFearEvents.ts` | Modifié (FearEvent interface + fetchAll) |
| `.github/workflows/ci.yml` | Nouveau |
| `turbo.json` | Modifié (tâche test) |

---

## 7. Limites connues

- **Couverture de code** : aucun seuil minimum configuré en CI. À fixer à 70 % minimum lors de la prochaine itération.
- **Tests E2E** : aucun test de bout en bout (Playwright). Les flux login → création étude → export ne sont couverts qu'en manuel.
- **Secrets CI** : `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` sont en dur dans le workflow pour l'environnement de test. À migrer vers GitHub Secrets pour les environnements de staging/production.
- **Export PDF/Excel avec auth** : les liens `<a href>` dans `StudySummaryPanel` ne portent pas le Bearer token. Pour la production, un fetch + Blob est nécessaire (hors scope Phase 8).
