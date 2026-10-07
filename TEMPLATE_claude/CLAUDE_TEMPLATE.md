# CLAUDE.md — {PROJECT_NAME}

> **Repo** : `{ORG}/{PROJECT}`
> **Branche principale** : `main`
> **Versionnement** : `X.Y.Z.a` en dev / `X.Y.Z` en prod — voir `.claude/commands/context/COMMON.md` section 5

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

| Nom | Rôle | Fichier | Spawn |
|-----|------|---------|-------|
| `planner` | Plan d'implémentation + contrats API | `.claude/agents/implementation-planner.template.md` | permanent |
| `dev-backend` | Backend ({BACKEND_TECH}) | `.claude/agents/dev-backend.template.md` | permanent |
| `dev-frontend` | Frontend ({FRONTEND_TECH}) | `.claude/agents/dev-frontend.template.md` | permanent |
| `dev-plugin` | Plugin ({PLUGIN_PLATFORM}) | `.claude/agents/dev-plugin.template.md` | permanent |
| `test-writer` | Scripts de tests + procédures QA | `.claude/agents/test-writer.template.md` | permanent |
| `code-reviewer` | Revue de code | `.claude/agents/code-reviewer.template.md` | permanent |
| `qa` | Exécution des tests et validation | `.claude/agents/qa.template.md` | permanent |
| `doc-updater` | Documentation | `.claude/agents/doc-updater.template.md` | permanent |
| `deployer` | Build + Publication + Déploiement QUALIF/PROD | `.claude/agents/deploy.template.md` | permanent |
| `security` | Audit sécurité | `.claude/agents/security.template.md` | ponctuel |
| `infra` | Infrastructure (si configurée) | `.claude/agents/infra.template.md` | ponctuel |

> **Fichier** pointe vers le `.template.md` — géré par sync, toujours présent. Un compagnon
> `.md` (sans suffixe) peut exister à côté pour des adaptations projet ; il est optionnel et
> n'est jamais référencé ici puisqu'il ne contient jamais la définition complète de l'agent.

> **Agents génériques** (projets non-dev) : une ligne par instance déclarée à l'init (`agents.generic[]`
> de `project-config.json`), ex. `| redacteur-pptx | <rôle> | .claude/agents/generic.template.md + generic.redacteur-pptx.md | permanent |`.
> Le template `generic` est commun ; la spécification de chaque instance vit dans `.claude/agents/generic.<nom>.md`.

> **permanent** = spawné au `/start-session`, reste en IDLE toute la session.  
> **ponctuel** = spawné à la demande par la commande dédiée, fermé après DONE.

> Pour `deployer` : la procédure concrète de PUBLISH/DEPLOY (un fichier par tâche × environnement)
> vit dans `.claude/agents/environments/{publish,deploy}.<env>.md` — voir `agents/deploy.md`
> section "Fichiers d'Environnement".

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
| `/build` | Compilation de la version candidate — agnostique à l'environnement |
| `/publish qualif\|prod` | Mise à disposition pour un environnement (promotion ou rebuild déterministe via CI) |
| `/deploy qualif\|prod` | Installation de l'artefact déjà publié |
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
| `Edit`, `Write`, `MultiEdit` (sauf `Write` d'un ordre dans `_work/tasks/*.md`) | `dev-*`, `doc-updater` |
| `Bash` (build / test / git) | `qa`, `deployer`, `dev-*` |
| `Read` (code applicatif) | `code-reviewer`, `planner` |
| `Glob`, `Grep` (recherche code) | `planner`, `dev-*` |

**`Read` autorisé uniquement pour** : `CLAUDE.md`, `MEMORY.md`, `project-config.json`, `_work/tasks/*.md`, `_work/handoff/*.md`, `_work/reports/*.md`, `contracts/CHANGELOG.md`

**`Write` autorisé uniquement pour** : `_work/tasks/*.md` (ordres aux teammates, création seule — jamais `Edit`/`MultiEdit`, jamais un autre chemin)

**Ne jamais** exécuter une tâche technique soi-même — spawner l'agent approprié.

### Dispatcher une tâche

Tous les teammates sont spawned au démarrage (`/start-session`) et sont en IDLE.
**Pendant la session : uniquement `SendMessage` — jamais de spawn.**

```
SendMessage({ to: "<nom-canonique>", content: "<tâche complète>" })
→ Attendre ACTIF (confirmation) + DONE (références fichiers)
```

**Ordre de plus de 3 lignes → fichier** : `Write` dans `_work/tasks/<agent>-<YYYYMMDD-HHmmss>.md` (un fichier par ordre,
jamais réécrit), puis `SendMessage` avec le seul chemin + un résumé d'une ligne :
`Tâche : _work/tasks/<agent>-<timestamp>.md — <résumé>`. Le fichier liste périmètre, fichiers à lire et livrables
attendus. Restent inline : ordre ≤ 3 lignes, `/clear`, réponses à un `BLOQUE`, correction de rapport invalide.
Relire l'ordre (`_work/tasks/*.md`) pour contrôler le `DONE` par rapport à la demande.

Plusieurs agents en parallèle — même tour :
```
SendMessage({ to: "dev-backend",  content: "<tâche>" })
SendMessage({ to: "dev-frontend", content: "<tâche>" })
```

### Nommage des Agents — Règle Absolue

Le paramètre `name` dans `Task` est **toujours le nom canonique simple** : `qa`, `dev-backend`, `planner`…  
**Jamais de suffixe** (`qa-1`, `qa-2`…). Un rôle = un nom = une adresse `SendMessage` permanente.

**Noms canoniques** :
```
planner, dev-backend, dev-frontend, dev-firmware, dev-plugin,
test-writer, code-reviewer, qa, doc-updater, deployer, security, infra
```

### Questions à l'utilisateur

**Règle absolue** : toute information, décision ou validation attendue de l'utilisateur est posée
**via l'outil `AskUserQuestion`** — jamais en texte dans le chat (pas de liste numérotée, pas de « OUI/NON »,
pas de `[O/n]`, pas de « dis-moi »). Ça vaut aussi pour les questions remontées par un teammate
(`BLOQUE` / `FAILED` — format unique `[NOM] BLOQUE` + `Questions:`, `TEAMMATES_PROTOCOL.md`).

