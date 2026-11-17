# CLAUDE.md — {PROJECT_NAME}

> **Repo** : `{ORG}/{PROJECT}`
> **Branche principale** : `main`
> **Versionnement** : `X.Y.Z.a` en dev / `X.Y.Z` en prod — voir `.claude/commands/context/VERSIONING.template.md` section 5

---

## Démarrage de Session

```
1. Lancer /start-session
2. Lire .claude/memory/MEMORY.md (état du projet, décisions, version courante)
3. Attendre les instructions de l'utilisateur
```

---

## Configuration Projet

| Paramètre | Valeur |
|-----------|--------|
| Projet | `{PROJECT_NAME}` |
| Team | `{TEAM_NAME}` |
| Backend | `{BACKEND_TECH}` |
| Frontend | `{FRONTEND_TECH}` |
| Base de données | `{DATABASE}` |
| Build | `{BUILD_CMD}` |
| Tests | `{TEST_CMD}` |

---

## Agents Disponibles

| Nom | Rôle | Fichier | Spawn |
|-----|------|---------|-------|
| `planner` | Plan d'implémentation + contrats API | `.claude/agents/implementation-planner.template.md` | socle |
| `dev-backend` | Backend ({BACKEND_TECH}) | `.claude/agents/dev-backend.template.md` | milestone |
| `dev-frontend` | Frontend ({FRONTEND_TECH}) | `.claude/agents/dev-frontend.template.md` | milestone |
| `dev-plugin` | Plugin ({PLUGIN_PLATFORM}) | `.claude/agents/dev-plugin.template.md` | milestone |
| `dev-firmware` | Firmware embarqué | `.claude/agents/dev-firmware.template.md` | milestone |
| `test-writer` | Scripts de tests + procédures QA | `.claude/agents/test-writer.template.md` | milestone |
| `code-reviewer` | Revue de code | `.claude/agents/code-reviewer.template.md` | milestone |
| `qa` | Exécution des tests et validation | `.claude/agents/qa.template.md` | milestone |
| `doc-updater` | Documentation | `.claude/agents/doc-updater.template.md` | milestone |
| `deployer` | Build + Publication + Déploiement QUALIF/PROD | `.claude/agents/deploy.template.md` | socle |
| `security` | Audit sécurité | `.claude/agents/security.template.md` | ponctuel |
| `infra` | Infrastructure (si configurée) | `.claude/agents/infra.template.md` | ponctuel |
| `marketing` | Communication de release (release notes, posts, site `gh-pages`) | `.claude/agents/marketing-release.template.md` | ponctuel |

> **Agents `dev-*`** : une ligne par agent de stack inscrit au registre des agents (`agents.registry[]` de
> `project-config.json`) — les lignes des stacks non configurées sont retirées. Plusieurs instances d'une même
> catégorie (ex. `| dev-firmware-capteur | Firmware capteur (ESP32) — firmware/sensor/** | .claude/agents/dev-firmware-capteur.template.md | milestone |`)
> ont chacune leur ligne, leur rôle et leur périmètre ; une stack sans template dédié utilise `dev-generic`
> (stack définie par le compagnon `<nom>.md`, obligatoire).

> **Spawn** (`agents/context/MILESTONE_CADRAGE.md` 4.1) : `socle` = au `/start-session`, toujours ; `milestone` = si
> l'agent est dans la team du milestone, validée au GATE 2 (la team d'un milestone en cours est respawnée au
> `/start-session`) ; `ponctuel` = à la demande, puis arrêté. Valeur historique `permanent` = `socle`.

> **Fichier** pointe vers le `.template.md` — géré par sync, toujours présent. Un compagnon
> `.md` (sans suffixe) peut exister à côté pour des adaptations projet ; il est optionnel et
> n'est jamais référencé ici puisqu'il ne contient jamais la définition complète de l'agent.

> **Agents génériques** (projets non-dev) : une ligne par instance déclarée à l'init (`agents.generic[]`
> de `project-config.json`), ex. `| redacteur-pptx | <rôle> | .claude/agents/generic.template.md + generic.redacteur-pptx.md | socle |`.
> Le template `generic` est commun ; la spécification de chaque instance vit dans `.claude/agents/generic.<nom>.md`.


