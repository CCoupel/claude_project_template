# Guide d'Initialisation de Projet

Ce document decrit le processus complet d'initialisation d'un projet avec Claude Code.
La reference executable est `init-project.md` (racine du repo template) ; ce guide en resume le deroulement.

> **Convention d'interaction** : toutes les questions et confirmations ci-dessous sont posees via l'outil
> `AskUserQuestion` (2-4 options, saisie libre via « Autre »), jamais en texte dans le chat. Les blocs
> `a) b) c)`, `(o/n)` et `> [Texte libre]` decrivent le contenu des questions, pas leur format d'affichage.

## Declenchement Automatique

L'initialisation est declenchee automatiquement si :
- Le fichier `.claude/project-config.json` n'existe pas
- Claude Code demarre sur un projet utilisant ce template

## Vue d'ensemble

```
/init-project
    |
    v
[FETCH TEMPLATE] --> TEMPLATE_claude/ depuis GitHub, au commit du dernier tag (jamais un HEAD non tagge)
    v
[DEPLOY] --> commandes (.claude/commands/*.md), agents et contextes partages (*.template.md
    |        avec en-tete de provenance), mods (.claude/skills/<mod>/)
    v
[DETECTION] --> code existant : analyse auto ou manuel ; projet vide : brief, workshop ou questionnaire
    v
[CONFIGURATION] --> Etapes 1 a 10 (questions ou deduction)
    v
[GENERATION] --> project-config.json + agents dev-* + registre des agents + fichiers d'environnement
    v
[PLACEHOLDERS] --> substitution des {VAR} dans commandes et agents deployes
    v
[FINALISATION] --> CLAUDE.md + .gitignore + CI/CD + labels GitHub + settings.json + memoire
    |              + milestone v0.1.0 et issues de base (nouveau projet avec remote GitHub)
    v
[AUDIT CONTEXTE] --> commit d'init puis /context-audit (audit complet)
    v
[PUBLICATION] --> commit des corrections de l'audit, report sur main et push (sans question)
```

## Processus d'Initialisation

### Etape 0 : Detection de Code Existant

**Avant de poser les questions**, Claude analyse le projet :

```
Analyse du projet en cours...

Technologies detectees :
- Backend : Go (go.mod)
- Frontend : React + TypeScript (package.json)
- Database : PostgreSQL (prisma avec provider postgresql)
- CI/CD : GitHub Actions (.github/workflows/)
- Tests : Vitest, Playwright
```

**Si du code existe**, Claude propose :

```
Comment veux-tu initialiser le projet ?
a) Initialiser avec cette configuration (recommande)
   → utilise directement les technologies detectees, aucune question supplementaire
b) Initialiser avec cette configuration et cadrer depuis le brief
   → stack detectee + cadrage produit deduit du brief (phases 1-4 et 6)
   (uniquement si un brief est disponible — voir ci-dessous)
c) Initialiser manuellement
   → questionnaire complet (etapes 2 a 10), utile si une detection est incorrecte
d) Annuler l'initialisation
```

**Si le projet est vide**, Claude propose :

```
Ce projet ne contient pas encore de code.

a) Brief de projet (recommande si un brief est disponible)
   → Un texte de presentation ou de preparation du projet : passe avec la commande
     (/init-project <texte ou chemin>), colle dans la conversation avant la commande,
     ou lu dans BRIEF.md, docs/BRIEF.md ou un README.md descriptif.
     Claude en deduit une proposition de cadrage (21 questions du workshop + stack,
     chaque valeur marquee deduit / propose / manquant, rien d'invente), l'affiche,
     puis ne pose que des questionnaires de precision : une question par element
     manquant ou propose (valeur deduite en option recommandee), une confirmation
     groupee par phase pour les elements deduits.
b) Workshop de cadrage
   → Entretien guide en 6 phases, par choix guides (21 questions). La question 8
     (solutions existantes, differenciateur) n'est pas posee : Claude cherche sur le web
     les solutions qui repondent deja au besoin, presente un tableau source, et fait
     seulement valider le differenciateur (ou l'adoption d'une solution existante).
     Meme regle en mode brief.
c) Questionnaire rapide
   → Stack technique seule, sans cadrage produit
d) Annuler
```

