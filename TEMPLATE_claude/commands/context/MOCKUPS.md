# MOCKUPS.md — Maquettes (§14)

> Extrait de `commands/context/COMMON.md` (numérotation conservée, les renvois « COMMON.md §N » restent valables) :
> à lire **seulement** quand la tâche touche une maquette (création, présentation au GATE 2, conformité QA) ou l'ouverture d'un fichier dans Chrome (§14.9) — pas à chaque commande.

## 14. Maquettes

Les maquettes font partie de la **définition du projet**. Une maquette validée est un livrable durable, conservé et versionné avec le code.

### 14.1 Quand une maquette est obligatoire

| Changement | Maquette |
|------------|----------|
| Toute modification visible d'une interface (ajout, retrait, changement d'aspect ou de comportement) | **Obligatoire** — maquette visuelle (`ui`) |
| Machine à états impactée | Obligatoire (`conception`) |
| Changement d'architecture (composants, flux, déploiement) | Obligatoire (`architecture`) |
| Bugfix ou refactoring sans effet visible ni structurel | Aucune |

Le planner tranche et justifie en une ligne quand il n'en produit pas.

### 14.2 Emplacement et nommage

Chemin configurable : `docs.mockup_dir` dans `project-config.json` (défaut `docs/mockup`).

```
docs/mockup/
├── INDEX.md                                 # maquettes actives / obsolètes (tenu par le CDP)
├── DECISIONS.md                             # contraintes de conception retenues (voir 14.5)
└── v<X.Y.Z>/                                # milestone en développement
    ├── ui/admin_nav_bar__compaction.html
    ├── architecture/deploy_pipeline__build_publish_deploy.html
    └── conception/session_state__reconnexion.html
```

- `v<X.Y.Z>` : le milestone en cours (`milestone/vX.Y.Z`). Un hotfix rattaché à un milestone y dépose ses maquettes. Si le milestone est renuméroté, le dossier suit (`git mv`).
- `<type>` : `ui`, `architecture` ou `conception`.
- Fichier : `<composant>__<feature>.<ext>` — **double underscore** entre composant et feature (chacun peut contenir des `_`). Pas de version dans le nom du fichier.

### 14.3 Format

**Le format standard est le HTML**, pour les trois types (`ui`, `conception`, `architecture`) :

| Cas | Format |
|-----|--------|
| **Standard** (tous types) | **HTML autonome** : CSS/JS inline, images en data-URI, aucune ressource externe au chargement (pas de CDN, pas de police distante). Les **schémas et dessins y sont intégrés** (machine à états, architecture, flux, annotations d'une interface), au choix du planner : **SVG inline** dessiné dans la page, ou **Mermaid embarqué** — source Mermaid + librairie `mermaid` copiée inline dans le fichier (version figée, récupérée une fois à la production du brouillon, jamais référencée par URL) |
| Exception : `.md` | **Uniquement si le HTML n'est pas adapté** (ex. maquette purement textuelle : format d'un fichier de configuration, sortie d'une CLI, structure d'un message). Le planner le justifie en une ligne dans le plan |
| Dernier recours : binaire | Accepté **s'il n'existe aucune autre solution** |

**Une maquette présente toujours le composant dans son intégralité**, y compris les parties inchangées. Elle peut néanmoins ne porter que sur une partie d'un composant : dans ce cas elle **complète** les maquettes actives du même composant (voir 14.4).

**Propositions en onglets** — un brouillon HTML présente **2 à 3 propositions** distinctes, sélectionnables par des
**onglets** en tête de page :

- Chaque proposition est une vraie alternative (parti pris différent : disposition, interaction, découpage,
  enchaînement d'états…), pas une variation cosmétique. Chacune respecte `DECISIONS.md` et présente le composant
  **entier**.
- Barre d'onglets : une lettre et un titre court par onglet (`A — Barre latérale`, `B — Menu compact`…), un seul
  panneau visible à la fois (CSS/JS inline). Sous l'onglet actif, une ligne de parti pris (avantage / inconvénient).
- Chaque panneau est un bloc autonome `<section data-proposition="A">…</section>`, sans dépendance aux autres panneaux.
- **Une seule proposition** n'est admise que s'il n'existe aucune alternative crédible (détail imposé par une
  maquette active, contrainte de `DECISIONS.md` qui fige le choix) — justifié en une ligne dans le plan, sans onglets.
