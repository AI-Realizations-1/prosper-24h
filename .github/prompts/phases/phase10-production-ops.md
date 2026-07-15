# Prompt Agent — Phase 10 : Production Ops, Observabilite et Securite Auth

## Contexte et prerequis
- Repertoire : ~/projects/Prosper/
- Phase 9 completee : E2E, couverture 70%, secrets CI, export auth
- Objectif Phase 10 : rendre l'exploitation production-ready sans changer le metier EBIOS RM
- Contrainte non negociable : pas de Docker

## Perimetre Phase 10

| Livrable | Description |
|----------|-------------|
| P10-01 | CD GitHub Actions sans Docker : staging auto + production manuelle approuvee |
| P10-02 | Observabilite minimale : logs structures, request-id, Sentry API/Web, health enrichi |
| P10-03 | Securite auth : migration localStorage vers cookie httpOnly + CSRF |
| P10-04 | Runbooks ops : deploiement, rollback, incident, sauvegarde/restauration DB |

---

## ETAPE 1 — Preparation CD et environnements GitHub (P10-01)

### 1a — Creer les environnements GitHub
Configurer dans GitHub Environments :
- staging
- production

Regles :
- production avec approbation manuelle obligatoire
- secrets dedies par environnement

Secrets minimum :
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- CORS_ORIGIN
- SENTRY_DSN_API
- SENTRY_DSN_WEB
- CSRF_SECRET
- DEPLOY_SSH_HOST
- DEPLOY_SSH_USER
- DEPLOY_SSH_KEY
- DEPLOY_TARGET_PATH

### 1b — Etendre le workflow CI existant
Creer ou modifier un workflow de deploiement sans Docker, base sur SSH/rsync + scripts Node/pnpm existants :
- declenchement staging sur push main
- declenchement production manuel via workflow_dispatch
- build/test obligatoires en prerequis
- migration Prisma cote cible avant redemarrage applicatif
- redemarrage process manager (pm2/systemd selon infra cible)

### 1c — Ajouter garde-fous de deploiement
- annuler si tests, coverage ou e2e echouent
- conserver version precedente sur le serveur pour rollback rapide
- journaliser commit, horodatage, environnement, resultat

---

## ETAPE 2 — Observabilite de base exploitable (P10-02)

### 2a — Logging structure API
Implementer un logger JSON (pino ou equivalent) avec champs :
- timestamp
- level
- requestId
- method
- path
- statusCode
- durationMs
- userId si disponible
- errorName/errorMessage pour erreurs

Ajouter middleware request-id :
- lire X-Request-Id si present
- sinon generer un id
- renvoyer X-Request-Id dans la reponse

### 2b — Health enrichi
Conserver le endpoint health et l'enrichir :
- statut app
- version applicative (commit ou variable)
- statut DB (ping leger)
- uptime
- environnement courant

### 2c — Sentry API/Web
Integrer Sentry cote API et Web :
- init conditionne par DSN non vide
- capture des erreurs non gerees
- release taggee par commit SHA
- environment = staging ou production

### 2d — Alertes minimales
Definir alertes de depart :
- taux d'erreurs API > seuil
- indisponibilite endpoint health
- echec deploiement staging/production

---

## ETAPE 3 — Migration auth securisee cookie + CSRF (P10-03)

### 3a — Backend auth
Passer a :
- refresh token en cookie httpOnly secure sameSite=lax
- access token court en memoire cote client (pas localStorage)
- endpoint de refresh dedie
- rotation refresh token
- invalidation sur logout

### 3b — Protection CSRF
Implementer CSRF token :
- endpoint de bootstrap CSRF
- header X-CSRF-Token requis sur methodes mutantes (POST/PUT/PATCH/DELETE)
- verification serveur avec secret dedie

### 3c — Frontend auth context
Adapter le contexte auth :
- suppression lecture/ecriture accessToken dans localStorage
- chargement session via endpoint refresh au boot
- maintien UX routes privees sans redirection parasite au refresh

### 3d — Compatibilite flux existants
Verifier non-regression sur :
- login/logout
- creation etude
- navigation ateliers
- export PDF/Excel deja securise

---

## ETAPE 4 — Runbooks exploitation (P10-04)

Creer les runbooks suivants dans docs/RUNBOOKS :
- run-phase10-deploy.md
- run-phase10-rollback.md
- run-phase10-incident.md
- run-phase10-backup-restore.md

Contenu attendu :
- prerequis
- commandes exactes
- verifications de succes
- points de controle securite
- procedure de retour arriere
- RTO/RPO cible (meme indicatifs)

Sauvegarde/restauration DB sans Docker :
- script backup horodate
- script restore controle
- test de restauration sur base de staging

---

## ETAPE 5 — Validation technique complete

Executer et faire passer :
1. lint API/Web
2. build API/Web
3. tests coverage API/Web (seuil 70% maintenu)
4. tests E2E existants
5. smoke staging post-deploiement :
   - health OK
   - login OK
   - creation etude OK
   - export PDF/Excel OK
6. test de rollback staging (au moins une fois)

---

## ETAPE 6 — Mise a jour registres phase/prompt

Mettre a jour :
- .github/prompts/README.md
- RETEX/prompts-used.yaml

Regles :
- phase9 passe a completed avec commit + retex
- phase10 est ajoutee en ready tant que non executee
- conserver un seul enregistrement par phase, pas de doublon

---

## ETAPE 7 — Commit et push

Messages recommandes :
1. feat: phase10 production ops without docker (cd, observability, auth cookies, runbooks)
2. docs: add retex for phase10 production ops

---

## ETAPE 8 — RETEX Phase 10

Creer un RETEX structure avec :
- resume execution
- livrables valides/non valides
- incidents rencontres
- decisions prises
- limites connues restantes
- prochaines actions priorisees

---

## Contraintes

1. Ne pas modifier la logique metier des ateliers EBIOS RM.
2. Pas de Docker.
3. Pas de secret en dur dans les workflows.
4. Toute regression auth bloquante invalide la phase.
5. Toute etape doit etre reproductible via runbook.

---

## Criteres d'acceptation fin de phase

- Deploiement staging automatise fonctionnel.
- Promotion production manuelle protegee fonctionnelle.
- Observabilite active (logs structures + Sentry + health enrichi).
- Auth migree vers cookie httpOnly + CSRF, sans usage localStorage pour accessToken.
- Runbooks complets testes sur au moins un cycle deploy/rollback.
- CI/CD et validations vertes sur main.
