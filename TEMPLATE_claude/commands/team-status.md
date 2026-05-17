# Commande /team-status

Afficher l'état de la team et optionnellement fermer des teammates.

## Usage

```
/team-status
```

## Instructions

### Etape 1 — Lire l'état

```bash
cat .claude/workflow-state.json 2>/dev/null || echo '{"agents":{}}'
```

Si le fichier est absent ou `"agents"` est vide → afficher :

```
Aucun agent actif. Aucune team en cours.
```

Et s'arrêter ici.

### Etape 2 — Afficher le tableau

Calculer pour chaque agent :
- **Durée** : `now - spawned_at`
- **Adresse** : `actual_name` si défini dans le JSON, sinon la clé canonique
- **Nom affiché** : `<clé canonique> (actual: <actual_name>)` si les deux diffèrent, sinon la clé seule

```
Team : {TEAM_NAME}

| # | Agent               | Statut        | Durée  | Tâche                    |
|---|---------------------|---------------|--------|--------------------------|
| 1 | dev-backend         | WORKING       | 12min  | implémentation endpoint  |
| 2 | planner             | IDLE          | 3min   | en attente               |
| 3 | qa (actual: qa-2)   | WORKING       | 5min   | validation feature X     |
| 4 | doc-updater         | SPAWN_PENDING | 0min   | mise à jour docs         |
| 5 | security            | PING_PENDING  | 0min   | audit sécurité           |
```

Légende des statuts :
- `WORKING` — ACTIF reçu, en cours de traitement
- `IDLE` — DONE envoyé, en attente de la prochaine tâche
- `SPAWN_PENDING` — spawné, en attente de l'ACK ACTIF (< 60s normal)
- `PING_PENDING` — PING envoyé, en attente du PONG (< 60s normal)
- `FAILED` — a envoyé FAILED, action requise

### Etape 3 — Proposer les actions

Afficher uniquement si des agents existent :

```
Actions disponibles :
  [R] Respawner les agents expirés (SPAWN_PENDING > 60s ou PING_PENDING > 60s)
  [P] Envoyer un PING à un agent IDLE pour vérifier sa présence
  [F] Fermer agents spécifiques (saisir les numéros séparés par virgule : 1,3)
  [Q] Quitter sans action
```

Attendre la saisie de l'utilisateur.

### Etape 4a — Respawn [R]

> **Règle adressage** : utiliser `actual_name` (si défini dans le JSON) comme argument de `TaskStop`
> et comme `name` dans `Task`. Si `actual_name` absent, utiliser la clé canonique.

Pour chaque agent `spawn_pending` depuis > 60s :
```
1. TaskStop(<actual_name ou clé>)
2. Task({ name: "<clé canonique>", prompt: "<prompt original>" })
3. .claude/workflow-state.json : status: "spawn_pending", spawned_at: <ISO>, actual_name: null
4. Afficher : "↑ <agent> respawné"
```

Pour chaque agent `ping_pending` depuis > 60s :
```
1. SendMessage({ to: "<actual_name ou clé>", message: {type: "shutdown_request"} })
2. Bash("sleep 10")
3. Task({ name: "<clé canonique>", prompt: "<prompt original>" })
4. .claude/workflow-state.json : status: "spawn_pending", spawned_at: <ISO>, actual_name: null
5. Afficher : "↑ <agent> respawné (après shutdown)"
```

### Etape 4b — PING individuel [P]

Demander le numéro de l'agent à PINGer (doit être `IDLE`).

Utiliser `actual_name` si défini, sinon la clé canonique, pour l'adresse du `SendMessage`.

```
1. SendMessage({ to: "<actual_name ou clé>", content: "PING" })
2. .claude/workflow-state.json : status: "ping_pending", pinged_at: <ISO>
3. ScheduleWakeup(60, "PING-check <clé> depuis /team-status — PONG reçu → idle, absent → failed")
4. Afficher : "→ PING envoyé à <agent> — réponse attendue sous 60s"
```

> Ce PING est un **check de liveness**, pas un dispatch. Si le wakeup fire sans PONG :
> ```
> status: "failed"
> Afficher : "⚠ <agent> ne répond plus (PING sans réponse).
>             Voulez-vous le respawner ? [O/N]"
> O → shutdown_request + Bash("sleep 10") + Task() → status: "spawn_pending"
> N → supprimer l'entrée du JSON
> ```
> Contrairement au dispatch PING, il n'y a pas de tâche en attente — le teamleader ne peut pas
> respawner automatiquement sans savoir ce qu'il doit confier à l'agent.

### Etape 4c — Fermeture [F]

Pour chaque agent sélectionné :

```
1. TaskStop(<actual_name ou clé>)
2. Supprimer l'entrée de .claude/workflow-state.json — écrire immédiatement
3. Afficher : "✓ <agent> stoppé"
```

> Ne jamais arrêter un agent `WORKING` sans confirmation explicite de l'utilisateur.

### Etape 5 — Résumé

```
Terminé.
  Agents actifs restants : N
```

## Règles

- Toujours utiliser `actual_name` (si présent dans le JSON) pour `SendMessage` et `TaskStop`
- Toujours écrire `.claude/workflow-state.json` sur disque après chaque modification
- Ne pas fermer un agent `WORKING` sans confirmation utilisateur explicite
- Un agent `IDLE` dans le JSON est vivant et réutilisable via PING/PONG
- [P] est un check de liveness — pas de respawn automatique sur wakeup, juste `failed`