- Brouillon à onglets : `<composant>__<feature>.propositions.html`. La maquette validée (14.4) ne contient que la
  proposition retenue, **sans onglets**, sous le nom définitif `<composant>__<feature>.html`.
- Une maquette `.md` (exception ci-dessus) présente ses propositions en sections `## Proposition A — <titre>`.

**Schémas et dessins — versions horizontales et verticales** : **tout schéma ou dessin** d'une maquette, quel qu'en
soit le type (`conception`, `architecture`, mais aussi un schéma ou une illustration intégré à une maquette `ui` :
machine à états, architecture, flux, déploiement, annotations, parcours…), est présenté en **2 à 3 versions
horizontales et 2 à 3 versions verticales**, soit **4 à 6 propositions** au choix :

- Horizontale = schéma qui se lit de gauche à droite (plus large que haut) ; verticale = de haut en bas (plus haut
  que large). Chaque version reste une vraie alternative (découpage, regroupement, enchaînement…), pas la même
  disposition simplement pivotée — une version verticale peut reprendre le parti pris d'une horizontale, mais pas
  toutes.
- Lettres continues (`A`…`F`), l'orientation en tête du titre : `A — Horizontal · Flux en ligne`,
  `D — Vertical · Couches empilées`. Barre d'onglets en **deux groupes** libellés « Horizontal » et « Vertical ».
- L'exception « une seule proposition » ne s'applique pas : minimum 2 horizontales + 2 verticales.
- Une maquette `ui` sans schéma ni dessin (écran seul) reste à 2 à 3 propositions. Une maquette `ui` qui contient un
  schéma ou un dessin suit la règle : ses 4 à 6 propositions portent sur ce schéma/dessin, l'écran autour restant
  celui de sa proposition.

**En-tête obligatoire** (commentaire HTML en tête de fichier, ou front-matter YAML pour `.md`) :

```
mockup:
  composant: admin_nav_bar
  feature: compaction
  version: 11.0.1
  type: ui
  issue: "#123"
  validee_le: 2026-09-25
  proposition_retenue: "B — Menu compact"   # brouillon : propositions: ["A — …", "B — …", "C — …"] (schéma : "A — Horizontal · …" … "F — Vertical · …")
  complete: []                # maquettes complétées (chemins) — les deux restent actives
  remplace: []                # maquettes remplacées (chemins) — les anciennes deviennent obsolètes
```

### 14.4 Cycle de vie et immuabilité

1. **Brouillon** : produit par le planner dans `_work/mockup/` (non commité), avec ses 2 à 3 propositions en onglets (14.3).
2. **Choix** (GATE 2) : le CDP ouvre le brouillon dans Chrome (14.9) et fait choisir une proposition à l'utilisateur. Le planner produit alors la **version retenue** (proposition choisie seule, sans onglets, en-tête `proposition_retenue`) — les propositions écartées ne sont pas conservées ; une raison de rejet exprimée par l'utilisateur devient une contrainte de `DECISIONS.md` (14.5).
3. **Validation** (GATE 2) : après accord explicite de l'utilisateur, le CDP copie la version retenue à son emplacement définitif, la commite sur la branche du milestone et met à jour `INDEX.md`.
4. **Immuable** : une maquette validée n'est **jamais modifiée**. Une évolution ultérieure crée une nouvelle maquette (dans le milestone courant) qui référence les précédentes via `complete` ou `remplace`.
5. **Obsolescence** : quand une maquette en `remplace` une autre, le CDP déplace l'ancienne de la table « Actives » vers la table « Obsolètes » de `INDEX.md`, avec la référence de la remplaçante. Le fichier reste dans git.
6. **Brouillons et propositions rejetés ou modifiés** : jamais conservés. Seules les **raisons** sont conservées (voir 14.5).

**`INDEX.md`** (tenu exclusivement par le CDP) :

```markdown
## Actives
| Composant | Feature | Fichier | Version | Relation |
|-----------|---------|---------|---------|----------|
| admin_nav_bar | compaction | v11.0.1/ui/admin_nav_bar__compaction.html | 11.0.1 | complète v10.2.0/ui/admin_nav_bar__base.html |

## Obsolètes
| Fichier | Remplacée par | Version |
|---------|---------------|---------|
```

**Conflit intra-milestone** : si deux features du même milestone maquettent le même composant, le CDP le détecte à l'ajout dans `INDEX.md` et arbitre avec l'utilisateur avant d'enregistrer.