Un brief n'est jamais exploite silencieusement : seulement apres ce choix explicite. Sources, par ordre de
priorite : texte passe avec la commande, texte colle avant la commande, `BRIEF.md` / `docs/BRIEF.md` /
`docs/CADRAGE.md` (section « Brief d'origine »), puis (projet vide) un `README.md` descriptif.

Brief et workshop ecrivent la **fiche de cadrage** `docs/CADRAGE.md` (brief d'origine verbatim, puis une
sous-section par phase avec les valeurs finales et leur provenance `[brief]`, `[precision]` ou `[workshop]`) ;
elle alimente les issues de base du milestone `v0.1.0` (une issue par cas d'usage v1) et sert de reference
au planner et au marketing. `project-config.json` → `initialized_from` = `analysis`, `manual`, `workshop` ou `brief`.

### Etape 0a : Analyse Automatique

Claude analyse les fichiers pour deduire :

| Fichier/Pattern | Deduction |
|-----------------|-----------|
| `package.json` | Node.js, dependances frontend/backend |
| `go.mod` | Go backend |
| `requirements.txt`, `pyproject.toml` | Python |
| `pom.xml`, `build.gradle` | Java |
| `Cargo.toml` | Rust |
| `*.csproj`, `*.sln` | C# / .NET |
| `composer.json` | PHP |
| `Gemfile` | Ruby |
| `platformio.ini` | ESP32/Arduino firmware |
| `docker-compose.yml` | Docker deployment |
| `.github/workflows/` | GitHub Actions CI |
| `.gitlab-ci.yml` | GitLab CI |
| `Jenkinsfile` | Jenkins |

**Detection des dependances (package.json)** :

| Dependance | Deduction |
|------------|-----------|
| `react`, `react-dom` | React frontend |
| `vue` | Vue.js frontend |
| `@angular/core` | Angular frontend |
| `svelte` | Svelte |
| `next` | Next.js |
| `nuxt` | Nuxt |
| `express`, `fastify`, `koa`, `hapi` | Node.js backend |
| `prisma`, `@prisma/client` | Prisma ORM |
| `typeorm` | TypeORM |
| `mongoose` | MongoDB |
| `pg`, `mysql2`, `sqlite3` | SQL direct |
| `jest`, `vitest`, `mocha` | Test framework |
| `cypress`, `playwright` | E2E testing |

Plusieurs racines de composant d'une meme categorie (ex. deux `platformio.ini`, deux `go.mod`) sont reprises a
l'Etape 5d pour proposer directement des instances d'agents.

### Etape 1 : Informations Generales

```
1. Quel est le nom du projet ?
   > [Detecte depuis package.json/go.mod → propose en option recommandee]

2. Decris brievement le projet (1-2 phrases) :
   > [Texte libre]

3. Repo GitHub ?
   [Detecte via git remote get-url origin → rien a demander]
   Sinon :
   a) Aucun pour l'instant — labels de phase, milestone v0.1.0 et issues de base non crees
   b) owner/repo existant → git remote add origin
   c) owner/repo inexistant → proposition de creation (gh repo create --private)
```

`org` / `project` de `project-config.json` sont extraits du remote ; sans remote, les etapes GitHub de la
finalisation sont sautees.

### Etape 1b : Licence

```
Licence detectee (LICENSE*, COPYING*, champ license des manifestes) → « Conserver ? » seulement.
Sinon : « Comment definir la licence du projet ? »
   a) M'aider a choisir (recommande) → synthese des principales licences open source (MIT, BSD-3-Clause,
      Apache-2.0, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0, Unlicense), puis 4 questions :
      reutilisation dans du logiciel ferme ? usage en SaaS ? brevets ? forme du livrable ?
      → recommandation argumentee + alternatives
   b) Je fournis la licence → identifiant SPDX ou chemin d'un fichier
   c) Proprietaire (tous droits reserves)
   d) Decider plus tard → rappel dans le message de fin
Puis titulaire du copyright (git user.name ou org GitHub).
```

Enregistre dans `project-config.json` → `license` ; `LICENSE` est cree a la finalisation (texte officiel via
`gh api licenses/<cle>`, jamais d'ecrasement d'un fichier existant). Projet deja initialise sans `license` :
option d, etape d1g.

### Etape 2 : Stack Backend

```
4. Quelle technologie backend utilises-tu ?
   a) Node.js (JavaScript/TypeScript) → dev-backend-node
   b) Python (FastAPI/Django/Flask)    → dev-backend-python
   c) Go                               → dev-backend-go
   d) Aucun backend
   (Autre — Java/Kotlin, C#/.NET, PHP, Ruby, Rust... → agent base sur dev-generic, voir Etape 5d)
```

### Etape 3 : Stack Frontend

```
5. Quelle technologie frontend utilises-tu ?
   a) React (Vite/CRA)   → dev-frontend-react
   b) React (Next.js)    → dev-frontend-react
   c) Vue.js (Vite/Nuxt) → dev-frontend-vue
   d) Aucun frontend
   (Autre — Angular, Svelte/SvelteKit, vanilla... → dev-generic)
```

### Etape 4 : Mobile (optionnel)

```
6. As-tu une application mobile ?
   a) React Native
   b) Flutter
   c) Natif (iOS Swift/SwiftUI ou Android Kotlin)
   d) Pas de mobile
   (Autre — Capacitor/Ionic...)
```

Une stack mobile n'a pas de template dedie : agent `dev-mobile` base sur `dev-generic`.

### Etape 5 : Firmware/Hardware (optionnel)

```
7. As-tu du code firmware ou embarque ?
   a) ESP32 (Arduino/PlatformIO) → dev-firmware-esp32
   b) Raspberry Pi
   c) Pas de firmware
   (Autre — ESP8266, Arduino AVR, STM32... → dev-generic)
```

### Etape 5b : Plugin (optionnel)

```
8. Ton projet inclut-il un plugin pour une plateforme existante ?
   a) VS Code Extension
   b) Browser Extension (Chrome/Firefox)
   c) Pas de plugin
   (Autre plateforme — Obsidian, WordPress...)
```

Toute plateforme utilise le template `dev-plugin`.

### Etape 5c : Agents generiques — projets non-dev (optionnel)

Pour les taches hors developpement (presentations, documents metier, analyses...). Chaque instance = le
template commun `generic` + une **specification** propre `.claude/agents/generic.<nom>.md`. Plusieurs instances
possibles ; un projet purement non-dev peut repondre « Pas de ... » aux etapes 2 a 6 et ne declarer que des
agents generiques. Pour chaque instance : nom canonique (kebab-case, unique), role, specification (perimetre,
entrees, livrables, outils, criteres de validation) et mode de spawn (`socle` par defaut, `milestone` ou `ponctuel`).

### Etape 5d : Agents de developpement — instances multiples et stacks sans template

Claude recapitule les agents de stack deduits des etapes 2 a 5b (table de correspondance stack → agent de stack
de `init-project.md`, section "Registre des agents") :

- **Instances multiples** : un meme type de composant present plusieurs fois (ex. firmware capteur + firmware
  passerelle) donne un agent par composant, `dev-<categorie>-<suffixe>`, avec un role et un perimetre (globs)
  disjoints. Il n'y a alors pas d'agent `dev-<categorie>` seul.
- **Stack sans template** (reponse « Autre ») : agent `dev-<categorie>` base sur `templates/dev-generic.md`. Sa
  stack, sa toolchain (commandes exactes de build/tests/lint/audit) et ses conventions sont deduites du code ou
  demandees, puis ecrites dans son compagnon `<nom>.md` — **obligatoire** (sans lui, l'agent repond `BLOQUE`).

### Etape 6 : Base de Donnees

```
9. Quelle base de donnees utilises-tu ?
   a) PostgreSQL
   b) MySQL / MariaDB
   c) MongoDB
   d) Aucune
   (Autre — SQLite, Redis, Firebase/Firestore, Supabase, plusieurs bases...)
```

### Etape 7 : CI/CD

```
10. Quel systeme CI/CD utilises-tu ?
    a) GitHub Actions — audite le workflow de release existant, sinon le genere
    b) GitLab CI — meme demarche avec .gitlab-ci.yml
    c) Aucun — pas de pipeline genere, /build et /publish restent manuels
    (Autre — Jenkins, CircleCI, Azure DevOps, Bitbucket Pipelines...)
```

### Etape 8 : Environnements et Deploiement

```
11. Comment deploies-tu ton application ? (mecanisme d'installation par defaut)
    a) Docker / Docker Compose
    b) Kubernetes / Helm
    c) Serverless (AWS Lambda, Vercel, Netlify)
    d) VPS / Bare metal
    (Autre — PaaS Heroku/Railway/Render, Cloud Run/App Engine...)

12. Quels environnements de release utilises-tu, dans l'ordre de promotion ?
    a) QUALIF puis PROD (recommande — seule chaine cablee dans l'orchestration CDP)
    b) DEV puis QUALIF puis PROD
    c) QUALIF puis PRE-PROD puis PROD
    (Autre chaine personnalisee)
```

Chaque environnement de `infrastructure.environments[]` recoit un `publish.mode` (`promote` par defaut, sauf
le dernier en `rebuild-ci`) et un `deploy.mechanism` (reponse a la question 11, sauf personnalisation explicite).
Un environnement hors QUALIF/PROD se publie/deploie manuellement (`/publish <env>`, `/deploy <env>`). Cette etape
ne cree que la configuration et les procedures generiques — les artefacts d'infra (Dockerfile,
`docker-compose.<env>.yml`, chart Helm...) sont scaffoldes par l'agent `infra` au premier deploiement.

### Etape 8b : Acces aux environnements (collecte + validation)

Un environnement injoignable ou mal configure doit etre decouvert au cadrage, pas au premier `/deploy`. Pour
chaque environnement, avec le role de l'agent `infra` (section « Mode Acces (cadrage) » de `agents/infra.md`) :

1. **Collecter** les elements d'acces non sensibles selon le mecanisme : hote, utilisateur, port SSH, runtime
   (`docker` ou `podman`), repertoire cible, registre, services a deployer (`docker-compose` / `vps`) ; contexte
   kube, namespace, deployments (`kubernetes` / `helm`) ; plateforme, projet, region (`serverless` / `paas` /
   `cloud-run`) ; droits de push du registre (`promote`) ou de tag sur le depot (`rebuild-ci`).
   **Jamais de valeur secrete** : seulement les **noms** des variables (valeurs dans `<env>.env`, gitignore).
2. **Valider** par des sondes en lecture seule (SSH sans mot de passe, runtime, droits sur la cible, login
   registre, `kubectl auth can-i`, « whoami » de la CLI plateforme, `permissions.push` du jeton GitHub).
3. **Verdict** par environnement (✓ OK / ✗ ECHEC / ? NON TESTE) ; pour tout environnement non valide : corriger
   et retester (recommande), basculer sur un autre mecanisme/hote, ou reporter (`skipped` — `/deploy <env>`
   refusera de partir tant que l'acces n'est pas valide).
4. **Enregistrer** dans `infrastructure.environments[].access` (coordonnees, `credentials_env`, `verified`).

### Etape 9 : Tests

```
13. Quels frameworks de tests utilises-tu ? (defauts deduits de la stack)
    a) Tests unitaires backend : ex. go test pour Go, Jest/Vitest pour Node
    b) Tests unitaires frontend : ex. Vitest/Jest pour React/Vue
    c) Tests E2E : Playwright (recommande)
```

### Etape 10 : Securite

```
14. Quels aspects securite sont importants pour ce projet ? (plusieurs choix possibles)
    [ ] Authentification utilisateurs
    [ ] Donnees sensibles (RGPD, sante, finance)
    [ ] Paiements (PCI-DSS)
    [ ] Aucun aspect particulier
    (Autre — API publique, multi-tenant...)
```

## Generation de la Configuration

Une fois les reponses collectees, Claude genere :

### 1. project-config.json

Extrait (schema complet et regles de derivation : `init-project.md`, section "1. project-config.json") :

```json
{
  "name": "mon-projet",
  "team_name": "mon-projet-team",
  "org": "mon-org",
  "project": "mon-projet",
  "description": "Description du projet",
  "version": "0.1.0",
  "initialized_at": "2026-01-15T10:30:00Z",
  "initialized_from": "analysis",
  "template_version": { "tag": "v4.0.0", "commit": "<sha>" },
  "src_dir": "src",
  "version_file": "package.json",
  "stack": {
    "backend": { "language": "go", "framework": null },
    "frontend": { "language": "typescript", "framework": "react" },
    "mobile": null,
    "firmware": null,
    "database": { "primary": "postgresql", "orm": "prisma" }
  },
  "infrastructure": {
    "cicd": "github-actions",
    "environments": [
      {
        "name": "QUALIF",
        "order": 1,
        "publish": { "mode": "promote", "target": "build/qualif_v{X.Y.Z}/" },
        "deploy":  { "mechanism": "docker-compose", "target": "docker-compose.qualif.yml" },
        "access":  {
          "method": "ssh", "host": "qualif.example.com", "user": "deploy", "port": 22, "runtime": "podman",
          "credentials_env": ["SSH_KEY_PATH", "REGISTRY_USER", "REGISTRY_PASSWORD"],
          "verified": { "status": "ok", "at": "2026-01-15T11:30:00Z" }
        }
      },
      {
        "name": "PROD",
        "order": 2,
        "publish": { "mode": "rebuild-ci", "trigger": "git-tag", "pipeline": ".github/workflows/release.yml" },
        "deploy":  { "mechanism": "docker-compose", "target": "docker-compose.prod.yml" }
      }
    ]
  },
  "testing": {
    "backend": ["go-test"],
    "frontend": ["vitest"],
    "e2e": ["playwright"],
    "regression_at_qa": "gated",
    "full_regression_at": "qualif",
    "coverage_min": 70,
    "lot_max_tests": 50
  },
  "security": { "concerns": ["auth", "api-public"] },
  "commands": { "build": "...", "test": "...", "lint": "...", "audit": "...", "ci": "scripts/ci.sh" },
  "docs": { "mockup_dir": "docs/mockup" },
  "marketing": { "site": "auto" },
  "milestone": {
    "defaults": { "patch": "leger", "minor": "complet", "major": "complet" }
  },
  "agents": {
    "generic": [],
    "registry": []
  }
}
```

- `template_version` : version du template deployee — seule copie trackee git (`TEMPLATE_claude/` est gitignore),
  elle permet la reinstallation a l'identique apres un clone.
- `milestone.defaults` : intensite de depart d'un milestone selon son type de version (`leger` / `complet`) ; le
  cadrage complet (options, team) est propose par le planner et valide au GATE 2 —
  `agents/context/MILESTONE_CADRAGE.md`. Absent = `complet` partout.
- `agents.registry[]` / `contexts.registry[]` : registre des agents et des contextes partages (ci-dessous).

### 2. Agents de Developpement et registre des agents

Selon la stack, Claude deploie les templates de stack (`init-project.md`, table « Correspondance stack → agent
de stack ») :

| Stack | Template | Agent genere |
|-------|----------|--------------|
| Go | `templates/dev-backend-go.md` | `agents/dev-backend.template.md` |
| Node.js | `templates/dev-backend-node.md` | `agents/dev-backend.template.md` |
| Python | `templates/dev-backend-python.md` | `agents/dev-backend.template.md` |
| React / Next.js | `templates/dev-frontend-react.md` | `agents/dev-frontend.template.md` |
| Vue.js / Nuxt | `templates/dev-frontend-vue.md` | `agents/dev-frontend.template.md` |
| ESP32 | `templates/dev-firmware-esp32.md` | `agents/dev-firmware.template.md` |
| Plugin (toute plateforme) | `templates/dev-plugin.md` | `agents/dev-plugin.template.md` |
| Stack sans template (« Autre », mobile) | `templates/dev-generic.md` | `agents/dev-<categorie>.template.md` + compagnon obligatoire |

Instances multiples : une copie `dev-<categorie>-<suffixe>.template.md` par composant (frontmatter `name:` reecrit
au nom de l'instance), avec son compagnon (`## Perimetre`).

**Registre** : chaque copie d'agent (communs et `dev-*`) est inscrite dans `project-config.json` →
`agents.registry[]` (`name`, `source`, `tag`/`commit`, `sha256` de la source, `changed_in`, `role`/`paths` pour les
agents de stack, `pinned` optionnel pose a la main) et porte un en-tete de provenance juste apres son frontmatter :

```
<!-- template-source: templates/dev-firmware-esp32.md @ v4.0.0 (1a2b3c4) sha256:5d6e7f8a9b0c — copie generee par /init-project, ne pas editer : adapter dans le compagnon dev-firmware.md -->
```

Les contextes partages suivent le meme mecanisme dans `contexts.registry[]` (en-tete en premiere ligne). Chaque
init, synchronisation ou reinstallation se termine par le **tableau des teammates** : version deployee, etat
(`🟢 a jour`, `⚠ en retard → <cible>`, `📌 epingle (<cible> dispo)`), compagnon, et mode de spawn (colonne `Spawn`
de la table « Agents Disponibles » : `socle` → au `/start-session`, `milestone` → si dans la team du milestone,
`ponctuel` → a la demande du teamleader), suivi du tableau des contextes partages.

### 2bis. Agents generiques

Pour chaque instance de `agents.generic[]` : creation idempotente de la specification
`.claude/agents/generic.<nom>.md` (sections Role et perimetre, Entrees, Livrables, Outils et conventions,
Criteres de validation), remplie avec les reponses de l'Etape 5c, et ajout d'une ligne dans la table
`## Agents Disponibles` de `CLAUDE.md`.

### 2ter. Adequation modele/effort des agents

Une fois tous les agents connus, Claude confronte les reponses de l'init a la grille de
`agents/context/TEAMMATES_PROTOCOL.md` section 7.1 et affiche un **retour high level** (agents probablement sous-
ou sur-dimensionnes, avec suggestion et motif). S'il y a au moins une alerte : revoir agent par agent
(recommande), appliquer les suggestions, ou garder les defauts. Les choix sont ecrits dans le frontmatter
(`model:` / `effort:`) du compagnon ; un agent deja surcharge par le projet n'est jamais signale.

### 3. Workflow CI/CD

Le pipeline de release est **audite s'il existe, genere sinon**, selon le contrat
`TEMPLATE_claude/agents/infra.md` section 3bis (exigences C1 a C11) : script unique `commands.ci`, workflow de
pre-validation `ci-branch.yml` (push `milestone/*`) et workflow de release. Rien n'est ecrit ni modifie sans
validation de l'utilisateur ; `templates/workflows/release-go-react.yml` n'est qu'une reference.

### 3bis. Fichiers d'environnement

Un fichier par tache × environnement, `.claude/agents/environments/{publish,deploy}.<env>.template.md`, depuis
`TEMPLATE_claude/templates/environments/` selon `publish.mode` / `deploy.mechanism`, plus les `.env.example`
(noms de variables seulement) — voir « Build puis Publish puis Deploy » ci-dessous.

### 4. Placeholders et CLAUDE.md

Les placeholders `{VARIABLE}` (`{PROJECT_NAME}`, `{TEAM_NAME}`, `{BUILD_CMD}`, `{TEST_CMD}`, `{SRC_DIR}`,
`{VERSION_FILE}`...) des commandes et agents deployes sont remplaces depuis `project-config.json`, puis
`CLAUDE.md` est genere depuis `TEMPLATE_claude/CLAUDE_TEMPLATE.md` :

```markdown
| Parametre | Valeur |
|-----------|--------|
| Nom du projet | mon-projet |
| Backend | Go |
| Frontend | React + TypeScript |
| Base de donnees | PostgreSQL |
```

### 5. Commandes et agents déployés

Les fichiers sont déployés depuis `TEMPLATE_claude/` vers `.claude/` :

```
commands/feature.md → .claude/commands/feature.md        (invocable /feature)
agents/cdp.md       → .claude/agents/cdp.template.md     (immutable)
commands/context/COMMON.md → .claude/commands/context/COMMON.template.md (immutable)
mods/milestone-panel/ → .claude/skills/milestone-panel/  (mod Claude Code)
...
```

#### Convention template / projet

**Commandes** : déployées en `*.md`, directement invocables (`/feature`, `/bugfix`...).
Ne pas les éditer — elles sont écrasées à chaque sync, sans compagnon.

**Agents** : déployés en `*.template.md`, avec un fichier compagnon `*.md` optionnel :

```
.claude/agents/cdp.template.md   ← template (sync automatique, ne jamais éditer)
.claude/agents/cdp.md            ← adaptations projet (tracké git, jamais écrasé)
```

Claude lit les deux à chaque invocation. Pour adapter un agent, créer le fichier
`*.md` correspondant avec uniquement les règles spécifiques.

**Contextes partagés** (`context/COMMON.md`, `context/GITHUB.md`... référencés par les commandes
et les agents) : même convention que les agents — un compagnon optionnel par fichier, jamais
écrasé par la sync :

```
.claude/commands/context/COMMON.template.md   ← template (sync automatique, ne jamais éditer)
.claude/commands/context/COMMON.md            ← adaptations projet (tracké git, jamais écrasé)
```

Une référence "voir `context/COMMON.md`" dans une commande ou un agent désigne ce concept
logique — elle se résout en lisant `COMMON.template.md` puis `COMMON.md` compagnon s'il existe,
les règles projet primant en cas de conflit. Pour adapter une commande ou une règle partagée,
créer/éditer le compagnon `context/X.md` correspondant.

Les projets sans adaptation n'ont pas besoin de créer de fichier `*.md` (agents comme contextes).

### 6. Finalisation

- `.gitignore` : copie de `TEMPLATE_claude/gitignore-for-projects`, ou fusion non destructive s'il existe
  (seules les lignes template absentes sont ajoutees) ; site marketing : `MARKETING/` = worktree de `gh-pages`.
- Squelettes idempotents : `docs/mockup/INDEX.md` + `DECISIONS.md`, `tests/INDEX.md` + `tests/METRICS.md`,
  `.claude/memory/MEMORY.md`, `contracts/CHANGELOG.md` (jamais ecrases).
- Labels GitHub de phase (`PLANNING`, `PRET`, `EN COURS`, `EN REVIEW`, `EN QA`, `DONE`) si un remote existe.
- **Premier milestone `v0.1.0` et issues de base** — uniquement pour un projet vide, avec remote GitHub, sans
  milestone ni tag `v*` existant, et jamais en mise a jour : squelette du projet, pipeline CI/CD, publication et
  deploiement du premier environnement, README, puis une issue par cas d'usage v1 de `docs/CADRAGE.md` (workshop ou
  brief). Liste affichee et validee avant creation (milestone + issues, milestone seul, ou rien).
- `.claude/settings.json` : cree s'il est absent ; `model` / `effortLevel` y recoivent le modele et l'effort du
  teamleader (compagnon `teamleader.md` > `teamleader.template.md`, defaut `opus` / `medium`). `effortLevel`
  n'accepte pas `max` : la cle est alors retiree et il faut taper `/effort max` au lancement.

### 7. Audit du contexte et publication sur `main`

1. Commit de l'etat initial (`chore(claude): init-project`) — point de retour.
2. `/context-audit` complet : placeholders non remplaces, references cassees, incoherences
   `project-config.json` ↔ `CLAUDE.md` ↔ agents ; corrections commitees a part.
3. **Publication sans question** : sur `main` → push ; sur une autre branche (ex. milestone en cours) → seuls les
   commits de l'init sont reportes sur `main` par cherry-pick dans un worktree, la branche n'est jamais mergee.
   Jamais de `--force` ; un push refuse (protection de branche) ou un conflit est signale dans le message de fin.

## Reinitialisation et synchronisation

### Detection de version

| `project-config.json` | `TEMPLATE_claude/` | `template_version` | Diagnostic |
|-----------------------|--------------------|--------------------|------------|
| absent | absent | - | Nouveau projet → flux normal |
| present | present | - | Projet v3+ → Reinitialisation (menu ci-dessous) |
| present | absent | present | Fichiers template manquants (clone frais) → **Reinstallation** |
| present | absent | absent | Projet v1/v2 → **Migration v3** |

**Reinstallation** : propose de reinstaller exactement la version enregistree dans `template_version` (recommande —
chaque agent du registre restaure a sa version, epingles compris) ou de mettre a jour vers la derniere version.

### Menu

Avant le menu, le template est fetche silencieusement (sans rien deployer) et les changements sont calcules :

```
Ce projet est deja initialise (config du 2026-01-15).
Template GitHub : CCoupel/claude_project_template — <commit> (fetch a l'instant)

Changements disponibles :
  [+] feature, hotfix                   ← nouveaux
  [~] cdp       — <explication courte du changement>
  [!] old-command                       ← reliquat

a) Appliquer les mises a jour detectees (recommande si des changements sont listes)
b) Reconfigurer completement (ecrase project-config.json)
c) Re-analyser le code (detecter les changements de stack)
d) Annuler
```

Pour modifier un seul parametre sans tout reconfigurer (ajouter une instance d'agent generique, ajouter ou scinder
un agent de developpement, cadrer depuis un brief...), le preciser via « Autre » : seule l'etape concernee est
rejouee.

### Appliquer les mises a jour detectees

Etapes principales (detail : `init-project.md`, section "Option d") :

| Etape | Action |
|-------|--------|
| d0 | Registre des agents (cree s'il est absent) ; **migration v3 → v4** : ajout de `milestone.defaults`, colonne `Spawn` `permanent` reecrite en `socle` / `milestone` / `ponctuel` ; un milestone deja en cours sans cadrage est mene en `complet` |
| d1a-d1f | Site marketing (`gh-pages`), audit du pipeline CI/CD (C1-C11, `commands.ci`, `ci-branch.yml`), migrations legacy, fichiers d'environnement, graphe des fichiers de definition, validation des acces aux environnements |
| d2-d4 | Diff commandes / agents (par empreinte, via le registre) / contextes / table « Agents Disponibles », puis rapport et choix (tout appliquer, sans les reliquats, annuler) |
| d5-d5e | Deploiement, doublons et conflits dans les compagnons, table « Agents Disponibles », verification post-nettoyage |
| d6-d6b | Bloc `TEAMLEADER_PROTOCOL` de `CLAUDE.md`, adequation modele/effort, `settings.json`, memoire, `.gitignore` |
| d7-d7b | Labels GitHub, puis audit du contexte et publication sur `main` (comme a l'init) |
| d8 | Rapport final + tableau des teammates |

Les agents (communs et `dev-*`) ne sont redeployes que si leur source a change (hors epingles) ; les autres sont
re-tamponnes a la version synchronisee. Le milestone `v0.1.0` n'est jamais cree en mise a jour.

### Analyse des compagnons (doublons et conflits)

| Signal | Signification |
|--------|---------------|
| `[↓]` DERIVE-TEMPLATE | Le template couvre maintenant votre customisation → simplification possible |
| `[~]` MIXTE | Une partie de votre `.md` est couverte par le template, une autre reste propre au projet → retirer seulement la partie redondante |
| `[=]` IDENTIQUE | Le `.md` duplique le template sans rien ajouter → peut etre supprime |
| `[*]` PROPRE | Contenu projet uniquement, rien a retirer |
| `[X]` CONFLIT | Compagnon et template se contredisent sur le meme sujet → arbitrage utilisateur |

La détection opère règle par règle, pas seulement fichier par fichier : dès qu'une
règle du compagnon se retrouve (littéralement ou en substance) dans le template mis
à jour, elle peut être retirée du compagnon — même si le reste du fichier reste propre.

Cette analyse est silencieuse si aucun fichier compagnon `*.md` n'existe ou si tout est propre.

## Comportements intrinsèques

Ces comportements sont natifs au template — aucune configuration requise.

### Build (compilation) puis Publish (mise à disposition) puis Deploy (installation)

`/build` construit l'artefact candidat une seule fois, agnostique à l'environnement. `/publish
<env>` le rend ensuite disponible pour un environnement donné, selon le mécanisme qui lui est
propre (déclaré dans `infrastructure.environments[]`, voir `project-config.json`) — principe
BORE, deux mécanismes valides : **promotion** (réutilise l'artefact tel quel, zéro rebuild —
défaut QUALIF) ou **rebuild déterministe** (reconstruit depuis la même source figée via
l'unique pipeline CI — défaut PROD). `/deploy <env>` installe enfin cet artefact déjà publié,
sans jamais builder ni publier :

```
/build        : verification → increment version (a) → compilation → candidat local

/publish qualif : verification candidat → copie/push tel quel (promote, zero rebuild)

/publish prod : merge → tag officiel → declenche le rebuild deterministe via CI (gh run watch)
                        ↓
              succès : artefact publié, disponible pour /deploy prod
              échec  :
                ├── lire logs → classifier (CODE / FLAKY / CONFIG / INFRA)
                └── rapport au teamleader → il route vers l'agent responsable (dev/qa/infra)

/deploy prod  : installe l'artefact publié par /publish prod → vérifie le rollout
                        ↓
              succès : notes de release + clôture du milestone proposée
              échec  : rollback infra (rollout undo) → rapport au teamleader
```

Le deployer ne corrige jamais lui-même — il remonte les faits, le teamleader décide du routing.

La mécanique concrète (commandes exactes) de PUBLISH et DEPLOY ne vit plus dans l'agent
`deploy.md` — elle est générée à l'init, un fichier par tâche × environnement, dans
`.claude/agents/environments/{publish,deploy}.<env>.template.md`, à partir de
`TEMPLATE_claude/templates/environments/` selon le mécanisme choisi pour chaque environnement
(`infrastructure.environments[].publish.mode` / `.deploy.mechanism`). `<env>` est le nom de
l'environnement normalisé (minuscules, espaces/underscores → tirets).

Variables/secrets : deux niveaux (`.env` racine, global ; `.claude/agents/environments/<env>.env`,
spécifique — jamais commités). `/init-project` génère un `.env.example` par niveau (noms de
variables attendus selon le mécanisme, valeurs vides), enrichi d'une détection best-effort des
noms déjà référencés dans les fichiers existants du projet (`docker-compose*.yml`, workflows
CI) — jamais de valeur lue ni copiée, juste des noms à vérifier manuellement.

### Séparation template / adaptations projet

**Commandes** (`*.md`) : directement invocables, gérées par sync, ne pas éditer, sans compagnon.

**Agents** : pattern template + compagnon projet optionnel :

```
.claude/agents/cdp.template.md   ← géré par sync, jamais édité
.claude/agents/cdp.md            ← adaptations projet, tracké git
```

**Contextes partagés** (`context/COMMON.md`, `context/GITHUB.md`...) : même pattern que les agents :

```
.claude/commands/context/COMMON.template.md   ← géré par sync, jamais édité
.claude/commands/context/COMMON.md            ← adaptations projet, tracké git
```

Claude lit les deux automatiquement (template puis compagnon s'il existe). À chaque sync,
une analyse détecte, règle par règle, sur les agents ET les contextes partagés :
- Le template qui a rattrapé une règle projet (`[↓]` simplification possible — la règle
  peut être retirée du compagnon puisqu'elle est désormais couverte par le template)
- Un compagnon qui mélange les deux (`[~]` MIXTE — ne retirer que la part redondante)
- Une règle du compagnon qui contredit le template (`[X]` CONFLIT — arbitrage utilisateur)

## Message de fin

```
Projet "mon-projet" initialise avec succes !

Configuration :
- Backend      : Go
- Frontend     : React + TypeScript
- Database     : PostgreSQL
- CI/CD        : GitHub Actions
- Environnements : QUALIF -> PROD

Teamleader : opus / medium ecrits dans .claude/settings.json
Modeles/efforts : defauts adaptes au projet
Audit contexte (/context-audit) : N ecarts corriges, N arbitres, N laisses
Publication : pousse sur origin/main
Milestone v0.1.0 : N issues de base — https://github.com/<org>/<repo>/milestone/<numero>

Prochaine etape : /start-session, puis /feature #<n> sur la premiere issue du milestone v0.1.0
```

Suivi du tableau des teammates (registre des agents) et du tableau des contextes partages.
