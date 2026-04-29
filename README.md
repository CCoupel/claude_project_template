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
TEMPLATE_claude/           │     ├── commands/
├── commands/              │     │   ├── *.template.md ← sync depuis TEMPLATE_claude/ (gitignore)
│   └── context/           │     │   ├── *.md          ← adaptations projet (tracké git)
├── agents/                │     │   └── init-project.md ← point d'entrée (tracké git)
│   └── context/           │     ├── agents/
├── templates/             └──►  │   ├── *.template.md ← sync depuis TEMPLATE_claude/ (gitignore)
│   └── workflows/               │   ├── *.md          ← adaptations projet (tracké git)
├── INITIALIZATION.md            │   ├── context/      ← sync depuis TEMPLATE_claude/ (gitignore)
├── CLAUDE_TEMPLATE.md           │   └── dev-*.md      ← généré stack (tracké git)
└── .template-source.json        ├── CLAUDE.md         ← généré (tracké git)
                                 ├── project-config.json ← généré (tracké git)
                                 └── memory/           ← tracké git

                                 TEMPLATE_claude/      ← gitignore (fetché depuis GitHub)
                                 .gitignore            ← généré par /init-project
```

### Règle simple

| Dossier | Dans le projet cible | Dans git |
|---------|----------------------|----------|
| `TEMPLATE_claude/` | Source template | Non (gitignore) |
| `.claude/commands/*.template.md` | Commandes template (jamais éditées) | Non (gitignore) |
| `.claude/commands/*.md` | Adaptations projet par commande | Oui |
| `.claude/agents/*.template.md` | Agents template (jamais édités) | Non (gitignore) |
| `.claude/agents/*.md` | Adaptations projet par agent | Oui |
| `.claude/agents/dev-*.md` | Agents projet (stack-spécifique) | Oui |
| `.claude/CLAUDE.md`, `project-config.json`, `memory/` | Config projet | Oui |

### Séparation template / projet

Chaque commande et agent est déployé en **deux fichiers compagnons** :

```
.claude/commands/feature.template.md   ← template, jamais édité, mis à jour par sync
.claude/commands/feature.md            ← adaptations projet, tracké git, jamais écrasé
```

Claude lit les deux automatiquement : le template d'abord, puis le fichier projet.
Les projets qui n'ont aucune adaptation n'ont pas besoin de créer le fichier `.md`.

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
| `test-writer` | Tests TDD depuis le plan/contrats (en parallèle du DEV) — unit/integration/E2E/perf + procédures QA |
| `code-reviewer` | Revue de code (qualité, sécurité OWASP, performance) + vérification couverture des contrats |
| `qa` | Exécution des tests et validation (unit/integration/E2E/perf) |
| `infra` | Validation des procédures de déploiement + infra Docker/Helm/CI |
| `deployer` | Déploiement QUALIF et PROD — surveille la CI activement, rollback automatique sur échec, remonte les faits à main |
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
    ↓  label PLANNING
[GATE 2] Validation plan (+ alerte breaking changes si détectés)
    ↓  label EN COURS
    ├──────────────────────────┐
  DEV                     TEST-WRITER ── depuis plan + contrats (TDD)
    └──────────────────────────┘
    ↓  (si backend+frontend parallèle → merge conflicts résolus par dev-backend)
    ↓  [GATE 2b] escalade si conflits non résolvables
    ↓  label EN REVIEW
REVIEW ─────────────────────── code + vérifie couverture des contrats par les tests
    ↓
    ↓  label EN QA
QA ────────────────────────── exécute scripts + suit procédures manuelles
    ↓  label DONE
DOC ───────────────────────── CHANGELOG + documentation technique
    ↓
INFRA validation QUALIF ────── cohérence procédure/infrastructure
    ↓  [GATE 4b] escalade si écart détecté
DEPLOY QUALIF
    ↓
[GATE 4] Validation manuelle ── CDP présente les scénarios à tester
    ├─ OUI → issue fermée → INFRA validation PROD → DEPLOY PROD → milestone si 100%
    └─ NON → label EN COURS → retour DEV ou PLAN selon l'écart
    ↓  [GATE 4c] escalade si infra PROD incohérente
DEPLOY PROD ────────────────── merge → tag → surveille CI → succès : release + milestone
                               échec  : rollback adapté → rapport à main → routing agent
```

**Points de validation utilisateur (GATES) :**

| Gate | Moment | Action requise |
|------|--------|----------------|
| 1 | Après analyse | Confirmer le démarrage |
| 2 | Après plan | Valider le plan et les contrats API |
| 2b | Conflits merge non résolvables | Résoudre manuellement |
| 3 | 3 cycles DEV atteints | Continuer ou abandonner |
| 4 | QUALIF prête | OUI (issue fermée + deploy prod) ou NON (retour DEV) |
| 4b | Procédure QUALIF incohérente | Corriger avant deploy |
| 4c | Procédure PROD incohérente | Corriger avant deploy |

**Cycles de correction** (max 3 avant escalade) :
- REVIEW refuse → DEV corrige → REVIEW seul (TEST-WRITER uniquement si scope change)
- QA échoue → DEV corrige → REVIEW seul (TEST-WRITER uniquement si scope change)
- Scope change = changement `BREAKING` ou `CHANGED` dans `contracts/CHANGELOG.md`

### Bugfix

```
ANALYSE ── cause racine
    ↓  label EN COURS
    ├──────────────────────────┐
  DEV ── fix minimal       TEST-WRITER ── test de régression depuis la spec du bug
    └──────────────────────────┘
    ↓  label EN REVIEW
REVIEW
    ↓  label EN QA
QA ── exécute les tests + procédure manuelle
    ↓  label DONE
DOC ── CHANGELOG (Fixed)
    ↓
DEPLOY QUALIF → [GATE 4] OUI → issue fermée → DEPLOY PROD
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

### Suivi des issues GitHub

Le CDP met à jour les labels de l'issue associée (via plugin GitHub MCP) à chaque transition de phase :

| Label | Moment |
|-------|--------|
| `PLANNING` | Phase 1 — plan en cours |
| `EN COURS` | GATE 2 validé — DEV + TEST-WRITER démarrés |
| `EN REVIEW` | Phase 3 — REVIEW en cours |
| `EN QA` | Phase 4 — QA en cours |
| `DONE` | QA validée |
| *(issue fermée)* | GATE 4 — utilisateur confirme que l'implémentation est conforme |

Un cycle correctif (REVIEW refuse ou QA échoue) remet le label à `EN COURS`.
Si l'utilisateur rejette à GATE 4, l'issue repasse à `EN COURS` et repart en DEV ou PLAN.

### Déploiement PROD et suivi CI

Le deployer ne pousse pas et ne passe pas à autre chose — il surveille la CI jusqu'à complétion et gère les échecs de façon autonome.

**En cas de succès CI :**
- Création de la GitHub Release avec les notes
- Vérification du milestone actif → clôture automatique si 100% des issues fermées

**En cas d'échec CI :**

Le deployer classe l'échec depuis les logs et applique le rollback adapté :

| Catégorie | Rollback | Signification |
|-----------|----------|---------------|
| `CODE` | Revert merge + suppression du tag | Le code mergé est suspect |
| `FLAKY` | Revert merge + suppression du tag | Échec non reproductible persistant |
| `CONFIG` | Suppression du tag uniquement | La config CI est en cause, le code est sain |
| `INFRA` | Suppression du tag uniquement | L'infrastructure CI est en cause, le code est sain |

Le deployer remonte les faits bruts à `main` (catégorie, run CI, rollback effectué).
**Il ne corrige rien lui-même** — `main` décide du routing vers l'agent responsable (dev, infra, qa).
La branche de travail est toujours préservée pour la correction et la re-tentative.

### Clôture de milestone

Après un déploiement PROD (CI OK), le CDP vérifie le milestone actif :
- **100% des issues fermées** → milestone clos automatiquement
- **Issues encore ouvertes** → alerte utilisateur avec la liste

---

## Approche TDD

Le `test-writer` est déclenché **en parallèle du DEV**, depuis le plan et les contrats API — pas depuis le code livré. Les tests définissent le comportement attendu ; le développeur implémente pour les faire passer.

**Règle de non-régression** : les tests existants sont immuables. Seul un changement `BREAKING` ou `CHANGED` documenté dans `contracts/CHANGELOG.md` autorise leur mise à jour. Le `code-reviewer` vérifie que les tests couvrent bien tous les contrats.

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

Fetche la dernière version de `TEMPLATE_claude/` et met à jour les fichiers `*.template.md`
sans jamais toucher aux fichiers `*.md` projet.

### Détection de dérive (automatique à chaque sync)

À chaque synchronisation, Claude analyse les fichiers `*.md` compagnons et détecte
les dérives dans les deux sens :

| Signal | Signification | Action proposée |
|--------|---------------|-----------------|
| `[↓]` DERIVE-TEMPLATE | Le template couvre maintenant ce que vous aviez customisé | Simplification possible |
| `[↑]` DERIVE-PROJET | Le fichier `.md` a grossi depuis la dernière sync | Vérifier que c'est intentionnel |
| `[=]` IDENTIQUE | Le `.md` duplique le template sans rien ajouter | Peut être supprimé |
| `[*]` PROPRE | Contenu projet uniquement | Rien à faire |

Cette analyse est silencieuse si tout est propre. Elle sert aussi de migration one-shot
pour les projets qui avaient du contenu mixte avant l'introduction de la convention.

---

## Personnalisation

### Adapter les commandes et agents au projet

Pour surcharger le comportement d'une commande ou d'un agent, créer le fichier `.md` compagnon :

```bash
# Exemple : règles spécifiques pour /feature
touch .claude/commands/feature.md
```

```markdown
# Adaptations projet — feature

## Conventions de nommage
- Toutes les branches feature suivent le pattern `feat/<ticket>-<slug>`

## Règles métier spécifiques
- Ne jamais modifier le module `billing/` sans validation du lead
```

Claude lit `feature.template.md` (comportement standard) puis `feature.md` (règles projet).
Le fichier `feature.template.md` n'est jamais à modifier — il se met à jour automatiquement.

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