### 14.5 Conservation des raisons de refus (`DECISIONS.md`)

Quand l'utilisateur refuse ou fait modifier une maquette, le CDP **reformule ses retours en contraintes durables** (pas en historique de brouillons) et les ajoute à `DECISIONS.md`, par composant :

```markdown
## admin_nav_bar
- Pas de bleu pour ce composant. _(v11.0.1, compaction)_
- Taille de l'icône supérieure à 24px. _(v11.0.1, compaction)_
```

Exemple : retour « je ne veux pas cette couleur et fais plus gros » → contraintes « pas de bleu » et « taille > 24px ». Une contrainte levée ou remplacée par l'utilisateur est mise à jour, avec la date.

### 14.6 Rôle de chaque agent

| Agent | Règle |
|-------|-------|
| **planner** | Lit `INDEX.md` et `DECISIONS.md` **avant** de dessiner ; part des maquettes actives du composant comme base ; respecte toutes les contraintes de `DECISIONS.md` ; produit le brouillon HTML à 2-3 propositions en onglets dans `_work/mockup/`, puis la version retenue après le choix de l'utilisateur |
| **CDP** | Ouvre le brouillon dans Chrome (14.9) et fait choisir une proposition au GATE 2 ; à la validation, commite la version retenue, met à jour `INDEX.md` (actives/obsolètes) ; à chaque refus, met à jour `DECISIONS.md` ; arbitre les conflits |
| **test-writer** | Dérive les scénarios de toutes les maquettes actives des composants touchés |
| **qa** | Vérifie la conformité à **toutes** les maquettes actives des composants touchés et aux contraintes de `DECISIONS.md`, pas seulement à celle de la feature |

### 14.7 Projets sans maquette de référence

Un projet existant n'a pas de maquette pour ses composants. Le planner dessine directement le nouvel état. Si cela aide à cadrer l'existant, le CDP peut demander à l'utilisateur une **capture d'écran de référence** (ou une maquette de l'état actuel) avant de continuer.

### 14.8 Maquettes marketing — éphémères

Les maquettes marketing (GATE 4d) sont **distinctes** des maquettes projet : systématiques mais **éphémères**. Elles partent toujours de la page publiée en production (ou, à l'initialisation d'un site sans page existante, d'une proposition à cadrer avec l'utilisateur), prennent la forme d'un aperçu Artifact construit depuis `MARKETING/index.html` (worktree de `gh-pages`, non commité tant que `PUBLISH` n'a pas eu lieu), ne sont jamais dans `docs/mockup/` et ne sont ni indexées ni versionnées. Le flag `mockup_ok` du GATE 4d est inchangé.


Les maquettes marketing ne suivent pas la règle des propositions en onglets (14.3) : elles présentent une seule
évolution du site existant.

### 14.9 Ouvrir un fichier du projet dans Chrome (serveur web du launcher, correspondance de chemins)

Claude et Chrome ne voient pas forcément le projet au même endroit : avec Claude-Launcher, le projet est monté dans un
conteneur (ex. `/share/MFS/ROOT/...`) alors que Chrome tourne sur le poste de l'utilisateur. C'est le **launcher** qui
dit comment Chrome atteint un fichier du projet. Depuis **v5.9.0**, il embarque un **serveur web** qui sert les fichiers
par leur chemin absolu (`http://localhost:8081<chemin absolu>`, un dossier affiche sa liste) : c'est la voie normale.
L'URL `file://` ne reste qu'en repli, hors launcher. Sources, par ordre de priorité :

