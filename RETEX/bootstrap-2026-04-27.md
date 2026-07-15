# RETEX — Bootstrap Prosper
**Date :** 27 avril 2026  
**Auteur :** Agent GitHub Copilot  
**Scope :** Initialisation complète du monorepo + dépôt GitHub + issues

---

## 1. Objectifs de la session

- Créer la structure monorepo pnpm + Turborepo + TypeScript dans `~/projects/Prosper/`
- Pousser le code initial sur `https://github.com/emi5650/Prosper.git`
- Créer les 9 labels et 33 issues GitHub couvrant les 5 ateliers EBIOS RM + les fonctions transverses

---

## 2. Résultats par étape

### Étape 1 — Structure monorepo
**Statut : ✅ OK**

Fichiers créés à la racine :
- `pnpm-workspace.yaml`
- `package.json` (scripts turbo : dev / build / lint)
- `turbo.json`
- `tsconfig.base.json`
- `.gitignore`

### Étape 2 — Package shared-types
**Statut : ✅ OK**

- `packages/shared-types/package.json`
- `packages/shared-types/tsconfig.json`
- `packages/shared-types/src/index.ts` — 17 interfaces/types EBIOS RM (Study, BusinessValue, SupportingAsset, FearEvent, SecurityBaseline, RiskSource, TargetObjective, RiskSourceObjectivePair, Stakeholder, StrategicScenario, OperationalScenario, Risk, SecurityMeasure, UserRole, StudyUser, AuditLogEntry)

### Étape 3 — Backend apps/api
**Statut : ✅ OK**

- `apps/api/package.json` (Express + CORS + tsx)
- `apps/api/tsconfig.json`
- `apps/api/src/index.ts` — serveur Express minimal avec route `/health`
- Dossiers vides scaffoldés : `src/routes/`, `src/controllers/`, `src/middleware/`

### Étape 4 — Frontend apps/web
**Statut : ✅ OK**

