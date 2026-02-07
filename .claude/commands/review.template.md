# Commande /review

Lancer une revue de code manuellement.

## Usage

```
/review [scope]
```

## Argument recu

$ARGUMENTS

## Mots-cles de controle

**Reference :** Voir `context/COMMON.md` section 12

| Mot-cle | Action |
|---------|--------|
| `help` | Affiche l'aide et les mots-cles disponibles |
| `status` | Affiche l'etat du workflow en cours |
| `plan` | Affiche le plan sans executer |
| `resume <phase>` | Reprend a une phase |
| `skip <phase>` | Saute une phase |
| `jumpto <tache>` | Demarre a une tache precise du plan |

Si `$ARGUMENTS` commence par un mot-cle -> executer l'action correspondante.
Sinon -> workflow normal.

## Scopes

| Scope | Description |
|-------|-------------|
| (vide) | Revue des changements non commites |
| `staged` | Revue des fichiers stages uniquement |
| `branch` | Revue de toute la branche vs main |
| `commit <sha>` | Revue d'un commit specifique |
| `file <path>` | Revue d'un fichier specifique |

## Exemples

```
/review                    # Changements en cours
/review staged             # Fichiers stages
/review branch             # Toute la branche
/review commit abc123      # Commit specifique
/review file src/api.ts    # Fichier specifique
```

## Rapport

Le rapport inclut :
- Problemes critiques (bloquants)
- Problemes majeurs (a corriger)
- Suggestions mineures (optionnel)
- Points positifs

**Contexte Qualite :** Voir `context/QUALITY.md`

## Agent

Lance l'agent `code-reviewer` defini dans `.claude/agents/code-reviewer.template.md`