1. **`CL_BROWSER_PATH_MAP`** (posée par Claude-Launcher **≥ v5.9.0**, réglage `browser_paths` de sa config) —
   tableau JSON de préfixes, la plus longue correspondance l'emporte. Le launcher la pose dans l'**environnement de la
   session tmux du projet** (hub pour un projet sur l'hôte, tmux du conteneur sinon) à chaque rattachement : elle est
   lue **d'abord dans tmux** (`tmux show-environment`, valeur courante même si la config a changé après le lancement
   de Claude), puis dans l'environnement du processus (`launcher_browser_map`) :
   ```
   CL_BROWSER_PATH_MAP=[{"container":"/","host":"http://localhost:8081","os":"url"}]           # serveur web du launcher
   CL_BROWSER_PATH_MAP=[{"container":"/share/MFS/ROOT","host":"\\\\nas\\MFS\\ROOT","os":"windows"}]   # file:// mappé
   ```
   `container` : préfixe vu par Claude ; `host` : la base vue par le navigateur — URL `http(s)://…` (serveur web du
   launcher : le chemin relatif au préfixe y est ajouté, segments encodés), ou dossier `C:\…`, UNC `\\serveur\…` (dont
   `\\wsl.localhost\…`), `/…` (URL `file://`) ; `os` : `url` | `windows` | `linux` (macOS = `linux` ; absent = déduit
   de `host`). `[]` = aucun navigateur ne peut ouvrir ces fichiers : afficher seulement le chemin. Variable présente =
   le launcher fait foi ; une correspondance fausse se corrige dans la config du launcher (`browser_paths`), jamais
   dans le projet.
2. **`browser.path_map`** de `project-config.json` — **repli** `file://` pour un projet lancé sans Claude-Launcher, ou
   avec un launcher antérieur à v5.9.0 qui ne pose pas la variable (défini par `/init-project`, Étape 9d) :
   ```json
   "browser": { "path_map": { "project_root": "/home/moi/app", "launcher_root": "C:\\Users\\moi\\app", "launcher_os": "windows" } }
   ```
3. **Aucune** : même chemin (`linux`) ; sous WSL, `wslpath -m` (`windows`).

**Appariement du navigateur** (serveur web du launcher) : quand plusieurs navigateurs sont connectés à
`claude-in-chrome`, le launcher indique dans le contexte de session (`CL_BROWSER_HINT`, injecté au démarrage) comment
identifier celui du hub — page `/__claude-launcher__/pair` ouverte dans chaque navigateur, celui qui affiche « ✓ »
est le bon. Suivre cette procédure **avant la première action Chrome** de la session, garder ce navigateur
sélectionné et l'indiquer à l'utilisateur ; plusieurs « ✓ » ou aucun → demander à l'utilisateur. Ne pas recopier la
procédure (URL, jeton) dans le projet : elle appartient au launcher.

**Règle** : tout fichier du projet présenté à l'utilisateur dans Chrome — brouillon de maquette (GATE 2), procédure de
tests manuels, aperçu marketing de repli — est ouvert via `mcp__claude-in-chrome__*` (`tabs_context_mcp`, puis
`tabs_create_mcp` + `navigate`) vers l'URL **mappée** par `browser_url` (`http://localhost:8081/…` avec le serveur
web du launcher, `file://…` en repli). **Le projet ne lance jamais son propre serveur HTTP** (`python -m http.server`,
`npx serve`…) : le fichier est autonome, et le serveur web du launcher n'est pas un serveur du projet.

**Toujours donner le chemin exact** : la réponse qui présente le fichier (texte du message **et** question
`AskUserQuestion`, qui peut masquer le texte qui la précède) indique, en plus de l'URL ouverte, le **chemin absolu
exact** du fichier (`realpath`) et son chemin relatif au repo — c'est le repli de l'utilisateur, qui peut toujours
ouvrir le fichier lui-même. Sans Chrome, ou si l'ouverture échoue (page vide, 404 du serveur du launcher, fichier
introuvable, URL `file://` refusée par l'extension — option « Autoriser l'accès aux URL de fichier ») : ne pas
bloquer, afficher l'URL mappée et ces chemins, et indiquer **la source à corriger** (`browser_paths` du launcher si
`launcher_browser_map` répond, sinon `/init-project`, option « Autre » → Étape 9d). Jamais de fichier hors du repo du
projet.

