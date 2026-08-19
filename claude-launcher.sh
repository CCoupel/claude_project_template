#!/usr/bin/env bash
# Nécessite : fzf tmux jq
# Installation : apt install fzf tmux jq  /  brew install fzf tmux jq
#
# Usage : ./claude.sh
#   - Session unique "claude-hub"
#   - Window "[menu]" : sélecteur fzf permanent
#   - Un window par projet avec claude
#   - Layout agent teams :
#       Ligne haute : agentType == "cdp"  (inclut le team-lead)
#       Ligne basse : tous les autres agents (côte-à-côte)
#   - Nettoyage automatique des teams orphelines au démarrage du menu
#
# Raccourci tmux pour forcer le relayout :
#   Ajouter dans ~/.tmux.conf :
#   bind R run-shell "bash /chemin/vers/claude.sh --relayout '#{session_name}' '#{window_id}'"

# ════════════════════════════════════════════════════════════════════════════
# VÉRIFICATION DES PRÉREQUIS
# ════════════════════════════════════════════════════════════════════════════
check_prerequisites() {
  local missing=()
  local warnings=()

  printf "\033[0;90m  Vérification des prérequis...\033[0m\n"
  for cmd in tmux fzf jq curl gh claude; do
    if command -v "$cmd" &>/dev/null; then
      printf "\033[1;32m  ✓\033[0m %-10s %s\n" "$cmd" "$(command -v "$cmd")"
    else
      printf "\033[1;31m  ✗\033[0m %-10s manquant\n" "$cmd"
      missing+=("$cmd")
    fi
  done
  printf "\n"

  if [[ ${#missing[@]} -gt 0 ]]; then
    printf "\033[1;31m  Installation requise :\033[0m\n"
    local apt_pkgs=() brew_pkgs=()
    for cmd in "${missing[@]}"; do
      case "$cmd" in
        tmux|fzf|jq|curl) apt_pkgs+=("$cmd"); brew_pkgs+=("$cmd") ;;
        gh)    apt_pkgs+=("gh");     brew_pkgs+=("gh") ;;
        claude) printf "    claude  → npm install -g @anthropic-ai/claude-code\n" ;;
      esac
    done
    [[ ${#apt_pkgs[@]} -gt 0 ]] && \
      printf "    apt     → sudo apt install %s\n" "${apt_pkgs[*]}"
    [[ ${#brew_pkgs[@]} -gt 0 ]] && \
      printf "    brew    → brew install %s\n" "${brew_pkgs[*]}"
    printf "\n"
    exit 1
  fi

  # Avertissements non bloquants
  if ! gh auth status &>/dev/null; then
    warnings+=("gh non authentifié — définir GITHUB_TOKEN dans la config ou lancer : gh auth login")
  fi

  for w in "${warnings[@]}"; do
    printf "\033[1;33m  ⚠  %s\033[0m\n" "$w"
  done
  [[ ${#warnings[@]} -gt 0 ]] && printf "\n"
}

# Sauter la vérification pour les modes internes (appelés par tmux en arrière-plan)
case "${1:-}" in
  --do-layout|--debug-layout|--relayout|--layout-watch) ;;
  *) check_prerequisites ;;
esac

# --no-update : désactive l'auto-update GitHub pour cette exécution
NO_AUTO_UPDATE=0
if [[ "${1:-}" == "--no-update" ]]; then
  NO_AUTO_UPDATE=1
  shift
fi

SESSION="claude-hub"
TEMPLATE_REPO="CCoupel/claude_project_template"
TEMPLATE_BRANCH="main"
SCRIPT_VERSION="v2.15.4"
CONFIG_FILE="${HOME}/.config/claude-launcher.conf"

# ── Valeurs par défaut (écrasées par le fichier de config) ───────────────────
GITHUB_DIR="$HOME/GITHUB"
GITHUB_DIRS=()   # Si non vide, remplace GITHUB_DIR — tableau de dossiers racine
GITHUB_TOKEN=""
CLAUDE_DISABLE_MOUSE=1
CLAUDE_EXPERIMENTAL_TEAMS=1
CLAUDE_OPTIONS=""

# ── Proportions du layout (configurables dans ~/.config/claude-launcher.conf) ─
# 2 lignes (≤5 teammates) : leader_pct / teammates  — reste toujours au teammate
LAYOUT_2ROW_LEADER_PCT=50
# 3 lignes (>5 teammates) : fractions leader/mid/bot  — bot reçoit toujours le reliquat
# Valeurs par défaut : 3/7 leader · 2/7 mid · 2/7+ bot
LAYOUT_3ROW_LEADER_NUM=3
LAYOUT_3ROW_MID_NUM=2
LAYOUT_3ROW_DEN=7

# ── Couleurs de fond par projet ──────────────────────────────────────────────
# Palette sombre, couleurs distinctes (indices tmux 256)
COLOR_PALETTE=(17 52 22 53 58 23 54 238 18 59)
# Override optionnel : declare -A PROJECT_COLORS=(["mon-projet"]="53")
declare -A PROJECT_COLORS=()
# Intensité de l'éclaircissement pour la surbrillance des panes teammates actifs
# (agent en train de travailler) — variante éclaircie de la couleur du projet,
# pas une couleur fixe. 1 = léger, 5 = blanc/couleur pleine.
PANE_ACTIVE_BRIGHTEN_STEP=1
# Intensité de l'assombrissement des panes teammates inactifs (agent en IDLE) —
# variante assombrie de la couleur du projet. 1 = léger, 5 = quasi-noir.
PANE_INACTIVE_DARKEN_STEP=1

load_config() {
  [[ -f "$CONFIG_FILE" ]] || return
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
}

create_default_config() {
  mkdir -p "$(dirname "$CONFIG_FILE")"
  cat > "$CONFIG_FILE" <<'EOF'
# claude-launcher — configuration utilisateur
# Éditer puis relancer le launcher.

# Répertoire contenant vos projets (utilisé si GITHUB_DIRS est vide)
GITHUB_DIR="$HOME/GITHUB"

# Plusieurs dossiers racine — si renseigné, remplace GITHUB_DIR
# Les projets seront listés groupés par dossier dans le menu
# GITHUB_DIRS=("$HOME/GITHUB" "/mnt/c/Users/username/Documents/VScode/GITHUB")
GITHUB_DIRS=()

# Token GitHub (gh CLI + Claude Code MCP)
GITHUB_TOKEN=""

# Options Claude Code
CLAUDE_DISABLE_MOUSE=1        # 1 = désactive la souris dans le terminal
CLAUDE_EXPERIMENTAL_TEAMS=1  # 1 = active les agent teams
CLAUDE_OPTIONS="--allow-dangerously-skip-permissions"

# Variables d'environnement supplémentaires passées à Claude Code
# Format : "NOM=valeur"  (une par ligne, sans export)
# Exemple :
#   EXTRA_ENVS=(
#     "ANTHROPIC_API_KEY=sk-ant-..."
#     "MY_API_URL=https://api.example.com"
#   )
EXTRA_ENVS=()

# Couleurs de fond par projet (optionnel — sinon assigné automatiquement)
# Valeurs : indices tmux 256 couleurs (ex: 17=bleu nuit, 52=bordeaux, 22=vert, 53=prune)
# declare -A PROJECT_COLORS=(
#   ["mon-projet"]="53"
#   ["autre-projet"]="17"
# )

# Surbrillance des panes teammates actifs (agent en train de travailler) :
# variante éclaircie de la couleur du projet. 1 = léger, 5 = blanc/couleur pleine.
# PANE_ACTIVE_BRIGHTEN_STEP=1

# Assombrissement des panes teammates inactifs (agent en IDLE) :
# variante assombrie de la couleur du projet. 1 = léger, 5 = quasi-noir.
# PANE_INACTIVE_DARKEN_STEP=1
EOF
}

build_claude_exports() {
  local e=""
  [[ -n "$GITHUB_TOKEN" ]] && \
    e+=$'\n'"export GITHUB_PERSONAL_ACCESS_TOKEN=\"${GITHUB_TOKEN}\""$'\n'"export GH_TOKEN=\"${GITHUB_TOKEN}\""
  [[ "${CLAUDE_DISABLE_MOUSE:-0}" == "1" ]] && \
    e+=$'\n'"export CLAUDE_CODE_DISABLE_MOUSE=1"
  [[ "${CLAUDE_EXPERIMENTAL_TEAMS:-0}" == "1" ]] && \
    e+=$'\n'"export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
  for env_var in "${EXTRA_ENVS[@]+"${EXTRA_ENVS[@]}"}"; do
    [[ -n "$env_var" ]] && e+=$'\n'"export ${env_var}"
  done
  printf '%s' "$e"
}

# Hash déterministe du nom de projet → index dans COLOR_PALETTE
# Même nom = même couleur, sans fichier de persistance
get_project_color() {
  local project="$1"
  [[ -n "${PROJECT_COLORS[$project]+_}" ]] && { echo "${PROJECT_COLORS[$project]}"; return; }
  local hash=0 i c
  for (( i=0; i<${#project}; i++ )); do
    c=$(printf '%d' "'${project:$i:1}")
    hash=$(( (hash * 31 + c) % ${#COLOR_PALETTE[@]} ))
  done
  echo "${COLOR_PALETTE[$hash]}"
}

# Éclaircit une couleur tmux 256 (cube 6x6x6 pour 16-231, niveaux de gris pour 232-255)
# en conservant sa teinte — utilisé pour la surbrillance des panes actifs sans
# s'écarter de la couleur du projet.
brighten_color() {
  local c="$1" step="${PANE_ACTIVE_BRIGHTEN_STEP:-1}"
  if (( c >= 16 && c <= 231 )); then
    local idx=$(( c - 16 ))
    local b=$(( idx % 6 )); idx=$(( idx / 6 ))
    local g=$(( idx % 6 )); idx=$(( idx / 6 ))
    local r=$(( idx % 6 ))
    # N'éclaircit que les canaux déjà non-nuls : préserve la teinte au lieu
    # d'allumer un canal éteint (saut disproportionné, 0 → ~95/255).
    (( r > 0 )) && { r=$(( r + step )); (( r > 5 )) && r=5; }
    (( g > 0 )) && { g=$(( g + step )); (( g > 5 )) && g=5; }
    (( b > 0 )) && { b=$(( b + step )); (( b > 5 )) && b=5; }
    echo $(( 16 + 36 * r + 6 * g + b ))
  elif (( c >= 232 && c <= 255 )); then
    local v=$(( c + step * 2 ))
    (( v > 255 )) && v=255
    echo "$v"
  else
    echo "$c"
  fi
}

# Assombrit une couleur tmux 256 (cube 6x6x6 / niveaux de gris), symétrique de
# brighten_color() — utilisé pour les panes teammates inactifs (agent en IDLE).
# Contrairement à brighten_color (plancher à 1 pour ne pas allumer un canal
# éteint), va jusqu'à 0 : la palette projet est déjà proche du noir (canaux à
# l'index 1), donc un plancher à 1 laisserait la plupart des couleurs inchangées.
darken_color() {
  local c="$1" step="${PANE_INACTIVE_DARKEN_STEP:-1}"
  if (( c >= 16 && c <= 231 )); then
    local idx=$(( c - 16 ))
    local b=$(( idx % 6 )); idx=$(( idx / 6 ))
    local g=$(( idx % 6 )); idx=$(( idx / 6 ))
    local r=$(( idx % 6 ))
    (( r > 0 )) && { r=$(( r - step )); (( r < 0 )) && r=0; }
    (( g > 0 )) && { g=$(( g - step )); (( g < 0 )) && g=0; }
    (( b > 0 )) && { b=$(( b - step )); (( b < 0 )) && b=0; }
    echo $(( 16 + 36 * r + 6 * g + b ))
  elif (( c >= 232 && c <= 255 )); then
    local v=$(( c - step * 2 ))
    (( v < 232 )) && v=232
    echo "$v"
  else
    echo "$c"
  fi
}

apply_pane_color() {
  local pane_id="$1" color="$2"
  # set-option -p (et non select-pane -P) : colore le pane sans changer le focus.
  tmux set-option -p -t "$pane_id" window-style "bg=colour${color}" 2>/dev/null
}

auto_update() {
  local latest_tag
  latest_tag=$(curl -fsSL --ipv4 --max-time 5 \
    "https://api.github.com/repos/${TEMPLATE_REPO}/tags" 2>/dev/null \
    | jq -r '.[0].name // empty')
  [[ -z "$latest_tag" ]] && return

  # Compare versions: si le tag distant est identique à la version locale, rien à faire
  [[ "$latest_tag" == "$SCRIPT_VERSION" ]] && return

  # Tri sémantique : met à jour seulement si le tag distant est plus récent
  local newer
  newer=$(printf '%s\n%s\n' "$SCRIPT_VERSION" "$latest_tag" \
    | sort -V | tail -1)
  [[ "$newer" == "$SCRIPT_VERSION" ]] && return

  local tmp
  tmp=$(mktemp)
  if curl -fsSL --ipv4 --max-time 5 \
      "https://github.com/${TEMPLATE_REPO}/releases/download/${latest_tag}/claude-launcher.sh" \
      -o "$tmp" 2>/dev/null && [[ -s "$tmp" ]]; then
    printf "\033[1;32m  ↑ Nouvelle version %s disponible (installée : %s) — mise à jour...\033[0m\n" \
      "$latest_tag" "$SCRIPT_VERSION"
    chmod +x "$tmp"
    mv "$tmp" "$SCRIPT_PATH"
    printf "  ✓ Launcher mis à jour. Relancement...\n\n"
    exec "$SCRIPT_PATH" "$@"
  fi
  rm -f "$tmp"
}

sync_init_project() {
  local tmp
  tmp=$(mktemp)
  if curl -fsSL --ipv4 --max-time 10 \
      "https://raw.githubusercontent.com/${TEMPLATE_REPO}/${TEMPLATE_BRANCH}/init-project.md" \
      -o "$tmp" 2>/dev/null && [[ -s "$tmp" ]]; then
    mv "$tmp" "$INIT_PROJECT_CACHE"
  else
    rm -f "$tmp"
    [[ ! -s "$INIT_PROJECT_CACHE" ]] && \
      printf "\033[1;33m  ⚠  init-project.md non téléchargé — /init-project indisponible\033[0m\n"
  fi
}

load_config

# Si GITHUB_DIRS vide (config ancienne ou non renseigné), repli sur GITHUB_DIR
if [[ ${#GITHUB_DIRS[@]} -eq 0 ]]; then
  GITHUB_DIRS=("$GITHUB_DIR")
fi

# ════════════════════════════════════════════════════════════════════════════
# FONCTION : find_team_config PROJECT_DIR
# Cherche le config.json de la team correspondant au projet
# Retourne le chemin ou "" si non trouvé
# ════════════════════════════════════════════════════════════════════════════
find_team_config() {
  local project_dir="$1"

  # Normalise le chemin : supprime slash final, résout si possible
  local real_project
  real_project=$(realpath "$project_dir" 2>/dev/null) || real_project="${project_dir%/}"

  for cfg in "$HOME/.claude/teams/"*/config.json; do
    [[ -f "$cfg" ]] || continue
    local cwd
    cwd=$(jq -r '.members[] | select(.name=="team-lead") | .cwd' "$cfg" 2>/dev/null)
    [[ -z "$cwd" || "$cwd" == "null" ]] && continue

    # Normalise le cwd du json de la même façon
    local real_cwd
    real_cwd=$(realpath "$cwd" 2>/dev/null) || real_cwd="${cwd%/}"

    # Comparaison directe et insensible à la casse (chemins WSL /mnt/c/...)
    if [[ "$real_cwd" == "$real_project" ]]     || [[ "${real_cwd,,}" == "${real_project,,}" ]]; then
      echo "$cfg"
      return
    fi
  done
}

# ════════════════════════════════════════════════════════════════════════════
# FONCTION : do_layout SESSION WIN_ID LEADER_PANE TEAM_CONFIG
# Classe les panes selon agentType dans config.json :
#   agentType == "cdp"  → ligne haute
#   tout le reste       → ligne basse
# ════════════════════════════════════════════════════════════════════════════
do_layout() {
  local TARGET_SESSION="$1"
  local WIN_ID="$2"
  local LEADER_PANE="$3"
  local TEAM_CONFIG="$4"
  local win="${TARGET_SESSION}:${WIN_ID}"

  # Lock anti race-condition
  local lock="/tmp/claude_layout_${WIN_ID}.lock"
  if [[ -f "$lock" ]]; then
    touch "/tmp/claude_layout_${WIN_ID}.rerun"
    return
  fi
  touch "$lock"
  trap 'rm -f "$lock"' RETURN

  # ── Récupère tous les panes ───────────────────────────────────────────────
  mapfile -t all_panes < <(tmux list-panes -t "$win" -F '#{pane_id}' 2>/dev/null)
  [[ ${#all_panes[@]} -le 1 ]] && return

  # ── Classification ────────────────────────────────────────────────────────
  local top_panes=("$LEADER_PANE")
  local bot_panes=()

  if [[ -f "$TEAM_CONFIG" ]]; then
    # Collecte nom + agentType + isActive de chaque bot
    local -A bot_name_of=()
    local -A bot_active_of=()
    local -a bot_all_ids=()
    while IFS=$'\t' read -r pane_id agent_type agent_name is_active; do
      [[ -z "$pane_id" || "$pane_id" == "null" ]] && continue
      [[ "$pane_id" == "$LEADER_PANE" ]] && continue
      tmux list-panes -t "$win" -F '#{pane_id}' 2>/dev/null \
        | grep -qxF "$pane_id" || continue
      if [[ "$agent_type" == "cdp" ]]; then
        top_panes+=("$pane_id")
      else
        bot_all_ids+=("$pane_id")
        bot_name_of["$pane_id"]="$agent_name"
        bot_active_of["$pane_id"]="$is_active"
      fi
    done < <(jq -r '
      .members[]
      | select(.tmuxPaneId != null and .tmuxPaneId != "")
      | [.tmuxPaneId, .agentType, .name, (.isActive // false)]
      | @tsv
    ' "$TEAM_CONFIG" 2>/dev/null)

    # ── Ordre MRU des panes actifs (persisté entre appels de do_layout) ──────
    # Une pane qui devient active passe en tête ; les autres actives gardent
    # leur ordre relatif. Une pane qui redevient inactive quitte cet ordre et
    # retrouve sa place alphabétique parmi les inactives.
    local order_file="/tmp/claude_layout_${WIN_ID}.order"
    local -a prev_order=()
    [[ -f "$order_file" ]] && mapfile -t prev_order < "$order_file"

    # Panes toujours actives : ordre MRU précédent conservé (les disparues sont exclues)
    local -a kept_order=()
    for pid in "${prev_order[@]}"; do
      [[ -z "$pid" ]] && continue
      [[ "${bot_active_of[$pid]:-}" == "true" ]] && kept_order+=("$pid")
    done

    # Panes nouvellement actives (absentes de l'ordre précédent) → triées par nom, placées en tête
    local -a newly_active=()
    for pid in "${bot_all_ids[@]}"; do
      [[ "${bot_active_of[$pid]}" != "true" ]] && continue
      local was_active=0
      for p in "${prev_order[@]}"; do [[ "$p" == "$pid" ]] && was_active=1 && break; done
      [[ $was_active -eq 0 ]] && newly_active+=("${bot_name_of[$pid]}|${pid}")
    done
    local -a newly_active_sorted=()
    if [[ ${#newly_active[@]} -gt 0 ]]; then
      while IFS='|' read -r _ pid; do
        newly_active_sorted+=("$pid")
      done < <(printf '%s\n' "${newly_active[@]}" | sort)
    fi

    # Nouvel ordre MRU : nouvelles actives en tête, puis les actives existantes
    local -a active_order=("${newly_active_sorted[@]}" "${kept_order[@]}")
    if [[ ${#active_order[@]} -gt 0 ]]; then
      printf '%s\n' "${active_order[@]}" > "$order_file"
    else
      : > "$order_file"
    fi

    # Panes inactives, triées par ordre alphabétique
    local -a inactive_named=()
    for pid in "${bot_all_ids[@]}"; do
      [[ "${bot_active_of[$pid]}" == "true" ]] && continue
      inactive_named+=("${bot_name_of[$pid]}|${pid}")
    done
    local -a inactive_sorted=()
    if [[ ${#inactive_named[@]} -gt 0 ]]; then
      while IFS='|' read -r _ pid; do
        inactive_sorted+=("$pid")
      done < <(printf '%s\n' "${inactive_named[@]}" | sort)
    fi

    bot_panes+=("${active_order[@]}" "${inactive_sorted[@]}")
  fi

  # Panes non référencés (panes manuels) → ligne basse non triée
  for p in "${all_panes[@]}"; do
    [[ "$p" == "$LEADER_PANE" ]] && continue
    local found=0
    for tp in "${top_panes[@]}"; do [[ "$p" == "$tp" ]] && found=1 && break; done
    for bp in "${bot_panes[@]}"; do [[ "$p" == "$bp" ]] && found=1 && break; done
    [[ $found -eq 0 ]] && bot_panes+=("$p")
  done

  local n_top=${#top_panes[@]}
  local n_bot=${#bot_panes[@]}

  # ── Réordonnancement physique des panes ───────────────────────────────────
  # tmux select-layout n'applique que la géométrie (tailles/positions) aux
  # panes dans leur ordre d'index ascendant existant : associer un index
  # arbitraire à un slot dans la layout string est silencieusement ignoré.
  # Pour déplacer réellement une pane, il faut échanger les index physiques
  # via swap-pane avant de calculer la géométrie ci-dessous.
  local -a target_order=("${top_panes[@]}" "${bot_panes[@]}")
  local ti tcur_pid twant
  for (( ti=0; ti<${#target_order[@]}; ti++ )); do
    twant="${target_order[$ti]}"
    tcur_pid=$(tmux list-panes -t "$win" -F '#{pane_index} #{pane_id}' 2>/dev/null \
      | awk -v idx="$ti" '$1==idx{print $2}')
    [[ -z "$tcur_pid" || "$tcur_pid" == "$twant" ]] && continue
    # -d : ne jamais changer la pane active tmux lors de l'échange — seul le
    # teamleader doit garder le focus, un teammate qui passe actif/inactif ne
    # doit jamais le voler pendant ce réordonnancement (sinon le focus tmux
    # saute silencieusement sur un teammate a chaque bascule de son statut).
    tmux swap-pane -d -s "$twant" -t "$tcur_pid" 2>/dev/null
  done

  # ── Dimensions ────────────────────────────────────────────────────────────
  local W H
  W=$(tmux display-message -t "$win" -p '#{window_width}'  2>/dev/null)
  H=$(tmux display-message -t "$win" -p '#{window_height}' 2>/dev/null)

  # ── Construction de la layout string tmux ────────────────────────────────
  # Format exact (vérifié sur layout réelle) :
  #   CHECKSUM,WxH,0,0[TOP_ROW,BOT_ROW]
  #   TOP_ROW = WxH,0,0{W1xH,0,0,IDX1,W2xH,X2,0,IDX2,...}
  #   BOT_ROW = WxH,0,Y{W1xH,0,Y,IDX3,...}
  #   IDX     = pane_index (entier, pas %N)
  #
  # Le checksum est un CRC16 sur la string sans le préfixe "XXXX,"

  # Récupère le pane_index depuis un pane_id (%N)
  get_idx() {
    tmux list-panes -t "$win" -F '#{pane_id} #{pane_index}' 2>/dev/null \
      | awk -v id="$1" '$1==id{print $2}'
  }

  # Construit une rangée : N panes côte-à-côte
  # build_row ROW_W ROW_H ROW_X ROW_Y idx1 idx2 ...
  build_row() {
    local rw=$1 rh=$2 rx=$3 ry=$4
    shift 4
    local idxs=("$@")
    local n=${#idxs[@]}

    if [[ $n -eq 1 ]]; then
      echo "${rw}x${rh},${rx},${ry},${idxs[0]}"
      return
    fi

    # Largeur par colonne (les séparateurs comptent 1 char chacun)
    local col_w=$(( (rw - n + 1) / n ))
    local rem=$(( rw - col_w * n - (n - 1) ))
    local cells="" cx=$rx
    for (( i=0; i<n; i++ )); do
      local pw=$col_w
      [[ $i -eq $((n-1)) ]] && pw=$(( col_w + rem ))
      [[ -n "$cells" ]] && cells+=","
      cells+="${pw}x${rh},${cx},${ry},${idxs[$i]}"
      cx=$(( cx + pw + 1 ))
    done
    echo "${rw}x${rh},${rx},${ry}{${cells}}"
  }

  # Calcul checksum CRC16 tmux
  tmux_checksum() {
    local str="$1" csum=0 c
    for (( i=0; i<${#str}; i++ )); do
      c=$(printf '%d' "'${str:$i:1}")
      csum=$(( ((csum >> 1) + ((csum & 1) << 15) + c) & 0xFFFF ))
    done
    printf '%04x' "$csum"
  }

  # Récupère les indices des panes (dans l'ordre de classification)
  local top_idxs=() bot_idxs=()
  for p in "${top_panes[@]}"; do
    top_idxs+=("$(get_idx "$p")")
  done
  for p in "${bot_panes[@]}"; do
    bot_idxs+=("$(get_idx "$p")")
  done

  # Construit la layout string
  local layout_body top_row mid_row bot_row

  if [[ $n_bot -eq 0 ]]; then
    # Pas de teammates : teamleader plein écran
    layout_body=$(build_row "$W" "$H" 0 0 "${top_idxs[@]}")
  elif [[ $n_bot -le 5 ]]; then
    # ≤ 5 teammates : 2 lignes — leader LAYOUT_2ROW_LEADER_PCT% / teammates (reliquat, toujours ≥)
    local top_h=$(( H * LAYOUT_2ROW_LEADER_PCT / 100 ))
    local bot_h=$(( H - top_h - 1 ))
    top_row=$(build_row "$W" "$top_h" 0 0 "${top_idxs[@]}")
    bot_row=$(build_row "$W" "$bot_h" 0 $(( top_h + 1 )) "${bot_idxs[@]}")
    layout_body="${W}x${H},0,0[${top_row},${bot_row}]"
  else
    # > 5 teammates : 3 lignes — fractions LAYOUT_3ROW_*NUM/LAYOUT_3ROW_DEN / bot reçoit le reliquat
    local leader_h=$(( H * LAYOUT_3ROW_LEADER_NUM / LAYOUT_3ROW_DEN ))
    local mid_h=$(( H * LAYOUT_3ROW_MID_NUM / LAYOUT_3ROW_DEN ))
    local bot_h=$(( H - leader_h - mid_h - 2 ))
    local n_mid=$(( (n_bot + 1) / 2 ))
    local mid_idxs=("${bot_idxs[@]:0:$n_mid}")
    local bot2_idxs=("${bot_idxs[@]:$n_mid}")
    top_row=$(build_row "$W" "$leader_h" 0 0 "${top_idxs[@]}")
    mid_row=$(build_row "$W" "$mid_h" 0 $(( leader_h + 1 )) "${mid_idxs[@]}")
    bot_row=$(build_row "$W" "$bot_h" 0 $(( leader_h + mid_h + 2 )) "${bot2_idxs[@]}")
    layout_body="${W}x${H},0,0[${top_row},${mid_row},${bot_row}]"
  fi

  local checksum
  checksum=$(tmux_checksum "$layout_body")
  local final_layout="${checksum},${layout_body}"

  # ── Application atomique ──────────────────────────────────────────────────
  tmux select-layout -t "$win" "$final_layout" 2>/dev/null

  # ── Couleur de fond du projet ─────────────────────────────────────────────
  local project_name
  project_name=$(tmux display-message -t "$win" -p '#{window_name}' 2>/dev/null)
  local project_color
  project_color=$(get_project_color "$project_name")
  for p in "${top_panes[@]}" "${bot_panes[@]}"; do
    apply_pane_color "$p" "$project_color"
  done
}

# ════════════════════════════════════════════════════════════════════════════
# MODE --do-layout  (appelé en interne par --layout-watch)
# Usage : bash claude.sh --do-layout SESSION WIN_ID LEADER_PANE TEAM_CONFIG
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--do-layout" ]]; then
  do_layout "$2" "$3" "$4" "$5"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# MODE --debug-layout  : affiche la classification sans appliquer le layout
# Usage : bash claude.sh --debug-layout SESSION WIN_ID
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--debug-layout" ]]; then
  TARGET_SESSION="$2"
  WIN_ID="$3"
  win="${TARGET_SESSION}:${WIN_ID}"

  echo "=== PANES TMUX dans $win ==="
  tmux list-panes -t "$win" -F '#{pane_id} #{pane_index} #{pane_current_command}' 2>/dev/null

  echo ""
  echo "=== LEADER PANE (index 0) ==="
  leader=$(tmux list-panes -t "$win" -F '#{pane_index} #{pane_id}' | awk '$1==0{print $2}')
  echo "leader_pane = $leader"

  echo ""
  echo "=== CONFIG.JSON trouvé ==="
  project_dir=$(tmux display-message -t "${win}.0" -p '#{pane_current_path}' 2>/dev/null)
  echo "project_dir = $project_dir"
  cfg=""
  for c in "$HOME/.claude/teams/"*/config.json; do
    [[ -f "$c" ]] || continue
    cwd=$(jq -r '.members[] | select(.name=="team-lead") | .cwd' "$c" 2>/dev/null)
    [[ -z "$cwd" || "$cwd" == "null" ]] && continue
    real_cwd=$(realpath "$cwd" 2>/dev/null) || real_cwd="${cwd%/}"
    real_proj=$(realpath "$project_dir" 2>/dev/null) || real_proj="${project_dir%/}"
    if [[ "$real_cwd" == "$real_proj" ]] || [[ "${real_cwd,,}" == "${real_proj,,}" ]]; then
      cfg="$c"
      break
    fi
  done
  echo "config = $cfg"

  if [[ -f "$cfg" ]]; then
    echo ""
    echo "=== MEMBRES avec tmuxPaneId ==="
    jq -r '.members[] | "\(.name)	\(.agentType)	\(.tmuxPaneId // "VIDE")"' "$cfg" 2>/dev/null

    echo ""
    echo "=== CLASSIFICATION ==="
    while IFS=$'	' read -r pane_id agent_type; do
      [[ -z "$pane_id" || "$pane_id" == "null" ]] && continue
      if tmux list-panes -t "$win" -F '#{pane_id}' | grep -qxF "$pane_id"; then
        if [[ "$agent_type" == "cdp" ]]; then
          echo "  TOP : $pane_id ($agent_type)"
        else
          echo "  BOT : $pane_id ($agent_type)"
        fi
      else
        echo "  ABSENT du window : $pane_id ($agent_type)"
      fi
    done < <(jq -r '.members[] | select(.tmuxPaneId != null and .tmuxPaneId != "") | [.tmuxPaneId, .agentType] | @tsv' "$cfg" 2>/dev/null)
  fi
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# MODE --relayout  (déclenché manuellement via bind tmux Ctrl+b R)
# Retrouve automatiquement le leader et le config.json du window courant
# Usage : bash claude.sh --relayout SESSION WIN_ID
#
# Dans ~/.tmux.conf :
#   bind R run-shell "bash /chemin/vers/claude.sh --relayout '#{session_name}' '#{window_id}'"
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--relayout" ]]; then
  TARGET_SESSION="$2"
  WIN_ID="$3"
  win="${TARGET_SESSION}:${WIN_ID}"

  # Vérifie qu'il y a plusieurs panes
  pane_count=$(tmux list-panes -t "$win" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$pane_count" -le 1 ]]; then
    tmux display-message -t "$win" "Relayout : pas de team active (1 seul pane)"
    exit 0
  fi

  # Le leader = premier pane du window (pane_index == 0)
  leader_pane=$(tmux list-panes -t "$win" -F '#{pane_index} #{pane_id}' 2>/dev/null \
    | awk '$1==0{print $2}')

  # Retrouve le cwd du leader pour trouver le bon config.json
  project_dir=$(tmux display-message -t "${win}.0" -p '#{pane_current_path}' 2>/dev/null)
  team_config=$(find_team_config "$project_dir")

  if [[ -z "$team_config" ]]; then
    tmux display-message -t "$win" "Relayout : aucun config.json trouvé pour $project_dir"
    exit 0
  fi

  do_layout "$TARGET_SESSION" "$WIN_ID" "$leader_pane" "$team_config"
  tmux display-message -t "$win" "Relayout appliqué  ($(basename "$(dirname "$team_config")"))"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# MODE --layout-watch  (tourne en arrière-plan pour chaque window projet)
# Surveille les changements de panes, attend le config.json, déclenche do_layout
# Usage : bash claude.sh --layout-watch SESSION WIN_ID LEADER_PANE PROJECT_DIR SCRIPT_PATH
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--layout-watch" ]]; then
  TARGET_SESSION="$2"
  WIN_ID="$3"
  LEADER_PANE="$4"
  PROJECT_DIR="$5"
  SCRIPT_PATH="$6"

  prev_count=1
  prev_active_signature=""

  while true; do
    sleep 1

    # Quitte si le window projet n'existe plus
    if ! tmux list-windows -t "$TARGET_SESSION" -F '#{window_id}' 2>/dev/null         | grep -qxF "$WIN_ID"; then
      exit 0
    fi

    pane_count=$(tmux list-panes -t "${TARGET_SESSION}:${WIN_ID}" 2>/dev/null       | wc -l | tr -d ' ')

    # ── Surbrillance des panes teammates actifs (agent en train de travailler) ──
    active_cfg=$(find_team_config "$PROJECT_DIR")
    if [[ -n "$active_cfg" ]]; then
      active_project_name=$(tmux display-message -t "${TARGET_SESSION}:${WIN_ID}" -p '#{window_name}' 2>/dev/null)
      active_project_color=$(get_project_color "$active_project_name")
      while IFS=$'\t' read -r active_pane_id active_is_active; do
        [[ -z "$active_pane_id" || "$active_pane_id" == "null" ]] && continue
        [[ "$active_pane_id" == "$LEADER_PANE" ]] && continue
        tmux list-panes -t "${TARGET_SESSION}:${WIN_ID}" -F '#{pane_id}' 2>/dev/null           | grep -qxF "$active_pane_id" || continue
        if [[ "$active_is_active" == "true" ]]; then
          apply_pane_color "$active_pane_id" "$(brighten_color "$active_project_color")"
        else
          apply_pane_color "$active_pane_id" "$(darken_color "$active_project_color")"
        fi
      done < <(jq -r '
        .members[]
        | select(.tmuxPaneId != null and .tmuxPaneId != "")
        | [.tmuxPaneId, (.isActive // false)]
        | @tsv
      ' "$active_cfg" 2>/dev/null)

      # Ré-ordonne les panes si l'ensemble des agents actifs a changé
      # (do_layout n'est sinon déclenché que sur un changement de pane_count)
      active_signature=$(jq -r '
        [.members[] | select(.tmuxPaneId != null and .tmuxPaneId != "" and ((.isActive // false) == true)) | .tmuxPaneId]
        | sort
        | join(",")
      ' "$active_cfg" 2>/dev/null)
      if [[ "$active_signature" != "$prev_active_signature" ]]; then
        prev_active_signature="$active_signature"
        do_layout "$TARGET_SESSION" "$WIN_ID" "$LEADER_PANE" "$active_cfg"
      fi
    fi

    # Vérifie si un re-run a été demandé pendant un layout précédent
    rerun_flag="/tmp/claude_layout_${WIN_ID}.rerun"
    if [[ -f "$rerun_flag" && ! -f "/tmp/claude_layout_${WIN_ID}.lock" ]]; then
      rm -f "$rerun_flag"
      prev_count=0  # Force un relayout
    fi

    if [[ "$pane_count" -ne "$prev_count" ]]; then
      prev_count="$pane_count"
      [[ "$pane_count" -le 1 ]] && continue

      # Agents attendus = pane_count - 1 (leader sans tmuxPaneId)
      expected=$(( pane_count - 1 ))

      # Attend que TOUS les panes agents soient dans le config.json
      team_config=""
      for attempt in 1 2 3 4 5 6 7 8 9 10; do
        sleep 0.8
        cfg=$(find_team_config "$PROJECT_DIR")
        if [[ -n "$cfg" ]]; then
          has_pane=$(jq -r '
            [.members[] | select(.tmuxPaneId != null and .tmuxPaneId != "")]
            | length
          ' "$cfg" 2>/dev/null)
          if [[ "$has_pane" -ge "$expected" ]]; then
            team_config="$cfg"
            break
          fi
        fi
      done

      do_layout "$TARGET_SESSION" "$WIN_ID" "$LEADER_PANE" "$team_config"
    fi
  done
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# FONCTION : cleanup_orphan_teams
#   - Pas de config.json          → suppression immédiate
#   - Window tmux fermé           → suppression de toutes les teams du projet
#   - Window tmux ouvert          → on ne touche à rien
# ════════════════════════════════════════════════════════════════════════════
cleanup_orphan_teams() {
  [[ ! -d "$HOME/.claude/teams" ]] && return

  local team_dir team_name cwd project

  for team_dir in "$HOME/.claude/teams/"/; do
    [[ -d "$team_dir" ]] || continue
    team_name=$(basename "$team_dir")

    # Pas de config.json → suppression directe
    if [[ ! -f "$team_dir/config.json" ]]; then
      echo "  🧹 $team_name — pas de config.json"
      rm -rf "$team_dir"
      rm -rf "$HOME/.claude/tasks/$team_name"
      continue
    fi

    cwd=$(jq -r '.members[] | select(.name=="team-lead") | .cwd' \
      "$team_dir/config.json" 2>/dev/null)
    [[ -z "$cwd" || "$cwd" == "null" ]] && continue

    project=$(basename "$cwd")

    # Window ouvert → on ne touche à rien
    tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null \
      | grep -qxF "$project" && continue

    # Window fermé → suppression
    echo "  🧹 $team_name ($project) — window fermé"
    rm -rf "$team_dir"
    rm -rf "$HOME/.claude/tasks/$team_name"
  done
}

# ════════════════════════════════════════════════════════════════════════════
# MODE --update  : met à jour le launcher depuis GitHub (préserve la config)
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--update" ]]; then
  SCRIPT_PATH="$(realpath "$0")"
  echo "Mise à jour du launcher depuis GitHub (${TEMPLATE_REPO}@${TEMPLATE_BRANCH})..."
  tmp=$(mktemp)
  if curl -fsSL --ipv4 \
      "https://raw.githubusercontent.com/${TEMPLATE_REPO}/${TEMPLATE_BRANCH}/claude-launcher.sh" \
      -o "$tmp"; then
    chmod +x "$tmp"
    mv "$tmp" "$SCRIPT_PATH"
    echo "✓ Launcher mis à jour : $SCRIPT_PATH"
    echo "  Config préservée   : $CONFIG_FILE"
  else
    echo "✗ Échec du téléchargement"
    rm -f "$tmp"
    exit 1
  fi
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# MODE --configure  : crée ou édite le fichier de config
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--configure" ]]; then
  if [[ ! -f "$CONFIG_FILE" ]]; then
    create_default_config
    echo "✓ Config créée : $CONFIG_FILE"
  else
    echo "  Config existante : $CONFIG_FILE"
  fi
  ${EDITOR:-nano} "$CONFIG_FILE"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# FONCTION : setup_tmux_style SESSION
# Configure la status bar et les styles de fenêtres :
#   [menu]           → orange, italique
#   projet inactif   → gris discret
#   fenêtre active   → blanc gras sur fond bleu, bien visible
# ════════════════════════════════════════════════════════════════════════════
setup_tmux_style() {
  local s="$1"

  # ── Status bar ──────────────────────────────────────────────────────────
  tmux set-option -t "$s" status on
  tmux set-option -t "$s" status-position bottom
  tmux set-option -t "$s" status-style        "bg=colour236,fg=colour250"
  tmux set-option -t "$s" status-left         "#[fg=colour81,bold] ❯ Claude Hub #[fg=colour240,nobold] │ "
  tmux set-option -t "$s" status-left-length  25
  tmux set-option -t "$s" status-right        "#[fg=colour240] %H:%M "
  tmux set-option -t "$s" status-right-length 10
  tmux set-option -t "$s" window-status-separator "  "
  tmux set-option -t "$s" window-status-format         " #W "
  tmux set-option -t "$s" window-status-current-format " ◆ #W "

  # ── Style [menu] ────────────────────────────────────────────────────────
  # inactif → orange italique  |  actif → noir sur orange vif
  tmux set-window-option -t "$s:[menu]" window-status-style         "fg=colour214,italics,bg=colour236"
  tmux set-window-option -t "$s:[menu]" window-status-current-style "bold,fg=colour232,bg=colour208,italics"

  # ── Style fenêtres projet existantes ────────────────────────────────────
  # Appliqué explicitement sur chaque fenêtre (l'héritage session est instable)
  tmux list-windows -t "$s" -F '#{window_name}' | grep -v '^\[menu\]$' | while read -r win; do
    style_project_window "$s" "$win"
  done
}

# Applique le style projet sur une fenêtre (inactif gris / actif blanc-bleu)
style_project_window() {
  local s="$1" win="$2"
  tmux set-window-option -t "$s:$win" window-status-style         "fg=colour242,bg=colour236"
  tmux set-window-option -t "$s:$win" window-status-current-style "bold,fg=colour255,bg=colour27"
}

# ════════════════════════════════════════════════════════════════════════════
# MODE --menu  (boucle fzf dans le window [menu])
# ════════════════════════════════════════════════════════════════════════════
if [[ "$1" == "--menu" ]]; then
  SCRIPT_PATH="${2:-$(realpath "$0")}"
  INIT_PROJECT_CACHE="$(dirname "$SCRIPT_PATH")/init-project.md"

  # Nom réel de la session courante (sessions groupées ont un nom auto-généré ≠ $SESSION)
  CURRENT_SESSION=$(tmux display-message -p '#{session_name}' 2>/dev/null || echo "$SESSION")

  if [[ -n "$GITHUB_TOKEN" ]] && command -v gh &>/dev/null; then
    export GH_TOKEN="$GITHUB_TOKEN"
    printf '%s' "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null \
      && printf "\033[0;90m  ✓ gh auth configuré\033[0m\n"
  fi

  cleanup_orphan_teams

  # ── Script de génération d'entrées fzf ─────────────────────────────────────
  # Créé une fois, réexécuté à chaque ctrl-r pour rafraîchir le statut des windows
  tmp_gen=$(mktemp /tmp/claude_menu_gen.XXXXXX.sh)
  tmp_update_flag=$(mktemp /tmp/claude_update_flag.XXXXXX)
  trap 'rm -f "$tmp_gen" "$tmp_update_flag"' EXIT INT TERM

  palette_decl="COLOR_PALETTE=(${COLOR_PALETTE[*]})"
  colors_decl="declare -A PROJECT_COLORS=()"
  for _k in "${!PROJECT_COLORS[@]}"; do
    colors_decl+=$'\n'"PROJECT_COLORS[$(printf '%q' "$_k")]=$(printf '%q' "${PROJECT_COLORS[$_k]}")"
  done
  dirs_decl="GITHUB_DIRS=($(printf '%q ' "${GITHUB_DIRS[@]}"))"

  # Format des entrées fzf : 3 champs séparés par \t
  #   champ 1 : clé (nom du projet ou token spécial) — utilisé pour la recherche (--nth=1)
  #   champ 2 : affichage ANSI coloré                — montré via --with-nth=2
  #   champ 3 : chemin absolu du dossier racine      — récupéré à la sélection via cut -f3

  cat > "$tmp_gen" <<GENSCRIPT
#!/usr/bin/env bash
SESSION=$(printf '%q' "$SESSION")
UPDATE_FLAG=$(printf '%q' "$tmp_update_flag")
${palette_decl}
${colors_decl}
${dirs_decl}

get_project_color() {
  local project="\$1"
  [[ -n "\${PROJECT_COLORS[\$project]+_}" ]] && { echo "\${PROJECT_COLORS[\$project]}"; return; }
  local hash=0 i c
  for (( i=0; i<\${#project}; i++ )); do
    c=\$(printf '%d' "'\${project:\$i:1}")
    hash=\$(( (hash * 31 + c) % \${#COLOR_PALETTE[@]} ))
  done
  echo "\${COLOR_PALETTE[\$hash]}"
}

existing_windows=\$(tmux list-windows -t "\$SESSION" -F '#{window_name}' 2>/dev/null)

# Génération en ordre INVERSE : fzf inverse la liste, donc on pré-inverse
# pour qu'elle s'affiche dans le bon sens sans dépendre d'options fzf.
#
# Ordre d'affichage voulu (top→bottom) :
#   sessions · update · quit · new · dir1 { sep + projets } · dir2 { sep + projets }
# Ordre de génération (inversé) :
#   dir2 { projets↑ + sep } · dir1 { projets↑ + sep } · new · quit · update · sessions

_n_dirs=\${#GITHUB_DIRS[@]}
for (( _di = _n_dirs - 1; _di >= 0; _di-- )); do
  _dir="\${GITHUB_DIRS[\$_di]}"
  [[ -d "\$_dir" ]] || continue
  _dirname=\$(basename "\$_dir")
  _dirlabel=\$(printf '%s' "\$_dir" | rev | cut -d'/' -f1-2 | rev)

  _projects=()
  while IFS= read -r entry; do
    [[ -d "\$_dir/\$entry" ]] && _projects+=("\$entry")
  done < <(ls -1A "\$_dir" 2>/dev/null)
  _np=\${#_projects[@]}

  # Projets en ordre inverse (dernier alpha en premier → après inversion fzf : ordre alpha)
  for (( _ri = _np - 1; _ri >= 0; _ri-- )); do
    entry="\${_projects[\$_ri]}"
    local_color=\$(get_project_color "\$entry")
    dot=\$(printf '\033[38;5;%sm●\033[0m' "\$local_color")
    if [[ \$_n_dirs -gt 1 ]]; then
      # Premier généré (index _np-1) = dernier affiché dans le groupe = └─
      if [[ \$_ri -eq \$((_np - 1)) ]]; then
        _pfx=\$'\033[0;90m  └─\033[0m '
      else
        _pfx=\$'\033[0;90m  ├─\033[0m '
      fi
    else
      _pfx=""
    fi
    if echo "\$existing_windows" | grep -qxF "\$entry"; then
      printf '%s\t%s%s \033[1;32m%s\033[0;32m [ouvert]\033[0m\t%s\n' "\$entry" "\$_pfx" "\$dot" "\$entry" "\$_dir"
    else
      printf '%s\t%s%s %s\t%s\n' "\$entry" "\$_pfx" "\$dot" "\$entry" "\$_dir"
    fi
  done

  # Séparateur généré APRÈS les projets → affiché AU-DESSUS après inversion fzf
  if [[ \$_n_dirs -gt 1 ]]; then
    printf '__sep__%s\t  \033[0;34m▸ \033[0;36m%s\033[0m\t\n' "\$_dirname" "\$_dirlabel"
  fi
done

printf '__new__\t  \033[1;36m✦ Créer nouveau projet\033[0m\t\n'
printf '__quit__\t  \033[0;90m✕ Quitter le launcher\033[0m\t\n'

if [[ -s "\$UPDATE_FLAG" ]]; then
  _latest=\$(cat "\$UPDATE_FLAG")
  printf '__update__\t  \033[1;32m↑ %s disponible\033[0m  \033[0;90m[Entrée] mettre à jour\033[0m\t\n' "\$_latest"
fi

# Sessions autres launcher (générées en dernier = affichées en premier après inversion)
while IFS= read -r _sess; do
  [[ "\$_sess" == "\$SESSION" ]] && continue
  tmux list-windows -t "\$_sess" -F '#{window_name}' 2>/dev/null \
    | grep -qxF '[menu]' || continue
  _pcount=\$(tmux list-windows -t "\$_sess" -F '#{window_name}' 2>/dev/null \
    | grep -cv '^\[menu\]\$')
  if tmux list-clients -t "\$_sess" 2>/dev/null | grep -q .; then
    _badge="\$(printf '\033[0;32m[active]\033[0m')"
  else
    _badge="\$(printf '\033[0;33m[orpheline]\033[0m')"
  fi
  printf '__session__%s\t  \033[0;35m⬡ %s\033[0m  %b  \033[0;90m%s projet(s)\033[0m\t\n' \
    "\$_sess" "\$_sess" "\$_badge" "\$_pcount"
done < <(tmux list-sessions -F '#{session_name}' 2>/dev/null)
GENSCRIPT
  chmod +x "$tmp_gen"

  preview_script='
    entry=$(printf "%s" "$1" | cut -f1)
    if [[ "$entry" == "__update__" ]]; then
      printf "\033[1;32m  Nouvelle version disponible\033[0m\n\n"
      printf "  Appuyer sur Entrée pour télécharger et relancer le launcher.\n"
      exit 0
    fi
    [[ "$entry" == __sep__* || "$entry" == __quit__ || "$entry" == __new__ || "$entry" == __session__* ]] && exit 0
    dirpath=$(printf "%s" "$1" | cut -f3)
    full="$dirpath/$entry"
    wins=$(tmux list-windows -t "'"$SESSION"'" -F "#{window_name}" 2>/dev/null)
    if echo "$wins" | grep -qxF "$entry"; then
      printf "\033[1;32m  ● window ouvert : %s\033[0m\n\n" "$entry"
    fi
    if [ -d "$full" ]; then
      ls -lhp --color=always "$full" 2>/dev/null | head -20
    fi
  '

  while true; do
    clear
    printf "\033[1;36m  Claude Code Launcher\033[0m  \033[0;90m%s\033[0m  —  session : %s\n" "$SCRIPT_VERSION" "$CURRENT_SESSION"
    printf "\033[0;90m  [Entrée] ouvrir  ·  [Ctrl+D] supprimer orpheline  ·  [Esc] annuler  ·  Ctrl+b R relayout\033[0m\n\n"

    fzf_port=$(( 20000 + RANDOM % 10000 ))

    # Watcher : rafraîchit la liste toutes les 2s via fzf --listen (fzf >= 0.36)
    (
      # Attend que fzf commence à écouter (max 4s)
      for _i in 1 2 3 4 5 6 7 8; do
        sleep 0.5
        curl -s --max-time 0.5 "http://localhost:$fzf_port" -d "" >/dev/null 2>&1 \
          && break
      done
      # Boucle de reload toutes les 2s ; s'arrête quand fzf ferme le port
      _upd_tick=0
      while curl -s --max-time 1 "http://localhost:$fzf_port" \
          -d "reload(bash '$tmp_gen')" >/dev/null 2>&1; do
        sleep 2
        # Vérifie les MàJ GitHub : au 1er tick (~6s après lancement), puis toutes les 5 min
        if (( _upd_tick++ % 150 == 0 )); then
          _latest=$(curl -fsSL --ipv4 --max-time 5 \
            "https://api.github.com/repos/${TEMPLATE_REPO}/tags" 2>/dev/null \
            | jq -r '.[0].name // empty')
          if [[ -n "$_latest" && "$_latest" != "$SCRIPT_VERSION" ]]; then
            _newer=$(printf '%s\n%s\n' "$SCRIPT_VERSION" "$_latest" | sort -V | tail -1)
            [[ "$_newer" != "$SCRIPT_VERSION" ]] && printf '%s' "$_latest" > "$tmp_update_flag"
          fi
        fi
      done
    ) &
    watcher_pid=$!

    _n_clients=$(tmux list-clients -t "$SESSION" 2>/dev/null | wc -l | tr -d ' ')
    _fzf_header=$(printf '  \033[0;90msession :\033[0m \033[1;36m%s\033[0m  \033[0;90m·  %s client(s) attaché(s)\033[0m' "$CURRENT_SESSION" "$_n_clients")

    selected=$(bash "$tmp_gen" | FZF_DEFAULT_OPTS="" fzf \
      --layout=default \
      --listen "$fzf_port" \
      --ansi \
      --delimiter=$'\t' \
      --with-nth=2 \
      --nth=1 \
      --prompt "  ❯ " \
      --height=70% --border \
      --header "$_fzf_header" \
      --header-first \
      --preview-window=right:45%:wrap \
      --preview "bash -c '$preview_script' -- {}" \
      --color 'hl:#5DCAA5,hl+:#1D9E75' \
      --bind 'esc:abort' \
      --bind 'left-click:accept' \
      --bind "ctrl-r:reload(bash '$tmp_gen')" \
      --bind "ctrl-d:execute-silent(entry={1}; [[ \"\$entry\" == __session__* ]] || exit 0; sess=\"\${entry#__session__}\"; tmux list-clients -t \"\$sess\" 2>/dev/null | grep -q . || tmux kill-session -t \"\$sess\")+reload(bash '$tmp_gen')")

    kill "$watcher_pid" 2>/dev/null
    wait "$watcher_pid" 2>/dev/null

    [[ -z "$selected" ]] && { sleep 0.2; continue; }

    project="${selected%%$'\t'*}"
    project_root=$(printf '%s' "$selected" | cut -f3)

    if [[ "$project" == "__update__" ]]; then
      auto_update --menu "$SCRIPT_PATH"
      rm -f "$tmp_update_flag"
      continue
    fi

    if [[ "$project" == "__quit__" ]]; then
      clear
      printf "\033[1;36m  Quitter\033[0m\n\n"
      printf "  [m] Fermer le menu (projets conservés)\n"
      printf "  [f] Fermer la session complète\n"
      printf "  [d] Détacher (session conservée en arrière-plan)\n\n"
      read -rn1 -p "  Choix : " _quit_choice
      printf "\n"
      case "${_quit_choice,,}" in
        m) exit 0 ;;
        f) tmux kill-session -t "$SESSION" ; exit 0 ;;
        d) tmux detach-client ; continue ;;
        *) continue ;;
      esac
    fi

    if [[ "$project" == __session__* ]]; then
      target_session="${project#__session__}"
      tmux switch-client -t "$target_session" 2>/dev/null \
        || tmux attach-session -t "$target_session"
      sleep 0.2
      continue
    fi

    if [[ "$project" == __sep__* ]]; then
      continue
    fi

    if [[ "$project" == "__new__" ]]; then
      clear
      printf "\033[1;36m  Créer nouveau projet\033[0m\n\n"
      if [[ ${#GITHUB_DIRS[@]} -gt 1 ]]; then
        printf "  Dossier racine :\n"
        for _i in "${!GITHUB_DIRS[@]}"; do
          printf "  [%d] %s\n" "$((_i+1))" "${GITHUB_DIRS[$_i]}"
        done
        read -rp "  Choix [1] : " _dir_choice
        _dir_choice="${_dir_choice:-1}"
        project_root="${GITHUB_DIRS[$((_dir_choice-1))]:-${GITHUB_DIRS[0]}}"
      else
        project_root="${GITHUB_DIRS[0]}"
      fi
      read -rp "  Nom du projet : " project
      [[ -z "$project" ]] && continue
      read -rp "  URL git remote (optionnel, Entrée pour ignorer) : " git_remote
      project_dir="$project_root/$project"
      if [[ -d "$project_dir" ]]; then
        printf "\033[1;31m  ✗ Le répertoire existe déjà : %s\033[0m\n" "$project_dir"
        sleep 2
        continue
      fi
      mkdir -p "$project_dir"
      git -C "$project_dir" init -q
      [[ -n "$git_remote" ]] && git -C "$project_dir" remote add origin "$git_remote"
      printf "\n  \033[1;32m✓ Projet créé : %s\033[0m\n\n" "$project_dir"
      sleep 1
    else
      project_dir="$project_root/$project"
    fi

    if tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null \
        | grep -qxF "$project"; then
      tmux select-window -t "$SESSION:$project"
    else
      tmux new-window -t "$SESSION" -n "$project"
      style_project_window "$SESSION" "$project"

      win_id=$(tmux list-windows -t "$SESSION" -F '#{window_name} #{window_id}' 2>/dev/null \
        | awk -v p="$project" '$1==p{print $2}')
      leader_pane=$(tmux list-panes -t "$SESSION:$project" -F '#{pane_id}' 2>/dev/null \
        | head -1)

      apply_pane_color "$leader_pane" "$(get_project_color "$project")"

      CLAUDE_EXPORTS=$(build_claude_exports)
      tmux send-keys -t "$SESSION:$project" \
        "cd '$project_dir'${CLAUDE_EXPORTS}
mkdir -p .claude/commands
_ip=.claude/commands/init-project.md
[[ -s '${INIT_PROJECT_CACHE}' ]] && cp '${INIT_PROJECT_CACHE}' \"\$_ip\" || echo '⚠  init-project.md non disponible — relancer le launcher connecté'
claude ${CLAUDE_OPTIONS}" \
        Enter

      tmux run-shell -b "bash '$SCRIPT_PATH' --layout-watch '$SESSION' '$win_id' '$leader_pane' '$project_dir' '$SCRIPT_PATH'"

      tmux select-window -t "$SESSION:$project"
    fi

    sleep 0.2
  done
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE PRINCIPAL
# ════════════════════════════════════════════════════════════════════════════
SCRIPT_PATH="$(realpath "$0")"
INIT_PROJECT_CACHE="$(dirname "$SCRIPT_PATH")/init-project.md"

# Auto-update silencieux au lancement (sauf si --no-update)
[[ "$NO_AUTO_UPDATE" == "0" ]] && auto_update
sync_init_project

# Premier lancement : créer la config par défaut si absente
if [[ ! -f "$CONFIG_FILE" ]]; then
  create_default_config
  printf "\033[1;33m  Premier lancement — config créée : %s\033[0m\n" "$CONFIG_FILE"
  printf "  Renseigner GITHUB_TOKEN et GITHUB_DIR avant de continuer.\n\n"
  printf "  Lancer  \033[1m%s --configure\033[0m  pour éditer.\n" "$SCRIPT_PATH"
  printf "  Lancer  \033[1m%s\033[0m           pour démarrer avec les valeurs par défaut.\n\n" "$SCRIPT_PATH"
  read -rp "  Continuer maintenant avec les valeurs par défaut ? [o/N] " ans
  [[ "${ans,,}" != "o" && "${ans,,}" != "oui" && "${ans,,}" != "y" && "${ans,,}" != "yes" ]] && exit 0
  load_config
fi

# Si claude-hub a des clients actifs → session groupée (navigation indépendante)
if tmux has-session -t "$SESSION" 2>/dev/null \
    && tmux list-clients -t "$SESSION" 2>/dev/null | grep -q .; then
  # Recréer [menu] si absent (fermé manuellement pendant la session)
  if ! tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null \
      | grep -qxF '[menu]'; then
    tmux new-window -t "$SESSION" -n "[menu]"
    tmux send-keys -t "$SESSION:[menu]" \
      "bash '$SCRIPT_PATH' --menu '$SCRIPT_PATH'" Enter
    tmux select-window -t "$SESSION:[menu]"
  fi
  setup_tmux_style "$SESSION"
  exec tmux new-session -t "$SESSION"
fi

# Si claude-hub existe sans clients actifs → session orpheline, rattachement direct
if tmux has-session -t "$SESSION" 2>/dev/null \
    && ! tmux list-clients -t "$SESSION" 2>/dev/null | grep -q .; then
  # Recréer [menu] si absent (ex: après [m] Fermer le menu)
  if ! tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null \
      | grep -qxF '[menu]'; then
    tmux new-window -t "$SESSION" -n "[menu]"
    tmux send-keys -t "$SESSION:[menu]" \
      "bash '$SCRIPT_PATH' --menu '$SCRIPT_PATH'" Enter
    setup_tmux_style "$SESSION"
  fi
  printf "\033[1;33m  ↩  Session orpheline trouvée : %s — rattachement...\033[0m\n" "$SESSION"
  sleep 0.6
  setup_tmux_style "$SESSION"
  tmux select-window -t "$SESSION:[menu]" 2>/dev/null
  exec tmux attach-session -t "$SESSION"
fi

# ── Recherche d'autres sessions launcher orphelines (window [menu] + aucun client) ─
_orphans=()
while IFS= read -r _sess; do
  [[ "$_sess" == "$SESSION" ]] && continue
  tmux list-windows -t "$_sess" -F '#{window_name}' 2>/dev/null \
    | grep -qxF '[menu]' || continue
  tmux list-clients -t "$_sess" 2>/dev/null | grep -q . && continue
  _orphans+=("$_sess")
done < <(tmux list-sessions -F '#{session_name}' 2>/dev/null)

if [[ ${#_orphans[@]} -ge 1 ]]; then
  _target="${_orphans[0]}"
  printf "\033[1;33m  ↩  Session orpheline trouvée : %s — rattachement...\033[0m\n" \
    "$_target"
  sleep 0.6
  setup_tmux_style "$_target"
  exec tmux attach-session -t "$_target"
fi

tmux new-session -d -s "$SESSION" -n "[menu]"

setup_tmux_style "$SESSION"

tmux send-keys -t "$SESSION:[menu]" \
  "bash '$SCRIPT_PATH' --menu '$SCRIPT_PATH'" Enter

exec tmux attach-session -t "$SESSION"
