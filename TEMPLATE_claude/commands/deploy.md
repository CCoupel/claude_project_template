# Commande /deploy

Installer sur un environnement cible la version deja publiee via `/publish`. `/deploy` ne
build jamais — voir `/publish` pour la construction/mise a disposition de l'artefact
(principe BORE, `agents/infra.md` section 3).

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
- [ ] Version publiee disponible (`/publish` execute)

### Pour PROD
- [ ] QUALIF validee
- [ ] Version publiee disponible (`/publish` execute)
- [ ] Tests complets OK
- [ ] Documentation a jour
- [ ] Confirmation utilisateur

## Workflow QUALIF

```
/deploy qualif
    |
    v
Install (artefact publie) --> Smoke Tests --> Notification
```

## Workflow PROD

```
/deploy prod
    |
    v
Confirmation --> Verification Doc --> Merge main --> Tag officiel (promotion, pas de rebuild) --> Install (artefact publie)
    |
    |-- SI OK --> Release Notes --> Monitoring
    |
    |-- SI ECHEC --> Rollback --> Analyse
```

> **Verification Doc** : CHANGELOG.md et README/docs concernes doivent etre a jour avant le merge (voir `.claude/agents/deploy.template.md`).
> Le tag officiel `vX.Y.Z` est un marqueur de release, jamais un declencheur de build — l'artefact installe est celui produit par `/publish` et deja valide en QUALIF.

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
exactement le meme chemin. Le `deployer` installe l'artefact deja publie par `/publish`
(Phase 5) — aucun rebuild n'est declenche par `/deploy prod`. Voir `agents/cdp.template.md`
Phase 6 pour le protocole complet (reponses asynchrones, GATE 4d, condition de publication) et
`agents/marketing-release.template.md` pour l'agent marketing.

Spec : `.claude/agents/deploy.template.md` (+ `.claude/agents/deploy.md` si présent) — voir Tache DEPLOY QUALIF / DEPLOY PROD
