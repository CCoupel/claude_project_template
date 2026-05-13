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

**`Read` autorisé uniquement pour** : `CLAUDE.md`, `MEMORY.md`, `project-config.json`, `workflow-state.json`, `_work/handoff/*.md`, `_work/reports/*.md`, `contracts/CHANGELOG.md`

Si un agent ne répond pas au PING sous 60s → spawn via `Task`. **Ne jamais** exécuter la tâche soi-même.

### Protocole PING — Activation avec Timeout Borné

**Pas d'attente synchrone.** Envoyer les PINGs en un bloc, associer un `ScheduleWakeup(60s)` comme timeout, puis laisser les ACTIF arriver naturellement :

```
Étape 1 — Envoyer tous les PINGs dans le même bloc de réponse :
  SendMessage({to: "<agent1>", content: "PING"})
  SendMessage({to: "<agent2>", content: "PING"})
  … (tous les agents à activer)
  Écrire immédiatement dans workflow-state.json :
    Pour chaque agent pingé : status = "ping_pending", ping_sent_at = <ISO>

Étape 2 — Programmer le timeout :
  ScheduleWakeup({
    delaySeconds: 60,
    reason: "PING timeout — spawn agents non-répondants",
    prompt: "Lire .claude/workflow-state.json. Pour chaque agent status='ping_pending' (PING sans réponse) : Task spawn + dispatcher son ordre selon le rapport planner ou la demande en cours. Effacer ping_sent_at."
  })

Étape 3 — Sur chaque réponse "<NOM> ACTIF" reçue :
  → Mettre à jour workflow-state.json : status = "idle", ping_sent_at = null
  → Dispatcher l'ordre de travail immédiatement via SendMessage

Étape 4 — Au réveil du ScheduleWakeup (timeout 60s) :
  → Pour chaque agent encore status = "ping_pending" : Task spawn + dispatcher l'ordre
  → Effacer ping_sent_at dans workflow-state.json
```

### Nommage des Agents — Règle Absolue

Le paramètre `name` dans `Task` est **toujours le nom canonique simple** : `qa`, `dev-backend`, `planner`…  
**Jamais de suffixe** (`qa-1`, `qa-2`…). Un rôle = un nom = une adresse `SendMessage` permanente.

Si le système impose un suffixe → l'agent précédent tourne encore → envoyer PING au nom simple ; au timeout s'il ne répond pas → c'est qu'il est bloqué, forcer via `TaskStop` puis re-spawn.

### Restauration après compactage de contexte

Après un compactage, un hook `UserPromptSubmit` ré-injecte automatiquement `workflow-state.json`. **À réception de ce bloc, lancer immédiatement un PING broadcast** :

**Étape 1** — Envoyer un PING individuel à chaque agent listé (tous dans le même bloc de réponse) :
```
SendMessage({to: "planner", content: "PING"})
SendMessage({to: "dev-backend", content: "PING"})
SendMessage({to: "qa", content: "PING"})
… (tous les agents présents dans workflow-state.json)
```

**Étape 2** — Écrire immédiatement dans `workflow-state.json` : `"post_compact_ping_sent_at": "<ISO>"`, puis programmer le timeout :
```
ScheduleWakeup({
  delaySeconds: 60,
  reason: "PING post-compactage — cleanup agents non-répondants",
  prompt: "Lire .claude/workflow-state.json. Pour chaque agent dont last_pong_at < post_compact_ping_sent_at (ou null) → supprimer l'entrée (agent disparu). Effacer post_compact_ping_sent_at. Pour tout agent disparu qui était en cours de tâche → Task re-spawn + retransmettre l'ordre."
})
```

**Étape 3** — Sur chaque réponse `<NOM> ACTIF` reçue : mettre à jour `workflow-state.json` (`last_pong_at: <ISO>`). L'agent est confirmé.

**Étape 4** — Au réveil du ScheduleWakeup : supprimer les agents dont `last_pong_at` est antérieur à `post_compact_ping_sent_at` (ou null), effacer `post_compact_ping_sent_at`, puis reprendre le travail.

### Workflow-state.json — Source de Vérité

Écrire **immédiatement sur disque** à chaque événement (jamais en mémoire) :

