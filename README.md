# Claude Code Project Template

Template de gestion de projet pour Claude Code.
Fournit un ensemble de commandes, agents et contextes partagés pour orchestrer
le développement, la qualité, le déploiement et la communication de release.

---

## Installation

### Option A — Launcher tmux (recommandé)

```bash
curl -fsSL \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/claude-launcher.sh \
  -o ~/claude-launcher.sh && chmod +x ~/claude-launcher.sh
```

Au premier lancement, le launcher crée `~/.config/claude-launcher.conf` :

```bash
~/claude-launcher.sh --configure   # édite la config (GITHUB_DIR, token…)
~/claude-launcher.sh               # démarre le hub tmux
```

**Variables disponibles dans la config :**

| Variable | Rôle |
|----------|------|
| `GITHUB_DIR` | Répertoire contenant vos projets |
| `GITHUB_TOKEN` | Token GitHub (gh CLI + MCP) |
| `CLAUDE_DISABLE_MOUSE` | `1` = désactive la souris |
| `CLAUDE_EXPERIMENTAL_TEAMS` | `1` = active les agent teams |
| `CLAUDE_OPTIONS` | Options passées à `claude` |
| `EXTRA_ENVS` | Variables d'environnement supplémentaires |

`EXTRA_ENVS` permet de passer n'importe quelle variable d'env à Claude Code (clés d'API tierces, URLs…) :

```bash
EXTRA_ENVS=(
  "ANTHROPIC_API_KEY=sk-ant-..."
  "MY_API_URL=https://api.example.com"
)
```

**Comportements automatiques à l'ouverture d'un projet :**
- Le launcher vérifie le dernier tag GitHub et se met à jour silencieusement si une nouvelle version est disponible
- `init-project.md` est rafraîchi depuis GitHub à chaque ouverture de projet
- Si GitHub est inaccessible et que le fichier existait déjà, l'ancienne version est conservée

Lancer ensuite `/init-project` dans Claude Code.

**Mettre à jour le launcher :**
```bash
~/claude-launcher.sh --update      # remplace le script, préserve la config
```

### Option B — Fichier seul

```bash
mkdir -p <mon-projet>/.claude/commands

curl -fsSL \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/init-project.md \
  -o <mon-projet>/.claude/commands/init-project.md
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
│   └── context/           │     │   ├── *.md          ← copié depuis TEMPLATE_claude/
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
| `.claude/agents/*.md` | Agents génériques | Non (gitignore) |
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
│   ├── feature.md
│   ├── bugfix.md
│   ├── hotfix.md
│   ├── refactor.md
│   ├── review.md
│   ├── qa.md
│   ├── secu.md
│   ├── deploy.md
│   ├── backlog.md
│   ├── milestone.md
│   ├── progression.md
│   ├── marketing.md
│   └── context/
│       ├── COMMON.md
│       ├── CDP_WORKFLOWS.md
│       ├── DEVELOPMENT.md
│       ├── QUALITY.md
│       └── GITHUB.md
│
├── agents/                      # Agents spécialisés
│   ├── cdp.md                   # Chef De Projet — orchestrateur
│   ├── implementation-planner.md
│   ├── test-writer.md
│   ├── code-reviewer.md
│   ├── qa.md
│   ├── security.md
│   ├── doc-updater.md
│   ├── deploy.md
│   ├── infra.md
│   ├── pr-reviewer.md
│   ├── marketing-release.md
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

## Orchestration multi-agents

Les workflows sont orchestrés par le **CDP (Chef De Projet)**, seul interlocuteur entre
l'utilisateur et l'équipe technique. Le CDP dispatche via `SendMessage` vers les agents
spécialisés, valide leurs livrables et reporte la progression.

### Agents disponibles

| Agent | Rôle |
|-------|------|
| `cdp` | Orchestrateur — coordonne, dispatche, reporte |
| `planner` | Plan d'implémentation + contrats API (contract-first) |
| `dev-backend` | Développement backend (stack détectée) |
| `dev-frontend` | Développement frontend (stack détectée) |
| `dev-firmware` | Développement firmware (si configuré) |
| `test-writer` | Scripts de tests automatisés + procédures manuelles QA |
| `code-reviewer` | Revue de code (qualité, sécurité OWASP, performance) |
| `qa` | Exécution des tests et validation (unit/integration/E2E/perf) |
| `infra` | Validation des procédures de déploiement + infra Docker/Helm/CI |
| `deployer` | Déploiement QUALIF et PROD |
| `doc-updater` | Mise à jour CHANGELOG, README, documentation technique |
| `security` | Audit de sécurité (SAST, dépendances, secrets) |
| `pr-reviewer` | Validation des Pull Requests externes |
| `marketing` | Communication de release depuis les données GitHub |

### Principes de communication

- **Livrable = fichier** : chaque agent écrit son résultat dans un fichier, le message ne contient que la référence
  - Agents d'analyse → `.claude/reports/[agent]-[timestamp].md`
  - Agents de code → SHA du commit
- **Handoff** : chaque agent écrit `.claude/handoff/[agent]-[timestamp].md` avant son DONE — le CDP le transmet au suivant
- **Validation CDP** : à réception de chaque DONE, le CDP lit le fichier livrable et vérifie la conformité avant de continuer
- **État persistant** : `.claude/workflow-state.json` mis à jour à chaque transition de phase — source de vérité pour `status`/`resume`/`skip`

---

## Workflows

### Feature — workflow complet

```
[GATE 1] Confirmation démarrage
    ↓
PLAN ──────────────────────── contrats API + contracts/CHANGELOG.md
    ↓
[GATE 2] Validation plan (+ alerte breaking changes si détectés)
    ↓
DEV ───────────────────────── backend et/ou frontend
    ↓  (si parallèle → merge conflicts résolus par dev-backend)
    ↓  [GATE 2b] escalade si conflits non résolvables
    ├──────────────────┐
  REVIEW           TEST-WRITER ── scripts (unit/integration/E2E/perf) + procédures QA
    └──────────────────┘
    ↓  (attente des deux)
QA ────────────────────────── exécute scripts + suit procédures manuelles
    ↓
DOC ───────────────────────── CHANGELOG + documentation technique
    ↓
INFRA validation QUALIF ────── cohérence procédure/infrastructure
    ↓  [GATE 4b] escalade si écart détecté
DEPLOY QUALIF
    ↓
[GATE 4] Validation manuelle ── CDP présente les scénarios à tester (depuis procédures test-writer)
    ↓  /deploy prod
INFRA validation PROD
    ↓  [GATE 4c] escalade si écart détecté
DEPLOY PROD
```

**Points de validation utilisateur (GATES) :**

| Gate | Moment | Action requise |
|------|--------|----------------|
| 1 | Après analyse | Confirmer le démarrage |
| 2 | Après plan | Valider le plan et les contrats API |
| 2b | Conflits merge non résolvables | Résoudre manuellement |
| 3 | 3 cycles DEV atteints | Continuer ou abandonner |
| 4 | QUALIF prête | `/deploy prod` explicite |
| 4b | Procédure QUALIF incohérente | Corriger avant deploy |
| 4c | Procédure PROD incohérente | Corriger avant deploy |

**Cycles de correction** (max 3 avant escalade) :
- REVIEW refuse → DEV corrige → REVIEW + TEST-WRITER relancés en parallèle
- QA échoue → DEV corrige → REVIEW + TEST-WRITER relancés en parallèle

### Bugfix

```
ANALYSE ── cause racine
    ↓
DEV ── fix minimal et ciblé
    ├──────────────────┐
  REVIEW           TEST-WRITER ── test de régression (reproduit le bug, valide le fix)
    └──────────────────┘
    ↓
QA ── exécute les tests + procédure manuelle
    ↓
DOC ── CHANGELOG (Fixed)
    ↓
DEPLOY QUALIF → /deploy prod
```

### Hotfix (urgence production)

```
DEV ── fix minimal uniquement
    ↓
REVIEW rapide
    ↓
DEPLOY PROD direct
    ↓
DOC ── post-mortem
```

### Refactor

```
QA (avant) ── capture l'état actuel des tests
    ↓
DEV ── refactoring (comportement identique obligatoire)
    ├──────────────────┐
  REVIEW           TEST-WRITER
    └──────────────────┘
    ↓
QA (après) ── vérifie la non-régression
    ↓
DEPLOY QUALIF
```

### Contrats API (contract-first)

Pour toute feature impliquant une API, le planner crée les contrats **avant** le développement :

```
contracts/
├── http-endpoints.md       # Endpoints REST
├── websocket-actions.md    # Messages WebSocket
├── models.md               # Modèles de données
└── CHANGELOG.md            # Historique BREAKING/NEW/CHANGED
```

Le frontend consulte les contrats sans les modifier. Le CDP alerte l'utilisateur en GATE 2 si des changements **BREAKING** sont détectés.

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
| `/feature <desc>` | Nouvelle fonctionnalité — workflow complet avec PLAN, DEV parallèle, tests, deploy |
| `/bugfix <desc>` | Correction de bug avec test de régression obligatoire |
| `/hotfix <desc>` | Correctif urgent production — deploy direct sans attendre QUALIF |
| `/refactor <desc>` | Refactoring sans changement fonctionnel — QA avant et après |

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
| `/progression` | Tableau de bord temps réel — statut de chaque agent actif |

### Validation

| Commande | Description |
|----------|-------------|
| `/review` | Revue de code directe (sans passer par /feature) |
| `/qa` | Tests et validation qualité directs |
| `/secu` | Audit de sécurité complet (SAST, OWASP, dépendances, secrets) |

### Déploiement et Communication

| Commande | Description |
|----------|-------------|
| `/deploy qualif` | Déploiement en qualification (avec validation infra préalable) |
| `/deploy prod` | Déploiement en production (gate explicite requis) |
| `/marketing [version]` | Release notes depuis milestone + CHANGELOG GitHub |

---

## Flux de travail type

```
/milestone new v1.2.0 2026-06-01    Créer le milestone + associer les issues
        ↓
/start-session                       Voir la progression du milestone
        ↓
/backlog #42                         Travailler une issue
        ↓
/feature "#42 - Auth OAuth"          Workflow complet multi-agents
        ↓
/deploy prod                         CI/CD → proposition de clôture du milestone
        ↓
/marketing v1.2.0                    Release notes depuis le milestone clos
```

---

## Migration depuis v1 ou v2

Les projets créés avec une architecture antérieure sont détectés automatiquement.

**Avec le launcher** : ouvrir le projet depuis le menu — `init-project.md` est bootstrappé automatiquement, puis `/init-project` détecte et migre.

**Sans le launcher** :
```bash
curl -fsSL \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/init-project.md \
  -o <projet>/.claude/commands/init-project.md

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
