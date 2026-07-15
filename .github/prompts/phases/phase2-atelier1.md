# Prompt Agent — Phase 2 : Atelier 1 + Auth + Prisma

## Statut
✅ COMPLETED — commits `1ee9f35` + `1ffc792` — 2026-04-27

## Objectif
Implémenter Atelier 1 EBIOS RM complet (valeurs métier, biens supports, événements redoutés, base de référence sécurité) + authentification JWT + Prisma/PostgreSQL.

## Issues fermées
A1-01 à A1-07 + FT-01 + FT-02 + FT-03

## Périmètre Backend
### Prisma
- Modèles: `User`, `Study`, `StudyUser`, `BusinessValue`, `SupportingAsset`, `FearEvent`, `SecurityBaseline`, `AuditLogEntry`
- Migration: `20260427123831_init`

### Auth
- `src/utils/jwt.ts` — access token 15m, refresh 7d
- `src/utils/password.ts` — bcrypt 10 rounds
- `src/middleware/auth.ts` — `authMiddleware` avec `req.userId`
- `src/middleware/rbac.ts`

### Services / Controllers / Routes
- `AuthService` + `AuthController` → `/api/auth`
- `StudyService` + `StudyController` → `/api/studies`
- `BusinessValueService` + `BusinessValueController` → `/api/studies/:studyId/business-values`
- `SupportingAssetService` + `SupportingAssetController` → `/api/studies/:studyId/supporting-assets`
- `FearEventService` + `FearEventController` → `/api/studies/:studyId/fear-events`
- `SecurityBaselineService` + `SecurityBaselineController` → `/api/studies/:studyId/security-baselines`

## Périmètre Frontend
- `AuthContext` + `PrivateRoute`
- Pages: `LoginPage`, `DashboardPage`, `StudyPage`
- Hooks: `useStudy`, `useBusinessValues`, `useSupportingAssets`, `useFearEvents`, `useSecurityBaselines`
- Composants: `AtlierLayout`, `A1Form`

## Stack
- JWT `jsonwebtoken@9.0.3`, bcrypt 5.1.1, Zod 3.22.4, dotenv
- PostgreSQL user `postgres`, password `postgres`, DB `prosper`

## RETEX
`RETEX/phase2-atelier1-2026-04-27.md`
