# Prompt Agent — Phase 8 : Hardening, Tests et Mise en production

## Contexte et prérequis
- Répertoire : ~/projects/Prosper/
- **Phase 7 complétée** : toutes les fonctionnalités transverses FT-01 à FT-07 livrées
- Commit de référence : `c22f7c5` (feat: Phase 7 — Fonctionnalités transverses)
- État actuel : aucun test automatisé, aucun workflow CI/CD, secrets JWT en dur dans le code
- Issues GitHub à fermer : aucune issue ouverte — créer les issues manuellement si demandé

## Périmètre Phase 8

| Livrable | Description |
|----------|-------------|
| H-01 | Hardening sécurité API (helmet, rate-limit, CORS strict, .env.example) |
| H-02 | Proxy Vite dev (évite CORS en développement) |
| H-03 | Tests unitaires API (vitest, 3 services clés) |
| H-04 | Tests unitaires Frontend (vitest + @testing-library/react, 2 composants) |
| H-05 | CI/CD GitHub Actions (build + lint + test) |

> ⚠️ Pas de Docker dans ce projet.

---

## ÉTAPE 1 — Variables d'environnement et .env.example

### 1a — Créer `.env.example` à la racine `apps/api/`

```
DATABASE_URL=postgresql://prosper:prosper@localhost:5432/prosper
JWT_SECRET=changeme-access-secret-256bits
JWT_REFRESH_SECRET=changeme-refresh-secret-256bits
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173
```

### 1b — Créer `.env.example` à la racine `apps/web/`

```
VITE_API_URL=http://localhost:3001
```

### 1c — Vérifier que `apps/api/.env` est listé dans `.gitignore` racine

Ouvrir `.gitignore`. S'assurer que les lignes suivantes sont présentes (les ajouter si manquantes) :

```
.env
.env.local
apps/api/.env
apps/web/.env
```

---

## ÉTAPE 2 — Hardening sécurité API (H-01)

### 2a — Installer les dépendances

```bash
cd ~/projects/Prosper/apps/api
pnpm add helmet express-rate-limit
pnpm add -D @types/express-rate-limit
```

### 2b — Modifier `apps/api/src/index.ts`

Ajouter en haut des imports :

```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
```

Ajouter juste après `const app = express();` et **avant** les middlewares existants :

```typescript
// Sécurité HTTP headers
app.use(helmet());

// CORS strict
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting global : 100 req/min par IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Rate limiting renforcé sur l'auth : 10 req/min par IP
app.use('/api/auth', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
}));
```

Remplacer la ligne `app.use(cors())` existante (si elle existe encore) par le bloc CORS ci-dessus — ne pas doublonner.

Ajouter à la fin du fichier, après toutes les routes, un handler d'erreur générique :

```typescript
// Handler d'erreur global
app.use((err: Error, req: import('express').Request, res: import('express').Response, _next: import('express').NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## ÉTAPE 3 — Proxy Vite dev (H-02)

Modifier `apps/web/vite.config.ts` (créer s'il n'existe pas) :

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

Si un `vite.config.ts` existe déjà, ajouter uniquement la section `server.proxy` sans écraser le reste.

---

## ÉTAPE 4 — Tests unitaires API (H-03)

### 4a — Installer vitest dans apps/api

```bash
cd ~/projects/Prosper/apps/api
pnpm add -D vitest @vitest/coverage-v8
```

Ajouter dans `apps/api/package.json` la section `scripts` :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

Ajouter dans `apps/api/package.json` la section de config vitest :

```json
"vitest": {
  "environment": "node",
  "globals": true
}
```

### 4b — Créer `apps/api/src/tests/AuditLogService.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  const auditLogEntry = {
    create: vi.fn(),
    findMany: vi.fn(),
  };
  const study = {
    findUniqueOrThrow: vi.fn(),
  };
  const studyUser = {
    findFirst: vi.fn(),
  };
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      auditLogEntry,
      study,
      studyUser,
    })),
  };
});

import { AuditLogService } from '../services/AuditLogService';

