# Commande /deploy

Deployer l'application vers un environnement cible.

## Usage

```
/deploy <environnement>
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

## Environnements

| Environnement | Description |
|---------------|-------------|
| `qualif` | Environnement de qualification/staging |
| `prod` | Production |

## Exemples

```
/deploy qualif    # Deploiement en qualification
/deploy prod      # Deploiement en production
```

## Prerequis

### Pour QUALIF
- [ ] Tests QA passes
- [ ] Build reussi

### Pour PROD
- [ ] QUALIF validee
- [ ] Tests complets OK
- [ ] Documentation a jour
- [ ] Confirmation utilisateur

## Workflow QUALIF

```
/deploy qualif
    |
    v
Build --> Push --> Smoke Tests --> Notification
```

## Workflow PROD

```
/deploy prod
    |
    v
Confirmation --> Verification Doc --> Merge main --> Tag --> CI/CD
    |
    |-- SI OK --> Release Notes --> Monitoring
    |
    |-- SI ECHEC --> Rollback --> Analyse
```

> **Verification Doc** : CHANGELOG.md et README/docs concernes doivent etre a jour avant le merge (voir `.claude/agents/deploy.template.md`).

## Rollback

En cas de probleme :
```
/deploy rollback    # Revenir a la version precedente
```

**Contexte projet :** Voir `context/COMMON.md` section 1

## Agent

**QUALIF** — dispatch direct au teammate `deployer` (en IDLE depuis `/start-session`) :
`SendMessage({to: "deployer", content: ...})`

**PROD** — `/deploy prod` execute systematiquement la Phase 6 du CDP (validation infra PROD +
dispatch `deployer` + preparation marketing en parallele, meme tour), **sans distinction entre
une commande directe et une confirmation GATE 4 en plein cycle CDP** — les deux cas suivent
exactement le meme chemin. Voir `agents/cdp.template.md` Phase 6 pour le protocole complet
(reponses asynchrones, GATE 4d, condition de publication) et
`agents/marketing-release.template.md` pour l'agent marketing.

Spec : `.claude/agents/deploy.template.md` (+ `.claude/agents/deploy.md` si présent)
