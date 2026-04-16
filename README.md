# Claude Code Project Template

Template de gestion de projet pour Claude Code.
Fournit un ensemble de commandes, agents et contextes partagés pour orchestrer
le développement, la qualité, le déploiement et la communication de release.

---

## Installation — Un seul fichier

```bash
mkdir -p <mon-projet>/.claude/commands

# Telecharger init-project.md depuis GitHub
curl -o <mon-projet>/.claude/commands/init-project.md \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/.claude/commands/init-project.md

# Ouvrir le projet dans Claude Code et lancer :
/init-project
```

`/init-project` fetche automatiquement tous les fichiers du template depuis GitHub,
détecte la stack et génère la configuration du projet.

---

## Architecture : TEMPLATE vs PROJET

Les fichiers `.claude/` sont séparés en deux catégories :

| Catégorie | Fichiers | Comportement |
|-----------|----------|--------------|
| **TEMPLATE** | `commands/`, `agents/*.template.md`, `agents/context/`, `templates/` | Fetchés depuis GitHub, gitignorés, jamais édités manuellement |
| **PROJET** | `CLAUDE.md`, `project-config.json`, `memory/`, `agents/dev-*.md`, `settings.json` | Trackés dans git, jamais écrasés par une sync |

Le fichier `.claude/.template-source.json` enregistre la source et le dernier commit fetché.
Le fichier `.claude/.gitignore` (créé par `/init-project`) exclut les fichiers TEMPLATE du repo projet.

---

## Structure

```
.claude/
├── INITIALIZATION.md                # Guide d'initialisation détaillé
├── CLAUDE_TEMPLATE.md               # Template CLAUDE.md à copier à la racine
├── .template-source.json            # Source GitHub + commit du dernier fetch
├── gitignore-for-projects           # Copié en .gitignore par /init-project
│
├── commands/                        # TEMPLATE — Commandes slash
│   ├── init-project.md              # Bootstrap et synchronisation
│   ├── start-session.md             # Démarrage de session + milestone actif
│   ├── end-session.md               # Clôture de session
│   ├── feature.template.md          # Nouvelle fonctionnalité
│   ├── bugfix.template.md           # Correction de bug
│   ├── hotfix.template.md           # Correctif urgent production
│   ├── refactor.template.md         # Refactoring
│   ├── review.template.md           # Revue de code
│   ├── qa.template.md               # Tests et validation
│   ├── secu.md                      # Audit de sécurité
│   ├── deploy.template.md           # Déploiement qualif / prod
│   ├── backlog.md                   # Gestion du backlog GitHub Issues
│   ├── milestone.md                 # Gestion des milestones GitHub
│   ├── marketing.template.md        # Mise à jour site marketing
│   └── context/                     # Contextes partagés commandes
│       ├── COMMON.md
│       ├── CDP_WORKFLOWS.md
│       ├── DEVELOPMENT.md
│       ├── QUALITY.md
│       └── GITHUB.md                # Patterns gh CLI centralisés
│
├── agents/                          # Agents spécialisés
│   ├── cdp.template.md              # TEMPLATE — Chef de projet / orchestrateur
│   ├── implementation-planner.template.md
│   ├── code-reviewer.template.md
│   ├── qa.template.md
│   ├── security.template.md
│   ├── doc-updater.template.md
│   ├── deploy.template.md
│   ├── infra.template.md
│   ├── pr-reviewer.template.md
│   ├── marketing-release.template.md
│   ├── dev-backend.md               # PROJET — généré selon la stack
│   ├── dev-frontend.md              # PROJET — généré selon la stack
│   └── context/                     # TEMPLATE — Contextes partagés agents
│       ├── COMMON.md
│       ├── DEV_COMMON.md
│       ├── TEAMMATES_PROTOCOL.md
│       ├── VALIDATION_COMMON.md
│       └── GITHUB.md
│
└── templates/                       # TEMPLATE — Templates par technologie
    ├── dev-backend-go.md
    ├── dev-backend-node.md
    ├── dev-backend-python.md
    ├── dev-frontend-react.md
    ├── dev-frontend-vue.md
    ├── dev-firmware-esp32.md
    └── workflows/
        └── release-go-react.yml     # Template CI/CD Go + React
```

