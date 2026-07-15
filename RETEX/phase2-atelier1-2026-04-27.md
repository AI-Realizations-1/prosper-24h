# Rapport Phase 2 — Atelier 1 + Infrastructure
Date : 2026-04-27

## Résumé
- Étapes exécutées : 1 à 25 (toutes complétées)
- Étapes échouées ou contournées : aucune (1 incident mineur résolu)

## Fichiers créés ou modifiés

### Backend — apps/api/
| Fichier | Description |
|--------|-------------|
| `package.json` | Ajout dépendances : @prisma/client, bcrypt, jsonwebtoken, zod, dotenv + prisma, @types/bcrypt, @types/jsonwebtoken |
| `.env.example` | Modèle variables d'environnement |
| `.env` | Variables locales (hors git) |
| `prisma/schema.prisma` | Schéma Prisma : User, Study, BusinessValue, SupportingAsset, FearEvent, SecurityBaseline, StudyUser, AuditLogEntry + enums |
| `prisma/migrations/20260427123831_init/migration.sql` | Migration initiale générée et appliquée |
| `src/index.ts` | Refonte : dotenv + 6 groupes de routes montés |
| `src/utils/jwt.ts` | signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, signTokens |
| `src/utils/password.ts` | hashPassword, verifyPassword (bcrypt, 10 rounds) |
| `src/middleware/auth.ts` | Injection userId/role depuis JWT dans req |
| `src/middleware/rbac.ts` | Garde RBAC par rôle(s) autorisé(s) |
| `src/services/AuthService.ts` | register, login, refreshTokens |
| `src/services/StudyService.ts` | CRUD Study + contrôle accès propriétaire/StudyUser |
| `src/services/BusinessValueService.ts` | CRUD BusinessValue scopé à l'étude |
| `src/services/SupportingAssetService.ts` | CRUD SupportingAsset + liaison M-N BusinessValue |
| `src/services/FearEventService.ts` | CRUD FearEvent + liaison M-N SupportingAsset |
| `src/services/SecurityBaselineService.ts` | CRUD SecurityBaseline (référentiel + conformité + écart) |
| `src/controllers/AuthController.ts` | POST /register, POST /login, POST /refresh |
| `src/controllers/StudyController.ts` | CRUD Study |
| `src/controllers/BusinessValueController.ts` | CRUD BusinessValue |
| `src/controllers/SupportingAssetController.ts` | CRUD SupportingAsset |
| `src/controllers/FearEventController.ts` | CRUD FearEvent |
| `src/controllers/SecurityBaselineController.ts` | CRUD SecurityBaseline |
| `src/routes/auth.ts` | Routes /api/auth |
| `src/routes/studies.ts` | Routes /api/studies |
| `src/routes/businessValues.ts` | Routes /api/studies/:studyId/business-values |
| `src/routes/supportingAssets.ts` | Routes /api/studies/:studyId/supporting-assets |
| `src/routes/fearEvents.ts` | Routes /api/studies/:studyId/fear-events |
| `src/routes/securityBaselines.ts` | Routes /api/studies/:studyId/security-baselines |

### Frontend — apps/web/
| Fichier | Description |
|--------|-------------|
| `src/App.tsx` | Routes React Router + AuthProvider wrapping |
| `src/context/AuthContext.tsx` | Contexte auth (login, register, logout, accessToken, role, userId) |
| `src/components/PrivateRoute.tsx` | Garde de route — redirige /login si non authentifié |
| `src/components/AtlierLayout.tsx` | Navigation ateliers 1-5 (Atelier 1 actif, 2-5 désactivés) |
| `src/components/A1Form.tsx` | Formulaire multi-onglets Atelier 1 : VM, BS, ER, Socle |
| `src/pages/LoginPage.tsx` | Page connexion/inscription |
| `src/pages/DashboardPage.tsx` | Tableau de bord — liste des études |
| `src/pages/StudyPage.tsx` | Page étude — wrapper AtlierLayout |
| `src/hooks/useStudy.ts` | Fetch étude par ID |
| `src/hooks/useBusinessValues.ts` | Fetch valeurs métier d'une étude |
| `src/hooks/useSupportingAssets.ts` | Fetch biens supports d'une étude |
| `src/hooks/useFearEvents.ts` | Fetch événements redoutés d'une étude |
| `src/hooks/useSecurityBaselines.ts` | Fetch socle de sécurité d'une étude |

## Incidents rencontrés
| # | Description | Solution appliquée |
|---|-------------|-------------------|
| 1 | `jsonwebtoken@^9.1.2` introuvable sur npm (dernière version = 9.0.3) | Corrigé la contrainte en `^9.0.3` dans package.json |
| 2 | Build scripts Prisma, bcrypt, esbuild ignorés par pnpm v10 | `pnpm approve-builds` → sélection de tous les packages |
| 3 | Authentification PostgreSQL échoue (`postgres`/`postgres`) | `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"` |

## Décisions techniques prises
- **Mot de passe JWT** : secrets distincts access/refresh, expiration 15m/7d
- **Contrôle accès** : double vérification `ownerId` OU `StudyUser` dans tous les services Atelier 1
- **Validation** : Zod dans les services (parse strict), Zod dans les controllers (parse entrée HTTP)
- **FearEvent→SupportingAsset** : relation M-N gérée via Prisma `connect/set` (pas de table pivot explicite dans le schéma)
- **`mergeParams: true`** sur les routers imbriqués pour accéder à `studyId` dans les routes enfant
- **Frontend** : stockage token dans `localStorage` (acceptable en dev, à remplacer par httpOnly cookie en prod)

## État final
- [x] Migration Prisma appliquée (`20260427123831_init`)
- [x] API prête à démarrer sur port 3001
- [x] Frontend prêt à démarrer sur port 3000
- [x] Authentification JWT Register/Login implémentée
- [x] CRUD complet Atelier 1 (Study + 4 entités) avec contrôle d'accès
- [x] Commit `1ee9f35` poussé sur `origin/main` (47 fichiers, +4880 lignes)

## Prochaines étapes recommandées
1. **Tests automatisés** — Vitest/Supertest pour les routes API (coverage Atelier 1)
2. **Atelier 2** — Sources de risque, objectifs visés, couples SR/OV (issues #20–#23)
3. **Formulaire création d'étude** — route `/study/new` avec POST `/api/studies`
4. **Prisma Studio** — `npx prisma studio` pour inspecter les données en développement
5. **Sécurité production** — Remplacer localStorage par cookie httpOnly + CSRF token
6. **GitHub Actions CI** — pipeline lint + build sur chaque PR
```
