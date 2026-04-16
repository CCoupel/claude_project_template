# Commande /init-project

Initialisation interactive du projet pour configurer l'environnement Claude Code.

> **Documentation complete** : [INITIALIZATION.md](../INITIALIZATION.md)

## Declenchement

- **Automatique** : Si `.claude/project-config.json` n'existe pas au demarrage
- **Manuel** : Commande `/init-project` pour reinitialiser ou modifier

## Workflow d'Initialisation

```
/init-project
    |
    v
[FETCH TEMPLATE] --> Fetcher la derniere version depuis GitHub
    |                (.template-source.json → gh api)
    v
[DETECTION] --> Analyser le code existant
    |
    |-- Code detecte --> Proposer analyse auto ou manuel
    |
    |-- Projet vide --> Questionnaire complet
    |
    v
[CONFIGURATION] --> Questions ou deduction
    |
    v
[GENERATION] --> project-config.json + agents
    |
    v
[FINALISATION] --> Mise a jour CLAUDE.md
```

> La phase **FETCH TEMPLATE** est toujours executee en premier.
> Elle garantit que les commandes, agents et contextes sont a la derniere version
> avant toute configuration projet. Voir section "Fetch du Template depuis GitHub".

---

## Etape 0 : Detection de Code Existant

**IMPORTANT** : Avant de poser des questions, analyser le projet.

### Fichiers a detecter

| Fichier | Detection |
|---------|-----------|
| `package.json` | Node.js, dependances npm |
| `go.mod` | Go |
| `requirements.txt`, `pyproject.toml` | Python |
| `Cargo.toml` | Rust |
| `pom.xml`, `build.gradle` | Java |
| `*.csproj`, `*.sln` | C# / .NET |
| `composer.json` | PHP |
| `Gemfile` | Ruby |
| `platformio.ini` | ESP32 / Arduino |
| `docker-compose.yml` | Docker |
| `.github/workflows/` | GitHub Actions |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |

### Dependances a analyser (package.json)

| Dependance | Technologie |
|------------|-------------|
| `react`, `react-dom` | React |
| `vue` | Vue.js |
| `@angular/core` | Angular |
| `svelte` | Svelte |
| `next` | Next.js |
| `nuxt` | Nuxt |
| `express`, `fastify`, `koa`, `hapi` | Node.js backend |
| `prisma`, `@prisma/client` | Prisma ORM |
| `typeorm` | TypeORM |
| `mongoose` | MongoDB |
| `pg`, `mysql2`, `sqlite3` | SQL direct |
| `jest`, `vitest`, `mocha` | Tests |
| `cypress`, `playwright` | E2E |

### Proposition a l'utilisateur

**Si code detecte :**

```
Analyse du projet en cours...

Technologies detectees :
- Backend : Go (go.mod)
- Frontend : React + TypeScript (package.json)
- Database : PostgreSQL (prisma avec provider postgresql)
- CI/CD : GitHub Actions (.github/workflows/)
- Tests : Vitest, Playwright

Voulez-vous :
a) Initialiser avec cette configuration (recommande)
   → Je confirme les details et genere les agents
b) Initialiser manuellement (questionnaire complet)
   → Repondre a toutes les questions
c) Annuler l'initialisation
```

**Si projet vide :**

```
Ce projet ne contient pas encore de code.

Comment souhaitez-vous initialiser le projet ?

a) Workshop de cadrage (recommande)
   → Entretien guidé pour définir vision, objectifs, stack et contraintes
   → Génère un CLAUDE.md complet et project-config.json
b) Questionnaire rapide
   → Questions directes sur la stack technique
   → Génère uniquement project-config.json et les agents
c) Annuler
```

### Option a : Workshop de Cadrage

Mener un entretien structuré en 6 phases, comme un avant-vente ou directeur de projet le ferait avant de constituer son équipe.

---

