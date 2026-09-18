# Commande /publish

Rendre disponible pour un environnement donne le candidat produit par `/build` — mecanisme
propre a chaque environnement (voir `agents/deploy.md`, Taches PUBLISH QUALIF / PUBLISH PROD).

## Usage

```
/publish <environnement>
```

## Argument recu

$ARGUMENTS

## Environnements

| Environnement | Mecanisme (`publish.mode`) |
|----------------|------------------------------|
| `qualif` | `promote` — copie/push tel quel du candidat BUILD, zero rebuild |
| `prod` | `rebuild-ci` — merge vers `main` + tag officiel, declenche un rebuild deterministe via CI |

> La liste des environnements et leur mecanisme sont declares dans
> `.claude/project-config.json` -> `infrastructure.environments[]` (definis a `/init-project`).
> QUALIF/PROD sont les deux environnements par defaut ; un environnement supplementaire
> (DEV, PRE-PROD...) est publiable de la meme maniere mais hors orchestration CDP automatisee.

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
Sinon -> workflow normal (environnement requis en premier argument).

## Principe

`/publish` ne build jamais — il suppose qu'un candidat existe deja (produit par `/build`).
Il prend obligatoirement un environnement en argument : le mecanisme de mise a disposition
differe selon l'environnement (promotion sans rebuild pour QUALIF, rebuild deterministe via
CI pour PROD), voir `agents/infra.md` section 3 (principe BORE).

## Prerequis

- [ ] Un candidat (`/build`) existe pour la version a publier
- [ ] PROD uniquement : documentation a jour, CHANGELOG mis a jour, publication QUALIF deja
      validee (sauf hotfix)

## Workflow

```
/publish qualif                              /publish prod
    |                                             |
    v                                             v
Verification --> Promotion --> Notification   Verification --> Doc --> Merge+Tag --> CI --> Notification
```

## Exemples

```
/publish qualif    # Mise a disposition du candidat courant pour QUALIF
/publish prod       # Merge + tag officiel + rebuild deterministe via CI pour PROD
```

## Agent

`/publish qualif` dispatch direct au teammate `deployer` (en IDLE depuis `/start-session`) :
`SendMessage({to: "deployer", content: "PUBLISH QUALIF"})`
`/publish prod` : `SendMessage({to: "deployer", content: "PUBLISH PROD"})`

En orchestration CDP, `/publish` n'est jamais invoque seul : la Phase 5 (QUALIF) du CDP
dispatch au `deployer` un ordre chaine `BUILD` puis `PUBLISH QUALIF` puis `DEPLOY QUALIF`,
et la Phase 6 (PROD) un ordre chaine `PUBLISH PROD` puis `DEPLOY PROD`, executes en sequence
par l'agent avant de repondre. Voir `agents/cdp.md` Phases 5 et 6 pour le protocole complet.

Spec : `.claude/agents/deploy.md` (voir Taches PUBLISH QUALIF / PUBLISH PROD)
