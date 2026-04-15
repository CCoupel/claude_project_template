# Claude Project Template

Template de gestion de projet pour Claude Code avec workflows orchestrés (CDP).

## 🎯 Objectif

Ce template fournit une structure complète pour gérer vos projets avec Claude Code, incluant :
- Workflows orchestrés (PLAN → DEV → REVIEW → QA → DOC → DEPLOY)
- Agents spécialisés par rôle (CDP, Planner, Reviewer, QA, Security, etc.)
- Templates technologiques adaptables (Go, React, Python, ESP32, etc.)
- Commandes slash pour tous les workflows (/feature, /bugfix, /deploy, etc.)

## 📦 Installation

### 1. Copier le template dans votre projet

```bash
# Cloner ce repository
git clone https://github.com/CCoupel/claude_project_template.git

# Copier la structure .claude dans votre projet
cp -r claude_project_template/.claude votre-projet/
cp -r claude_project_template/.github votre-projet/
cp claude_project_template/.gitignore votre-projet/
```

### 2. Initialiser votre projet

Ouvrez Claude Code dans votre projet et lancez :

```
/init-project
```

Claude va automatiquement détecter votre stack technique et générer la configuration adaptée. Vous pouvez aussi relancer cette commande à tout moment pour reconfigurer ou mettre à jour le projet.

## 📖 Documentation Complète

Toute la documentation est dans `.claude/README.md` :

- **[.claude/README.md](.claude/README.md)** : Guide complet du template
- **[.claude/INITIALIZATION.md](.claude/INITIALIZATION.md)** : Processus d'initialisation détaillé

## 🚀 Démarrage Rapide

### Première utilisation

Au premier lancement de Claude dans votre projet, il :

1. **Détecte automatiquement** votre stack technique (package.json, go.mod, requirements.txt, etc.)
2. **Vous propose** une configuration adaptée ou un questionnaire complet
3. **Génère** les agents de dev correspondant à votre stack
4. **Crée** le fichier `project-config.json` avec votre configuration

### Commandes Principales

```bash
/init-project             # Initialiser ou reconfigurer le projet (obligatoire au 1er lancement)

/feature <description>    # Nouvelle fonctionnalité (workflow complet)
/bugfix <description>     # Correction de bug
/hotfix <description>     # Correction urgente production
/refactor <description>   # Refactoring sans changement fonctionnel

/review                   # Revue de code
/qa                       # Tests et validation
/secu                     # Audit de sécurité

/deploy qualif            # Déploiement qualification
/deploy prod              # Déploiement production
```

## 🏗️ Structure

```
.claude/
├── README.md                          # Documentation complète
├── INITIALIZATION.md                   # Guide d'initialisation
├── CLAUDE_TEMPLATE.md                  # Template CLAUDE.md (à copier)
├── agents/
│   ├── *.template.md                   # Agents génériques (CDP, Planner, etc.)
│   ├── context/                        # Contextes partagés
│   └── templates/                      # Templates techno (Go, React, etc.)
├── commands/
│   └── *.template.md                   # Commandes slash génériques
└── templates/
    ├── dev-backend-go.md               # Template backend Go
    ├── dev-backend-node.md             # Template backend Node.js
    ├── dev-backend-python.md           # Template backend Python
    ├── dev-frontend-react.md           # Template frontend React
    ├── dev-frontend-vue.md             # Template frontend Vue
    └── dev-firmware-esp32.md           # Template firmware ESP32
```

## 🔄 Workflows

### Workflow Standard (/feature, /bugfix)

```
CDP → PLAN → DEV → TEST → REVIEW → QA → DOC → DEPLOY
```

- **CDP** : Orchestrateur, analyse et dispatche
- **PLAN** : Création du plan d'implémentation
- **DEV** : Développement (agents adaptés à votre stack)
- **TEST** : Rédaction des tests
- **REVIEW** : Revue de code qualité/sécurité
- **QA** : Exécution des tests et validation
- **DOC** : Mise à jour documentation (CHANGELOG, etc.)
- **DEPLOY** : Déploiement QUALIF puis PROD

### Workflow Sécurité (/secu)

```
SCAN → DEPS → SECRETS → OWASP → REPORT → FIX
```

### Workflow Hotfix (/hotfix)

```
ANALYSE → FIX → TESTS CRITIQUES → DEPLOY PROD → POST-MORTEM
```

## 🎨 Personnalisation

### Ajouter une technologie

1. Créer un template dans `.claude/templates/` (ex: `dev-backend-rust.md`)
2. Suivre le format des templates existants
3. L'agent sera généré automatiquement à l'initialisation

### Modifier un workflow

1. Éditer l'agent concerné dans `.claude/agents/*.template.md`
2. Adapter les étapes selon vos besoins

### Ajouter une commande

1. Créer un fichier dans `.claude/commands/` (ex: `perf.template.md`)
2. Documenter l'usage et le workflow
3. Créer l'agent associé si nécessaire

## 🤝 Contribution

Ce template est open-source. Pour signaler un problème ou suggérer une amélioration :

1. Ouvrir une issue sur https://github.com/CCoupel/claude_project_template
2. Proposer une pull request avec vos améliorations

## 📄 Licence

MIT License - Voir LICENSE pour plus de détails.

## 🙏 Crédits

Développé pour être utilisé avec **Claude Code** (CLI officiel Anthropic).

---

**Pour démarrer** : Lisez [.claude/README.md](.claude/README.md) pour le guide complet !