**Phase 1 — Identification du problème**
```
1. Quel est le nom du projet ?
2. Quel est le problème central que ce projet cherche à résoudre ?
   (Formuler en "Aujourd'hui, [persona] n'arrive pas à... parce que...")
3. Pourquoi ce problème n'est-il pas résolu aujourd'hui ?
   (Absence d'outil, outil inadapté, processus manuel, coût trop élevé...)
4. Quelle est l'urgence ou l'impact si le problème n'est pas résolu ?
```

**Phase 2 — Solution envisagée**
```
5. Comment le projet compte-t-il résoudre ce problème ?
   (Approche générale : automatisation, centralisation, nouveau service...)
6. Quels sont les 3 cas d'usage principaux de la v1 ?
7. Quels cas d'usage sont explicitement hors périmètre (v1) ?
8. Existe-t-il des solutions concurrentes ou comparables ? Qu'est-ce qui différencie ce projet ?
```

**Phase 3 — Parties prenantes et utilisateurs**
```
9.  Qui sont les utilisateurs finaux ? (rôles, profils, niveau technique)
10. Qui sont les commanditaires / décideurs du projet ?
11. Y a-t-il des parties prenantes externes (clients, partenaires, régulateurs) ?
12. Quel est le contexte de distribution (interne entreprise, SaaS public, B2B, B2C, embarqué) ?
```

**Phase 4 — Contraintes et risques**
```
13. Quelles sont les contraintes de délai ? (deadline, jalons, MVP attendu pour quand ?)
14. Quelles sont les contraintes budgétaires ou d'équipe ?
    (taille de l'équipe prévue, profils disponibles)
15. Y a-t-il des contraintes techniques imposées ?
    (langage, infra existante, compatibilité avec un SI, hébergement imposé...)
16. Y a-t-il des contraintes réglementaires ou de conformité ?
    (RGPD, HDS, PCI-DSS, ISO 27001, accessibilité RGAA...)
17. Quels sont les principaux risques identifiés ?
    (technique, organisationnel, marché, dépendances externes...)
```

**Phase 5 — Stack et architecture**
```
→ Enchaîner les étapes 2 à 10 du questionnaire standard
   (backend, frontend, mobile, firmware, BDD, CI/CD, déploiement, tests, sécurité)
```

**Phase 6 — Conventions d'équipe**
```
18. Quelle est la convention de nommage des branches ?
    (ex: feature/xxx, feat/xxx, fix/xxx)
19. Quel format de commit utilises-tu ?
    (ex: Conventional Commits, Gitmoji, libre)
20. Quelle est la politique de revue de code ? (nombre d'approbateurs, règles de merge)
21. Y a-t-il des règles de code ou des standards qualité spécifiques à documenter ?
```

---

A la fin du workshop, générer :
- `CLAUDE.md` complet avec toutes les informations collectées (vision, problème, solution, contraintes, stack, conventions)
- `project-config.json`
- Les agents adaptés à la stack

### Option b : Questionnaire Rapide

Enchaîner directement les étapes 1 à 10 ci-dessous.

---

## Etape 1 : Informations Generales

```
1. Quel est le nom du projet ?
   [Detecte: nom depuis package.json/go.mod] Confirmer ou modifier ?
   > [Texte libre]

2. Decris brievement le projet (1-2 phrases) :
   > [Texte libre]
```

---

## Etape 2 : Stack Backend

```
3. Quelle technologie backend utilises-tu ?
   [Detecte: X] Confirmer ou changer ?

   a) Go
   b) Node.js (JavaScript/TypeScript)
   c) Python (FastAPI/Django/Flask)
   d) Java / Kotlin (Spring)
   e) C# / .NET
   f) PHP (Laravel/Symfony)
   g) Ruby (Rails)
   h) Rust (Actix/Axum)
   i) Aucun backend
```

---

## Etape 3 : Stack Frontend

```
4. Quelle technologie frontend utilises-tu ?
   [Detecte: X] Confirmer ou changer ?

   a) React (Vite/CRA)
   b) React (Next.js)
   c) Vue.js (Vite)
   d) Vue.js (Nuxt)
   e) Angular
   f) Svelte / SvelteKit
   g) HTML/CSS/JS vanilla
   h) Aucun frontend
```

