# Commande /publish

Construire et publier une version candidate — build once, mise a disposition commune a QUALIF
et PROD.

## Usage

```
/publish
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

## Principe

`/publish` ne prend pas d'environnement en argument : c'est le seul endroit ou l'artefact est
construit. L'artefact resultant (tague `X.Y.Z.a`) est ensuite installe tel quel par
`/deploy qualif` puis, apres validation, promu sans rebuild par `/deploy prod` — principe BORE
(Build Once, Run Everywhere), voir `agents/infra.md` section 3.

## Prerequis

- [ ] Tests QA passes
- [ ] Revue de code approuvee

## Workflow

```
/publish
    |
    v
Verification --> Increment version (a) --> Build --> Push registre --> Notification
```

## Exemples

```
/publish    # Build + publication de la version candidate courante
```

## Agent

`/publish` dispatch direct au teammate `deployer` (en IDLE depuis `/start-session`) :
`SendMessage({to: "deployer", content: "PUBLISH"})`

En orchestration CDP, `/publish` n'est jamais invoque seul : la Phase 5 (QUALIF) du CDP
dispatch au `deployer` un ordre chaine `PUBLISH` puis `DEPLOY QUALIF`, execute en sequence par
l'agent avant de repondre. Voir `agents/cdp.md` Phase 5 pour le protocole complet.

Spec : `.claude/agents/deploy.md` (voir Tache PUBLISH)
