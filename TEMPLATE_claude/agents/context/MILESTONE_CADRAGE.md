# Cadrage du milestone — intensite, options de workflow, team

> **Source unique** des regles de cadrage. Lu par le teamleader (role CDP) au lancement d'un milestone et a chaque
> phase dont le deroulement depend du cadrage, et par le planner (section « Cadrage du milestone » du plan).

---

## 1. Deux niveaux de reglage

| Niveau | Quoi | Ou | Quand ca change |
|---|---|---|---|
| **Projet** (cadrage global : atelier/brief de `/init-project`, `docs/CADRAGE.md`, acces valides a l'etape 8b) | Ce qui existe : stacks et agents DEV, environnements disponibles (QUALIF ou non), CI, site marketing, conventions — et les **valeurs par defaut** des milestones (`milestone.defaults`) | `.claude/project-config.json`, `CLAUDE.md` | Rarement — `/init-project`, option d « Appliquer les mises a jour detectees » |
| **Milestone** | Comment ce milestone est mene : intensite, options de workflow, team | `.claude/workflow-state.json` (`cadrage`) + bloc « Cadrage » de la description GitHub du milestone | A chaque lancement de milestone, valide au GATE 2 |

Le niveau projet borne le niveau milestone : un milestone ne peut pas demander une QUALIF que le projet n'a pas
(`infrastructure.environments[]` sans entree `QUALIF` → `qualif` force a `false`).

## 2. Intensites et options

Une **intensite** est un prereglage des options ; chaque option reste ajustable une a une (par le planner, puis
l'utilisateur au GATE 2). Les phases ne lisent **que les options**, jamais le nom de l'intensite.

| Option (`cadrage.*`) | `leger` | `complet` | Effet si desactivee (section 5) |
|---|---|---|---|
| `test_writer` | `false` | `true` | Les agents DEV ecrivent eux-memes les tests de leurs changements |
| `review` | `false` | `true` | Pas de phase REVIEW : QA seule (`code-reviewer` reste disponible a la demande) |
| `qualif` | `false` | `true` (si le projet a une QUALIF) | Validation humaine (GATE LOT / GATE 4) sur l'artefact du BUILD, puis PROD sans QUALIF |
| `doc` | `dev` | `agent` | `dev` : les agents DEV tiennent `CHANGELOG.md` dans leurs commits, pas de `doc-updater` |

Valeurs par defaut (niveau projet, `project-config.json`) — ecrites par `/init-project`, modifiables a la main :

```json
"milestone": { "defaults": { "patch": "leger", "minor": "complet", "major": "complet" } }
```

**Invariants — jamais desactivables**, quelle que soit l'intensite : milestone + branche `milestone/vX.Y.Z`,
versionnement `X.Y.Z.a`, labels de phase, QA, CI verte avant fermeture des issues et avant merge, validation
humaine avant PROD (GATE 4), historique GitHub du milestone.

## 3. Deroulement

```
Lancement (CDP, Phase Init — 1re ouverture de la branche)
  └─ intensite de depart (regles 3.1), transmise au planner — aucune question a l'utilisateur ici
PLAN (planner)
  └─ section « Cadrage du milestone » du plan : options + team, chacune justifiee
GATE 2 (utilisateur)
  └─ valide le plan ET le cadrage en une seule question
Application (CDP) — section 4
```

### 3.1 Intensite de depart (CDP, sans lire le code)

Les donnees viennent du `DONE` de l'ordre `MILESTONE START` (`agents/deploy.md` Tache MILESTONE) : type de version,
nombre d'issues, labels `breaking` / `security` presents, QUALIF disponible.

1. Type de version (`X` change par rapport a la derniere version livree → `major` ; `Y` → `minor` ; sinon `patch`) :
   intensite = `milestone.defaults.<type>` (absent → `complet`).
2. **Relever a `complet`** si une issue du milestone porte `breaking` ou `security`, ou si le milestone compte plus
   de 5 issues.
3. Transmettre au planner : `Intensite de depart : <leger|complet> — <raison>` et `QUALIF disponible : oui|non`.

### 3.2 Section « Cadrage du milestone » du plan (planner)

Le planner part de l'intensite de depart et l'ajuste d'apres son analyse du code — il peut **relever** une option
(ex. « touche l'authentification → `review: true` », « nouvelle API publique → `test_writer: true` ») ou
**l'abaisser** en le justifiant. Il compose la **team** : les agents de type `milestone` (section 4.1) dont le plan
a besoin — agents DEV d'apres le perimetre des taches, `test-writer` / `code-reviewer` / `doc-updater` selon les
options, `qa` toujours. Format : voir `implementation-planner.md` « Format du Plan ».

### 3.3 GATE 2

Le resume du cadrage (intensite, options modifiees par rapport a l'intensite de depart, team) est presente avec le
plan. Une seule question : « Valides-tu ce plan et ce cadrage ? » — Valider (Recommande) / Ajuster le cadrage
(l'utilisateur precise, champ « Autre » ; redispatch au planner) / Revoir le plan.

## 4. Application du cadrage (CDP, des la validation du GATE 2 — ou du GATE 1 pour un bugfix sans plan, du routage pour un hotfix, section 6)

1. **Etat** : ecrire `cadrage` dans `.claude/workflow-state.json` (`context/CDP_WORKFLOWS.md` section 12).
2. **GitHub** : ordre a `deployer` `MILESTONE CADRAGE vX.Y.Z : intensite <i> ; test_writer <b> ; review <b> ; qualif <b> ;
   doc <agent|dev> ; team <liste>` (bloc « Cadrage » de la description + evenement d'historique dont l'etat resume
   les options, ex. `📋 leger · tests:DEV review:non qualif:non doc:DEV` — une revision qui change une seule option
   est donc tracee,
   `agents/deploy.md` Tache MILESTONE).
3. **Team** : spawner les agents de la team absents (meme prompt que `commands/start-session.md` etape 4) et
   attendre leurs `ACTIF` ; arreter (`TaskStop`) les agents de type `milestone` actifs mais absents de la team.
   Le planner (type `socle`) reste.

Un milestone en cours **garde son cadrage jusqu'a sa cloture**. Un changement ne vaut que pour le milestone suivant —
sauf retour en PLAN (Cas B d'un GATE refuse) : le nouveau plan peut reviser le cadrage, revalide au GATE 2.

### 4.1 Types de spawn (colonne `Spawn` de la table « Agents Disponibles » de `CLAUDE.md`)

| Type | Spawne | Agents (defaut du template) |
|---|---|---|
| `socle` | Au `/start-session`, toujours | `planner`, `deployer` |
| `milestone` | Au GATE 2, si l'agent est dans la team du milestone ; au `/start-session`, si un milestone en cours l'a dans son cadrage | agents DEV, `test-writer`, `code-reviewer`, `qa`, `doc-updater` |
| `ponctuel` | A la demande d'une commande ou d'une phase, puis arrete | `security`, `infra`, `marketing` (et `pr-reviewer`, hors table) |

Valeur historique `permanent` (projet non synchronise, instance generique) = `socle`.

### 4.2 Team perdue en cours de session — et agent absent au dispatch

**Effectif attendu** a tout moment d'un workflow en cours : agents `socle` + `cadrage.team` (sans `cadrage` : tous les
agents `milestone` si `plan` est renseigne, sinon rien de plus — memes regles que `/start-session` etape 4).

- **Reprise annoncee par Claude Code** (message du type « tes teammates (...) ont ete perdus ... relance les teammates
  necessaires pour les taches non terminees », apres un terminal tue, une coupure de WSL ou de disque) : cette consigne
  ne remplace pas la regle du template. Le teamleader respawne **tout l'effectif attendu**, pas seulement les agents
  des taches en cours — une correction de QA ou le lot suivant en auront besoin. Il applique `commands/start-session.md`
  etape 4 points 2 a 4 (modele/effort resolus, meme prompt de spawn, attente des `ACTIF` ; pas de nouveau `TeamCreate`
  si la team existe encore), puis l'etape 4bis (rapprochement etat/git/GitHub, phase interrompue rejouee depuis son
  debut, labels de phase realignes).
- **Agent absent au dispatch** (filet de securite) : avant d'envoyer un ordre, si le destinataire fait partie de
  l'effectif attendu mais n'est pas actif dans la team (perdu, jamais respawne, `SendMessage` en echec), le spawner
  (meme prompt), attendre son `ACTIF`, puis envoyer l'ordre — jamais executer la tache soi-meme, jamais bloquer le
  workflow faute d'agent. Un agent `milestone` hors `cadrage.team` n'est pas concerne : l'utiliser est une revision du
  cadrage (section 4), a faire valider par l'utilisateur.

## 5. Effets des options sur les phases

| Option a `false` / `dev` | Phase | Deroulement |
|---|---|---|
| `test_writer: false` | DEV (Batch 1) | Pas de dispatch `test-writer`. L'ordre DEV precise : « Ecris les tests (unit/integration, et E2E si le plan en demande) de tes changements, selon la section Tests Requis du plan » (`context/DEV_COMMON.md`). |
| `test_writer: false` | Bugfix — reproduction | Le test de reproduction est ecrit par l'agent DEV concerne, **avant** le fix ; RED CHECK inchange (`qa`). |
| `review: false` | REVIEW ∥ QA | Pas de dispatch `code-reviewer` : QA seule ; son verdict ouvre la suite. Un cycle = un NOT VALIDATED de QA. |
| `qualif: false` | Phase 5 | BUILD seul (pas de PUBLISH/DEPLOY QUALIF) ; GATE LOT / GATE 4 sur l'artefact local `build/candidate_vX.Y.Z/` (procedure de test adaptee au local). NR complete inchangee. |
| `qualif: false` | Phase 6 | PUBLISH PROD sans prerequis « publication validee sur l'environnement precedent » — l'ordre au `deployer` le precise (`Cadrage : sans QUALIF`). |
| `doc: dev` | DOC draft / finalize | Pas de `doc-updater` : chaque ordre DEV demande la mise a jour de `CHANGELOG.md` (et de la doc touchee) dans le commit ; GATE 4 s'ouvre sans attendre DOC finalize. |

## 6. Cas particuliers

- **Hotfix** : pas de planner — cadrage fixe, celui du flux hotfix (`agents/cdp.md` « Hotfix ») : `test_writer: true`
  (reproduction), `review: true` (rapide), `qualif: false` (PROD direct), `doc: agent` (post-mortem) ; team = agent DEV
  concerne + `test-writer` + `code-reviewer` + `qa` + `doc-updater`, spawnes des le routage (GATE 1).
- **Bugfix sans plan** : intensite de depart appliquee telle quelle ; team = agent DEV du perimetre de l'issue + `qa`
  (+ `test-writer` / `code-reviewer` selon les options). Le GATE 1 (demarrage) presente ce cadrage a la place du GATE 2.
- **Bugfix rejoignant un milestone en cours** : il suit le cadrage du milestone.
- **Hotfix rejoignant un milestone en cours** : il garde le cadrage fixe du flux hotfix (PROD directe, sans QUALIF,
  reproduction par `test-writer`) ; les agents de ce cadrage absents de la team sont spawnes pour le hotfix, sans
  modifier le cadrage du milestone.
- **Milestone en cours sans `cadrage`** (projet migre depuis la v3) : `complet`, team = tous les agents `milestone`
  de la table.
- **Reprise apres interruption** : `/start-session` respawne `socle` + la team de `cadrage` (`workflow-state.json`) ;
  une reprise annoncee par Claude Code sans `/start-session` respawne le meme effectif (section 4.2).
