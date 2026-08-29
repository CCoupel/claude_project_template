# Commande /team-delete

Fermer des teammates de la team.

## Usage

```
/team-delete            # ferme uniquement les teammates IDLE (aucune tâche en cours)
/team-delete --force    # ferme TOUS les teammates actifs, sans exception
```

## Instructions

### Etape 1 — Lister les teammates réellement actifs

```
ListAgents()
→ extraire les noms sous la section "Teammates (N)" du résultat
```

Si aucun teammate actif → afficher `"Aucun teammate actif."` et s'arrêter.

Ne jamais confondre avec les "Peer sessions" listées par `ListAgents` (autres sessions Claude
Code, locales ou cloud) — ne jamais les arrêter, elles ne font pas partie de cette équipe.

**Exclure du mode par défaut** (sans `--force`) tout nom commençant par `sub-planner-`,
`sub-reviewer-` ou `sub-qa-` — ce sont des sous-agents temporaires gérés exclusivement par le
CDP (spawn/fermeture ciblée par nom, voir `context/TEAMMATES_PROTOCOL.md` section 6). Même
IDLE, ne pas les inclure dans le balayage par défaut : un sous-agent IDLE de ce type est
généralement en attente légitime (ex. boucle de révision GATE 2 du planner), pas orphelin.
`--force` reste la voie de secours si l'un d'eux est réellement orphelin (ex. après un crash de
session) — dans ce cas seulement, les inclure comme n'importe quel teammate actif.

### Etape 2 — Déterminer l'état de chaque teammate

Pour chaque teammate, déterminer l'état à partir du dernier message de protocole reçu
(voir `TEAMMATES_PROTOCOL.md`) :

- **IDLE** : dernier message reçu = `DONE` (ou `ACTIF` initial, sans tâche dispatchée depuis)
- **EN COURS** : une tâche a été dispatchée et aucun `DONE`/`BLOQUE` n'a encore été reçu

### Etape 3 — Sélection selon le mode

| Mode | Sélection |
|------|-----------|
| Sans `--force` | Uniquement les teammates **IDLE** |
| Avec `--force` | **Tous** les teammates actifs, y compris ceux EN COURS |

Sans `--force`, si aucun teammate n'est IDLE (tous EN COURS) → afficher la liste des
teammates occupés et suggérer `--force` si l'utilisateur veut vraiment tout fermer.
Pas de confirmation interactive supplémentaire en mode `--force` : le flag vaut confirmation.

### Etape 4 — Fermeture

Pour chaque teammate sélectionné (nom exact tel que listé) :

```
TaskStop({ task_id: "<nom-teammate>" })
```

### Etape 5 — Vérification

```
ListAgents() → confirmer que les teammates fermés n'apparaissent plus
```

## Règles

- Ne jamais fermer un teammate EN COURS sans `--force`
- Ne jamais fermer une "Peer session"

## Exemple

```
/team-delete
Team : {TEAM_NAME}
Teammates IDLE fermés : dev-backend, planner
Teammates EN COURS conservés : qa (tâche en cours) — relancer avec --force pour forcer

/team-delete --force
Team : {TEAM_NAME}
3 teammate(s) fermés (dev-backend, planner, qa), y compris ceux en cours de tâche.
```