describe('AuditLogService', () => {
  it("log() appelle prisma.auditLogEntry.create avec les bons paramètres", async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prismaInstance = new (PrismaClient as any)();
    prismaInstance.auditLogEntry.create.mockResolvedValue({ id: 'entry-1' });

    const params = { studyId: 'study-1', userId: 'user-1', action: 'CREATE', target: 'BusinessValue' };
    await AuditLogService.log(params);

    expect(prismaInstance.auditLogEntry.create).toHaveBeenCalledWith({ data: params });
  });

  it("getByStudy() lève une erreur si l'utilisateur n'a pas accès", async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prismaInstance = new (PrismaClient as any)();
    prismaInstance.study.findUniqueOrThrow.mockResolvedValue({ ownerId: 'other-user' });
    prismaInstance.studyUser.findFirst.mockResolvedValue(null);

    await expect(AuditLogService.getByStudy('study-1', 'user-1')).rejects.toThrow('Not authorized');
  });
});
```

### 4c — Créer `apps/api/src/tests/StudyService.duplicate.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  const study = {
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
  };
  const studyUser = {
    findFirst: vi.fn(),
  };
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({ study, studyUser })),
  };
});

import { StudyService } from '../services/StudyService';

describe('StudyService.duplicateStudy()', () => {
  it("refuse la duplication si l'utilisateur n'est ni propriétaire ni membre", async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prismaInstance = new (PrismaClient as any)();
    prismaInstance.study.findUniqueOrThrow.mockResolvedValue({
      ownerId: 'other-user',
      name: 'Test',
      businessValues: [],
      supportingAssets: [],
      fearEvents: [],
      securityBaselines: [],
      riskSources: [],
      targetObjectives: [],
      stakeholders: [],
      strategicScenarios: [],
      operationalScenarios: [],
    });
    prismaInstance.studyUser.findFirst.mockResolvedValue(null);

    await expect(StudyService.duplicateStudy('study-1', 'user-1')).rejects.toThrow('Not authorized');
  });
});
```

### 4d — Créer `apps/api/src/tests/checkCoherence.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      study: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ ownerId: 'user-1' }),
      },
      studyUser: { findFirst: vi.fn() },
      businessValue: { findMany: vi.fn().mockResolvedValue([]) },
      supportingAsset: { findMany: vi.fn().mockResolvedValue([]) },
      strategicScenario: { findMany: vi.fn().mockResolvedValue([]) },
      operationalScenario: { findMany: vi.fn().mockResolvedValue([]) },
      risk: { count: vi.fn().mockResolvedValue(0) },
    })),
  };
});

import { StudyService } from '../services/StudyService';

