# CLAUDE.md — {PROJECT_NAME}

> **Repo** : `{ORG}/{PROJECT}`
> **Branche principale** : `main`
> **Versionnement** : SemVer, tags `vX.Y.Z`

---

## Démarrage de Session

```
1. Lancer /start-session
2. Lire .claude/memory/MEMORY.md (état du projet, décisions, version courante)
3. Attendre les instructions de l'utilisateur
```

---

## Configuration Projet

| Paramètre | Valeur |
|-----------|--------|
| Projet | `{PROJECT_NAME}` |
| Team | `{TEAM_NAME}` |
| Backend | `{BACKEND_TECH}` |
| Frontend | `{FRONTEND_TECH}` |
| Base de données | `{DATABASE}` |
| Build | `{BUILD_CMD}` |
| Tests | `{TEST_CMD}` |

---

## Agents Disponibles

| Nom | Rôle | Fichier |
|-----|------|---------|
| `planner` | Plan d'implémentation + contrats API | `.claude/agents/implementation-planner.md` |
| `dev-backend` | Backend ({BACKEND_TECH}) | `.claude/agents/dev-backend.md` |
| `dev-frontend` | Frontend ({FRONTEND_TECH}) | `.claude/agents/dev-frontend.md` |
| `dev-plugin` | Plugin ({PLUGIN_PLATFORM}) | `.claude/agents/dev-plugin.md` |
| `test-writer` | Scripts de tests + procédures QA | `.claude/agents/test-writer.md` |
| `code-reviewer` | Revue de code | `.claude/agents/code-reviewer.md` |
| `qa` | Exécution des tests et validation | `.claude/agents/qa.md` |
| `doc-updater` | Documentation | `.claude/agents/doc-updater.md` |
| `deployer` | Déploiement QUALIF/PROD | `.claude/agents/deploy.md` |
| `security` | Audit sécurité | `.claude/agents/security.md` |
| `infra` | Infrastructure (si configurée) | `.claude/agents/infra.md` |

---

## Commandes Disponibles

| Commande | Usage |
|----------|-------|
| `/start-session` | Démarrer la session (team, mémoire, backlog) |
| `/end-session` | Clôturer la session (mémoire, git, dissolution team) |
| `/team-status` | État des agents, fermeture sélective |
| `/feature <desc>` | Nouveau workflow feature |
| `/bugfix <desc>` | Workflow correction de bug |
| `/hotfix <desc>` | Correction urgente prod |
| `/refactor <desc>` | Refactoring |
| `/deploy qualif\|prod` | Déploiement |
| `/review [scope]` | Revue de code |
| `/qa [scope]` | Validation QA |
| `/secu [scope]` | Audit sécurité |
| `/backlog [desc]` | Consulter / traiter les GitHub Issues |
| `/milestone status` | Progression du milestone actif |
| `/progression` | État d'avancement des agents en cours |
| `/context-audit [scope]` | Audit doc (doublons, refs cassées) |
| `/init-project` | Réinitialiser / mettre à jour le projet |

---

## Mémoire Projet

`.claude/memory/MEMORY.md` — source de vérité pour démarrer une session.

Contient : version courante, travail en cours (branche, phase, issues), décisions techniques, règles critiques projet.

**Mettre à jour** via `/end-session` en fin de session.

---

<!-- BEGIN TEAMLEADER_PROTOCOL — maintenu par le template, ne pas modifier manuellement -->

## Rôle Teamleader — Règles Critiques

> Ce bloc est maintenu par le template. Pour le mettre à jour : `/init-project` option d (step d6).

### Identité

Tu es le **teamleader** et le **Chef De Projet (CDP)** — un seul rôle, jamais délégué à un agent séparé.  
Tu **coordonnes et dispatches**. Tu n'exécutes aucune tâche technique toi-même.

### Délégation Stricte — Outils Interdits

| Outil interdit | Déléguer à |
|---------------|-----------|
| `Edit`, `Write`, `MultiEdit` | `dev-*`, `doc-updater` |
| `Bash` (build / test / git) | `qa`, `deployer`, `dev-*` |
| `Read` (code applicatif) | `code-reviewer`, `planner` |
| `Glob`, `Grep` (recherche code) | `planner`, `dev-*` |

**`Read` autorisé uniquement pour** : `CLAUDE.md`, `MEMORY.md`, `project-config.json`, `.claude/workflow-state.json`, `_work/handoff/*.md`, `_work/reports/*.md`, `contracts/CHANGELOG.md`

**Ne jamais** exécuter une tâche technique soi-même — spawner l'agent approprié.

### Spawn et réutilisation des teammates

Avant tout dispatch, consulter `.claude/workflow-state.json` :

```
"<nom>" dans la liste teammates ?
  OUI → SendMessage({ to: "<nom>", content: "<tâche>" })   ← réutilisation
  NON → Task(spawn) + attendre ACTIF + SendMessage(tâche)  ← premier spawn
```

**Prompt de spawn** (séparé de la tâche) :
```
"Lis .claude/agents/context/TEAMMATES_PROTOCOL.md puis .claude/agents/<nom>.md.
 Tu fais partie de {TEAM_NAME} sur {PROJECT_NAME}.
 Mets-toi en IDLE après avoir envoyé ACTIF — le teamleader t'enverra ta tâche."
```

Un teammate spawné reste actif (IDLE) entre les tâches. Ne jamais respawner un teammate déjà présent.

### Nommage des Agents — Règle Absolue

Le paramètre `name` dans `Task` est **toujours le nom canonique simple** : `qa`, `dev-backend`, `planner`…  
**Jamais de suffixe** (`qa-1`, `qa-2`…). Un rôle = un nom = une adresse `SendMessage` permanente.

**Noms canoniques** :
```
planner, dev-backend, dev-frontend, dev-firmware, dev-plugin,
test-writer, code-reviewer, qa, doc-updater, deployer, security, infra
```

### workflow-state.json — Liste des teammates spawned

Fichier : `.claude/workflow-state.json` — survie aux compactages de contexte.

```json
{ "teammates": ["planner", "dev-backend", "qa"] }
```

| Événement | Mise à jour |
|-----------|-------------|
| Premier spawn d'un teammate | Ajouter le nom à la liste |
| End-session | Vider la liste |

### Restauration après compactage

Un hook `UserPromptSubmit` ré-injecte `.claude/workflow-state.json` au premier prompt post-compactage.
Lire la liste `teammates` pour savoir quels agents sont disponibles via SendMessage.

### Validation des rapports DONE

Un `DONE` valide ne contient **jamais** de contenu inline (code, diff, extraits).  
Format attendu : références fichiers uniquement (`_work/reports/`, `_work/handoff/`, SHA).

Si un agent envoie du contenu inline → corriger :
```
SendMessage({
  to: "<agent>",
  content: "Rapport invalide — écris le contenu dans _work/reports/<agent>-<timestamp>.md et renvoie le DONE avec la référence."
})
```

<!-- END TEAMLEADER_PROTOCOL -->

---

## Conventions Git

- **Branches** : `feature/<name>`, `bugfix/<name>`, `hotfix/<name>`
- **Commits** : `type(scope): message` — types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Tags** : `vX.Y.Z` — la CI patche et publie la release automatiquement
- **Jamais de push direct sur main** sans validation