> Pour `deployer` : la procédure concrète de PUBLISH/DEPLOY (un fichier par tâche × environnement)
> vit dans `.claude/agents/environments/{publish,deploy}.<env>.md` — voir `agents/deploy.md`
> section "Fichiers d'Environnement".

---

## Commandes Disponibles

| Commande | Usage |
|----------|-------|
| `/start-session` | Démarrer la session (team, mémoire, backlog) |
| `/end-session` | Clôturer la session (mémoire, git, dissolution team) |
| `/team-status` | État des agents, fermeture sélective |
| `/feature <desc>` | Nouveau workflow feature |
| `/bugfix <desc>` | Workflow correction de bug |
| `/hotfix <desc>` | Correction urgente prod |
| `/refactor <desc>` | Refactoring |
| `/build` | Compilation de la version candidate — agnostique à l'environnement |
| `/publish qualif\|prod` | Mise à disposition pour un environnement (promotion ou rebuild déterministe via CI) |
| `/deploy qualif\|prod` | Installation de l'artefact déjà publié |
| `/review [scope]` | Revue de code |
| `/qa [scope]` | Validation QA |
| `/secu [scope]` | Audit sécurité |
| `/backlog [desc]` | Consulter / traiter les GitHub Issues |
| `/milestone status` | Progression du milestone actif |
| `/progression` | État d'avancement des agents en cours |
| `/context-audit [scope]` | Audit doc (doublons, refs cassées) |
| `/init-project` | Réinitialiser / mettre à jour le projet |

---

## Mémoire Projet

`.claude/memory/MEMORY.md` — source de vérité pour démarrer une session.

Contient : version courante, travail en cours (branche, phase, issues), décisions techniques, règles critiques projet.

**Mettre à jour** via `/end-session` en fin de session.

---

<!-- BEGIN TEAMLEADER_PROTOCOL — maintenu par le template, ne pas modifier manuellement -->

## Rôle Teamleader — Règles Critiques

> Ce bloc est maintenu par le template (`/init-project` option d, step d6). Volontairement court : `CLAUDE.md` est
> chargé par **chaque** teammate, qui n'a pas besoin des règles du teamleader. Règles complètes :
> `.claude/agents/teamleader.template.md` (+ `cdp.template.md`) — **les relire après chaque compactage du contexte**.

- **Identité** : tu es le teamleader et le CDP — tu coordonnes et dispatches (`SendMessage`), tu n'exécutes aucune
  tâche technique. Interdits : `Edit`/`Write`/`MultiEdit` (sauf ordre `_work/tasks/*.md`, état
  `.claude/workflow-state.json` et `.claude/workflow/*`), `Bash` build/test/git (sauf `checkout`/`switch`/`reset`/
  `stash` du checkout principal), `Read`/`Glob`/`Grep` sur le code applicatif.
- **`Read` autorisé** : `CLAUDE.md`, `MEMORY.md`, `project-config.json`, `_work/tasks|handoff|reports/*.md`,
  `contracts/CHANGELOG.md` — et un rapport seulement quand c'est utile (point suivant).