---

## Commandes disponibles

### Session

| Commande | Description |
|----------|-------------|
| `/start-session` | Démarre la session, lit la mémoire projet, affiche le milestone actif |
| `/end-session` | Clôture la session, met à jour la mémoire |
| `/init-project` | Bootstrap, réinitialisation ou synchronisation du template |

### Développement

| Commande | Description |
|----------|-------------|
| `/feature <desc>` | Nouvelle fonctionnalité (workflow PLAN→DEV→REVIEW→QA→DOC→DEPLOY) |
| `/bugfix <desc>` | Correction de bug |
| `/hotfix <desc>` | Correctif urgent production |
| `/refactor <desc>` | Refactoring sans changement fonctionnel |

### Backlog et Milestones

| Commande | Description |
|----------|-------------|
| `/backlog` | Lister les issues GitHub ouvertes (avec colonne milestone) |
| `/backlog <desc>` | Rechercher une issue et lancer le workflow adapté |
| `/milestone new <version> [date]` | Créer un milestone et associer des issues |
| `/milestone status` | Progression du milestone actif (barre %, issues restantes) |
| `/milestone close [version]` | Clôturer avec gestion des issues non terminées |

### Validation

| Commande | Description |
|----------|-------------|
| `/review` | Revue de code |
| `/qa` | Tests et validation qualité |
| `/secu` | Audit de sécurité |

### Déploiement et Communication

| Commande | Description |
|----------|-------------|
| `/deploy qualif` | Déploiement en qualification |
| `/deploy prod` | Déploiement en production (+ clôture milestone automatique) |
| `/marketing [version]` | Mise à jour site gh-pages depuis milestone + CHANGELOG |

---

## Flux de travail type

```
/milestone new v1.2.0 2026-06-01    Créer le milestone + associer les issues
        ↓
/start-session                       Voir la progression du milestone
        ↓
/backlog #42                         Travailler une issue (auto-assignée au milestone)
        ↓
/feature "#42 - Auth OAuth"          Workflow complet
        ↓
/deploy prod                         CI/CD → proposition de clôture du milestone
        ↓
/marketing v1.2.0                    Release notes depuis le milestone clos
```

---

## Migration depuis v1

Les projets créés avant la v2 (tous les fichiers `.claude/` trackés dans git)
sont détectés automatiquement :

```bash
# Copier init-project.md dans le projet v1
cp init-project.md <projet-v1>/.claude/commands/

# Dans Claude Code :
/init-project
# → "Projet v1 détecté — migration v2 requise"
# → Fetch GitHub + .gitignore + git rm --cached + commit automatique
```

---

## Synchronisation du template

Pour récupérer les nouvelles fonctionnalités du template dans un projet existant :

```
/init-project → d) Synchroniser le template depuis GitHub
```

Fetche la dernière version depuis `CCoupel/claude_project_template` et met à jour
les fichiers TEMPLATE sans toucher aux fichiers PROJET.

---

## Personnalisation

### Modifier l'URL source du template

Si vous forkez ce template, mettre à jour `.claude/.template-source.json` :

```json
{
  "repo": "votre-org/votre-fork",
  "branch": "main"
}
```

### Ajouter un template de stack

1. Créer `templates/dev-backend-rust.md` (suivre le format existant)
2. Mettre à jour la liste dans `commands/init-project.md`

### Ajouter un template de workflow CI/CD

1. Créer `templates/workflows/release-node-react.yml`
2. Référencer dans la section "Generer le Workflow CI/CD" de `init-project.md`