describe('StudyService.checkCoherence()', () => {
  it('retourne valid: true quand aucune incohérence', async () => {
    const result = await StudyService.checkCoherence('study-1', 'user-1');
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});
```

---

## ÉTAPE 5 — Tests unitaires Frontend (H-04)

### 5a — Installer vitest dans apps/web

```bash
cd ~/projects/Prosper/apps/web
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Ajouter dans `apps/web/package.json` la section `scripts` :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

Ajouter dans `apps/web/package.json` la section de config vitest :

```json
"vitest": {
  "environment": "jsdom",
  "globals": true,
  "setupFiles": ["./src/tests/setup.ts"]
}
```

### 5b — Créer `apps/web/src/tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
```

### 5c — Créer `apps/web/src/tests/StudySummaryPanel.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudySummaryPanel } from '../components/StudySummaryPanel';

vi.mock('../hooks/useStudySummary', () => ({
  useStudySummary: () => ({
    summary: {
      atelier1: { businessValues: 3, supportingAssets: 5, fearEvents: 2, securityBaselines: 4 },
      atelier2: { riskSources: 2 },
      atelier3: { stakeholders: 3, strategicScenarios: 4 },
      atelier4: { operationalScenarios: 6 },
      atelier5: { risksTotal: 6, risksReduction: 3, risksAccepted: 2, risksPending: 1, securityMeasures: 8, avgLevel: 2.5, avgResidual: 1.5 },
    },
    loading: false,
    error: null,
  }),
}));
vi.mock('../hooks/useCoherence', () => ({
  useCoherence: () => ({ result: null, loading: false, check: vi.fn() }),
}));
vi.mock('../hooks/useAuditLog', () => ({
  useAuditLog: () => ({ entries: [], loading: false }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
}));

describe('StudySummaryPanel', () => {
  it('affiche les onglets de navigation', () => {
    render(<StudySummaryPanel studyId="study-1" />);
    expect(screen.getByText('Synthèse')).toBeInTheDocument();
    expect(screen.getByText('Cohérence')).toBeInTheDocument();
    expect(screen.getByText('Journal')).toBeInTheDocument();
    expect(screen.getByText('Exports')).toBeInTheDocument();
  });

  it('affiche les KPI de synthèse dans le tableau', () => {
    render(<StudySummaryPanel studyId="study-1" />);
    expect(screen.getByText('Valeurs métier')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
```

### 5d — Créer `apps/web/src/tests/DashboardPage.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    logout: vi.fn(),
  }),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => [{ id: 'study-1', name: 'Étude EBIOS', status: 'DRAFT' }],
});

describe('DashboardPage', () => {
  it('affiche le titre principal', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText(/Tableau de bord/i)).toBeInTheDocument();
  });

  it('affiche le bouton créer une étude', () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText(/Créer une étude/i)).toBeInTheDocument();
  });
});
```

---

## ÉTAPE 6 — CI/CD GitHub Actions (H-05)

Créer `.github/workflows/ci.yml` :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    name: Build, Lint & Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: prosper
          POSTGRES_PASSWORD: prosper
          POSTGRES_DB: prosper
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://prosper:prosper@localhost:5432/prosper
        run: pnpm prisma migrate deploy && pnpm prisma generate

      - name: Lint API
        working-directory: apps/api
        run: pnpm lint

      - name: Lint Web
        working-directory: apps/web
        run: pnpm lint

      - name: Build API
        working-directory: apps/api
        run: pnpm build

      - name: Build Web
        working-directory: apps/web
        run: pnpm build

      - name: Test API
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://prosper:prosper@localhost:5432/prosper
          JWT_SECRET: ci-test-secret
          JWT_REFRESH_SECRET: ci-test-refresh-secret
        run: pnpm test

      - name: Test Web
        working-directory: apps/web
        run: pnpm test
```

---

## ÉTAPE 7 — Mise à jour turbo.json

Modifier `turbo.json` :

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": { "dependsOn": ["^build"], "cache": false }
  }
}
```

---

## ÉTAPE 8 — Validation locale

```bash
cd ~/projects/Prosper
pnpm --filter api lint
pnpm --filter web lint
pnpm --filter api build
pnpm --filter web build
pnpm --filter api test
pnpm --filter web test
```

Tous les builds et tests doivent passer sans erreur.

---

## ÉTAPE 9 — Commit et RETEX

```bash
cd ~/projects/Prosper
git add -A
git commit -m "feat: Phase 8 — Hardening, tests et CI/CD (H-01 à H-05)"
git push origin main
```

Puis créer et committer le RETEX :

```bash
cat > RETEX/phase8-hardening-$(date +%Y-%m-%d).md << 'EOF'
# Rapport Phase 8 — Hardening, Tests et CI/CD
Date : $(date +%Y-%m-%d)

## Résumé
- Étapes exécutées : toutes (1 à 9)

## État final
- [ ] .env.example créés (api + web)
- [ ] Hardening sécurité : helmet + rate-limit + CORS strict
- [ ] Proxy Vite dev configuré
- [ ] Tests API : vitest (AuditLogService + duplicateStudy + checkCoherence)
- [ ] Tests Web : vitest + @testing-library/react (StudySummaryPanel + DashboardPage)
- [ ] CI/CD : .github/workflows/ci.yml
- [ ] turbo.json : tâche test ajoutée
- [ ] Commit poussé sur GitHub
- [ ] Build API ✅ / Build Web ✅ / Tests API ✅ / Tests Web ✅
EOF

git add RETEX/
git commit -m "docs: add RETEX for Phase 8 hardening"
git push origin main
```

---

## Contraintes

1. Ne pas modifier les services métier (Ateliers 1-5, transverses).
2. Les secrets par défaut dans `jwt.ts` restent pour le dev local.
3. Les tests sont autonomes (mocks Prisma, pas de vraie DB).
4. Pas de Docker dans ce projet.
5. `prisma migrate deploy` (non `dev`) en CI.
6. Rate limiting `/api/auth` (10 req/min) : ne pas augmenter.