---

## Etape 4 : Mobile (optionnel)

```
5. As-tu une application mobile ?
   a) React Native
   b) Flutter
   c) iOS natif (Swift/SwiftUI)
   d) Android natif (Kotlin)
   e) Capacitor/Ionic
   f) Pas de mobile
```

---

## Etape 5 : Firmware/Hardware (optionnel)

```
6. As-tu du code firmware ou embarque ?
   a) ESP32 (Arduino/PlatformIO)
   b) ESP8266
   c) Raspberry Pi
   d) Arduino (AVR)
   e) STM32
   f) Pas de firmware
```

---

## Etape 6 : Base de Donnees

```
7. Quelle base de donnees utilises-tu ?
   [Detecte: X] Confirmer ou changer ?

   a) PostgreSQL
   b) MySQL / MariaDB
   c) MongoDB
   d) SQLite
   e) Redis
   f) Firebase / Firestore
   g) Supabase
   h) Plusieurs (preciser)
   i) Aucune
```

---

## Etape 7 : CI/CD

```
8. Quel systeme CI/CD utilises-tu ?
   [Detecte: X] Confirmer ou changer ?

   a) GitHub Actions
   b) GitLab CI
   c) Jenkins
   d) CircleCI
   e) Azure DevOps
   f) Bitbucket Pipelines
   g) Aucun
```

---

## Etape 8 : Deploiement

```
9. Comment deploies-tu ton application ?
   [Detecte: X] Confirmer ou changer ?

   a) Docker / Docker Compose
   b) Kubernetes
   c) Serverless (AWS Lambda, Vercel, Netlify)
   d) VPS / Bare metal
   e) PaaS (Heroku, Railway, Render)
   f) Cloud Run / App Engine
```

---

## Etape 9 : Tests

```
10. Quels frameworks de tests utilises-tu ?
    [Detecte: X] Completer si necessaire

    Tests unitaires backend: ___
    Tests unitaires frontend: ___
    Tests E2E: ___
```

---

## Etape 10 : Securite

```
11. Quels aspects securite sont importants ? (plusieurs choix)

    [ ] Authentification utilisateurs
    [ ] API publique
    [ ] Donnees sensibles (RGPD, sante, finance)
    [ ] Paiements (PCI-DSS)
    [ ] Multi-tenant
    [ ] Aucun aspect particulier
```

---

## Generation de la Configuration

### 1. Generer project-config.json

```json
{
  "name": "<PROJECT_NAME>",
  "description": "<DESCRIPTION>",
  "version": "0.1.0",
  "initialized_at": "<TIMESTAMP>",
  "initialized_from": "analysis|manual",
  "stack": {
    "backend": { "language": "go", "framework": null },
    "frontend": { "language": "typescript", "framework": "react" },
    "mobile": null,
    "firmware": null,
    "database": { "primary": "postgresql", "orm": "prisma" }
  },
  "infrastructure": {
    "cicd": "github-actions",
    "deploy": "docker"
  },
  "testing": {
    "backend": ["go-test"],
    "frontend": ["vitest"],
    "e2e": ["playwright"]
  },
  "security": {
    "concerns": ["auth", "api-public"]
  }
}
```

### 2. Generer les Agents

| Stack | Template Source | Destination |
|-------|-----------------|-------------|
| Go | `templates/dev-backend-go.md` | `agents/dev-backend.md` |
| Node.js | `templates/dev-backend-node.md` | `agents/dev-backend.md` |
| Python | `templates/dev-backend-python.md` | `agents/dev-backend.md` |
| React | `templates/dev-frontend-react.md` | `agents/dev-frontend.md` |
| Vue.js | `templates/dev-frontend-vue.md` | `agents/dev-frontend.md` |
| ESP32 | `templates/dev-firmware-esp32.md` | `agents/dev-firmware.md` |

### 2b. Generer le Workflow CI/CD

