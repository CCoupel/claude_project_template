# Commande /qa

Executer les tests et valider la qualite du code.

## Usage

```
/qa [scope]
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
| (vide) | Suite complete de tests |
| `unit` | Tests unitaires uniquement |
| `integration` | Tests integration uniquement |
| `e2e` | Tests end-to-end uniquement |
| `coverage` | Rapport de couverture |
| `quick` | Smoke tests rapides |

## Exemples

```
/qa                  # Tests complets
/qa unit             # Tests unitaires
/qa e2e              # Tests E2E
/qa coverage         # Avec rapport couverture
/qa quick            # Tests rapides
```

## Rapport

Le rapport QA inclut :
- Resultats des tests par categorie
- Couverture de code
- Tests en echec avec details
- Tests lents identifies
- Verdict final (PRET / NON PRET)

## Seuils de Qualite

| Metrique | Minimum | Ideal |
|----------|---------|-------|
| Tests unitaires | 100% pass | 100% pass |
| Couverture | 70% | >85% |
| Build | Success | Success |

**Contexte Qualite :** Voir `context/QUALITY.md`

## Agent

Vérifier si le teammate `qa` est déjà actif via `TaskList`.
Si absent → spawner avant d'envoyer la tâche :

```
Task({
  name: "qa",
  prompt: "Lis .claude/agents/context/TEAMMATES_PROTOCOL.md puis .claude/agents/qa.md. Tu fais partie de {TEAM_NAME} sur {PROJECT_NAME}. Mets-toi en IDLE après avoir envoyé ACTIF — le teamleader t'enverra ta tâche."
})
```

Attendre ACTIF, puis dispatcher via `SendMessage` :
`SendMessage({to: "qa", content: ...})`

Spec : `.claude/agents/qa.md`
