# Commande /cdp - Controle de l'Orchestrateur CDP

Commande de controle direct de l'agent CDP (Chef De Projet) pour interroger, modifier ou controler les workflows en cours.

## Argument recu

$ARGUMENTS

## Mot-cle help

`/cdp help` -> Affiche :

```
## /cdp - Aide

**Description** : Controle direct de l'orchestrateur CDP

**Usage** :
  /cdp help                          Afficher cette aide
  /cdp status                        Etat global des workflows
  /cdp abort                         Abandonner le workflow en cours
  /cdp pause                         Mettre en pause le workflow
  /cdp resume                        Reprendre un workflow en pause
  /cdp context "information"         Ajouter du contexte
  /cdp note "remarque"               Ajouter une note au rapport
  /cdp priority [high|normal|low]    Changer la priorite
  /cdp config                        Afficher la config CDP actuelle

**Difference avec /feature status** :
  /feature status -> Etat du workflow FEATURE en cours
  /cdp status     -> Vue globale de TOUS les workflows
```

## Mots-cles disponibles

| Mot-cle | Description | Exemple |
|---------|-------------|---------|
| `help` | Affiche cette aide | `/cdp help` |
| `status` | Vue globale des workflows | `/cdp status` |
| `abort` | Abandonner le workflow actuel | `/cdp abort` |
| `pause` | Mettre en pause | `/cdp pause` |
| `resume` | Reprendre apres pause | `/cdp resume` |
| `context` | Ajouter du contexte | `/cdp context "Info supplementaire"` |
| `note` | Ajouter note au rapport | `/cdp note "A revoir avec l'equipe"` |
| `priority` | Changer priorite | `/cdp priority high` |
| `config` | Afficher config CDP | `/cdp config` |

## References

**Contexte projet :** Voir `context/COMMON.md` section 1
**Workflow CDP :** Voir `context/CDP_WORKFLOWS.md`
- Etat persistant : section 9
- Phases : section 3

## Comportement par mot-cle

### `status` - Vue globale

Affiche l'etat de tous les workflows :

```markdown
## CDP - Etat Global

**Workflow actif** : [TYPE] "[Description]"
- Branche : [branche]
- Phase : [PHASE] ([N]/[Total])
- Taches : [N]/[Total] completees
- Demarre : il y a [duree]

**Historique recent** :
- [TYPE] "[Description]" -> Complete (il y a [duree])

[Voir details] | [Reprendre] | [Abandonner]
```

### `abort` - Abandonner

1. Demande confirmation
2. Nettoie l'etat du workflow
3. Optionnel : propose de supprimer la branche

```markdown
Abandonner le workflow [TYPE] "[Description]" ?

**Etat actuel** : Phase [PHASE], [N]/[Total] taches completees
**Branche** : [branche]

Options :
- [Confirmer] Abandonner et garder la branche
- [Confirmer + Supprimer] Abandonner et supprimer la branche
- [Annuler] Retourner au workflow
```

### `pause` / `resume` - Controle du flux

- `pause` : Sauvegarde l'etat, permet de faire autre chose
- `resume` : Reprend exactement ou on s'etait arrete

### `context` - Ajouter du contexte

Ajoute une information contextuelle utilisee par les sous-agents :

```
/cdp context "Le client utilise Safari, pas Chrome"
/cdp context "L'API externe a une limite de 100 req/min"
```

Le contexte est transmis a tous les sous-agents.

### `note` - Ajouter une note

Ajoute une note qui apparaitra dans le rapport final :

```
/cdp note "A discuter avec l'equipe avant merge"
/cdp note "Performance a surveiller en production"
```

### `priority` - Changer la priorite

```
/cdp priority high    -> Priorite haute (moins de validations)
/cdp priority normal  -> Priorite normale (workflow standard)
/cdp priority low     -> Priorite basse (plus de validations)
```

### `config` - Configuration CDP

Affiche la configuration actuelle de l'orchestrateur :

```markdown
## CDP - Configuration

**Mode** : Standard
**Validation utilisateur** : Activee
**Max cycles review/QA** : 3
**Auto-commit** : Desactive
**Parallel agents** : Active
```

## Etat persistant CDP

Le CDP maintient un etat global (voir `context/CDP_WORKFLOWS.md` section 9).

## Integration avec les commandes CDP

`/cdp` complete les commandes existantes :

| Besoin | Commande |
|--------|----------|
| Lancer une feature | `/feature <description>` |
| Etat de cette feature | `/feature status` |
| Vue globale CDP | `/cdp status` |
| Ajouter contexte | `/cdp context "..."` |
| Abandonner | `/cdp abort` |

## Action immediate

Analyser `$ARGUMENTS` :

1. Si `help` -> Afficher l'aide
2. Si `status` -> Afficher etat global
3. Si `abort` -> Demander confirmation puis abandonner
4. Si `pause` -> Sauvegarder etat et mettre en pause
5. Si `resume` -> Reprendre le workflow en pause
6. Si `context "..."` -> Extraire le texte et l'ajouter au contexte
7. Si `note "..."` -> Extraire le texte et l'ajouter aux notes
8. Si `priority <level>` -> Changer la priorite
9. Si `config` -> Afficher la configuration
10. Si vide ou non reconnu -> Afficher l'aide