Chaîne : les teammates ne parlent jamais à l'utilisateur — ils t'envoient leurs questions et options
(`SendMessage` vers `main`), **tu les convertis en `AskUserQuestion`**, puis tu leur renvoies les réponses
via `SendMessage`.

- Questions fermées, 2 à 4 options, label court + description (contexte/conséquence), option par défaut
  marquée « (Recommandé) » ; pas d'option « Autre » (ajoutée automatiquement).
- Tout regrouper dans **un seul appel** `AskUserQuestion` (jusqu'à 4 questions).
- Seule exception : une question de découverte ouverte par nature (workshop de cadrage).

Détail et checklist avant chaque message à l'utilisateur : `.claude/agents/teamleader.md`, section « Questions à l'utilisateur ».

### Relayer l'avancement

Chaque jalon `[NOM] EN COURS — …` d'un teammate (ex. `QA EN COURS — lot 3/12 …`) est relayé à l'utilisateur en
une ligne, sans attendre le DONE. Un jalon n'est pas un DONE : ne pas enchaîner avant le DONE.

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

## Confinement des fichiers de travail — INTERDIT de sortir du projet

**Tout fichier ou dossier créé pendant le travail reste DANS le dossier du projet.** Jamais de
`../`, de chemin absolu hors du repo, ni de `/tmp`, `$TMPDIR`, `~/` ou `mktemp` sans `-p` pointant dans le projet.

| Besoin | Emplacement obligatoire |
|--------|-------------------------|
| Worktree git (isolation, branche parallèle) | `.claude/worktrees/<nom>` — jamais `../<repo>-<nom>` ni `/tmp/...` |
| Worktree du site marketing | `MARKETING/` (racine du projet) |
| Fichier / dossier temporaire (scratch, sortie intermédiaire, `.tmp`, backup) | `_work/tmp/` (créé à la demande, gitignoré) |
| Ordres du teamleader (> 3 lignes), rapports et handoffs inter-agents | `_work/tasks/`, `_work/reports/`, `_work/handoff/` |

- Fichiers temporaires : `mkdir -p _work/tmp && mktemp -p _work/tmp ...` ; les supprimer en fin de tâche.
- Worktrees : `git worktree add .claude/worktrees/<nom> ...` puis `git worktree remove` en fin de tâche.
- Ces dossiers sont gitignorés (`_work/`, `.claude/worktrees/`) — ne jamais les commiter.
- Si un outil impose un emplacement externe, rediriger via `TMPDIR=$PWD/_work/tmp` ; en cas d'impossibilité, **BLOQUE** et demande au teamleader/utilisateur.

---

## Conventions Git

- **Branches** : `milestone/vX.Y.Z` — accueille tout le travail FEATURE/BUGFIX/HOTFIX/REFACTOR
  du cycle (un seul milestone en développement à la fois)
- **Commits** : `type(scope): message` — types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Tags** : `vX.Y.Z` — la CI patche et publie la release automatiquement
- **Jamais de travail direct sur `main`** — la branche milestone n'y est mergée qu'au déploiement PROD
