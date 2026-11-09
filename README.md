# Claude Code Project Template

Template de gestion de projet pour Claude Code.
Fournit un ensemble de commandes, agents et contextes partagés pour orchestrer
le développement, la qualité, le déploiement et la communication de release.

---

## Installation

### Option A — Launcher (recommandé)

**Claude-Launcher-NG2** : hub tmux pour piloter plusieurs projets Claude Code en parallèle (teams
mises en page, vignettes, reprise après crash, sync automatique de `init-project.md`), sur l'hôte
ou **en conteneur** (podman, docker, ssh, Kubernetes) — maintenu dans son propre repo, compagnon de
celui-ci :

```bash
os=$(uname -s | tr A-Z a-z); arch=$(uname -m)
case "$arch" in x86_64) arch=amd64 ;; aarch64) arch=arm64 ;; esac
curl -fsSL "https://github.com/CCoupel/Claude-Launcher/releases/latest/download/claude-launcher-ng2-$os-$arch" \
  -o ~/.local/bin/claude-launcher-ng2 && chmod +x ~/.local/bin/claude-launcher-ng2 && claude-launcher-ng2
```

Documentation complète (configuration, backends, mise à jour) :
[CCoupel/Claude-Launcher](https://github.com/CCoupel/Claude-Launcher) ·
[site](https://ccoupel.github.io/Claude-Launcher/)

Avec le launcher NG2 (**≥ v5.5.0**), un projet s'exécute dans un **conteneur** décrit par deux fichiers versionnés
de `.claude-launcher/` :

| Fichier | Propriétaire | Règle |
|---------|--------------|-------|
| `env-template.yaml` | le template | **Régénéré entièrement** par `/init-project` à chaque passage (Étape 9c, option d : d1j), sans fusion, de façon déterministe (même stack = même fichier à l'octet près, réécrit seulement s'il change — sinon chaque passage ferait rejouer le `setup` des conteneurs) ; en-tête « NE PAS MODIFIER » |
| `env.yaml` | le projet | Ajouts propres au projet (image choisie par F2, paquets, étapes, `prefer`). Le template n'y écrit **jamais** et ne le crée pas (le launcher crée un squelette au besoin) |

Le launcher fusionne **config du launcher → `env-template.yaml` → `env.yaml`** : `image` de `env.yaml` sinon du
template ; `packages`, `packages_by_manager`, `watch`, `local` réunis ; `setup` / `on_start` à la suite (launcher,
template, projet) ; `mounts` réunis par `path` (`ro` de `env.yaml` prioritaire) ; `prefer` réservé à `env.yaml`.
Un projet ne peut pas retirer un élément du template : `env-template.yaml` ne contient que ce que la stack exige —
paquets, `setup` rejouable sans effet de bord (`npm ci`, venv, toolchain Go…), verrous en `watch`, dossiers dérivés en
`local` (`node_modules`, `.venv`, y compris en sous-dossier, privés au conteneur) — plus un **socle commun** à tous
les projets : `gh`, `jq`, et l'inclusion de `PRIVATE/gitconfig` (créé s'il manque, gitignoré : git s'authentifie par
`gh` avec `$GH_TOKEN`, sans secret dans le fichier) dans le `~/.gitconfig` du conteneur.
Projet dont `env.yaml` était généré par une version antérieure du template : `/init-project` (option d) propose la
**migration** — retire de `env.yaml` ce que génère le template, garde une image différente et les ajouts manuels,
montre le diff et demande confirmation. **Claude-Launcher < v5.5.0 ignore `env-template.yaml`** : un projet migré
perdrait l'environnement de sa stack, voire repasserait sur l'hôte.

> **Version majeure commune.** Depuis la v5, le template et le launcher partagent leur version
> majeure : le template **v5** va avec **Claude-Launcher v5 (NG2)**. Un launcher vX n'adopte que
> les versions du template de majeure ≤ X ; les versions mineures restent indépendantes, sauf
> fonctionnalité commune (publiée sous le même numéro des deux côtés).
>
> **Passage d'une majeure à l'autre** : fermer tous les projets avant de changer de version
> majeure du launcher (voir
> [Passage à la v5](https://github.com/CCoupel/Claude-Launcher#passage-à-la-v5)).

> **Déjà installé avant `v3.0.0` ?** Le launcher vivait ici auparavant — votre script cherche
> encore ses mises à jour sur ce repo, qui ne l'héberge plus. Installez NG2 avec la commande
> ci-dessus ; détails :
> [notes de la release v3.0.0](https://github.com/CCoupel/claude_project_template/releases/tag/v3.0.0)
> · [procédure de migration complète](https://github.com/CCoupel/Claude-Launcher#migration-depuis-claude_project_template).

Lancer ensuite `/init-project` dans Claude Code.

### Option B — Fichier seul

```bash
mkdir -p <mon-projet>/.claude/commands

curl -fsSL \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/init-project.md \
  -o <mon-projet>/.claude/commands/init-project.md
```

Ouvrir le projet dans Claude Code et lancer `/init-project`.

`/init-project` fetche automatiquement `TEMPLATE_claude/` depuis GitHub,
détecte la stack et génère la configuration complète. Sans remote `origin`, il demande le repo GitHub (existant,
ou à créer via `gh repo create`). Il fixe la **licence** : détectée (`LICENSE`, manifestes) et seulement
confirmée, fournie (identifiant SPDX ou fichier), propriétaire, reportée, ou **choisie avec un guide** — synthèse des
principales licences open source puis 4 questions (réutilisation dans du logiciel fermé, SaaS, brevets, forme du
livrable) aboutissant à une recommandation ; le fichier `LICENSE` est créé à la finalisation (jamais écrasé). Il
**étudie les éléments privés** (Étape 10b) : ce qui doit ou peut aller dans `PRIVATE/` (gitignoré) — fichiers déjà
trackés suspects, non trackés, et accès attendus (kubeconfig, tokens k8s, clés SSH, comptes). Sur un **projet vide**, trois entrées : le **brief** (un texte de présentation
ou de préparation du projet — passé avec la commande, collé dans la conversation, ou lu dans `BRIEF.md` /
`docs/BRIEF.md` / un `README.md` descriptif — dont il déduit une **proposition de cadrage** puis ne pose que des
**questionnaires de précision** sur ce que le texte ne dit pas, valeurs déduites en option recommandée), le
**workshop de cadrage** (21 questions en 6 phases, par choix guidés) ou le **questionnaire rapide** (stack seule).
Dans les deux premiers, les **solutions existantes** ne sont pas demandées : Claude les cherche sur le web, présente un
tableau sourcé (3 à 5 solutions, couverture des cas d'usage v1, limites, modèle), et fait seulement valider le
**différenciateur** — ou l'adoption d'une solution existante si elle couvre déjà tout le besoin.
Brief et workshop produisent la **fiche de cadrage** `docs/CADRAGE.md` (brief d'origine verbatim + valeurs finales
avec leur provenance), relue par le planner et le marketing ; un projet avec code existant peut aussi être cadré
depuis un brief (stack détectée, phases produit déduites). Avec un remote GitHub, il crée les labels de phase ; pour
un **nouveau projet** (aucun code détecté), il crée en plus le **premier milestone `v0.1.0`** et ses **issues de base**
(squelette du projet, pipeline CI/CD, publication/déploiement du premier environnement, README, et une issue par
cas d'usage v1 de la fiche de cadrage) après validation de la liste — jamais sur un projet avec code existant,
déjà doté de milestones ou de tags, ni lors d'une mise à jour. Il se termine par un **audit du contexte** :
commit d'init (point de retour), puis `/context-audit` complet — placeholders non remplacés, références
cassées, incohérences `project-config.json` ↔ `CLAUDE.md` ↔ agents. Les corrections sont committées à part
(`git show HEAD`), puis tout est **publié sur `main` et poussé**, sans question : sur `main` → push ; sur une autre
branche (ex. milestone en cours) → seuls les commits de l'init sont reportés sur `main` (cherry-pick dans un worktree),
la branche n'est jamais mergée. Jamais de `--force` ; un push refusé (protection de branche) est signalé dans le
message de fin.

---

## Architecture

```
Repo template (ce repo)          Projet cible après /init-project
─────────────────────────        ──────────────────────────────────
README.md                        README.md  (projet)
init-project.md          ──┐
CLAUDE.md                  │     .claude/
TEMPLATE_claude/           │     ├── commands/
├── commands/              │     │   ├── *.md          ← sync depuis TEMPLATE_claude/ (gitignore, /xxx)
│   └── context/           │     │   └── init-project.md ← point d'entrée (tracké git)
├── agents/                │     ├── agents/
│   └── context/           └──►  │   ├── *.template.md ← sync depuis TEMPLATE_claude/ (gitignore)
├── templates/                   │   ├── *.md          ← adaptations projet par agent (tracké git)
│   └── workflows/               │   ├── context/*.template.md ← sync (gitignore)
├── INITIALIZATION.md            │   ├── context/*.md  ← adaptations projet par contexte (tracké git)
├── CLAUDE_TEMPLATE.md           │   └── dev-*.template.md ← agent de stack, sync via le registre (gitignore)
└── .template-source.json        ├── CLAUDE.md         ← généré (tracké git)
                                 ├── project-config.json ← généré (tracké git)
                                 └── memory/           ← tracké git (MEMORY.md initialisé en fin d'init)

                                 TEMPLATE_claude/      ← gitignore (fetché depuis GitHub)
                                 .gitignore            ← généré par /init-project
```

### Règle simple

| Dossier | Dans le projet cible | Dans git |
|---------|----------------------|----------|
| `TEMPLATE_claude/` | Source template | Non (gitignore) |
| `.claude/commands/*.md` | Commandes template (jamais éditées, invocables `/xxx`) | Non (gitignore) |
| `.claude/agents/*.template.md` | Agents template (jamais édités) — agents communs et agents de stack `dev-*`, chacun avec un en-tête de provenance (template source + version) | Non (gitignore) |
| `.claude/agents/*.md` | Adaptations projet par agent (compagnons, `dev-*.md` compris) | Oui |
| `.claude/agents/generic.<nom>.md` | Spécification d'une instance d'agent générique (projets non-dev, ex. rédacteur PowerPoint) — le template commun est `generic.template.md` ; plusieurs instances possibles, déclarées dans `project-config.json` → `agents.generic[]` | Oui |
| `.claude/agents/environments/{publish,deploy}.<env>.template.md` | Fichiers publish/deploy par environnement (mécanisme spécifique, un par tâche × environnement), générés depuis `templates/environments/` | Non (gitignore) |
| `.claude/agents/environments/{publish,deploy}.<env>.md` | Adaptations projet d'un fichier d'environnement (compagnon optionnel) | Oui |
| `.claude/agents/environments/<env>.env`, `.env` | Valeurs des variables/secrets (global et par environnement) — les `*.env.example` (noms seuls) sont trackés | Non (gitignore) |
| `PRIVATE/` | Éléments privés jamais commités, partagés par les worktrees : `GLOBAL/` (comptes et accès notés, dumps de données réelles, documents client, notes perso) et `<ENV>/` (fichiers d'accès d'un environnement : kubeconfig, tokens k8s, clés SSH, comptes de service — désignés par chemin depuis `<env>.env`) ; `gitconfig` à la racine. Contenu étudié par `/init-project` (Étape 10b), liste attendue dans `project-config.json` → `private` | Non (gitignore) |
| `.claude/{agents,commands}/context/*.template.md` | Contextes partagés template (jamais édités) | Non (gitignore) |
| `.claude/{agents,commands}/context/*.md` | Adaptations projet par contexte partagé | Oui |
| `.claude/CLAUDE.md`, `project-config.json`, `memory/` | Config projet — `project-config.json` porte aussi le **registre des agents** (`agents.registry[]`) | Oui |
| `contracts/CHANGELOG.md` | Changelog des contrats (squelette créé par `/init-project`) | Oui |
| `.claude-launcher/env-template.yaml` | Environnement conteneur Claude-Launcher NG2 (≥ v5.5.0) généré par le template — régénéré à chaque `/init-project`, ne pas modifier (socle `gh`/`jq`/`PRIVATE/gitconfig` + stack) | Oui |
| `.claude-launcher/env.yaml` | Ajouts propres au projet (image choisie par F2, paquets, étapes, `prefer`), fusionnés par le launcher après `env-template.yaml` ; jamais créé ni écrit par le template, sauf migration d'un `env.yaml` généré par une version antérieure (étape d1j) — référence `templates/launcher/env-yaml.md` | Oui |
| `docs/CADRAGE.md` | Fiche de cadrage produit (brief d'origine + valeurs finales par phase), écrite par `/init-project` en mode brief ou workshop ; lue par le planner et le marketing | Oui |

> **Après un `git clone`/`git pull`** sur un projet déjà initialisé, les fichiers gitignorés
> ci-dessus (`TEMPLATE_claude/`, commandes, agents template) sont absents jusqu'au prochain
> `/init-project` — c'est manuel, géré au niveau de l'ouverture de projet (ex. le launcher).
> `project-config.json.template_version` (tracké git) retient la version exacte du template
> utilisée : `/init-project` la détecte et propose de **réinstaller à l'identique** (pas de mise
> à jour forcée) plutôt que de refaire une migration v1/v2 → v3. Le registre des agents restaure de même
> chaque agent — agents de stack `dev-*` et agents épinglés compris — à la version qu'il enregistre.
> `/start-session` signale une mise à jour du template en comparant le commit synchronisé au **dernier tag**
> publié — la même référence que celle déployée par `/init-project` (jamais le HEAD de `main`).

### Séparation template / projet

**Commandes** : déployées en `*.md`, directement invocables (`/feature`, `/bugfix`...).
Ne pas les éditer — elles sont écrasées à la prochaine sync, sans compagnon.

**Agents** : déployés en deux fichiers compagnons :

```
.claude/agents/cdp.template.md   ← template, jamais édité, mis à jour par sync
.claude/agents/cdp.md            ← adaptations projet, tracké git, jamais écrasé
```

Le compagnon peut commencer par un frontmatter limité à `model:` et/ou `effort:` pour surcharger le modèle et
l'effort du template (voir « Modèles et effort par agent » ci-dessous) ; toute autre clé y est ignorée.

**Registre des agents — provenance et version** : chaque `*.template.md` est une copie d'un template source
(`TEMPLATE_claude/agents/<nom>.md` pour les agents communs, `TEMPLATE_claude/templates/dev-*.md` pour les agents
de stack) inscrite dans `project-config.json` → `agents.registry[]` :

```json
{ "name": "dev-firmware", "source": "templates/dev-firmware-esp32.md",
  "tag": "v3.28.0", "commit": "<sha>", "sha256": "<empreinte de la source>", "changed_in": "v3.22.0" }
```

La copie porte le même renseignement dans un en-tête après son frontmatter
(`<!-- template-source: templates/dev-firmware-esp32.md @ v3.22.0 (…) sha256:… -->`). `/init-project` suit
ainsi chaque agent individuellement : l'empreinte de la source détecte la dérive par agent (seul un agent dont
le template a réellement changé est proposé en mise à jour, avec `version enregistrée → nouvelle version`),
les agents de stack `dev-*` sont resynchronisés comme les autres, et une copie manquante est restaurée à sa
version. `"pinned": true` (posé à la main) fige un agent à sa version — exception, les versions restent
alignées par défaut. Les projets antérieurs au registre sont migrés automatiquement à la première sync.

Un agent dont le template n'a pas changé n'est pas redéployé mais **re-tamponné** à chaque sync (`tag`/`commit` et
en-tête mis à la version synchronisée) : tous les agents à jour affichent la même version, seuls les agents épinglés
ou en retard s'en écartent. `changed_in` garde la version du dernier changement réel de la source. Les **contextes
partagés** (`agents/context/`, `commands/context/`) suivent le même mécanisme dans `contexts.registry[]` (en-tête de
provenance en première ligne, détection de dérive par empreinte, tableau affiché après celui des teammates).
**Plusieurs agents d'un même type et stacks sans template** (étape 5d de `/init-project`) :
- un composant présent plusieurs fois (deux firmwares, deux backends...) donne un agent par composant,
  `dev-<catégorie>-<suffixe>`, basé sur le même template : chaque instance a sa copie `<nom>.template.md`
  (frontmatter `name:` réécrit — c'est son `subagent_type`), son entrée au registre avec `role` et périmètre
  `paths`, et son compagnon `<nom>.md` (`## Perimetre`) ; le planner assigne chaque tâche à l'instance dont le
  périmètre couvre les fichiers ;
- une stack « Autre » (Rust, Java, STM32, Raspberry Pi, Flutter, mobile natif...) utilise le template de repli
  `templates/dev-generic.md`, sans techno : la stack, la toolchain (commandes exactes), le périmètre et les
  conventions sont dans le compagnon `<nom>.md`, **obligatoire** (sinon l'agent répond `BLOQUE`).

Chaque init / sync / réinstallation se termine par un **tableau des teammates** : nom, fichier, template source,
version actuelle (celle de la copie déployée), état (`🟢 a jour`, `⚠ en retard → <cible>`, `📌 epingle (<cible> dispo)`) et présence d'un compagnon `<nom>.md` (ou de la
spécification `generic.<nom>.md` pour une instance générique), et **mode de spawn** : `au /start-session`
(agents `socle`), `si dans la team du milestone` (agents `milestone`), `a la demande du teamleader` (`ponctuel` : `security`, `infra`, `marketing`, `pr-reviewer`...), ou
`— (Claude principal)` pour `teamleader` et `cdp`, qui ne sont pas des teammates : ce sont les specs que le Claude
principal lit pour jouer les deux rôles.

**Contextes partagés** (`context/COMMON.md`, `context/GITHUB.md`... référencés par les commandes
et les agents) : même convention que les agents, un compagnon optionnel par fichier :

```
.claude/commands/context/COMMON.template.md   ← template, jamais édité, mis à jour par sync
.claude/commands/context/COMMON.md            ← adaptations projet, tracké git, jamais écrasé
```

Claude lit les deux automatiquement (agents comme contextes). Les projets sans adaptation n'ont pas besoin de créer de fichier `*.md`.

---

## Structure du repo template

```
README.md                        # Documentation utilisateur (ce fichier)
init-project.md                  # Seul fichier à copier pour bootstrapper
CLAUDE.md                        # Guide de contribution au template lui-même

TEMPLATE_claude/                 # Tous les composants livrés aux projets cibles
├── INITIALIZATION.md            # Documentation détaillée du processus d'init
├── CLAUDE_TEMPLATE.md           # Modèle de CLAUDE.md (Zone 1 projet + Zone 2 teamleader)
├── settings.json                # Configuration Claude Code (vide par défaut — extensible par le projet)
├── .template-source.json        # Référence GitHub (repo + commit du dernier fetch)
├── gitignore-for-projects       # Copié en .gitignore par /init-project
│
├── mods/                        # Mods Claude Code, déployés dans .claude/skills/<mod>/
│   └── milestone-panel/         # Panneau latéral : consommation du compte Claude + issues du milestone en cours par phase (sinon milestones + PR ouvertes)
│
├── commands/                    # Commandes slash
│   ├── start-session.md
│   ├── end-session.md
│   ├── team-status.md
│   ├── team-delete.md
│   ├── feature.md
│   ├── bugfix.md
│   ├── hotfix.md
│   ├── refactor.md
│   ├── review.md
│   ├── qa.md
│   ├── secu.md
│   ├── build.md
│   ├── publish.md
│   ├── deploy.md
│   ├── backlog.md
│   ├── milestone.md
│   ├── progression.md
│   ├── context-audit.md
│   ├── marketing.md
│   └── context/
│       ├── COMMON.md
│       ├── CDP_WORKFLOWS.md
│       ├── DEVELOPMENT.md
│       ├── QUALITY.md
│       └── GITHUB.md
│
├── agents/                      # Agents spécialisés
│   ├── teamleader.md            # Teamleader — gestion team + rôle CDP
│   ├── cdp.md                   # Règles CDP — orchestration, délégation, gates
│   ├── implementation-planner.md
│   ├── generic.md               # Agent générique multi-instances (projets non-dev) — spécialisé par generic.<nom>.md
│   ├── test-writer.md
│   ├── code-reviewer.md
│   ├── qa.md
│   ├── security.md
│   ├── doc-updater.md
│   ├── deploy.md
│   ├── infra.md
│   ├── pr-reviewer.md
│   ├── marketing-release.md
│   └── context/
│       ├── COMMON.md
│       ├── DEV_COMMON.md
│       ├── TEAMMATES_PROTOCOL.md
│       ├── CDP_PHASES_PLAN_DEV.md      # Phases 1-2 du CDP (lues à l'entrée de la phase)
│       ├── CDP_PHASES_REVIEW_QA.md     # Phases 3-4
│       ├── CDP_PHASES_RELEASE.md       # Phases 5-6 (QUALIF, GATE 4, PROD)
│       ├── MILESTONE_CADRAGE.md        # Cadrage par milestone : intensité, options, team (v4)
│       ├── VALIDATION_COMMON.md
│       └── GITHUB.md
│
└── templates/                   # Templates par stack technique
    ├── dev-backend-go.md
    ├── dev-backend-node.md
    ├── dev-backend-python.md
    ├── dev-frontend-react.md
    ├── dev-frontend-vue.md
    ├── dev-firmware-esp32.md
    ├── dev-plugin.md
    ├── dev-generic.md            # repli pour une stack sans template (Rust, STM32, Flutter...) — stack dans le compagnon
    ├── environments/             # Templates publish/deploy par mécanisme (promote, rebuild-ci,
    │                             # docker-compose, kubernetes-helm, serverless, vps, paas, cloud-run)
    ├── launcher/
    │   ├── env-yaml.md           # stack → .claude-launcher/env-template.yaml (conteneur Claude-Launcher NG2 ≥ v5.5.0)
    │   └── gitconfig             # modèle de PRIVATE/gitconfig (git → gh auth git-credential)
    └── workflows/
        └── release-go-react.yml  # exemple de référence (le pipeline est audité/généré par infra)
```

---

## Orchestration multi-agents

Les workflows sont orchestrés par le **CDP (Chef De Projet)**, seul interlocuteur entre
l'utilisateur et l'équipe technique. Le CDP dispatche via `SendMessage` vers les agents
spécialisés, valide leurs livrables et reporte la progression.

### Agents disponibles

| Agent | Rôle |
|-------|------|
| `cdp` | Orchestrateur — coordonne, dispatche, reporte |
| `planner` | Plan d'implémentation + contrats API (contract-first) |
| `dev-backend` | Développement backend (stack détectée) |
| `dev-frontend` | Développement frontend (stack détectée) |
| `dev-firmware` | Développement firmware (si configuré) |
| `dev-<cat>-<suffixe>` | Instance supplémentaire d'un agent dev (ex. `dev-firmware-capteur` + `dev-firmware-passerelle`), chacune avec son périmètre |
| `test-writer` | Tests TDD depuis le plan/contrats (en parallèle du DEV) — unit/integration/E2E/perf + procédures QA |
| `code-reviewer` | Revue de code (qualité, sécurité OWASP, performance) + vérification couverture des contrats |
| `qa` | Exécution des tests et validation (unit/integration/E2E/perf) |
| `infra` | Validation des procédures de déploiement + infra Docker/Helm/CI ; outils manquants (`.claude-launcher/env.yaml`) et structure de `PRIVATE/` |
| `deployer` | Build (compilation locale, agnostique à l'environnement) + Publication QUALIF/PROD (mécanisme propre à chacun, voir `.claude/agents/environments/`) + Déploiement QUALIF/PROD — surveille activement la CI lors de PUBLISH PROD, rollback automatique sur échec, remonte les faits au teamleader |
| `doc-updater` | Mise à jour CHANGELOG, README, documentation technique |
| `security` | Audit de sécurité (SAST, dépendances, secrets) |
| `pr-reviewer` | Validation des Pull Requests externes |
| `marketing` | Communication de release depuis les données GitHub |
| `<nom>` (`generic`) | Agent générique pour les projets non-dev (ex. rédacteur PowerPoint) — voir ci-dessous |

**Modèles et effort par agent** (champs `model:` — alias qui suivent la dernière version de la famille — et `effort:` du frontmatter de chaque `*.template.md`, teamleader compris) — valeurs par défaut du template :

| Agent | Modèle | Effort |
|-------|--------|--------|
| teamleader | `opus` | `medium` — il tient une machine à états à chaque tour : la capacité compte, pas la profondeur de réflexion |
| `planner` | `fable` | `high` — une fois par milestone, il porte la structure (lots, contrats, ordre) |
| `infra` | `opus` | `medium` — validation à chaque déploiement ; la profondeur ne sert qu'à l'audit initial du pipeline |
| `security` | `sonnet` | `high` — ponctuel (`/secu`), rare donc marginal |
| `code-reviewer` | `sonnet` | `medium` — à chaque lot, jusqu'à 3 cycles plus les sous-reviewers : l'effort le plus fréquent du pipeline |
| `dev-*`, `test-writer`, `qa`, `pr-reviewer`, `deploy`, `generic` | `sonnet` | `medium` |
| `doc-updater` | `haiku` | `low` |
| `marketing` | `sonnet` | `low` |

**Surcharge par projet** : le compagnon `xxx.md` d'un agent (ou la spécification `generic.<nom>.md` d'une instance)
peut commencer par un frontmatter ne contenant que `model:` et/ou `effort:` — il prime sur le template. Au
`/start-session`, le teamleader résout ces valeurs et les passe **explicitement** au spawn (`subagent_type`, `model`,
`effort`) ; sans cela un teammate hériterait du modèle et de l'effort de la session. Les sous-agents temporaires
héritent de leur coordinateur. Règle complète : `agents/context/TEAMMATES_PROTOCOL.md` section 7.

**Adéquation au projet** : `/init-project` (section 2ter de la génération, étape d6a en synchronisation) confronte
les réponses de l'init (sécurité, firmware, nombre de composants, déploiement, taille, budget du cadrage) à la grille
de `TEAMMATES_PROTOCOL.md` §7.1 et affiche un **retour high level** : agents probablement sous- ou sur-dimensionnés,
avec suggestion et motif. S'il y a au moins une alerte, il demande s'il faut **revoir agent par agent**, appliquer
les suggestions ou garder les défauts ; les choix sont écrits dans le frontmatter des compagnons. Un agent qui a déjà
une surcharge projet n'est jamais signalé.

Le **teamleader** est la session principale et ne peut pas changer son propre modèle : `/init-project` (init et
mises à jour) écrit les valeurs résolues (`teamleader.md` compagnon > `teamleader.template.md`) dans
`.claude/settings.json` (`model`, `effortLevel` — clés dérivées, ne pas les éditer à la main), et `/start-session`
vérifie que la session tourne avec elles, sinon affiche les commandes `/model` et `/effort` à taper. `effortLevel`
n'accepte pas `max` : pour `max`, la clé est retirée et il faut taper `/effort max` au lancement.

#### Agents génériques (projets non-dev)

Pour les tâches hors développement, `/init-project` (étape 5c) peut déclarer une ou plusieurs **instances**
de l'agent `generic` : le template commun `generic.template.md` (protocole, cycle ACTIF/DONE) est partagé,
et chaque instance est spécialisée par un **compagnon de spécification** `.claude/agents/generic.<nom>.md`
(rôle, entrées, livrables, outils, critères de validation). Chaque instance a son nom canonique
(ex. `redacteur-pptx`, `redacteur-doc`), est déclarée dans `project-config.json` → `agents.generic[]` et dans
la table `## Agents Disponibles` de `CLAUDE.md`, et est connue du CDP qui la dispatche selon son rôle. Les
spécifications sont trackées git et jamais écrasées par la sync ; ajouter une instance plus tard se fait via
`/init-project` (option « Autre »).

### Principes de communication

- **Livrable = fichier** : chaque agent écrit son résultat dans un fichier, le message ne contient que la référence
  - Agents d'analyse → `_work/reports/[agent]-[timestamp].md`
  - Agents de code → SHA du commit
- **Ordres = fichier au-delà de 3 lignes** : le teamleader écrit l'ordre dans `_work/tasks/[agent]-[timestamp].md` (un fichier par ordre, jamais réécrit) et n'envoie par `SendMessage` que le chemin + un résumé d'une ligne ; ≤ 3 lignes, `/clear`, réponses à un `BLOQUE` restent inline. Exception à la délégation stricte : `Write` autorisé au teamleader **uniquement** pour `_work/tasks/*.md` (création seule) et pour l'état d'orchestration (`.claude/workflow-state.json`, `.claude/workflow/plan-<version>.md`), et `Read` sur ce dossier pour contrôler chaque `DONE` par rapport à la demande. Règle posée dans `CLAUDE_TEMPLATE.md`, `agents/cdp.md`, `agents/teamleader.md` et `agents/context/TEAMMATES_PROTOCOL.md`
- **Handoff** : chaque agent écrit `_work/handoff/[agent]-[timestamp].md` avant son DONE — le CDP le transmet au suivant ou l'agent le transmet directement si le CDP l'autorise
- **Questions = `AskUserQuestion`** : toute question, confirmation ou choix attendu de l'utilisateur — y compris dans `/init-project`, `/start-session`, `/end-session`, `/backlog`, `/milestone`, `/context-audit` — passe par l'outil `AskUserQuestion`, jamais par du texte (`[O/n]`, listes numérotées). Règle posée dans `commands/context/COMMON.md` §0. §0 impose aussi que toute question de **validation d'un livrable** contienne son chemin/URL. Côté agents : **format unique** — tout agent remonte ses questions par `[NOM] BLOQUE` + bloc `Questions:` inline (2-4 options, 4 questions max), jamais de mot-clé propre (`BLOCKED`, `BESOIN CADRAGE`) ni de questions seulement dans un rapport
- **Confinement dans le projet** : aucun worktree, dossier ou fichier de travail hors du dossier du projet (`../`, `/tmp`, `$TMPDIR`, `~/` interdits). Worktrees git → `.claude/worktrees/<nom>` (`MARKETING/` pour le site) ; fichiers temporaires → `_work/tmp/`. Les deux sont gitignorés. Règle posée dans `CLAUDE_TEMPLATE.md`, `agents/context/COMMON.md` et `commands/context/COMMON.md`
- **Éléments privés → `PRIVATE/`** : les données privées du projet (kubeconfig, tokens k8s, clés, comptes et accès, dumps réels, documents client, notes perso) vont dans `PRIVATE/` à la racine, gitignoré, rangées par portée : `PRIVATE/GLOBAL/` (commun au projet) et `PRIVATE/<ENV>/` (propre à un environnement, ex. `PRIVATE/PROD/kubeconfig`). `PRIVATE/` est **partagé** : un seul exemplaire (checkout principal), jamais copié — les worktrees y accèdent par lien symbolique (ignoré par la ligne `/PRIVATE` du `.gitignore`). Structure et contenu attendu tenus par `infra`, `deployer` lit seulement, chaque teammate range ce qu'il produit. `.env` / `<env>.env` et `PRIVATE/gitconfig`, liés à la structure du projet, gardent leur place ; une variable désignant un fichier d'accès pointe vers `PRIVATE/<ENV>/`. Élément privé tracké ailleurs → `BLOQUE` au teamleader. À l'init, l'**Étape 10b** étudie le dépôt (fichiers trackés/non trackés suspects, éléments attendus d'après les réponses) et propose les déplacements (`git rm --cached`, références mises à jour, rotation recommandée si déjà poussé) ; en mise à jour (option d, étape d1h) l'étude est jouée si jamais faite, les éléments hors `GLOBAL/` / `<ENV>/` proposés au rangement, et la section ajoutée ou mise à jour dans `CLAUDE.md`. Règle posée dans `CLAUDE_TEMPLATE.md` et `agents/context/COMMON.md`
- **Outil manquant → environnement de bootstrap** : un teammate qui constate un outil absent (commande introuvable, version insuffisante) ne l'installe pas à la main : il le décrit (`BLOQUE outil manquant` + fiche : usage, version, paquets `apt`/`dnf`/`apk` ou installation idempotente), le teamleader transmet à `infra` (Mode Outil), qui l'ajoute à `.claude-launcher/env.yaml` (jamais à `env-template.yaml`, généré), l'installe dans le conteneur courant si possible et signale s'il vaut pour toute la stack. Règle posée dans `CLAUDE_TEMPLATE.md` (« Outil manquant »), `agents/context/COMMON.md`, `teamleader.md` et `infra.md`
- **Branche courante maîtrisée** : une seule branche de travail à la fois (`milestone/vX.Y.Z`), fixée par le teamleader — seul propriétaire du HEAD du checkout principal. Les agents la consomment sans pouvoir la changer (ni `checkout`/`switch`/`reset`/`rebase`/`merge`/`stash`, ni retour à un commit précédent) : ils la vérifient au démarrage (écart → `BLOQUE`) et passent par `BRANCH REQUEST` au teamleader, qui change de branche en `BRANCH CHANGE PENDING` → checkout → `BRANCH CHANGE DONE` (tree propre exigé, confirmation utilisateur pour un retour en arrière). Un `/bugfix` ou `/hotfix` lancé pendant un milestone n'ouvre pas sa branche : le planner l'intègre **en priorité** au plan du milestone, livré avec lui. Les worktrees restent libres mais sans nouvelle branche (`git worktree add --detach`) ; `pr-reviewer` et la publication PROD (merge vers `main`, rollback) passent par un worktree détaché + `git push origin HEAD:main`. Les tests (`qa`, `sub-qa`) ne tournent que sur du code commité (`git status --porcelain` vide, sinon `BLOQUE`). Règle posée dans `agents/context/COMMON.md` « Branche Courante et Historique »
- **Nettoyage des branches** : après un DEPLOY PROD réussi, `deployer` supprime en **local et en remote** la branche du milestone et toute branche dont la PR est `MERGED` (`agents/deploy.md` Étape 6) ; jamais `main`, `gh-pages` ni un milestone actif ; une branche à PR fermée non mergée est signalée, pas supprimée ; garde-fou : une branche ayant des commits absents de `origin/main` (`git log origin/main..<branche>` non vide, ex. PROD en `promote` sans merge) n'est jamais supprimée. La GitHub Release étant créée par la CI de release (C5), `deployer` y pose les notes (`gh release edit`) et ne la crée qu'en repli
- **Validation CDP** : à réception de chaque DONE, le CDP lit le rapport ou handoff référencé et vérifie la conformité avant de continuer (jamais le code lui-même)
- **Team par milestone** (v4) : au `/start-session`, seul le **socle** est spawné (`planner`, `deployer`) ; la **team du milestone** (agents DEV, `test-writer`, `code-reviewer`, `qa`, `doc-updater` selon le cadrage) est spawnée à la validation du plan (GATE 2) et respawnée au `/start-session` tant que le milestone est en cours — ou quand Claude Code annonce lui-même des teammates perdus (coupure du terminal, de WSL ou du disque) : le teamleader respawne alors **tout** l'effectif attendu (socle + team du cadrage), pas seulement les agents des tâches en cours, et respawne avant le dispatch tout agent de cet effectif absent de la team (`MILESTONE_CADRAGE.md` 4.2) ; les `ponctuel` (`security`, `infra`, `marketing`) à la demande. Hors de ces moments, le teamleader n'utilise que `SendMessage`
- **Reprise après interruption** : le CDP écrit `.claude/workflow-state.json` à chaque transition (`status`, phase, `lots` avec le lot courant et sa phase, `plan`) et copie le plan validé au GATE 2 dans `.claude/workflow/plan-<version>.md` (gitignoré, hors `_work/`). Si le terminal est tué en plein lot, `/start-session` détecte le workflow non terminé **avant** toute purge et propose *Reprendre* (purge sélective : seuls `_work/tmp/` et `_work/tasks/` ; rapports, handoffs, `tests-ledger.md` conservés) ou *Abandonner*. À la reprise, le teamleader rapproche l'état de git (commits, arbre non commité → WIP / stash / jeter) et des labels GitHub, puis rejoue la phase interrompue depuis son début, sans rejouer les phases ni lots terminés. Règles : `commands/start-session.md` étapes 2 et 4bis, `commands/context/CDP_WORKFLOWS.md` §12
- **Teamleader = interlocuteur unique** : les teammates s'adressent toujours au teamleader (adresse `SendMessage` : `team-lead`) — jamais à un « CDP » distinct. Quand le teamleader a besoin d'une information de l'utilisateur, il la présente **toujours via l'outil `AskUserQuestion`** (2 à 4 options avec description détaillée par option, valeur par défaut marquée "(Recommandé)", "Autre" géré automatiquement par l'outil). Les questions des teammates suivent la même chaîne : le teammate envoie un `BLOQUE` avec questions + options chiffrées (format dans `TEAMMATES_PROTOCOL.md`), le teamleader les convertit en `AskUserQuestion` puis renvoie la réponse au teammate — jamais de liste de questions ni de `[O/n]` en texte dans le chat

### Délégation à des sous-agents temporaires

`planner`, `code-reviewer` et `qa` peuvent, pour un périmètre suffisamment large et décomposable
en groupes/dimensions/scopes indépendants, demander au CDP de spawner des sous-agents temporaires
et les piloter **directement** (pair-à-pair, sans relayer via le CDP) — seule exception au
principe "tout passe par le CDP". Le CDP reste le seul à spawner et fermer ces sous-agents ;
l'agent coordinateur gère le dispatch, la collecte et la consolidation.

| Agent | Sous-agents | Découpage | Fermeture |
|-------|-------------|-----------|-----------|
| `planner` | `sub-planner-N` | Groupes d'issues indépendants | Différée — sortie de Phase Plan (boucle GATE 2 comprise), pour permettre la réutilisation lors des révisions |
| `code-reviewer` | `sub-reviewer-<dimension>` | Dimensions de la revue (sécurité, performance...) | Immédiate — après consolidation du verdict |
| `qa` | `sub-qa-<scope>` | Scopes de tests (unit/integration/e2e...), chacun isolé dans son propre `git worktree --detach` (sans branche, code commité) créé/nettoyé en `Bash` | Immédiate — après consolidation du verdict |

Détail complet du protocole : `TEMPLATE_claude/agents/context/TEAMMATES_PROTOCOL.md` section 6.

---

## Workflows

### Cadrage du milestone (v4)

Deux niveaux de réglage. Le **projet** (`/init-project`) fixe ce qui existe — stacks, environnements (QUALIF ou non),
CI — et les valeurs par défaut des milestones (`milestone.defaults` : `patch` → léger, `minor`/`major` → complet).
Chaque **milestone** est cadré à son lancement :

1. **Lancement** (1re ouverture de la branche) : le CDP calcule une **intensité de départ** — type de version, relevée à
   « complet » si une issue porte `breaking`/`security` ou si le milestone compte plus de 5 issues.
2. **Plan** : le planner, qui analyse le code, propose le **cadrage** — options `test_writer`, `review`, `qualif`, `doc`
   (chacune justifiée si elle s'écarte de l'intensité) et la **team** (agents DEV des tâches, + `qa`, + selon options).
3. **GATE 2** : l'utilisateur valide plan et cadrage en une seule question (ou les ajuste).
4. **Application** : cadrage écrit dans `workflow-state.json` et dans un bloc « Cadrage » de la description GitHub du
   milestone ; team spawnée, agents inutiles arrêtés.

| Option | Léger | Complet | Désactivée |
|---|---|---|---|
| `test_writer` | non | oui | les agents DEV écrivent leurs tests |
| `review` | non | oui | QA seule (`code-reviewer` à la demande) |
| `qualif` | non | oui (si le projet a une QUALIF) | validation humaine sur l'artefact local, PROD sans QUALIF |
| `doc` | agents DEV | `doc-updater` | CHANGELOG tenu par les agents DEV |

**Invariants**, quelle que soit l'intensité : milestone et sa branche, versionnement, QA, CI verte, validation humaine
avant PROD, historique GitHub. Un milestone garde son cadrage jusqu'à sa clôture. Hotfix : cadrage fixe (flux hotfix
inchangé). Règles complètes : `TEMPLATE_claude/agents/context/MILESTONE_CADRAGE.md`.

### Phase Review/QA — parallélisation par défaut

Par défaut, `qa` démarre dès que `test-writer` a livré ses scripts — **en parallèle de `code-reviewer`**,
sans attendre son verdict. Si REVIEW rejette, le travail QA en cours (ou déjà fini) est annulé/ignoré et
on repart en DEV comme avant ; la durée totale n'est donc jamais pire que l'ancien enchaînement strictement
séquentiel, et souvent meilleure (QA masqué sous REVIEW). Le planner fixe ce comportement via le champ
`qa_parallelizable: true|false` du plan (`true` par défaut ; `false` justifié en une ligne si le risque de
rejet en review est élevé — scope large, architecture, concurrence sensible). Sans plan, l'orchestrateur
applique la même valeur par défaut. Détail complet : `TEMPLATE_claude/commands/context/QUALITY.md` section 12.

### Feature — workflow complet

```
[GATE 1] Confirmation démarrage
    ↓
PLAN ──────────────────────── contrats API + contracts/CHANGELOG.md + qa_parallelizable
    ↓  (🧵 peut déléguer à des sub-planner-N — groupes d'issues indépendants)
    ↓  label PLANNING
[GATE 2] Validation plan + cadrage du milestone (+ alerte breaking changes si détectés) → team du milestone spawnée
    ↓  label PRET (EN COURS à l'ordre DEV du lot)
    ├──────────────────────────┐
  DEV                     TEST-WRITER ── depuis plan + contrats (TDD)
    └──────────────────────────┘
    ↓  (si backend+frontend parallèle → merge conflicts résolus par dev-backend)
    ↓  [GATE 2b] escalade si conflits non résolvables
    ↓  label EN REVIEW (+ EN QA si qa_parallelizable, dès TEST-WRITER DONE)
    ├──────────────────────────┐
  REVIEW                     QA ── démarre dès TEST-WRITER DONE, sans attendre REVIEW (défaut)
  🧵 sub-reviewer-<dim>       🧵 sub-qa-<scope> (worktree isolé)
    └──────────────────────────┘
    ↓  REVIEW REJECTED → annule/ignore QA ; sinon attend QA si pas encore DONE
    ↓  label DONE
PUSH de la branche du milestone ── déclenche la CI de validation (C10)
    ├─ CI verte → issues fermées (elles gardent DONE) — ne vaut pas validation du milestone ; avec lots : le push n'a lieu qu'après la validation QUALIF du lot (GATE LOT), puis lot suivant
    └─ CI non verte (rouge/orange) → label EN COURS + commentaire, retour DEV, nouveau cycle
DOC (brouillon) ─────────────── CHANGELOG + documentation technique — pas de version incrémentée
    ↓
INFRA validation QUALIF ────── cohérence procédure/infrastructure
    ↓  [GATE 4b] escalade si écart détecté
    ├────────────────────────────────────────┬──────────────────────────────┐
BUILD → PUBLISH QUALIF → DEPLOY QUALIF   DOC (finalize) ── release notes   NR complète (QA) ── toute la suite
    └────────────────────────────────────────┴──────────────────────────────┘
    ↓  BUILD = compilation seule, incrémente `a` (aucun test rejoué) · GATE 4 attend les TROIS (NR KO → retour DEV sans solliciter l'utilisateur)
[GATE 4] Validation manuelle ── CDP présente les scénarios à tester
    ├─ OUI → INFRA validation PROD → PUBLISH PROD → DEPLOY PROD (∥ marketing-release systématique) → clôture du milestone proposée
    │        → branche distante du milestone supprimée une fois PROD réussi
    └─ NON → seules les issues concernées sont rouvertes : label EN COURS (retour DEV) ou PLANNING (retour PLAN) selon l'écart
    ↓  [GATE 4c] escalade si infra PROD incohérente
PUBLISH PROD → DEPLOY PROD ─── merge → tag officiel (déclenche un rebuild déterministe via CI) → installe l'artefact publié par la CI
                               succès : notes de release + clôture du milestone proposée
                               échec  : rollback infra → rapport au teamleader → routing agent
```

**Milestone avec lots** — les lots sont traités **un à la fois** ; la boucle ci-dessus (DEV → REVIEW → QA) s'applique à chaque lot, mais le push et la fermeture des issues attendent la validation QUALIF du lot :

```
(DEV → REVIEW → QA du lot N, label DONE)
    ↓
BUILD → PUBLISH QUALIF → DEPLOY QUALIF ── le lot N est testé en QUALIF
    ↓
    ↓  label A VALIDER (lot à issue VALID-HUMAINE ; lot auto-validé : reste DONE)
[GATE LOT] l'utilisateur teste et valide ── lot suivant / publier le milestone en PROD / refuser
    ↓  OUI → label DONE
PUSH → CI de validation ── verte : issues du lot N fermées (DONE conservé) → lot N+1 (PRET → EN COURS)
                           non verte : label EN COURS + commentaire, retour DEV
```

**Validation humaine ou automatique** : le `test-writer` marque chaque scénario `AUTO` (commande/fichier, rejoué par QA) ou `HUMAIN` (jugement) ; les issues à scénario `HUMAIN` portent le label `VALID-HUMAINE` (affiché `👤` dans le panneau). Un lot sans `VALID-HUMAINE` est auto-validé (pas de GATE LOT) ; le GATE 4 n'est jamais sauté. À chaque GATE de validation par tests restant (GATE LOT, GATE 4), le CDP affiche une synthèse de ce qu'il faut tester, le chemin de la procédure `tests/procedures/…` et l'ouvre automatiquement dans Chrome (repli : chemin affiché si Chrome est indisponible). Aucune validation n'est demandée après la CI d'un lot. Le GATE 4 (PROD) n'a lieu qu'une fois : après le dernier lot, ou sur « publier le milestone en PROD » (publication anticipée : les lots restants sont déplacés vers un autre milestone). Déroulement : `TEMPLATE_claude/commands/context/GITHUB.md` §9.5b.

**Points de validation utilisateur (GATES) :**

| Gate | Moment | Action requise |
|------|--------|----------------|
| 1 | Après analyse | Confirmer le démarrage |
| 2 | Après plan | Valider le plan, les contrats API et le cadrage du milestone (options, team) — ou ajuster le cadrage |
| 1.5 | Planner bloqué ou en échec (ambiguïté) | Lever l'ambiguïté |
| 2b | Conflits merge non résolvables | Résoudre manuellement |
| LOT | Milestone avec lots : lot déployé en QUALIF (auto-validé si aucune issue `VALID-HUMAINE`) | Valider le lot (suivant / publier en PROD) ou refuser |
| 3 | 3 cycles DEV atteints | Continuer ou abandonner |
| 4 | BUILD+PUBLISH+DEPLOY QUALIF, DOC (finalize) DONE **et** NR complète VALIDATED — toujours posé | OUI (publish/deploy prod) ou NON (retour DEV ou PLAN) |
| 4b | Procédure QUALIF incohérente | Corriger avant build/publish/deploy |
| 4c | Procédure PROD incohérente | Corriger avant publish/deploy |
| 4d | Maquette de communication prête | Valider la communication de release |
| 4e | Aucun site marketing existant | Répondre aux questions de cadrage |

Question et options exactes de chaque gate : `TEMPLATE_claude/agents/cdp.md` (tableau des points de validation).

**Accès aux environnements** : `/init-project` (Étape 8b) collecte pour chaque environnement les éléments d'accès
non sensibles (hôte, utilisateur, port SSH, runtime docker/podman, registre, contexte kube...) et **teste** les accès
en lecture seule avec le rôle `infra` (SSH, runtime, droits sur la cible, registre, CLI plateforme). Le résultat est
enregistré dans `infrastructure.environments[].access` (jamais de secret — seulement les noms des variables de
`<env>.env`). Un accès non validé bloque `/deploy <env>` (preflight de `deployer`) ; la synchronisation d'un projet
existant le détecte (étape d1f) et propose de le valider, et `infra` intervient dès la planification (Mode Préparation, sur demande du planner via `PLANNER NEED INFRA` quand le milestone
touche au déploiement ou qu'un accès n'est pas validé) : les écarts qu'il peut corriger seul deviennent des tâches en Batch 0, ceux qui
demandent l'utilisateur ou un administrateur sont présentés en tête du GATE 2. Il rejoue ensuite les sondes lors de la « Validation infra » du CDP, avant chaque PUBLISH/DEPLOY (Phases 5 et 6), puis
met à jour `access.verified`. Les fichiers `deploy.<env>` lisent ces accès (runtime docker/podman, hôte local ou distant,
port SSH) et `deploy.services` (optionnel) limite le déploiement aux seuls services nécessaires.

> **Limitation connue** : cette orchestration (Gates 4/4b/4c) n'est câblée que pour la chaîne
> à 2 environnements QUALIF→PROD. Un environnement supplémentaire déclaré dans
> `infrastructure.environments[]` (DEV, PRE-PROD...) se publie/déploie manuellement via
> `/publish <env>` et `/deploy <env>`, hors flux CDP automatisé.

**Cycles de correction** (max 3 avant escalade) :
- REVIEW refuse → si QA tournait en parallèle, annulé/ignoré → DEV corrige → REVIEW seul (+ QA si toujours
  parallélisable) (TEST-WRITER uniquement si scope change)
- QA échoue → DEV corrige → REVIEW seul (+ QA) (TEST-WRITER uniquement si scope change)
- Scope change = changement `BREAKING` ou `CHANGED` dans `contracts/CHANGELOG.md`

### Bugfix

```
ANALYSE ── cause racine
    ↓  label EN COURS
TEST-WRITER ── test de reproduction (statut `regression`)
    ↓
RED CHECK ── QA joue ce seul test sur le code non corrigé : il doit ÉCHOUER (sinon retour TEST-WRITER)
    ↓
DEV ── fix minimal
    ↓  label EN REVIEW (+ EN QA si qa_parallelizable)
    ├──────────────────────────┐
  REVIEW                     QA ── reproduction (vert) + NR du composant, en parallèle de REVIEW (défaut)
    └──────────────────────────┘
    ↓  label DONE → push de la branche → CI verte : issues fermées (avec lots : push après validation QUALIF du lot ; non verte : retour DEV)
DOC (brouillon) ── CHANGELOG (Fixed)
    ↓
BUILD → PUBLISH QUALIF → DEPLOY QUALIF ∥ DOC (finalize) ∥ NR complète ── GATE 4 attend les trois
    ↓
[GATE 4] OUI → PUBLISH PROD → DEPLOY PROD (∥ marketing-release systématique) ── installe l'artefact publié par la CI
```

### Hotfix (urgence production)

```
TEST-WRITER ── test de reproduction
    ↓
DEV ── fix minimal uniquement
    ↓
REVIEW rapide ∥ QA critique ── reproduction + tests `smoke`/`critical` + build
    ↓
BUILD → PUBLISH PROD → DEPLOY PROD direct (∥ marketing-release systématique) ── sans passage par QUALIF
    ↓
NR complète en arrière-plan sur `main` (échec → issue) ∥ DOC ── post-mortem
```

### Refactor

```
QA (avant) ── NR du composant : capture l'état actuel des tests
    ↓
DEV ── refactoring (comportement identique obligatoire)
    ├──────────────────┐
  REVIEW          QA (après) ── NR du composant, non-régression, en parallèle de REVIEW (défaut)
    └──────────────────┘
    ↓
DOC (brouillon) ── CHANGELOG (Changed)
    ↓
BUILD → PUBLISH QUALIF → DEPLOY QUALIF ∥ DOC (finalize) ∥ NR complète ── GATE 4 attend les trois
```

### Contrats API (contract-first)

Pour toute feature impliquant une API, le planner crée les contrats **avant** le développement :

```
contracts/
├── http-endpoints.md       # Endpoints REST
├── websocket-actions.md    # Messages WebSocket
├── models.md               # Modèles de données
└── CHANGELOG.md            # Historique BREAKING/NEW/CHANGED
```

Le frontend consulte les contrats sans les modifier. Le CDP alerte l'utilisateur en GATE 2 si des changements **BREAKING** sont détectés.

### Maquettes (définition du projet)

Les maquettes font partie de la définition du projet : toute modification visible d'une interface exige une **maquette visuelle** ; les machines à états et changements d'architecture exigent une maquette de **conception** / **architecture**. Un bugfix ou refactoring sans effet visible n'en exige pas. Les maquettes validées sont conservées et versionnées avec le code :

```
docs/mockup/                          # configurable : docs.mockup_dir (project-config.json)
├── INDEX.md                          # maquettes actives / obsolètes — tenu par le CDP
├── DECISIONS.md                      # contraintes de conception issues des refus utilisateur
└── v11.0.1/                          # milestone en développement
    ├── ui/admin_nav_bar__compaction.html
    ├── architecture/deploy_pipeline__build_publish_deploy.md
    └── conception/session_state__reconnexion.md
```

- **Nommage** : `<type>/<composant>__<feature>.<ext>` (double underscore entre composant et feature).
- **Format** : HTML autonome (CSS/JS inline, aucune ressource externe) pour l'UI, Mermaid pour états/architecture, sinon le format le plus autonome et diffable — `.md` préféré pour toute maquette textuelle ; binaire accepté s'il n'existe aucune autre solution.
- **Composant en entier** : une maquette montre toujours le composant dans son intégralité, mais peut ne couvrir qu'une partie de sa définition — elle **complète** alors les maquettes actives (`complete`) ou en **remplace** (`remplace`) d'autres, qui passent en « Obsolètes » dans `INDEX.md`.
- **Immuabilité** : une maquette validée n'est jamais modifiée ; toute évolution est une nouvelle maquette qui référence les précédentes. L'en-tête porte composant, feature, version, type, issue, date de validation, `complete`, `remplace`.
- **Refus** : les brouillons rejetés ne sont pas conservés, mais leurs raisons le sont, reformulées en contraintes durables dans `DECISIONS.md` (ex. « pas de bleu pour ce composant », « taille > 24px »). Le planner les respecte, QA les vérifie.
- **Cycle** : le planner lit `INDEX.md` + `DECISIONS.md`, part des maquettes actives du composant et dessine un brouillon dans `_work/mockup/` ; le CDP le présente au GATE 2 en l'ouvrant directement dans Chrome par son chemin `file://` (jamais via un serveur HTTP local) — et rouvre le nouveau brouillon après chaque correction —, puis le commite et met à jour l'index à la validation. QA vérifie la conformité à **toutes** les maquettes actives des composants touchés.
- **Projet sans maquette de référence** : le planner dessine directement le nouvel état ; le CDP peut demander une capture d'écran de référence.
- **Marketing** : les maquettes marketing (GATE 4d) sont distinctes — systématiques mais éphémères (`_work/`, non commitées), toujours basées sur la page publiée en production.

Convention complète : `TEMPLATE_claude/commands/context/COMMON.md` §14. `/init-project` crée le squelette (`INDEX.md`, `DECISIONS.md`) de façon idempotente, y compris sur un projet existant.

### Suivi des issues GitHub

Le CDP met à jour les labels de l'issue associée à chaque transition de phase, **dès l'événement** — retour de fin de tâche d'un teammate (`DONE`/`FAILED`/`BLOQUE`) ou validation d'un GATE (`GITHUB.md` §9.12) — et avant l'ordre suivant. **L'état dit ce qui reste à faire pour l'issue, pas ce qu'un teammate fait à cet instant** : il ordonne à `deployer` d'exécuter les `gh issue edit` de `GITHUB.md` §9 (le teamleader n'a pas de `Bash`).
Dès que le milestone compte 2 issues ou plus, le planner le découpe en lots (obligatoire) : chaque issue reçoit exactement un label `LOT-<entier>` (nommage strict `^LOT-[0-9]+(\.[0-9]+)?$`, numérotation continue depuis 1 ; un lot peut se découper en sous-lots `LOT-2.1`, `LOT-2.2`, dont chacun est une unité de livraison), en plus de sa phase. Un lot est indépendant et auto-suffisant (livrable seul). Les lots sont traités **un à la fois**, dans l'ordre : à la fin d'un lot (QA validée), il est déployé en QUALIF et l'utilisateur le teste et le valide (**GATE LOT**) ; le lot est alors poussé, la CI passe au vert, ses issues sont fermées (aucune validation après la CI), puis le lot suivant démarre — les lots non lancés restent `PRET`. Si le milestone doit être publié en urgence, les lots restants sont déplacés vers un autre milestone (`GITHUB.md` §9.5b). Découpage par priorité : indépendance, puis thème/composant, puis livrabilité ; un lot ne dépend que des lots qui le précèdent. Ce label est posé après le GATE 2 et jamais retiré par une transition de phase. La pose est fiabilisée par **un seul ordre** du teamleader à `deployer` au GATE 2, recopiant la table « Lots » du plan validé (`PRET` sur toutes les issues + le lot de chacune, tous les lots d'un coup) ; `deployer` vérifie avant d'écrire (chaque issue dans exactement un lot, nommage, appartenance au milestone — sinon `LABELS FAILED`, rien n'est posé) et rend un récapitulatif par issue que le teamleader compare à la table avant le premier ordre DEV (`GITHUB.md` §9.0).
Un seul label de phase à la fois (sauf `EN REVIEW` + `EN QA` pendant la parallélisation Review/QA ; `BLOQUE` se superpose à la phase) :

| Statut | Signification | Posé par | Posé quand |
|--------|---------------|----------|------------|
| `PLANNING` | Plan à élaborer ou à valider | CDP | Phase 1 ; ou rejet GATE 4 hors scope (Cas B) ; reste tant que le plan n'est pas validé (GATE 2) |
| `PRET` | Plan validé, développement pas encore lancé (lot en attente) | CDP | GATE 2 validé |
| `EN COURS` | Développement à faire ou en cours | CDP | Ordre DEV du lot ; cycle correctif (REVIEW refusé / QA échoue) ; rejet GATE 4 dans le scope (Cas A) |
| `EN REVIEW` | Revue à faire ou en cours | CDP | Retour DONE de tous les dev de l'issue |
| `EN QA` | QA à faire ou en cours | CDP | Retour DONE des TEST-WRITER si parallèle au REVIEW (défaut), sinon après le verdict REVIEW |
| `DONE` | QA validée ; branche poussée, CI en cours puis verte | CDP | QA validée — push immédiat de la branche ; CI non verte → retour `EN COURS` ; ou validation d'une issue `A VALIDER` |
| `A VALIDER` | Terminée côté équipe, **en attente de ta validation** | CDP | Juste avant la question du GATE LOT (lot à issue `VALID-HUMAINE` ; un lot auto-validé n'y passe pas) ou du GATE 4 (`issues.close_on` = `validation`, issues encore ouvertes) ; validé → `DONE`, refusé → `EN COURS` / `PLANNING` (issues concernées), les autres → `DONE` |
| `BLOQUE` | Avancement impossible — s'ajoute à la phase courante (conservée) | CDP | Blocage constaté (cause en commentaire) ; retiré à la levée du blocage |
| `ABANDONNE` | Ne sera pas traitée (terminal) | CDP | Sur décision de l'utilisateur uniquement ; l'issue est fermée `not planned` |
| *(issue fermée)* | QA OK + CI verte (garde `DONE`) — la validation du milestone reste à l'utilisateur (GATE 4) | CDP | CI verte après le push de la branche (avec lots : après validation QUALIF du lot, GATE LOT) ; rouverte si GATE 4 refusé pour cette issue |

Les labels sont posés par `deployer`, sur ordre du teamleader (qui n'a ni `Bash` ni outil GitHub), avec
`gh issue edit --add-label … --remove-label …` — à chaque changement de phase, avant l'ordre de la phase suivante
(règle aussi présente dans le bloc `TEAMLEADER_PROTOCOL` de `CLAUDE.md`).

**Fermeture configurable** — `project-config.json` → `issues.close_on` (question de l'Étape 7 de `/init-project`) :
`ci` (défaut) ferme l'issue sur CI verte ; `validation` la laisse ouverte en `DONE` (`A VALIDER` pendant la question) jusqu'à une validation
utilisateur qui la couvre (GATE LOT explicite, sinon « Oui » au GATE 4, avant le déploiement PROD).

Définition de référence (transitions, labels retirés, commandes `gh`) :
`TEMPLATE_claude/commands/context/GITHUB.md` §8.2 et §9 — les autres fichiers y renvoient sans la recopier.

### Build (compilation locale, agnostique à l'environnement)

`/build` compile une seule fois, sans dépendre d'un environnement cible ni rejouer de tests (QA a déjà validé
le même arbre git), et produit un candidat local versionné (`build/candidate_vX.Y.Z/`) — aucune CI ni registre
impliqués. Un échec ici est toujours un échec de code (compilation, packaging), remonté directement à `dev`.

### Publish (mise à disposition, par environnement)

`/publish <env>` rend ce candidat disponible pour un environnement donné, selon le mécanisme qui
lui est propre — principe BORE, voir `agents/infra.md` section 3 :
- **QUALIF** — `promote` : copie/push du candidat tel quel, zéro rebuild, aucune CI impliquée.
- **PROD** — `rebuild-ci` : merge vers `main` + tag officiel `vX.Y.Z`, qui déclenche un rebuild
  déterministe via la CI (même pipeline, même source figée). Le deployer surveille cette CI
  jusqu'à complétion et gère les échecs de façon autonome.

La procédure concrète (commandes exactes) de chaque mécanisme vit dans
`.claude/agents/environments/publish.<env>.md`, générés à `/init-project` depuis
`TEMPLATE_claude/templates/environments/` selon `infrastructure.environments[].publish.mode`.

**En cas d'échec de PUBLISH PROD (CI) :**

Le deployer classe l'échec depuis les logs et remonte les faits, sans corriger lui-même :

| Catégorie | Signification | Agent responsable |
|-----------|---------------|--------------------|
| `CODE` | Le code est suspect | `dev` |
| `FLAKY` | Échec non reproductible persistant | `qa` |
| `CONFIG` | La config CI est en cause, le code est sain | `infra` |
| `INFRA` | L'infrastructure CI est en cause, le code est sain | `infra` |

Le teamleader décide du routing vers l'agent responsable. Le merge et le tag de la publication échouée
sont annulés (rollback) — aucun artefact partiellement publié ne reste référençable.

### Déploiement PROD (installation pure, sans build ni merge ni tag)

Le merge vers `main` et le tag officiel `vX.Y.Z` ont désormais lieu dans `/publish prod`, qui
déclenche le rebuild déterministe via CI — `/deploy prod` installe uniquement sur la plateforme
PROD l'artefact que cette CI a produit et publié, sans jamais rebuilder ni republier. Comme pour
PUBLISH, la procédure d'installation propre au mécanisme (docker-compose, helm, vps...) vit dans
`.claude/agents/environments/deploy.<env>.md`, générés depuis `TEMPLATE_claude/templates/environments/`
selon `infrastructure.environments[].deploy.mechanism`.

**En cas de succès du rollout :**
- Notes de release posées sur la GitHub Release créée par la CI (`gh release edit` ; création seulement en repli)
- Milestone correspondant à la version → clôture proposée à l'utilisateur, puis nettoyage des branches résiduelles

**En cas d'échec du rollout :** rollback infra (`kubectl rollout undo`, réinstallation de la
version précédente) — la publication (`/publish prod`) ayant déjà réussi (CI verte), l'échec ici
est toujours un échec d'installation, jamais un échec de code ni de build. Le deployer remonte
les faits bruts au teamleader, qui décide de la suite.

### Clôture de milestone

Après un déploiement PROD réussi, `deployer` recherche le milestone correspondant à la version (par préfixe `vX.Y.Z`)
et remonte la question « Clôturer le milestone ? » (posée par le teamleader via `AskUserQuestion`) :
- **Clôturer** (recommandé) → issues encore ouvertes : reporter vers le prochain milestone / fermer / laisser en
  suspens ; version consignée dans l'historique de la description, puis milestone fermé
- **Laisser ouvert** → aucun changement

Même logique que `/milestone close` (`agents/deploy.md` Étape 5).

### Marketing en parallèle du déploiement

Le CDP dispatche systématiquement `marketing-release` **en parallèle du `deployer`** à chaque
déploiement PROD — tous workflows confondus, y compris Hotfix — sans attendre le résultat de
la CI et sans vérifier lui-même l'existence ou le contenu d'un milestone. C'est l'agent
marketing qui, une fois lancé, résout lui-même le milestone correspondant à la version — par
**préfixe**, jamais par titre exact (le titre peut porter un nom descriptif après le préfixe,
séparateur non garanti, ex. `v8.0.0 — Mode RAFALE` ou `v8.0.0 - Mode RAFALE`) — et statue seul
sur la pertinence d'une publication en examinant les changements réellement livrés : au moins
une issue fermée avec un label visible utilisateur (`feature`, `enhancement`, `breaking`) →
prépare du contenu ; sans changement marquant (que des `fix`/`chore`/`refactor`), ou aucun
milestone trouvé (repli sur `CHANGELOG.md`), il s'arrête immédiatement, sans solliciter
l'utilisateur.

**Emplacement du site** : le site vit **uniquement sur la branche `gh-pages`**, jamais commité sur la
branche de code (`main`, `milestone/*`, `hotfix/*`). `MARKETING/` n'est pas un dossier de `main` : c'est le
**worktree git de `gh-pages`** (`git worktree add MARKETING gh-pages`, créé par l'agent s'il est absent). Il
est exclu par le `.gitignore` posé par `/init-project`, et `PUBLISH` commit + push depuis ce worktree. Les
release notes et posts, eux, restent sur la branche de code, dans `docs/releases/`. Un projet dont `MARKETING/`
est déjà suivi par la branche de code se voit proposer une migration par `/init-project`.

**Initialisation du site** : un site marketing est la règle (`marketing.site: "auto"`). S'il n'en existe
aucun (pas de branche `gh-pages` avec un `index.html`) et que le CDP n'a pas donné l'ordre `SANS SITE`
(`marketing.site: false`), l'agent n'improvise pas : il **alerte le CDP** (`MARKETING BLOQUE` + questions de cadrage)
avec une **maquette proposée** (hypothèses à confirmer) et des **questions de cadrage** (public cible,
proposition de valeur, identité, sections, visuels, appel à l'action, langues/URL). Le CDP les relaie à
l'utilisateur (**GATE 4e**) ; « pas de site » enregistre `marketing.site: false`. Les réponses sont consignées
dans `MARKETING/CADRAGE.md` (sur `gh-pages`) et servent de référence aux releases suivantes. Le déploiement PROD n'est pas
bloqué ; rien n'est publié tant que la maquette n'est pas validée.

S'il y a lieu de publier, l'agent prépare le contenu (release notes, posts, site) **sans
commit**, et le CDP relaie la maquette à l'utilisateur pour validation. La publication
(commit + push depuis le worktree `MARKETING/`, donc sur `gh-pages`) n'est déclenchée que lorsque **les deux conditions sont
réunies** : maquette (éphémère, voir « Maquettes ») validée par l'utilisateur ET déploiement PROD confirmé réussi — dans
n'importe quel ordre. Si le déploiement échoue, rien n'est publié.

---

## Approche TDD

Le `test-writer` est déclenché **en parallèle du DEV**, depuis le plan et les contrats API — pas depuis le code livré. Les tests définissent le comportement attendu ; le développeur implémente pour les faire passer.

**Règle de non-régression** : les tests existants sont immuables. Seul un changement `BREAKING` ou `CHANGED` documenté dans `contracts/CHANGELOG.md` autorise leur mise à jour. Le `code-reviewer` vérifie que les tests couvrent bien tous les contrats.

### Plan de tests (feature / non-régression)

Objectif : **ne jamais rejouer le même test sur le même code sans raison**, et séparer les tests de la feature en cours des tests de non-régression (NR). Convention complète : `TEMPLATE_claude/commands/context/COMMON.md` §15.

- **Arborescence par lots** : le `test-writer` range les tests de spécification en `tests/integration/<theme>/<lot>/`, `e2e/<theme>/<lot>/`, `tests/procedures/<theme>/<lot>/` (`<theme>` = domaine fonctionnel ; un lot = au plus `testing.lot_max_tests` cas, défaut 50). Le chemin porte l'identité (auto-documenté) ; les tests unitaires restent colocalisés avec le code.
- **Progression QA** : `qa` exécute **lot par lot** et envoie un jalon au teamleader à chaque fin de lot (`QA EN COURS — lot 3/12 (integration/auth/login) — 148/612 tests, 2 KO`), relayé à l'utilisateur en une ligne — plus d'effet tunnel. Règle générale dans le protocole teammates (§4b) : toute tâche à plusieurs unités envoie un jalon `EN COURS` par unité au teamleader, qui le relaie. Les échanges coordinateur ↔ sous-agents (planner, code-reviewer, qa) suivent les mêmes règles : ordres et retours par références de fichiers, jamais de contenu inline ; jalons des sous-agents agrégés par le coordinateur.
- **Index `tests/INDEX.md`** : ne porte que l'état qui change — une ligne par **lot** (chemin, niveau, composant, feature, statut, tags), plus des lignes fichier pour les exceptions (quarantaine). Un lot sans ligne est traité `feature`. Statuts : `feature` (milestone en cours), `regression` (features livrées — promus par le CDP au déploiement PROD ; un test de reproduction de bugfix naît `regression`), `quarantaine` (échec connu ou instable, raison + issue — ne bloque pas le verdict). Tags : `smoke`, `critical`, `slow`. 
- **Propriété** : le `test-writer` écrit les tests de spécification (contrats, critères, maquettes) ; les `dev-*` n'écrivent que des tests unitaires internes et ne lancent que la **boucle rapide** (build, lint, typecheck, tests liés à leurs fichiers modifiés — jamais la suite complète).
- **QA par cycle** : suite **feature** d'abord (KO → retour DEV immédiat, sans NR) ; si OK, NR **impactées** par le diff (`testing.components`) — `testing.regression_at_qa` = `gated` (défaut) \| `parallel` \| `none`.
- **NR complète** (`qa`, scope `regression-full`) — `testing.full_regression_at` : `qualif` (défaut : en parallèle de BUILD → PUBLISH → DEPLOY QUALIF et de DOC finalize ; **GATE 4 ne s'ouvre qu'une fois la NR VALIDATED**, un échec renvoie en DEV sans solliciter l'utilisateur), `build` (avant PUBLISH QUALIF) ou `prod` (une fois avant PUBLISH PROD). En hotfix : après le DEPLOY PROD, en arrière-plan.
- **BUILD ne rejoue aucun test** : `deployer` compile seulement, QA a déjà validé le même arbre git. Un journal `_work/tests-ledger.md` (tree-hash + scope) évite de relancer un scope déjà VALIDATED sur un arbre inchangé.
- **Bugfix** : le test de reproduction est écrit **avant** le DEV et vérifié **rouge** par QA (`red-check`) sur le code non corrigé.
- **Échecs classés** par nature (`feature` / `regression` / `quarantaine` / `environnement` / `flaky` — une relance maximum, puis quarantaine) ; le CDP consigne chaque verdict dans `tests/METRICS.md` pour mesurer le taux réel de retours dus à la régression.
- **Durée des tests** (§15.10 — retour d'expérience : suites de plusieurs heures) : 1) **chaîne native** de l'OS qui exécute — sous WSL, `node`/`npm`/`go` Linux, jamais les `.exe` Windows via `/mnt/c` (`commands.env`, contrôle avant le premier build/test, binaire Windows → `BLOQUE`) ; 2) **petits paquets** parallélisables (Go : `cmd/` mince, logique dans `internal/<domaine>/`, `t.Parallel()`, pas d'attente fixe ; budget ~60 s par unité, QA publie les 5 plus lentes et le teamleader propose le découpage) ; 3) **runner JS réglé** (vitest : `environment: 'node'` par défaut, jsdom seulement pour les fichiers DOM, `pool: 'threads'`, `--reporter=dot`) ; 4) **tests ciblés** — `dev-*` : tests liés aux fichiers modifiés (`commands.test_related`, ex. `vitest related --run`, sinon `commands.test_targeted` sur les paquets touchés, Go sans `-race` hors code concurrent) ; `test-writer` : ses seuls fichiers (compilation + RED) ; `qa` : seul à lancer les suites complètes, une fois par arbre git, jamais deux en parallèle sur le même dépôt.
- **Scopes optionnels** : `perf` et `security` ne sont joués que si le planner les a demandés (`test_scopes`) ; smoke post-deploy via `commands.smoke` (à défaut `curl /health`).

Réglages dans `project-config.json` : `testing.components`, `testing.regression_at_qa`, `testing.full_regression_at`, `testing.coverage_min`, `testing.lot_max_tests`, `commands.env`, `commands.test_related`, `commands.test_targeted`, `commands.smoke` (`commands.test_fast` : obsolète). `/init-project` détecte la chaîne d'outils (Étape 9b ; en mise à jour, étape d1i). `/init-project` crée `tests/INDEX.md` et `tests/METRICS.md` (idempotent).

---

## Commandes disponibles

### Session

| Commande | Description |
|----------|-------------|
| `/start-session` | Démarre la session, lit la mémoire projet, spawne le socle (+ la team du milestone en cours), affiche le milestone actif ; détecte un workflow interrompu (terminal tué) et propose de le reprendre au lieu de purger `_work/` ; signale les branches résiduelles (lecture seule) |
| `/end-session` | Clôture la session, shutdown propre des agents, met à jour la mémoire — tout délégué : git à `deployer`, tests/build à `qa`, docs + `MEMORY.md` à `doc-updater`, le teamleader ne fait que questionner ; purge sélective de `_work/` si un workflow reste en cours ; classe les branches résiduelles (protégée / sûre / à arbitrer) et propose de supprimer les sûres en local + remote, jamais sans confirmation (classement et suppression délégués à `deployer`) |
| `/team-status` | État de la team (lecture seule) |
| `/team-delete [--force]` | Ferme les teammates IDLE, ou tous avec `--force` |
| `/context-audit [scope]` | Audit des fichiers de configuration : doublons, refs cassées, dérive template |
| `/init-project` | Bootstrap, réinitialisation ou synchronisation du template |

### Développement

| Commande | Description |
|----------|-------------|
| `/feature <desc>` | Nouvelle fonctionnalité — workflow complet avec PLAN, DEV parallèle, tests, build, publish, deploy |
| `/bugfix <desc>` | Correction de bug avec test de régression obligatoire |
| `/hotfix <desc>` | Correctif urgent production — build, publish puis deploy direct (PROD uniquement, sans QUALIF) |
| `/refactor <desc>` | Refactoring sans changement fonctionnel — QA avant et après |

### Backlog et Milestones

| Commande | Description |
|----------|-------------|
| `/backlog` | Lister les issues GitHub ouvertes |
| `/backlog <desc>` | Rechercher une issue et lancer le workflow adapté |
| `/milestone new <version>` | Créer un milestone et associer des issues (le premier, `v0.1.0`, est créé par `/init-project` sur un nouveau projet). Pas de date à la création : la **due date GitHub** du milestone porte la **date de démarrage du dev**, posée par `deployer` à l'ouverture de la branche `milestone/vX.Y.Z` (jamais écrasée). Sur GitHub : ouvert sans due date = planifié, ouvert avec due date = en cours depuis cette date, fermé = terminé. La **description** du milestone porte en plus son **historique** (état courant, tableau des lots, journal daté : en cours, en QUALIF, refusé, terminé, reporté, mise en prod, échec, clôture), tenu par `deployer` à chaque transition — `GITHUB.md` §3.0bis |
| `/milestone status` | Progression du milestone actif (barre %) |
| `/milestone close [version]` | Clôturer avec gestion des issues non terminées |

### Suivi d'équipe

| Commande | Description |
|----------|-------------|
| `/progression` | Tableau de bord temps réel — statut de chaque agent actif |
| `/team-status` | État de la team (tableau agents + statut IDLE/EN COURS) — lecture seule |
| `/team-delete [--force]` | Ferme les teammates IDLE ; `--force` ferme tous les teammates, y compris ceux EN COURS |

### Panneau milestone (mod)

Le mod `milestone-panel` (0.3.4 : phase `A VALIDER` entre `EN QA` et `DONE`, comptée comme terminée dans la barre ; 0.3.0 : PR ouvertes listées quand aucun milestone n'est en cours ; 0.2.0 : `👤` après le lot et devant l'issue quand le label `VALID-HUMAINE` est posé) affiche à droite du terminal (à partir de 144 colonnes ; sinon `/panel-milestone`, qui à tout moment **recharge** le panneau : état remis à zéro, relecture GitHub et consommation immédiates, redessin, et résumé en réponse), **uniquement dans la session du team-leader** (les sessions de teammates ne l'ouvrent pas — détection par les options `--agent-name`/`--team-name` d'un processus ancêtre, en remontant toute la chaîne), **en tête la consommation du compte Claude** — la même source que la page « Utilisation » du site (endpoint d'utilisation du compte, lu via le credential tenu par l'hôte, le secret ne transitant jamais par le mod ; repli sur les en-têtes de la dernière réponse avec une clé API ou hors ligne) : une ligne par limite (« Session » 5 h, « Semaine » 7 j, et chaque limite hebdomadaire distincte par modèle, ex. « Fable sem. »), avec barre sur toute la largeur du panneau, pourcentage et réinitialisation en heure locale (« 15:00 », « demain 12:00 », « mer. 12:00 », « 42 min ») ; barre bleue, orange au-delà de `warnPercent` (70 % par défaut) ou si l'API signale `warning`, rouge à partir de 90 % ou `critical` ; relue au démarrage, après chaque tour (20 s mini entre deux lectures) et toutes les minutes **dans le cache partagé avec le launcher** (0.3.3 : `$CLAUDE_CONFIG_DIR/claude-launcher-cache/usage.json` quand `CLAUDE_CONFIG_DIR` est défini — Claude-Launcher v5, stockage commun à l'hôte et à tous les conteneurs de projets — sinon `${XDG_CACHE_HOME:-~/.cache}/claude-launcher/usage.json` ; alimenté par le launcher, au rythme de `USAGE_REFRESH_SEC` de `~/.config/claude-launcher.conf` quand ce fichier existe — launcher v4 ; absent dans un conteneur, repli 5 min) : le panneau n'appelle lui-même l'endpoint que si ce cache manque ou a plus de 1,5 × cet intervalle, et y réécrit la réponse pour le launcher et les autres projets ; après un échec noté par quiconque (`usage.json.err` : 429, token expiré), aucun appel tant que `maintenant < date(.err) + max(5 min, 2 × l’intervalle)` — un `.err` daté dans le futur (attente progressive du launcher) vaut attente et n'est **jamais raccourci** ; sur un 429, le panneau applique la même progression que le launcher (`usage.json.wait` : 5, 10, 20 puis 30 min, `Retry-After` respecté ; `.err` « trop d’appels à l’endpoint, nouvel essai vers HH:MM » daté de maintenant + attente − 5 min), et un succès supprime `.wait` et vide `.err` — puis
les issues **ouvertes** du milestone en cours, groupées par label de phase, du plus avancé (`DONE`, `A VALIDER`, `EN QA`, `EN REVIEW`, `EN COURS`, `PRET`, `PLANNING`) au backlog sans phase en dernier, `BLOQUE` en rouge. Le titre du milestone est suivi d'une barre d'avancement segmentée dans l'ordre de développement (fermées en violet, puis chaque phase présente — `DONE` compris — à la couleur de son label, puis non démarrées ; le pourcentage compte fermées + `DONE`), les issues sont regroupées par lot (label `LOT-N`, GITHUB.md §9.11 ; les sous-lots `LOT-N.M` sont regroupés sous le lot parent, sans distinction) quand le milestone en porte, lots triés par avancement (phase moyenne de leurs issues : un lot entièrement `DONE` passe avant un lot `DONE` + `EN REVIEW` ; puis phase la plus avancée, puis numéro), issues sans lot en dernier, chaque phase reprend la couleur de son label GitHub et s'affiche en une ligne par issue (`LOT  PHASE : #n titre`, libellés alignés, écrits uniquement sur la première ligne de leur groupe) et les lignes s'adaptent à la largeur du panneau.
Le milestone en cours est le milestone ouvert portant une due date (= date de démarrage du dev, posée au MILESTONE START), le plus anciennement démarré ; quand toutes ses issues sont fermées (CI verte), il reste le milestone en cours, signalé « — publication » pendant la publication/le déploiement PROD, jusqu'à sa clôture — même si le milestone suivant a déjà des issues en `PLANNING` (sans due date, il n'est pas démarré). Repli pour un projet sans aucune due date : premier milestone (SemVer) portant une issue dans une phase autre que `PLANNING` (un plan en cours d'élaboration ne démarre pas le milestone — 0.3.2), sinon un milestone ouvert dont toutes les issues sont fermées ; à défaut,
le panneau liste les milestones ouverts avec leur avancement, les milestones sans version (`vX.0.x`, `vx.x.x`) en dernier, puis par progression décroissante puis par version croissante, une ligne par milestone (`barre  %  fermées/total  titre`), suivis des **PR ouvertes** (`#n  état  titre  (branche)` : brouillons en dernier, état de revue « ✓ approuvée », « ✗ à corriger », « revue attendue » ou « brouillon ») ; l'heure de mise à jour est sur la ligne de titre. Il se rafraîchit 10 s après chaque
`gh issue edit/close/reopen/create` et `gh pr create/merge/close/reopen/ready/edit` du teamleader (délai de propagation GitHub, relecture unique de vérification),
puis toutes les minutes, après toute commande Bash et après chaque délégation du team-leader (`SendMessage`, `Agent`). Délais réglables via la config du mod (`propagationDelaySec`, `refreshIntervalSec`). Nécessite `gh`.

### Validation

| Commande | Description |
|----------|-------------|
| `/review` | Revue de code directe (sans passer par /feature) |
| `/qa` | Tests et validation qualité directs |
| `/secu` | Audit de sécurité complet (SAST, OWASP, dépendances, secrets) |

### Déploiement et Communication

| Commande | Description |
|----------|-------------|
| `/build` | Compilation d'une version candidate (aucun test rejoué) — locale, agnostique à l'environnement |
| `/publish qualif` | Mise à disposition du candidat pour QUALIF — promotion, zéro rebuild |
| `/publish prod` | Mise à disposition du candidat pour PROD — merge + tag officiel, déclenche un rebuild déterministe via CI |
| `/deploy qualif` | Installation en qualification de l'artefact déjà publié (avec validation infra préalable) |
| `/deploy prod` | Installation en production de l'artefact publié par la CI — sans build ni merge ni tag (gate explicite requis) |
| `/marketing [version]` | Release notes depuis milestone + CHANGELOG GitHub |

---

## Flux de travail type

```
/milestone new v1.2.0               Créer le milestone + associer les issues
        ↓
/start-session                       Voir la progression du milestone
        ↓
/backlog #42                         Travailler une issue
        ↓
/feature "#42 - Auth OAuth"          Workflow complet multi-agents (build + publish + deploy qualif inclus)
        ↓
/deploy prod                         Publie (merge + tag → rebuild CI) puis installe en PROD → proposition de clôture du milestone
        ↓
/marketing v1.2.0                    Release notes depuis le milestone clos
```

---

## Migration depuis v3 (cadrage par milestone)

`/init-project` → « Appliquer les mises à jour détectées » (option d) : ajoute `milestone.defaults` à `project-config.json`, réécrit la colonne `Spawn`
de la table « Agents Disponibles » (`permanent` → `socle` / `milestone` / `ponctuel` selon le template ; une instance
générique garde sa valeur, `permanent` = `socle`). Un milestone déjà en cours, sans cadrage, est mené en « complet »
avec toute la team ; le cadrage s'applique à partir du milestone suivant. Redémarrer le teamleader après la synchro.

## Migration depuis v1 ou v2

Les projets créés avec une architecture antérieure sont détectés automatiquement.

**Avec le launcher** : ouvrir le projet depuis le menu — `init-project.md` est bootstrappé automatiquement, puis `/init-project` détecte et migre.

**Sans le launcher** :
```bash
curl -fsSL \
  https://raw.githubusercontent.com/CCoupel/claude_project_template/main/init-project.md \
  -o <projet>/.claude/commands/init-project.md

# Dans Claude Code :
/init-project
# → "Projet v1/v2 détecté — migration v3 requise"
# → Fetch TEMPLATE_claude/ + .gitignore + nettoyage git + commit automatique
```

---

## Synchronisation du template

Pour récupérer les nouvelles fonctionnalités du template dans un projet existant :

```
/init-project → Appliquer les mises à jour détectées (option d)
```

Fetche la dernière version de `TEMPLATE_claude/` et :
- Écrase les commandes (`*.md`), agents template (`*.template.md`) et contextes partagés template (`context/*.template.md`)
  — pour les agents (communs et `dev-*`), selon le registre des agents : seuls ceux dont la source a changé, hors épinglés
- Met à jour le bloc `<!-- BEGIN/END TEAMLEADER_PROTOCOL -->` dans `CLAUDE.md` sans toucher au reste
- Compare la table `## Agents Disponibles` de `CLAUDE.md` à la structure attendue (agents génériques
  + agents `dev-*` inscrits au registre des agents) et la met à jour — documentation uniquement, cette
  comparaison ne crée/modifie/supprime jamais `.claude/agents/*.md`
- Synchronise `CLAUDE.md` (bloc `TEAMLEADER_PROTOCOL` + table `Agents Disponibles`) et `.claude/settings.json`
- Crée s'ils sont absents `.claude/memory/MEMORY.md` et `contracts/CHANGELOG.md` (jamais écrasés)
- Régénère `.claude-launcher/env-template.yaml` (étape d1j) s'il change : nouveaux dossiers dérivés, verrous ou version de chaîne ; `env.yaml` jamais touché, sauf migration d'un `env.yaml` généré par une version antérieure (diff + confirmation)
- Termine par le même audit du contexte qu'à l'init (commit de l'état synchronisé, puis `/context-audit` complet),
  puis la même publication sur `main` (commit des corrections, report sur `main`, push)

### Structure de CLAUDE.md — Zone projet / Zone template

`CLAUDE.md` est divisé en deux zones maintenues séparément :

```
Zone 1 — Contenu projet           Zone 2 — Règles template
─────────────────────────         ───────────────────────────────────────
Config, stack, commandes,         <!-- BEGIN TEAMLEADER_PROTOCOL -->
mémoire. Jamais écrasé            Rôle CDP, nommage canonique,
par le template.                 délégation stricte, spawn du socle au
                                  start-session (team au GATE 2),
                                  SendMessage only, validation DONE.
                                  <!-- END TEAMLEADER_PROTOCOL -->
                                  Remplacé à chaque sync (step d6).

Table "## Agents Disponibles" — exception documentaire dans la Zone 1 : comparée à la
stack configurée et resynchronisée à chaque sync (step d5d), mais uniquement son texte —
`.claude/agents/*.md` n'est jamais touché par cette resynchronisation.
```

`CLAUDE.md` étant chargé nativement par Claude Code à chaque session, les règles de la Zone 2 survivent aux compactages de contexte sans mécanisme de hook supplémentaire.

### Audit du graphe de dépendances et vérification post-nettoyage (automatique à chaque sync)

- **Avant la mise à jour (step d1e)** : Claude parcourt le graphe des fichiers de définition locaux
  (`CLAUDE.md`, `project-config.json`, `settings.json`, agents, contextes, environnements — arêtes :
  tables `Fichier`, `@import`, chemins, renvois de section, hooks, pairage compagnon ↔ template) et
  signale les **liens cassés** (cible/section absente, `{PLACEHOLDER}` restant) et les **orphelins**
  (compagnon sans template, `generic.<nom>` ou `dev-*` hors config, environnement retiré...).
  Les reliquats de contextes (`*.template.md` dont la source a disparu) sont désormais supprimés comme ceux des
  commandes et agents. Correction toujours après confirmation ; `TEMPLATE_claude/` et les `*.template.md`
  ne sont jamais modifiés — **le template fait foi**.
- **Après la mise à jour et le nettoyage (step d5e)** : contrôle déterministe (`cmp`, lignes reprises à
  l'identique) puis sémantique que plus aucun doublon ne subsiste (hors doublons assumés), que le graphe
  est sain et qu'aucun nettoyage n'a cassé de lien ; reprise limitée à 2 passes.

### Détection de doublons et de conflits (automatique à chaque sync)

À chaque synchronisation, Claude analyse les fichiers `*.md` compagnons (agents et contextes
partagés) en deux passes distinctes.

**1. Doublons (step d5b)** — règles du compagnon qui disent la même chose que le template,
devenues redondantes :

| Signal | Signification | Action proposée |
|--------|---------------|-----------------|
| `[↓]` DERIVE-TEMPLATE | Le template couvre maintenant ce que vous aviez customisé | Simplification possible |
| `[~]` MIXTE | Une partie du `.md` est couverte par le template, une autre reste propre au projet | Retirer seulement la partie redondante |
| `[=]` IDENTIQUE | Le `.md` duplique le template sans rien ajouter | Peut être supprimé |
| `[*]` PROPRE | Rien de redondant — passe à l'analyse de conflits | — |

La détection opère règle par règle, pas seulement fichier par fichier : dès qu'une règle
du `.md` compagnon se retrouve — littéralement ou en substance, **en disant la même
chose** — dans le template mis à jour, elle peut être retirée du compagnon, même si le
reste du fichier reste propre.

**2. Conflits (step d5c)** — règles du compagnon qui portent sur le même sujet que le
template mais disent **autre chose** (incohérence, pas simple ajout) :

| Signal | Signification | Action proposée |
|--------|---------------|-----------------|
| `[X]` CONFLIT | Compagnon et template se contredisent sur le même sujet | Arbitrage utilisateur : template, compagnon, ou édition manuelle |
| — | COHERENT | Le compagnon ajoute du contenu spécifique sans contredire le template | Rien à faire |

Chaque conflit est présenté individuellement pour trancher : garder la règle du template
(la règle projet est retirée/adaptée), garder la règle du compagnon (dérogation projet
assumée, re-signalée aux sync suivantes tant qu'elle diffère), ou éditer manuellement.

Ces analyses sont silencieuses si tout est propre. Elles servent aussi de migration
one-shot pour les projets qui avaient du contenu mixte avant l'introduction de la convention.

---

## Personnalisation

### Adapter les agents et contextes partagés au projet

Les commandes (`*.md`) n'ont pas de compagnon — leur comportement se personnalise via les
contextes partagés qu'elles référencent (voir plus bas). Les agents et les contextes partagés
suivent tous deux le pattern template + compagnon : créer le fichier `.md` compagnon à côté
du `.template.md` pour surcharger le comportement.

```bash
# Exemple : règles spécifiques pour l'agent deployer
touch .claude/agents/deploy.md
```

```markdown
# Adaptations projet — deploy

## Conventions de nommage
- Les tags de release suivent le pattern `v<version>-<env>`

## Règles métier spécifiques
- Ne jamais déployer en PROD un vendredi sans validation explicite
```

Claude lit `deploy.template.md` (comportement standard) puis `deploy.md` (règles projet).
Le fichier `deploy.template.md` n'est jamais à modifier — il se met à jour automatiquement.

Même principe pour un contexte partagé, référencé par plusieurs commandes/agents à la fois :

```bash
# Exemple : règle de versionnement spécifique au projet
touch .claude/commands/context/COMMON.md
```

```markdown
# Adaptations projet — COMMON

## Règle de versionnement spécifique
- Les milestones de ce projet incluent systématiquement un numéro de sprint dans leur description
```

Claude lit `context/COMMON.template.md` (règles génériques du template) puis `context/COMMON.md`
(règles projet) — toute commande ou agent référençant "`context/COMMON.md`" lit en réalité les deux.
Le fichier `context/COMMON.template.md` n'est jamais à modifier — il se met à jour automatiquement.

### Forker ce template

Mettre à jour `TEMPLATE_claude/.template-source.json` dans votre fork :

```json
{
  "repo": "votre-org/votre-fork",
  "branch": "main"
}
```

### Ajouter un template de stack

1. Créer `TEMPLATE_claude/templates/dev-backend-rust.md`
2. Ajouter sa ligne à la table « Correspondance stack → agent de stack » de la section "Registre des agents"
   de `init-project.md` (le registre se charge ensuite du déploiement et de la synchronisation). En attendant
   un template dédié, une stack est déjà couverte par le repli `dev-generic.md` + compagnon de stack

### Pipeline CI/CD de release

Pas de modèle à ajouter par stack : le pipeline est **audité s'il existe, généré sinon** par `/init-project`
(puis maintenu par l'agent `infra`) selon le contrat de `TEMPLATE_claude/agents/infra.md` §3bis (déclencheur
tag `v*`, CI de pré-validation sur push de `milestone/*` et à la demande (C10), script unique `commands.ci` partagé CI/QA/deploy (C11), cohérence des versions, build identique à `commands.build`, livrables `<artefact>-<X.Y.Z>`,
Release créée avec les notes du changelog, permissions minimales, pas de secret en clair, pas de déploiement).

**Une seule CI, locale et distante** : `commands.ci` (`CI_CMD`) est un script unique (build, lint, tests + détecteur de course, audit, build web) appelé par les workflows, `qa` et `deploy` — plus d'écart local/CI. `/init-project` génère aussi un workflow de **pré-validation** (`ci-branch.yml` : push de `milestone/*` + à la demande, sans publier). `deploy` (PUBLISH PROD, `rebuild-ci`) **refuse de merger et de taguer** tant que ce workflow n'est pas vert sur le SHA exact (`gh run list --workflow ci-branch.yml --commit <sha>`) : un tag ne sert jamais de test, on corrige sur la branche sans retaguer. Un échec CI `FLAKY` se relance une fois au plus, puis analyse. `qa` rejoue les tests de timing en conditions de runner (2 CPU, charge) et relance l'audit de dépendances juste avant la release ; règle des tests de timing (pas de sondage de port ni d'attente fixe, attentes par événement, pas de rebind de port éphémère) dans `commands/context/DEVELOPMENT.md` et `QUALITY.md`.

**Projet déjà initialisé** : « Appliquer les mises à jour » (étapes d1c/d1d) ajoute `commands.ci`, propose de dériver `scripts/ci.sh` du workflow de release existant, de générer `ci-branch.yml` et de réduire le workflow à `run: $CI_CMD`, et de régénérer (avec `.bak`) le fichier `publish.<env>` en `rebuild-ci` qui n'a pas la barrière. Tout est soumis à validation, rien n'est écrasé sans réponse.
Le pipeline généré est montré à l'utilisateur avant écriture ; un pipeline existant n'est jamais modifié sans
accord. `release-go-react.yml` n'est qu'un exemple de référence.
