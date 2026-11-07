# Environnement conteneur Claude-Launcher NG2 — `.claude-launcher/env.yaml`

Reference lue par `/init-project` (Etape 9c, Finalisation, Etape d1j). Le launcher NG2 (`CCoupel/Claude-Launcher`,
`ng2/README.md` §« Déclarer l'environnement ») fournit le **mecanisme** (conteneur bootstrappe depuis `env.yaml`) ;
le template connait la **stack** : il propose le contenu. `env.yaml` est **versionne** avec le projet.

Principe : **projet = sources + verrous + `env.yaml` ; derive = au conteneur**. Le dossier projet est partage (hote,
autres conteneurs, autres machines) : ce que `setup` construit (`node_modules`, `.venv`, `target/`) depend de l'image
(glibc/musl, chemins des interpreteurs) et doit rester prive au conteneur (`local:`).

## 1. Schema (launcher v5.1.0+)

| Cle | Role | Genere par le template |
|-----|------|------------------------|
| `image` | Socle (obligatoire), ex. `docker.io/library/debian:12` | **Conserve** s'il existe (choisi par le launcher, F2). Absent : `defaults.image` de `~/.config/claude-launcher-ng2/backends.yaml`, sinon `docker.io/library/debian:12` |
| `packages` | Paquets systeme en plus de `tmux git bash sudo curl` (implicites) — noms **communs** a toutes les distributions | Oui (§2) |
| `packages_by_manager` | Paquets **en plus**, propres a un gestionnaire : `apt`, `dnf`, `apk`, `zypper` | Oui, pour les 3 premiers (le socle peut changer par F2) |
| `setup` | Etapes executees une fois (et a chaque changement de `env.yaml` ou d'un `watch`), en utilisateur, dans le projet, `bash -e` | Oui (§2) |
| `watch` | Fichiers dont le **contenu** modifie rejoue `setup` seul (sans reinstaller les paquets) | Oui : les verrous de dependances |
| `on_start` | Etapes a chaque nouvelle session (jamais au rattachement) — a garder rapides | Non par defaut (`watch` couvre les verrous) ; conserve s'il existe |
| `local` | Chemins relatifs au projet, **prives au conteneur** (volume qui masque le dossier partage) | Oui : chaque dossier derive (§3) |
| `mounts`, `prefer` | Dossiers en plus, backend prefere | Jamais touches |

Contraintes des chemins `local` / `watch` : relatifs au projet, sans `..`, sans `:` ni `,`.
`PATH` du conteneur (setup, on_start, sessions) : `$HOME/.local/bin` en tete. `$HOME` est propre au conteneur
(seul `~/.claude` est partage) : caches pip/npm/go et outils installes sous `~/.local` n'y sont pas a declarer.

## 2. Stack → contenu

Un manifeste par dossier `D` (racine `.` ou sous-dossier : `web/`, `server-go/web/`...). Hors racine, une etape qui doit
s'executer dans `D` s'ecrit en sous-shell `(cd D && ...)` : les etapes `setup` sont concatenees en **un seul script**
`bash -e` lance depuis le projet, un `cd` nu deborderait sur les suivantes. Chaque etape est **idempotente** (rejouee
a chaque changement d'un `watch`).

| Manifeste dans `D` | `packages` (+ `packages_by_manager`) | `setup` | `local` | `watch` |
|--------------------|--------------------------------------|---------|---------|---------|
| `package.json` + `package-lock.json` | `nodejs`, `npm` (§2.1) | `npm ci` | `D/node_modules` | `D/package-lock.json` |
| `package.json` + `pnpm-lock.yaml` | idem | `command -v pnpm >/dev/null \|\| npm install -g --prefix ~/.local pnpm` puis `pnpm install --frozen-lockfile` | `D/node_modules` | `D/pnpm-lock.yaml` |
| `package.json` + `yarn.lock` | idem | `command -v yarn >/dev/null \|\| npm install -g --prefix ~/.local yarn` puis `yarn install --frozen-lockfile` (Berry : `--immutable`) | `D/node_modules` | `D/yarn.lock` |
| `package.json` sans verrou | idem | `npm install` — signaler `⚠ verrou absent` | `D/node_modules` | `D/package.json` |
| `requirements*.txt` | `python3` ; apt : `python3-venv python3-pip` ; dnf : `python3-pip` ; apk : `py3-pip` | `[ -d D/.venv/bin ] \|\| python3 -m venv D/.venv` puis `D/.venv/bin/pip install -r D/requirements.txt` (un `-r` par fichier) | `D/.venv` | les `requirements*.txt` |
| `pyproject.toml` + `uv.lock` | `python3` | `command -v uv >/dev/null \|\| curl -LsSf https://astral.sh/uv/install.sh \| sh` puis `uv sync --frozen` | `D/.venv` | `D/uv.lock` |
| `pyproject.toml` + `poetry.lock` | `python3` (+ comme `requirements`) | `command -v poetry >/dev/null \|\| curl -sSL https://install.python-poetry.org \| python3 -` puis `POETRY_VIRTUALENVS_IN_PROJECT=true poetry install --no-root` | `D/.venv` | `D/poetry.lock` |
| `pyproject.toml` seul | comme `requirements` | venv comme ci-dessus puis `D/.venv/bin/pip install -e D` | `D/.venv` | `D/pyproject.toml` |
| `go.mod` | aucun (§2.1) | toolchain Go (§2.1) puis `go mod download` | — (modules sous `~/go`) | `D/go.sum` |
| `Cargo.toml` | apt : `build-essential` ; dnf : `gcc make` ; apk : `build-base` | `command -v cargo >/dev/null \|\| { curl -sSf https://sh.rustup.rs \| sh -s -- -y --no-modify-path && ln -sf ~/.cargo/bin/* ~/.local/bin/; }` puis `cargo fetch` | `D/target` | `D/Cargo.lock` |
| Playwright (E2E, Etape 9) | — | `npx playwright install --with-deps chromium` (sudo disponible) | — (navigateurs sous `~/.cache`) | — |
| Dependances natives (`node-gyp`, cgo, `psycopg`, `bcrypt`...) | apt : `build-essential` ; dnf : `gcc gcc-c++ make` ; apk : `build-base` (+ en-tetes : `libpq-dev` / `libpq-devel` / `postgresql-dev`...) | — | — | — |

Autres stacks (Etape 5d, `dev-generic`) : meme logique — paquets de la chaine, `setup` d'installation des
dependances depuis le verrou, dossier de dependances/sorties natives en `local`, verrou en `watch`.

Sorties de build **natives** (binaires, `target/`) → `local`. Sorties portables (`dist/` JS, `build/` du candidat
BUILD) : **non** — elles sont lues hors conteneur (publish/deploy).

### 2.1 Versions de la chaine

Les paquets de distribution sont souvent en retard (Debian 12 : `nodejs` 18, `golang` 1.19, `python3` 3.11).
Version requise = dans l'ordre `.nvmrc` / `.node-version` / `engines.node`, directive `toolchain` / `go` de `go.mod`,
`requires-python`, sinon celle de la CI (`setup-node`, `setup-go`, `setup-python` des workflows).

- **Node** : paquet distro si sa version suffit ; sinon binaire officiel sous `~/.local` (glibc ; Alpine/musl : paquet
  `nodejs` de la distro, signaler si trop ancien) — paquets apt : `xz-utils`, dnf/apk : `xz` :
  ```bash
  V=22.11.0; A=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
  [ "$(node -v 2>/dev/null)" = "v$V" ] || { curl -fsSL https://nodejs.org/dist/v$V/node-v$V-linux-$A.tar.xz | tar -xJ -C ~/.local --strip-components=1; }
  ```
  (`~/.local/bin/node`, `npm`, `npx` : deja dans le `PATH`). Les paquets `nodejs`/`npm` sont alors retires.
- **Go** : toujours le binaire officiel (version **figee** : `toolchain`, sinon `go` complet de `go.mod`, sinon la CI,
  sinon `curl -s 'https://go.dev/VERSION?m=text' | head -1` au moment de l'init) ; Alpine : paquet `go` si suffisant :
  ```bash
  V=1.23.4; A=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
  [ "$(~/.local/go/bin/go env GOVERSION 2>/dev/null)" = "go$V" ] || { rm -rf ~/.local/go; curl -fsSL https://go.dev/dl/go$V.linux-$A.tar.gz | tar -xz -C ~/.local; }
  ln -sf ~/.local/go/bin/go ~/.local/go/bin/gofmt ~/.local/bin/
  ```
- **Python** : `python3` de la distro si `requires-python` est satisfait ; sinon `uv python install <version>` puis
  `uv venv --python <version>` (uv installe comme ci-dessus), ou une image plus recente (signaler).

`commands.env` (Etape 9b) concerne l'hote : un `PATH` vers un dossier absent du conteneur est sans effet — rien a
adapter.

## 3. Dossiers derives (`local`)

Lister les dossiers existants **et attendus** (un par manifeste du §2), y compris en sous-dossier :

```bash
find . -path ./.git -prune -o -path ./TEMPLATE_claude -prune -o -path ./.claude -prune -o \
  \( -name node_modules -o -name .venv -o -name venv -o -name target \) -type d -prune -print | sed 's|^\./||'
find . -path ./.git -prune -o -name node_modules -prune -o -path ./TEMPLATE_claude -prune -o -type f \
  \( -name package.json -o -name 'requirements*.txt' -o -name pyproject.toml -o -name go.mod -o -name Cargo.toml \) -print
```

- `venv/` existant (nom non standard) : le garder tel quel dans `local` et dans les etapes `setup`.
- `target/` sans `Cargo.toml` voisin (ex. Maven) : selon la stack — sorties natives → `local`.
- Projet neuf sans manifeste : partir des reponses aux Etapes 2-5 et des repertoires sources (`src_dir`, frontend) ;
  l'Etape d1j completera `env.yaml` quand les manifestes existeront.

## 4. Ecriture et fusion

- **Absent** → creer `.claude-launcher/env.yaml` (en-tete ci-dessous, cles dans l'ordre du §1).
- **Present** (ecrit par le launcher ou a la main) → **fusion additive** : conserver commentaires, `image`, `mounts`,
  `prefer`, `on_start` et toutes les valeurs existantes ; n'ajouter que les elements absents des listes (les lignes
  commentees du launcher `# packages: []`... sont remplacees par la cle reelle). Une etape `setup` existante qui
  differe de la proposition (meme outil, autre commande) n'est **jamais** reecrite d'office : la presenter en diff
  dans la question de l'Etape 9c / d1j.
- Editer le texte (Edit), pas de reserialisation YAML (qui perdrait les commentaires). Verifier ensuite la syntaxe si
  un parseur est disponible :
  `python3 -c 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))' .claude-launcher/env.yaml` (ou `yq . <fichier>`).
- `.gitignore` : chaque chemin `local` doit etre ignore (le moteur cree un dossier vide servant de point de montage
  dans le projet) — `git check-ignore -q <chemin>/ || echo "/<chemin>/" >> .gitignore` (`node_modules/`, `.venv/`
  generiques deja presents : rien a ajouter). `.claude-launcher/` n'est **jamais** ignore.

Exemple (Go + React dans `server-go/web/`, socle choisi par le launcher) :

```yaml
# Exécution du projet en conteneur (Claude-Launcher-NG2) — versionné avec le projet
# Contenu propose par /init-project (stack) — completable a la main, fusion additive a chaque /init-project d
image: docker.io/library/debian:12
packages: [nodejs, npm]
packages_by_manager:
  apt: [build-essential]
  dnf: [gcc, gcc-c++, make]
  apk: [build-base]
setup:
  - |
    V=1.23.4; A=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
    [ "$(~/.local/go/bin/go env GOVERSION 2>/dev/null)" = "go$V" ] || { rm -rf ~/.local/go; curl -fsSL https://go.dev/dl/go$V.linux-$A.tar.gz | tar -xz -C ~/.local; }
    ln -sf ~/.local/go/bin/go ~/.local/go/bin/gofmt ~/.local/bin/
  - (cd server-go && go mod download)
  - (cd server-go/web && npm ci)
watch: [server-go/go.sum, server-go/web/package-lock.json]
local: [server-go/web/node_modules]
```

(Les etapes `setup` forment un seul script lance depuis le projet : `cd` toujours en sous-shell.)