Choisir le template workflow adapte a la stack, le copier vers `.github/workflows/release.yml`
et remplacer les placeholders par les valeurs du projet :

| Stack detectee | Template workflow |
|----------------|------------------|
| Go + React/Vue | `templates/workflows/release-go-react.yml` |
| (autres stacks) | Generer un workflow minimal adapte |

**Placeholders a remplacer :**

| Placeholder | Valeur | Exemple |
|-------------|--------|---------|
| `{PROJECT_NAME}` | Nom du projet | `MyApp` |
| `{BINARY_NAME}` | Nom du binaire (minuscules) | `myapp` |
| `{BACKEND_DIR}` | Repertoire backend | `backend` |
| `{FRONTEND_DIR}` | Repertoire frontend | `frontend` |
| `{EMBED_DIR}` | Chemin embed dans backend | `cmd/server/dist` |
| `{GO_MAIN_PKG}` | Package main Go | `./cmd/server` |
| `{VERSION_FILE}` | Fichier version backend | `config.json` |
| `{GO_VERSION}` | Version Go | `1.22` |
| `{NODE_VERSION}` | Version Node | `20` |
| `{MIN_BINARY_SIZE}` | Taille min binaire (octets) | `5242880` |

Si des informations manquent, demander a l'utilisateur ou utiliser des valeurs par defaut raisonnables.

### 3. Finaliser

- Copier les templates de commandes (`.template.md` → `.md`)
- Mettre a jour CLAUDE.md avec les valeurs reelles
- Adapter l'agent CDP selon les agents generes
- Creer `.claude/.gitignore` depuis `gitignore-for-projects` :
  ```bash
  cp .claude/gitignore-for-projects .claude/.gitignore
  ```

---

## Message de Fin

```
Projet "<PROJECT_NAME>" initialise avec succes !

Configuration :
- Backend : Go
- Frontend : React + TypeScript
- Database : PostgreSQL
- CI/CD : GitHub Actions
- Deploy : Docker

Agents generes :
- dev-backend.md (Go)
- dev-frontend.md (React)

Commandes disponibles :
- /feature, /bugfix, /hotfix, /refactor
- /review, /qa, /secu
- /deploy qualif, /deploy prod

Bonne utilisation de Claude Code !
```

---

---

## Architecture : separation TEMPLATE / PROJET

Les fichiers `.claude/` sont classes en deux categories :

| Categorie | Fichiers | Comportement |
|-----------|----------|--------------|
| **TEMPLATE** | `commands/`, `agents/*.template.md`, `agents/context/`, `templates/` | Fetchés depuis GitHub, gitignores, jamais edites manuellement |
| **PROJET** | `CLAUDE.md`, `project-config.json`, `memory/`, `agents/dev-*.md`, `settings.json` | Git trackes, jamais ecrases par une sync |

Le fichier `.claude/.template-source.json` enregistre la source du template :
```json
{
  "repo": "owner/claude_project_template",
  "branch": "main",
  "commit": "<sha du dernier fetch>",
  "synced_at": "YYYY-MM-DD"
}
```

Le fichier `.claude/.gitignore` (cree par `/init-project` depuis `gitignore-for-projects`) exclut les fichiers TEMPLATE du repo projet.

---

## Fetch du Template depuis GitHub

### Quand fetcher

- **Premiere initialisation** : toujours
- **Reinitialisation** : option d) ci-dessous
- **Synchronisation manuelle** : `/init-project` → option d)

### Procedure de fetch

#### 1. Lire la source

```bash
cat .claude/.template-source.json
# → repo, branch, commit connu
```

#### 2. Verifier si une mise a jour est disponible

```bash
TEMPLATE_REPO=$(cat .claude/.template-source.json | jq -r '.repo')
KNOWN_COMMIT=$(cat .claude/.template-source.json | jq -r '.commit // ""')

# Dernier commit sur la branche main
LATEST_COMMIT=$(gh api repos/$TEMPLATE_REPO/commits/main --jq '.sha')

if [ "$KNOWN_COMMIT" = "$LATEST_COMMIT" ]; then
  echo "Template deja a jour ($LATEST_COMMIT)"
  # Continuer quand meme (les fichiers peuvent etre absents si gitignores)
fi
```

