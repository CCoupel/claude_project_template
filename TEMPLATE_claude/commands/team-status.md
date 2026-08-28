# Commande /team-status

Afficher l'état de la team. Commande de lecture seule — pour fermer des teammates,
utiliser `/team-delete`.

## Instructions

### Etape 1 — Lire l'état natif

```
ListAgents()
→ extraire les noms sous la section "Teammates (N)" du résultat
```

Si aucun teammate actif → afficher `"Aucun teammate actif."` et s'arrêter.

### Etape 2 — Déterminer l'état de chaque teammate

Pour chaque teammate, déterminer l'état à partir du dernier message de protocole reçu
(voir `TEAMMATES_PROTOCOL.md`) :

- **IDLE** : dernier message reçu = `DONE` (ou `ACTIF` initial, sans tâche dispatchée depuis)
- **EN COURS** : une tâche a été dispatchée et aucun `DONE`/`BLOQUE` n'a encore été reçu

### Etape 3 — Afficher le tableau

```
Team : {TEAM_NAME}

| # | Teammate    | État     |
|---|-------------|----------|
| 1 | dev-backend | IDLE     |
| 2 | planner     | EN COURS |

Pour fermer des teammates : /team-delete (IDLE uniquement) ou /team-delete --force (tous)
```

## Règles

- Ne déclenche aucune action sur les teammates — lecture seule
