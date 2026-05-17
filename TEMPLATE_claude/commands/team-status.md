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
- **Nom affiché** : `actual_name` si défini, sinon la clé canonique

```
Team : {TEAM_NAME}

| # | Agent        | Statut         | Durée  | Tâche                    |
|---|--------------|----------------|--------|--------------------------|
| 1 | dev-backend  | WORKING        | 12min  | implémentation endpoint  |
| 2 | planner      | IDLE           | 3min   | en attente               |
| 3 | qa           | SPAWN_PENDING  | 0min   | validation feature X     |
| 4 | doc-updater  | PING_PENDING   | 0min   | mise à jour docs         |
```

Légende des statuts :
- `WORKING` — ACTIF reçu, en cours de traitement
- `IDLE` — DONE envoyé, en attente de la prochaine tâche
- `SPAWN_PENDING` — spawné, en attente de l'ACK ACTIF (< 60s normal)
- `PING_PENDING` — PING envoyé, en attente du PONG (< 60s normal)
- `SHUTDOWN_PENDING` — shutdown_request envoyé + sleep en cours, respawn imminent
- `FAILED` — a envoyé FAILED, action requise

### Etape 3 — Proposer les actions

Afficher uniquement si des agents existent :

```
Actions disponibles :
  [R] Respawner les agents expirés (SPAWN_PENDING > 60s ou PING_PENDING > 60s sans réponse)
  [P] Envoyer un PING à un agent IDLE pour vérifier sa présence
  [F] Fermer agents spécifiques (saisir les numéros séparés par virgule : 1,3)
  [Q] Quitter sans action
```

Attendre la saisie de l'utilisateur.

### Etape 4a — Respawn [R]

Pour chaque agent `spawn_pending` depuis > 60s :
```
1. TaskStop(<agent>) si le pane existe encore
2. Task({ name: "<agent>", prompt: "<prompt original>" })
3. .claude/workflow-state.json : status: "spawn_pending", spawned_at: <ISO>
4. Afficher : "↑ <agent> respawné"
```

Pour chaque agent `ping_pending` depuis > 60s :
```
1. SendMessage({ to: "<agent>", message: {type: "shutdown_request"} })
2. Bash("sleep 10")
3. Task({ name: "<agent>", prompt: "<prompt original>" })
4. .claude/workflow-state.json : status: "spawn_pending", spawned_at: <ISO>
5. Afficher : "↑ <agent> respawné (après shutdown)"
```

### Etape 4b — PING individuel [P]

Demander le numéro de l'agent à PINGer.

Pour l'agent sélectionné (doit être `IDLE`) :

```
1. SendMessage({ to: "<agent>", content: "PING" })
2. .claude/workflow-state.json : status: "ping_pending", pinged_at: <ISO maintenant>
3. ScheduleWakeup(60, "PING-check <agent> depuis /team-status — PONG reçu → idle, absent → supprimer")
4. Afficher : "→ PING envoyé à <agent> — réponse attendue sous 60s"
```

### Etape 4c — Fermeture [F]

Pour chaque agent sélectionné :

```
1. TaskStop(<agent>)
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

- Toujours écrire `.claude/workflow-state.json` sur disque après chaque modification
- Ne pas fermer un agent `WORKING` sans confirmation utilisateur explicite
- Un agent absent du JSON s'est auto-fermé anormalement — le respawner si nécessaire
- Un agent `IDLE` dans le JSON est vivant et réutilisable via PING/PONG
