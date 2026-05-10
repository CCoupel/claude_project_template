# Commande /team-status

Afficher l'état de la team et optionnellement fermer des teammates.

## Usage

```
/team-status
```

## Instructions

### Etape 1 — Lire l'état

```bash
cat .claude/workflow-state.json 2>/dev/null || echo '{"watchdog_active":false,"agents":{}}'
```

Si le fichier est absent ou `"agents"` est vide → afficher :

```
Aucun agent actif. Aucune team en cours.
```

Et s'arrêter ici.

### Etape 2 — Afficher le tableau

Calculer pour chaque agent :
- **Durée** : si `status == "working"` → `now - last_order_sent_at` ; si `status == "idle"` → `now - idle_since`

```
Team : {TEAM_NAME}
Watchdog actif : oui / non

| # | Agent        | Statut         | Durée  |
|---|--------------|----------------|--------|
| 1 | dev-backend  | WORKING        | 12min  |
| 2 | qa           | IDLE           | 8min   |
| 3 | planner      | PENDING_DELETE | 2min   |
```

Légende des statuts :
- `WORKING` — en cours de traitement d'un ordre
- `IDLE` — en attente d'ordres (watchdog surveille)
- `PENDING_DELETE` — shutdown_request envoyé, en attente de réponse

### Etape 3 — Proposer les actions

Afficher uniquement si des agents existent :

```
Actions disponibles :
  [P] Vérifier connectivité — PING broadcast (confirme les agents réellement actifs)
  [A] Fermer tous les IDLE
  [N] Fermer agents spécifiques (saisir les numéros séparés par virgule : 1,3)
  [Q] Quitter sans action
```

Attendre la saisie de l'utilisateur.

### Etape 4a — PING-STATUS broadcast [P]

Utile après un compactage de contexte ou si le statut semble incohérent.

Envoyer `PING-STATUS` à **tous les agents listés simultanément** (un seul bloc) :

```
SendMessage({to: "<agent1>", content: "PING-STATUS"})
SendMessage({to: "<agent2>", content: "PING-STATUS"})
… (tous les agents de workflow-state.json)
```

Afficher : `⏳ PING-STATUS envoyé à N agents — attente des réponses (30s)…`

Attendre **30 secondes** les réponses `PONG(...)` :

| Réponse | Action |
|---------|--------|
| `PONG(WORKING)` | `status: "working"` dans workflow-state.json |
| `PONG(IDLE)` | `status: "idle"` dans workflow-state.json |
| `PONG(IDLE-2)` | afficher `⚠ <agent> IDLE depuis 2 cycles` — proposer fermeture |
| Pas de réponse | supprimer l'entrée + afficher `✗ <agent> non joignable — retiré` |

Écrire `workflow-state.json` immédiatement après chaque modification.

Après traitement, ré-afficher le tableau mis à jour (Etape 2) et reproposer le menu.

### Etape 4b — Appliquer la fermeture [A] ou [N]

Pour chaque agent sélectionné (ou tous les IDLE si [A]) :

```
1. SendMessage({to: "<agent>", content: "shutdown_request"})
2. Mettre status: "pending_delete" dans workflow-state.json — écrire immédiatement
3. Afficher : "⏳ shutdown_request envoyé à <agent>"
```

Attendre **30 secondes** les `shutdown_response` :
- À chaque `shutdown_response` reçu → supprimer l'entrée de `workflow-state.json` + afficher `✓ <agent> terminé`
- Après 30s, pour tout agent encore `"pending_delete"` :
  - `TaskStop(<agent>)`
  - Supprimer l'entrée de `workflow-state.json`
  - Afficher `✓ <agent> stoppé (pas de réponse)`

Écrire `workflow-state.json` immédiatement après chaque modification.

### Etape 5 — Résumé

Après fermeture [A] ou [N] :

```
Fermeture terminée.

  Agents terminés proprement : N (shutdown_response reçu)
  Agents stoppés de force    : N (TaskStop)
  Agents encore actifs       : N (WORKING — non touchés)
```

## Règles

- Ne jamais arrêter un agent `WORKING` sans confirmation explicite de l'utilisateur
- Toujours écrire `workflow-state.json` sur disque après chaque modification
- Si `watchdog_active == true` après la fermeture → le watchdog se chargera des éventuels restants au prochain cycle
- Le PING broadcast [P] ne ferme aucun agent — il retire uniquement les entrées d'agents disparus
