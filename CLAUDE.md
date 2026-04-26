# CLAUDE.md — claude_project_template

Ce repo EST le template de gestion de projet pour Claude Code.
Il se développe lui-même avec les mêmes pratiques qu'il préconise.

---

## Contexte Projet

| Paramètre | Valeur |
|-----------|--------|
| Repo | `CCoupel/claude_project_template` |
| Branche principale | `main` |
| Pas de backend / frontend / base de données | — |
| Versionnement | SemVer, tags `vX.Y.Z` |

---

## Architecture

### Ce repo contient deux choses distinctes

**1. Le projet lui-même** (tracké dans git, développé ici)

```
README.md                    # Documentation utilisateur
CLAUDE.md                    # Ce fichier
init-project.md              # Bootstrapper un projet (téléchargé par le launcher)
claude-launcher.sh           # Launcher tmux — point d'entrée utilisateur
.claude/
├── memory/                  # Mémoire des sessions de développement
└── settings.local.json      # Config Claude Code locale
```

**2. Les composants du template** (livrés aux projets cibles via fetch GitHub)

```
TEMPLATE_claude/             # Racine de tous les composants template
├── INITIALIZATION.md        # Documentation du processus d'init
├── CLAUDE_TEMPLATE.md       # Template de CLAUDE.md pour les projets cibles
├── .template-source.json    # Référence GitHub pour le fetch
├── commands/                # Commandes slash (/.feature, /bugfix, /deploy...)
│   └── context/             # Contextes partagés (COMMON.md, GITHUB.md...)
├── agents/                  # Agents spécialisés (cdp, qa, deploy, marketing...)
│   └── context/             # Contextes partagés agents
└── templates/               # Templates par stack technique
    ├── dev-backend-go.md
    ├── dev-backend-node.md
    ├── dev-backend-python.md
    ├── dev-frontend-react.md
    ├── dev-frontend-vue.md
    ├── dev-firmware-esp32.md
    └── workflows/
        └── release-go-react.yml
```

### Comment un projet cible consomme ce template

```
claude-launcher.sh           # Téléchargé une fois par l'utilisateur
    ↓ ouverture d'un projet
Projet cible
├── .claude/commands/
│   └── init-project.md      # Téléchargé automatiquement par le launcher
│       ↓ /init-project
├── TEMPLATE_claude/         # Fetché depuis GitHub — gitignored
└── .claude/
    ├── commands/            # Générés depuis TEMPLATE_claude/commands/
    ├── agents/dev-*.md      # Générés selon la stack — trackés
    ├── CLAUDE.md            # Généré depuis TEMPLATE_claude/CLAUDE_TEMPLATE.md
    ├── project-config.json  # Créé par /init-project
    └── memory/
```

---

## Conventions de développement

### Modifier une commande ou un agent

Les fichiers dans `TEMPLATE_claude/commands/` et `TEMPLATE_claude/agents/` sont des templates.
Les fichiers dans ces dossiers sont des templates (placeholders `{VARIABLE}` remplacés à l'init).
Ils sont copiés tels quels dans `.claude/` — le dossier `TEMPLATE_claude/` suffit à les identifier comme templates.

### Ajouter un template de stack

1. Créer `TEMPLATE_claude/templates/dev-backend-rust.md` (suivre le format existant)
2. Référencer dans `TEMPLATE_claude/commands/init-project.md` section "Génération des agents"

### Ajouter un template de workflow CI/CD

1. Créer `TEMPLATE_claude/templates/workflows/release-node-react.yml`
2. Référencer dans `TEMPLATE_claude/commands/init-project.md` section "Génerer le Workflow CI/CD"

### Placeholders dans les templates

| Placeholder | Remplacé par |
|-------------|-------------|
| `{PROJECT_NAME}` | Nom du projet cible |
| `{BACKEND_TECH}` | Stack backend (Go, Node.js...) |
| `{FRONTEND_TECH}` | Stack frontend (React, Vue...) |
| `{DATABASE}` | Base de données |
| `{BUILD_CMD}` | Commande de build |
| `{TEST_CMD}` | Commande de test |
| `{VERSION_FILE}` | Fichier de version |
| `{SRC_DIR}` | Répertoire source |

### Commits

Format conventionnel : `type(scope): message`

Types : `feat`, `fix`, `docs`, `refactor`, `chore`
Scopes courants : `commands`, `agents`, `templates`, `init-project`, `ci`, `readme`

### Versions et releases

- **minor** (Y) : nouvelle commande, nouvel agent, nouveau template de stack
- **patch** (Z) : correction, amélioration d'un template existant
- **major** (X) : changement d'architecture (ex: v1→v2 = introduction de TEMPLATE_claude/)

Pour publier une release, pousser un tag SemVer sur main :

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

La CI (`.github/workflows/release.yml`) se déclenche automatiquement et :
1. Patche `SCRIPT_VERSION` dans `claude-launcher.sh` avec le tag exact (sans commit)
2. Publie la GitHub Release avec le launcher pré-patché en asset

L'asset est disponible à :
`https://github.com/CCoupel/claude_project_template/releases/download/vX.Y.Z/claude-launcher.sh`

Ne jamais modifier `SCRIPT_VERSION` à la main — c'est la CI qui le gère.

---

## Ce qu'il ne faut PAS faire

- Ne pas mettre de fichiers spécifiques à un projet dans `TEMPLATE_claude/` (pas de noms de projets, pas d'URLs hardcodées sauf `CCoupel/claude_project_template`)
- Ne pas ajouter d'autres workflows dans `.github/workflows/` — seul `release.yml` existe (gestion des releases du launcher) ; les workflows CI/CD pour les projets cibles sont dans `TEMPLATE_claude/templates/workflows/`
- Ne pas éditer `CLAUDE_TEMPLATE.md` comme si c'était le `CLAUDE.md` de ce repo (c'est le modèle pour les projets cibles)

---

## Tester les modifications

Pour valider un changement sur `TEMPLATE_claude/`, tester sur un projet cible vide :

```bash
mkdir /tmp/test-project && cd /tmp/test-project && git init
mkdir -p .claude/commands
cp <path>/init-project.md .claude/commands/
# Ouvrir dans Claude Code et lancer /init-project
```

---

## Mémoire de session

`.claude/memory/MEMORY.md` — lire en début de session pour le contexte des travaux en cours.
