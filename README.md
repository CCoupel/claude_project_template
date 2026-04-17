# Claude Code Project Template

Template de gestion de projet pour Claude Code.
Fournit un ensemble de commandes, agents et contextes partagés pour orchestrer
le développement, la qualité, le déploiement et la communication de release.

---

## Installation — Un seul fichier

```bash
mkdir -p <mon-projet>/.claude/commands

curl -o <mon-projet>/.claude/commands/init-project.md \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/init-project.md
```

Ouvrir le projet dans Claude Code et lancer `/init-project`.

`/init-project` fetche automatiquement `TEMPLATE_claude/` depuis GitHub,
détecte la stack et génère la configuration complète.

---

## Architecture

```
Repo template (ce repo)          Projet cible après /init-project
─────────────────────────        ──────────────────────────────────
README.md                        README.md  (projet)
init-project.md          ──┐
CLAUDE.md                  │     .claude/
TEMPLATE_claude/           │     ├── commands/         ← copié depuis TEMPLATE_claude/
├── commands/              │     ├── agents/
│   └── context/           │     │   ├── *.template.md ← copié depuis TEMPLATE_claude/
├── agents/                │     │   ├── context/      ← copié depuis TEMPLATE_claude/
│   └── context/           │     │   └── dev-*.md      ← généré (tracké git)
├── templates/             └──►  ├── CLAUDE.md         ← généré (tracké git)
│   └── workflows/               ├── project-config.json ← généré (tracké git)
├── INITIALIZATION.md            └── memory/           ← tracké git
├── CLAUDE_TEMPLATE.md
└── .template-source.json        TEMPLATE_claude/      ← gitignore (fetché depuis GitHub)
                                 .gitignore            ← généré par /init-project
```

### Règle simple

| Dossier | Dans le projet cible | Dans git |
|---------|----------------------|----------|
| `TEMPLATE_claude/` | Source template | Non (gitignore) |
| `.claude/commands/` | Commandes slash | Non (gitignore, sauf `init-project.md`) |
| `.claude/agents/*.template.md` | Agents génériques | Non (gitignore) |
| `.claude/agents/dev-*.md` | Agents projet | Oui |
| `.claude/CLAUDE.md`, `project-config.json`, `memory/` | Config projet | Oui |

---

## Structure du repo template

```
README.md                        # Documentation utilisateur (ce fichier)
init-project.md                  # Seul fichier à copier pour bootstrapper
CLAUDE.md                        # Guide de contribution au template lui-même

TEMPLATE_claude/                 # Tous les composants livrés aux projets cibles
├── INITIALIZATION.md            # Documentation détaillée du processus d'init
├── CLAUDE_TEMPLATE.md           # Modèle de CLAUDE.md pour les projets cibles
├── .template-source.json        # Référence GitHub (repo + commit du dernier fetch)
├── gitignore-for-projects       # Copié en .gitignore par /init-project
│
├── commands/                    # Commandes slash
│   ├── start-session.md
│   ├── end-session.md
│   ├── feature.template.md
│   ├── bugfix.template.md
│   ├── hotfix.template.md
│   ├── refactor.template.md
│   ├── review.template.md
│   ├── qa.template.md
│   ├── secu.md
│   ├── deploy.template.md
│   ├── backlog.md
│   ├── milestone.md
│   ├── progression.md
│   ├── marketing.template.md
│   └── context/
│       ├── COMMON.md
│       ├── CDP_WORKFLOWS.md
│       ├── DEVELOPMENT.md
│       ├── QUALITY.md
│       └── GITHUB.md
│
├── agents/                      # Agents spécialisés
│   ├── cdp.template.md
│   ├── implementation-planner.template.md
│   ├── code-reviewer.template.md
│   ├── qa.template.md
│   ├── security.template.md
│   ├── doc-updater.template.md
│   ├── deploy.template.md
│   ├── infra.template.md
│   ├── pr-reviewer.template.md
│   ├── marketing-release.template.md
│   └── context/
│       ├── COMMON.md
│       ├── DEV_COMMON.md
│       ├── TEAMMATES_PROTOCOL.md
│       ├── VALIDATION_COMMON.md
│       └── GITHUB.md
│
└── templates/                   # Templates par stack technique
    ├── dev-backend-go.md
    ├── dev-backend-node.md
    ├── dev-backend-python.md
    ├── dev-frontend-react.md
    ├── dev-frontend-vue.md
    ├── dev-firmware-esp32.md
    └── workflows/
        └── release-go-react.yml
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
| `/feature <desc>` | Nouvelle fonctionnalité (PLAN→DEV→REVIEW→QA→DOC→DEPLOY) |
| `/bugfix <desc>` | Correction de bug |
| `/hotfix <desc>` | Correctif urgent production |
| `/refactor <desc>` | Refactoring sans changement fonctionnel |

### Backlog et Milestones

| Commande | Description |
|----------|-------------|
| `/backlog` | Lister les issues GitHub ouvertes |
| `/backlog <desc>` | Rechercher une issue et lancer le workflow adapté |
| `/milestone new <version> [date]` | Créer un milestone et associer des issues |
| `/milestone status` | Progression du milestone actif (barre %) |
| `/milestone close [version]` | Clôturer avec gestion des issues non terminées |

### Suivi d'équipe

| Commande | Description |
|----------|-------------|
| `/progression` | Tableau de bord temps réel — statut de chaque agent actif (`✅ Terminé`, `🔄 En cours`, `⏳ Attente dépendance`, `💬 Attente teammate`, `👤 Attente validation`, `🔴 Bloqué`) |

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
/backlog #42                         Travailler une issue
        ↓
/feature "#42 - Auth OAuth"          Workflow complet
        ↓
/deploy prod                         CI/CD → proposition de clôture du milestone
        ↓
/marketing v1.2.0                    Release notes depuis le milestone clos
```

---

## Migration depuis v1 ou v2

Les projets créés avec une architecture antérieure sont détectés automatiquement :

```bash
# Copier init-project.md dans le projet existant
curl -o <projet>/.claude/commands/init-project.md \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/init-project.md

# Dans Claude Code :
/init-project
# → "Projet v1/v2 détecté — migration v3 requise"
# → Fetch TEMPLATE_claude/ + .gitignore + nettoyage git + commit automatique
```

---

## Synchronisation du template

Pour récupérer les nouvelles fonctionnalités du template dans un projet existant :

```
/init-project → d) Synchroniser le template depuis GitHub
```

Fetche la dernière version de `TEMPLATE_claude/` et redéploie dans `.claude/`
sans toucher aux fichiers projet.

---

## Personnalisation

### Forker ce template

Mettre à jour `TEMPLATE_claude/.template-source.json` dans votre fork :

```json
{
  "repo": "votre-org/votre-fork",
  "branch": "main"
}
```

### Ajouter un template de stack

1. Créer `TEMPLATE_claude/templates/dev-backend-rust.md`
2. Référencer dans `init-project.md` section "Agents dev-*"

### Ajouter un template de workflow CI/CD

1. Créer `TEMPLATE_claude/templates/workflows/release-node-react.yml`
2. Référencer dans `init-project.md` section "Workflow CI/CD"