- `apps/web/package.json` (React 18 + Vite + react-router-dom)
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts` — proxy `/api → localhost:3001`
- `apps/web/index.html`
- `apps/web/src/main.tsx` + `apps/web/src/App.tsx`
- Dossiers vides scaffoldés : `src/pages/`, `src/components/`, `src/hooks/`

### Étape 5 — Git init et push
**Statut : ✅ OK**

```
a7e046d (HEAD -> main, origin/main) chore: init monorepo Prosper — TypeScript fullstack EBIOS RM
```

- 23 fichiers commités
- Branche `main` trackée sur `origin`

### Étape 6 — Labels et issues GitHub
**Statut : ✅ OK (avec incidents de parcours)**

9 labels créés : `atelier-1`, `atelier-2`, `atelier-3`, `atelier-4`, `atelier-5`, `transverse`, `P0`, `P1`, `P2`

33 issues ouvertes au final :

| # | Titre | Labels |
|---|-------|--------|
| 1 | FT-01 : Gestion des études (créer, modifier, archiver, dupliquer) | transverse, P0 |
| 2 | FT-02 : Gestion des utilisateurs et des rôles | transverse, P0 |
| 3 | FT-03 : Traçabilité des modifications — journal d'audit | transverse, P0 |
| 4 | FT-04 : Export PDF/Word/Excel de l'analyse | transverse, P0 |
| 5 | FT-05 : Import/export de données (interopérabilité) | transverse, P0 |
| 6 | FT-06 : Tableau de bord de synthèse par étude | transverse, P0 |
| 7 | FT-07 : Cohérence automatique des données entre ateliers | transverse, P0 |
| 8 | A1-01 : Définir le périmètre et l'objet de l'étude | atelier-1, P0 |
| 9 | A1-02 : Identifier les valeurs métier (VM) | atelier-1, P0 |
| 15 | A1-03 : Identifier les biens supports (BS) et les lier aux VM | atelier-1, P0 |
| 16 | A1-04 : Identifier les événements redoutés (ER) liés aux VM | atelier-1, P0 |
| 17 | A1-05 : Évaluer l'impact (gravité) des événements redoutés | atelier-1, P0 |
| 18 | A1-06 : Définir le socle de sécurité (conformité, référentiels) | atelier-1, P0 |
| 19 | A1-07 : Identifier les écarts par rapport au socle | atelier-1, P0 |
| 20 | A2-01 : Identifier les sources de risque (SR) | atelier-2, P0 |
| 21 | A2-02 : Identifier les objectifs visés (OV) par chaque SR | atelier-2, P0 |
| 22 | A2-03 : Évaluer la pertinence des couples SR/OV | atelier-2, P0 |
| 23 | A2-04 : Sélectionner les couples SR/OV retenus | atelier-2, P0 |
| 28 | A3-01 : Cartographier l'écosystème (parties prenantes) | atelier-3, P1 |
| 29 | A3-02 : Évaluer les dépendances et niveaux de menace des parties prenantes | atelier-3, P1 |
| 30 | A3-03 : Construire les scénarios stratégiques | atelier-3, P1 |
| 31 | A3-04 : Évaluer la vraisemblance des scénarios stratégiques | atelier-3, P1 |
| 32 | A3-05 : Définir les mesures de sécurité sur l'écosystème | atelier-3, P1 |
| 33 | A4-01 : Décliner les scénarios stratégiques en scénarios opérationnels | atelier-4, P1 |
| 34 | A4-02 : Lier les scénarios opérationnels aux biens supports | atelier-4, P1 |
| 35 | A4-03 : Évaluer la vraisemblance technique | atelier-4, P1 |
| 36 | A4-04 : Définir les mesures de sécurité techniques | atelier-4, P1 |
| 37 | A5-01 : Synthèse des risques (matrice gravité × vraisemblance) | atelier-5, P1 |
| 38 | A5-02 : Cartographie des risques | atelier-5, P1 |
| 39 | A5-03 : Décision de traitement par risque | atelier-5, P1 |
| 40 | A5-04 : Élaborer le plan de traitement des risques (PTR) | atelier-5, P1 |
| 41 | A5-05 : Évaluer les risques résiduels après traitement | atelier-5, P1 |
| 46 | A5-06 : Tableau de suivi des mesures de sécurité | atelier-5, P1 |

> **Note sur les numéros d'issues :** Les numéros ne sont pas consécutifs (#10–#14, #24–#27, #42–#45) car des doublons ont été créés lors de l'exécution concurrente de scripts et ont été fermés en cours de session. Les 33 issues actives couvrent bien l'intégralité du backlog spécifié.

### Vérification pnpm install
**Statut : ✅ OK**

```
Done in 37.8s using pnpm v10.33.0
```

Avertissement non bloquant : `Ignored build scripts: esbuild@0.21.5, esbuild@0.27.7` — résolu par `pnpm approve-builds` si nécessaire.

---

## 3. Incidents et mitigations

| Incident | Cause | Mitigation |
|----------|-------|------------|
| `gh` non installé | CLI absente sur la machine | Installation via `apt-get install gh` |
| `gh auth login` requis | Aucune session GitHub préexistante | Authentification via device flow (code `0AC1-0BB7` → github.com/login/device) |
| Doublons d'issues (×2 séries) | Exécution concurrente de scripts dans plusieurs terminaux actifs | Fermeture manuelle des doublons via `gh issue close` |
| Apostrophes perdues dans A3-01, A3-05, A5-01 | Troncature des caractères spéciaux lors d'un envoi `send_to_terminal` en mode non-interactif | Correction via `gh issue edit --title` |
| Numéros d'issues non séquentiels | Conséquence des doublons créés puis fermés | Sans impact fonctionnel, backlog complet |

---

## 4. État final du dépôt

```
Prosper/
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── controllers/.gitkeep
│   │       ├── middleware/.gitkeep
│   │       └── routes/.gitkeep
│   └── web/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── components/.gitkeep
│           ├── hooks/.gitkeep
│           └── pages/.gitkeep
├── packages/
│   └── shared-types/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/index.ts
└── RETEX/
    └── bootstrap-2026-04-27.md
```

---

## 5. Prochaines étapes recommandées

1. **Scaffolding API** — implémenter les routes CRUD pour `Study` (Atelier 1 → FT-01)
2. **Scaffolding Web** — créer les pages de navigation entre ateliers
3. **Base de données** — choisir le moteur (SQLite/PostgreSQL) et mettre en place les migrations
4. **Authentification** — implémenter la gestion des rôles (`UserRole`) — FT-02
5. **CI/CD** — ajouter un workflow GitHub Actions (lint + build) sur les PRs
6. **`pnpm approve-builds`** — autoriser les build scripts esbuild si nécessaire

---

*Généré par GitHub Copilot — Session du 27 avril 2026*