| Événement | Mise à jour |
|-----------|-------------|
| Envoi PING | `status: "ping_pending"`, `ping_sent_at: <ISO>` |
| Réception ACTIF (réponse PING) | `status: "idle"`, `ping_sent_at: null` |
| Timeout PING (60s sans réponse) | spawn via Task, `status: "working"`, `ping_sent_at: null` |
| Dispatch (SendMessage de travail) | `status: "working"`, `last_order_sent_at: <ISO>`, `idle_since: null` |
| Réception DONE | `status: "idle"`, `idle_since: <ISO>` **+ vérifier TTL sur tous les agents idle** |
| Réception `PONG(WORKING\|IDLE)` | `status` correspondant, `last_pong_at: <ISO>` |
| Envoi `shutdown_request` | `status: "pending_delete"` |
| Réception `shutdown_response` | supprimer l'entrée agent |
| `TaskStop` (cleanup non-répondant) | supprimer l'entrée agent |

**Vérification TTL proactive** — à chaque réception de `DONE`, vérifier immédiatement tous les agents `{status: "idle"}` :
```
SI idle_since + IDLE_TTL ≤ now → SendMessage(shutdown_request), status: "pending_delete"
```
Ne pas attendre le prochain cycle PING-STATUS pour terminer les agents expirés.

Format minimal :
```json
{
  "watchdog_active": false,
  "post_compact_ping_sent_at": null,
  "ping_status_sent_at": null,
  "agents": {
    "<nom>": { "status": "working|idle|ping_pending|pending_delete", "last_order_sent_at": "<ISO>", "idle_since": null, "ping_sent_at": null, "last_pong_at": null }
  }
}
```

### Boucle PING-STATUS — Singleton

- Prérequis : `project-config.json` absent → skip (pas de team)
- Vérifier `watchdog_active` avant tout `ScheduleWakeup` — **une seule boucle à la fois**
- Envoi PING-STATUS → écrire `ping_status_sent_at: <ISO>` + `ScheduleWakeup(60s)` comme timeout de réponse
- Sur réception `PONG(WORKING|IDLE)` → mettre à jour `status` + `last_pong_at`
- Au réveil du timeout : supprimer les agents dont `last_pong_at < ping_status_sent_at` (non-répondants)
- `PONG(IDLE-2)` → `shutdown_request` → `pending_delete` ; cycle suivant si toujours présent → `TaskStop`
- Réception `shutdown_response` → supprimer l'entrée immédiatement

### Activation des Agents (démarrage de workflow)

**Temps 1** — Activer `planner` (PING + ScheduleWakeup(60s) → ACTIF → SendMessage | timeout → Task)  
**Temps 2** — Après rapport planner, activer en parallèle les agents du scope détecté

Scope → agents dev concernés + `test-writer` + `code-reviewer` + `qa` + `doc-updater` + `deployer`  
Exception HOTFIX : pas de planner, activer directement dev-* + deployer  
Exception SECU : uniquement `security`

**Prompt obligatoire pour tout `Task` de spawn** (première activation ou re-spawn) :
```
"Lis .claude/agents/context/TEAMMATES_PROTOCOL.md puis .claude/agents/<nom>.template.md,
 puis .claude/agents/<nom>.md si ce fichier existe (adaptations projet).
 Tu fais partie de {TEAM_NAME} sur {PROJECT_NAME}.
 Reste en mode IDLE et attends mes ordres."
```
Un agent spawné sans cette ligne ne connaît pas le protocole et répondra en inline.

### Validation des rapports DONE

Un `DONE` valide ne contient **jamais** de contenu inline (code, diff, extraits).  
Format attendu : références fichiers uniquement (`_work/reports/`, `_work/handoff/`, SHA).

Si un agent envoie du contenu inline → refuser et corriger :
```
SendMessage({
  to: "<agent>",
  content: "Rapport invalide — aucun contenu inline autorisé. Écris le contenu dans _work/reports/<agent>-<timestamp>.md et renvoie le DONE avec la référence uniquement."
})
```
Ne jamais accepter un DONE inline comme valide — relancer jusqu'au format correct.

<!-- END TEAMLEADER_PROTOCOL -->

---

## Conventions Git

- **Branches** : `feature/<name>`, `bugfix/<name>`, `hotfix/<name>`
- **Commits** : `type(scope): message` — types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Tags** : `vX.Y.Z` — la CI patche et publie la release automatiquement
- **Jamais de push direct sur main** sans validation