```bash
# launcher_browser_map — affiche CL_BROWSER_PATH_MAP fournie par le launcher ; code 1 si absente (launcher anterieur
# ou projet hors launcher). tmux d'abord (session, puis global) : la valeur courante, meme posee apres le lancement de
# Claude ; "-CL_BROWSER_PATH_MAP" (variable retiree) vaut absence. Puis l'environnement du processus.
launcher_browser_map() {
  local v
  if [ -n "$TMUX" ] && command -v tmux >/dev/null 2>&1; then
    v=$(tmux show-environment CL_BROWSER_PATH_MAP 2>/dev/null || tmux show-environment -g CL_BROWSER_PATH_MAP 2>/dev/null)
    case "$v" in CL_BROWSER_PATH_MAP=*) printf '%s\n' "${v#CL_BROWSER_PATH_MAP=}"; return 0 ;; esac
  fi
  [ -n "${CL_BROWSER_PATH_MAP+x}" ] && { printf '%s\n' "$CL_BROWSER_PATH_MAP"; return 0; }
  return 1
}

# browser_url CHEMIN — URL a ouvrir dans Chrome pour un fichier du projet (relatif au repo ou absolu) :
# http(s):// (serveur web du launcher) ou file:// (repli). Sortie : l'URL ; code 1 = hors projet ou aucune
# correspondance, 2 = aucun navigateur ([]) — afficher le chemin.
browser_url() {
  local cfg=.claude/project-config.json abs map ok root lroot los rel
  abs=$(realpath -m -- "$1")
  case "$abs/" in "$(git rev-parse --show-toplevel)"/*) ;; *) echo "browser_url : hors du projet : $abs" >&2; return 1 ;; esac
  if map=$(launcher_browser_map); then
    :                                                                                 # 1. launcher (tmux, puis env)
  else
    map=$(jq -c '[.browser.path_map // empty | {container: .project_root, host: .launcher_root, os: .launcher_os}]' "$cfg" 2>/dev/null)
    if [ -z "$map" ] || [ "$map" = "[]" ]; then                                       # 3. aucune : meme chemin
      root=$(git rev-parse --show-toplevel)
      if command -v wslpath >/dev/null 2>&1; then map=$(jq -cn --arg c "$root" --arg h "$(wslpath -m "$root")" '[{container:$c,host:$h,os:"windows"}]')
      else map=$(jq -cn --arg c "$root" '[{container:$c,host:$c,os:"linux"}]'); fi
    fi                                                                                # 2. sinon : project-config
  fi
  [ "$(jq -r 'length' <<<"$map" 2>/dev/null)" = 0 ] && { echo "browser_url : aucun navigateur (CL_BROWSER_PATH_MAP=[]) : $abs" >&2; return 2; }
  { read -r ok; read -r root; read -r lroot; read -r los; } < <(jq -r --arg p "$abs" '
      [ .[] | select(.container and .host) | .container |= rtrimstr("/")
        | select((.container + "/") as $c | ($p + "/") | startswith($c)) ]
      | sort_by(-(.container | length)) | .[0] // empty
      | "ok", .container, .host,
        (.os // (if (.host | test("^https?://")) then "url"
                 elif (.host | test("^([A-Za-z]:|[\\\\/]{2})")) then "windows" else "linux" end))' <<<"$map")
  [ "$ok" = ok ] || { echo "browser_url : aucune correspondance pour $abs (CL_BROWSER_PATH_MAP / browser.path_map)" >&2; return 1; }
  rel=${abs#"$root"}                                                # conteneur "/" : root vide, rel = chemin absolu
  _enc() { jq -rn --arg p "$1" '$p | split("/") | map(@uri) | join("/")'; }
  case "$los" in
    url)                                                                              # serveur web du launcher
      printf '%s%s\n' "${lroot%/}" "$(_enc "$rel")" ;;
    windows)
      lroot=${lroot//\\//}; lroot=${lroot%/}
      case "$lroot" in
        //*)  printf 'file:%s%s\n' "$(_enc "$lroot")" "$(_enc "$rel")" ;;                          # UNC \\serveur\partage\...
        ?:*)  printf 'file:///%s%s%s\n' "${lroot:0:2}" "$(_enc "${lroot:2}")" "$(_enc "$rel")" ;;   # C:\...
        *)    echo "browser_url : chemin Windows invalide : $lroot" >&2; return 1 ;;
      esac ;;
    *)
      printf 'file://%s%s\n' "$(_enc "${lroot%/}")" "$(_enc "$rel")" ;;
  esac
}
```

Exemples : `/share/MFS/ROOT/p/app/docs/x.html` avec `/` ↔ `http://localhost:8081` (url) →
`http://localhost:8081/share/MFS/ROOT/p/app/docs/x.html` ; avec `/share/MFS/ROOT` ↔ `\\nas\MFS\ROOT` (windows) →
`file://nas/MFS/ROOT/p/app/docs/x.html` ; `/workspace/app` ↔ `C:\Users\moi\app` →
`file:///C:/Users/moi/app/docs/x.html` ; `/home/moi/app` (linux) → `file:///home/moi/app/docs/x.html`.
