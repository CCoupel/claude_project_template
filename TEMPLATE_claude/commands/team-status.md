# Commande /team-status

Afficher l'état de la team et optionnellement fermer des teammates.

## Usage

```
/team-status
```

## Instructions

### Etape 1 — Lire la liste des teammates

```bash
cat .claude/workflow-state.json 2>/dev/null || echo '{"teammates":[]}'
```

Si la liste `teammates` est vide → afficher :

```
Aucun teammate spawned. Aucune team active.
```

Et s'arrêter ici.

### Etape 2 — Afficher le tableau

```
Team : {TEAM_NAME}

| # | Teammate     | Spawned dans cette session |
|---|--------------|---------------------------|
| 1 | dev-backend  | oui                        |
| 2 | planner      | oui                        |
| 3 | qa           | oui                        |
```

### Etape 3 — Proposer les actions

```
Actions disponibles :
  [F] Fermer des teammates (saisir les numéros séparés par virgule : 1,3)
  [Q] Quitter sans action
```

Attendre la saisie de l'utilisateur.

### Etape 4 — Fermeture [F]

Pour chaque teammate sélectionné :

```
1. TaskStop(<nom>)
2. Retirer le nom de la liste dans .claude/workflow-state.json
3. Afficher : "✓ <nom> stoppé"
```

### Etape 5 — Résumé

```
Terminé.
  Teammates actifs restants : N
```

## Règles

- `/team-status` est un outil de consultation et de nettoyage — pas d'orchestration
- Écrire `.claude/workflow-state.json` sur disque après chaque modification
- Un teammate fermé doit être retiré de la liste pour que le teamleader puisse le respawner si besoin