#### 3. Fetcher les fichiers TEMPLATE depuis GitHub

```bash
TEMPLATE_REPO=$(cat .claude/.template-source.json | jq -r '.repo')

# Lister tous les fichiers TEMPLATE dans le repo
gh api repos/$TEMPLATE_REPO/git/trees/main?recursive=1 \
  --jq '.tree[] | select(.type=="blob") | .path' \
  | grep -E '^\.claude/(commands/|agents/.*\.template\.md|agents/context/|templates/)' \
  | while read FILE; do
      # Creer le dossier destination si necessaire
      mkdir -p ".$(dirname $FILE)"
      # Telecharger le fichier
      gh api repos/$TEMPLATE_REPO/contents/$FILE \
        --jq '.content' | base64 -d > ".$FILE"
      echo "  ✓ $FILE"
    done
```

#### 4. Mettre a jour .template-source.json

```bash
LATEST_COMMIT=$(gh api repos/$TEMPLATE_REPO/commits/main --jq '.sha')
TODAY=$(date +%Y-%m-%d)

jq --arg commit "$LATEST_COMMIT" --arg date "$TODAY" \
  '.commit = $commit | .synced_at = $date' \
  .claude/.template-source.json > /tmp/tpl.json && \
  mv /tmp/tpl.json .claude/.template-source.json
```

---

## Reinitialisation

Si le projet est deja initialise :

```
Ce projet est deja initialise (config du YYYY-MM-DD).
Template : <repo> — dernier sync : <date> (<commit>)

Voulez-vous :
a) Reconfigurer completement (ecrase la config)
b) Modifier certains parametres
c) Re-analyser le code (detecter les changements)
d) Synchroniser le template depuis GitHub (fetch derniere version)
e) Annuler
```

### Option b : Modification partielle

```
Quel element modifier ?
a) Stack backend
b) Stack frontend
c) Base de donnees
d) CI/CD
e) Deploiement
f) Tests
g) Securite
h) Retour
```

### Option c : Re-analyse

Utile apres evolution du projet (nouvelle techno, migration).
Re-analyse le code et propose les mises a jour.

### Option d : Synchronisation du template depuis GitHub

Fetche la derniere version du template et met a jour les fichiers TEMPLATE.
Les fichiers PROJET ne sont jamais touches.

#### Etape 1 — Verifier les mises a jour disponibles

Executer la procedure "Fetch du Template depuis GitHub" ci-dessus.

Afficher le rapport avant toute action :

```
Synchronisation template depuis github.com/<repo>

  Commit actuel : abc1234  (synced: 2026-03-01)
  Dernier commit : def5678  (2026-04-16) ← mise a jour disponible

  NOUVEAUX fichiers :
    + .claude/commands/milestone.md
    + .claude/commands/context/GITHUB.md
    + .claude/agents/context/GITHUB.md

  MODIFIES :
    ~ .claude/commands/backlog.md
    ~ .claude/agents/deploy.template.md

  INCHANGES : 18 fichiers

Continuer ?
  [A] Tout appliquer
  [B] Nouveaux fichiers uniquement
  [C] Annuler
```

#### Etape 2 — Application

**Si [A]** : fetcher tous les fichiers TEMPLATE (nouveaux + modifies)
**Si [B]** : fetcher uniquement les fichiers absents localement

#### Etape 3 — Rapport final

```
Template synchronise — commit def5678 (2026-04-16)

  Nouveaux  : 3 fichiers
  Mis a jour : 2 fichiers
  Inchanges : 18 fichiers

Fichiers PROJET preserves (non touches) :
  ✓ CLAUDE.md
  ✓ project-config.json
  ✓ agents/dev-backend.md
  ✓ memory/MEMORY.md
```