- **`DONE` par exception** : `Verdict : OK` + `Conformité : conforme` → continuer sans ouvrir le fichier ; l'ouvrir
  (bloc `## Résumé` d'abord) sur KO / réserves / écart / `BLOQUE`, ou pour préparer un GATE utilisateur.
- **Questions à l'utilisateur** : toujours `AskUserQuestion`, jamais en texte (procédure : `teamleader.template.md`).
- **Dispatch** : uniquement `SendMessage` (ordre > 3 lignes → `_work/tasks/`), noms canoniques sans suffixe ; agent
  clearable : `/clear` puis la tâche dans le même tour. Spawn seulement : team du milestone au GATE 2, agents
  `ponctuel`, agent perdu.
- **Lots** : aucun ordre pour LOT-N+1 tant que LOT-N n'est pas terminé ET validé (`cdp.template.md` « Verrou »).

<!-- END TEAMLEADER_PROTOCOL -->

---

## Confinement des fichiers de travail — INTERDIT de sortir du projet

**Tout fichier ou dossier créé pendant le travail reste DANS le dossier du projet.** Jamais de
`../`, de chemin absolu hors du repo, ni de `~/`. **Seule exception : `/tmp`** (ou `$TMPDIR`) pour un temporaire
**non vital** au projet (voir ci-dessous).

| Besoin | Emplacement obligatoire |
|--------|-------------------------|
| Worktree git (isolation d'exécution, sans nouvelle branche) | `.claude/worktrees/<nom>` — jamais `../<repo>-<nom>` ni `/tmp/...` |
| Worktree du site marketing | `MARKETING/` (racine du projet) |
| Fichier / dossier temporaire **utile au projet** (sortie intermédiaire lue par un autre agent ou une étape suivante, backup avant écrasement, fichier d'une procédure du template, contenu privé ou issu de `PRIVATE/`) | `_work/tmp/` (créé à la demande, gitignoré) |
| Temporaire **non vital** (jetable : scratch d'une seule commande, sortie brute filtrée sur place, téléchargement d'outil, cache de build/test) — perdu sans conséquence, lu par personne d'autre | `/tmp` autorisé : `mktemp -d /tmp/<projet>-<agent>-XXXX` (jamais un nom fixe partagé) |
| Ordres du teamleader (> 3 lignes), rapports et handoffs inter-agents | `_work/tasks/`, `_work/reports/`, `_work/handoff/` |

- Fichiers temporaires : `mkdir -p _work/tmp && mktemp -p _work/tmp ...` ; les supprimer en fin de tâche.
- `/tmp` : uniquement pour le non vital. En cas de doute (un autre agent ou une reprise en aurait besoin, contenu
  sensible — `/tmp` est partagé par tout le poste/conteneur) → `_work/tmp/`. Jamais de worktree, de livrable, de
  rapport/handoff ni d'élément privé dans `/tmp`. Supprimer son dossier `/tmp/<projet>-…` en fin de tâche.
- Worktrees : `git worktree add --detach .claude/worktrees/<nom> <ref>` (sans créer de branche) puis `git worktree remove` en fin de tâche.
- Branche courante : fixée par le teamleader seul ; les agents ne font ni `checkout`/`switch`/`reset` ni retour à un commit précédent dans le checkout principal (`BRANCH REQUEST` au teamleader) — voir `agents/context/COMMON.md`.
- Ces dossiers sont gitignorés (`_work/`, `.claude/worktrees/`) — ne jamais les commiter.
- Si un outil impose un emplacement externe : accepté s'il s'agit de temporaire non vital (`/tmp`, `$TMPDIR`) ;
  sinon rediriger via `TMPDIR=$PWD/_work/tmp` ; en cas d'impossibilité, **BLOQUE** et demande au teamleader/utilisateur.

---

## Éléments privés — dossier `PRIVATE/`

**Tout élément privé qui ne doit jamais être commité se range dans `PRIVATE/`** (racine du projet, gitignoré) :
accès aux environnements (kubeconfig, tokens Kubernetes et de comptes de service, clés SSH, JSON de compte
cloud, certificats `*.pem`/`*.key`, keystores), comptes et identifiants notés, exports et dumps de données
réelles, documents client ou contractuels, notes personnelles, configuration locale propre à un poste.

Rangement — un dossier par portée (le nom d'environnement est celui de `infrastructure.environments[].name`) :

```
PRIVATE/
├── gitconfig        # lié à la structure du projet (inclus par le conteneur) — reste à la racine
├── GLOBAL/          # données privées communes au projet (comptes, ACCES.md, dumps, documents client, notes)
└── <ENV>/           # données privées d'un environnement précis (ex. PROD/kubeconfig, QUALIF/deploy_key)
```

| Élément | Emplacement |
|---------|-------------|
| Élément privé lié à un environnement | `PRIVATE/<ENV>/` (ex. `PRIVATE/PROD/kubeconfig`, `PRIVATE/QUALIF/deploy_key`) |
| Élément privé commun au projet | `PRIVATE/GLOBAL/` (ex. `PRIVATE/GLOBAL/ACCES.md`, `PRIVATE/GLOBAL/dumps/`) |
| Variables lues par `/deploy` (globales, par environnement) | `.env`, `.claude/agents/environments/<env>.env` — emplacements fixes liés à la structure du projet, **pas** dans `PRIVATE/` ; une variable qui désigne un fichier d'accès pointe dans `PRIVATE/<ENV>/` (ex. `KUBECONFIG=PRIVATE/PROD/kubeconfig`) |
| Fichier temporaire de travail | `_work/tmp/` (purgé, pas un stockage durable) — jamais `/tmp` pour un contenu privé |

- **`PRIVATE/` est partagé** : un seul exemplaire, à la racine du checkout principal, utilisé par tous les
  teammates — jamais copié (copier un secret le multiplie). Depuis un worktree :
  `PRIVATE_DIR="$(git rev-parse --path-format=absolute --git-common-dir)/../PRIVATE"`, ou un lien symbolique
  `ln -s <checkout principal>/PRIVATE <worktree>/PRIVATE` (ignoré par la ligne `/PRIVATE` du `.gitignore`).
- **Qui range quoi** : `infra` tient la structure et le contenu attendu (crée `GLOBAL/` et un dossier par
  environnement, y range les accès qu'il établit) ; `deployer` lit seulement ; tout teammate qui produit une
  donnée privée la range lui-même dans `GLOBAL/` ou `<ENV>/`. Un nouveau sous-dossier hors de cette structure :
  demander au teamleader. Aucune valeur secrète n'est inventée par un agent — elle est fournie par l'utilisateur.
- Avant de créer un fichier contenant une donnée privée : le placer dans `PRIVATE/` ; le code et la config trackés
  ne référencent `PRIVATE/` que par chemin relatif, jamais par copie de son contenu.
- Élément privé trouvé tracké hors `PRIVATE/` : **BLOQUE** et signaler au teamleader (déplacement + `git rm --cached`
  décidés par l'utilisateur ; un secret déjà poussé reste dans l'historique → rotation à prévoir).
- Ne jamais retirer `PRIVATE/` du `.gitignore` ni forcer son ajout (`git add -f`).
- Le contenu attendu de `PRIVATE/` est établi par `/init-project` (Étape 10b) → `project-config.json` → `private`.

---

## Outil manquant — environnement de bootstrap

Un outil absent du conteneur (commande introuvable, version insuffisante) ne s'installe pas « à la main » en
silence : il est **décrit** puis **ajouté à l'environnement de bootstrap** pour que toute session future l'ait.

1. Le teammate qui le constate : `[NOM] BLOQUE outil manquant` au teamleader, avec la fiche — outil, usage dans
   la tâche, version minimale, paquets (`apt` / `dnf` / `apk`) ou commande d'installation idempotente,
   contournement éventuel.
2. Le teamleader transmet la fiche à `infra` (jamais d'installation par le teamleader lui-même).
3. `infra` l'ajoute à `.claude-launcher/env.yaml` (ajouts propres au projet — **jamais** `env-template.yaml`,
   réécrit par `/init-project`), l'installe dans le conteneur courant si possible (débloque la session sans
   redémarrage), vérifie si la CI / le Dockerfile en ont aussi besoin, et signale l'outil au teamleader s'il
   vaut pour toute la stack (à proposer au template).

---

## Conventions Git

- **Branches** : `milestone/vX.Y.Z` — accueille tout le travail FEATURE/BUGFIX/HOTFIX/REFACTOR
  du cycle (un seul milestone en développement à la fois)
- **Commits** : `type(scope): message` — types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- **Tags** : `vX.Y.Z` — la CI patche et publie la release automatiquement
- **Jamais de travail direct sur `main`** — la branche milestone n'y est mergée qu'au déploiement PROD
