# Deploy — {ENV_NAME} (mecanisme : docker-compose)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-docker-compose.md` — selectionne
> car `infrastructure.environments[].deploy.mechanism = "docker-compose"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, etape
> [2. MECANISME]. Fichier compose : `{DEPLOY_TARGET}`.

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3).

## Variables attendues

| Variable | Usage |
|----------|-------|
| `REGISTRY_USER` / `REGISTRY_PASSWORD` | `docker login` avant `docker pull`, si le registre est prive |
| `SSH_KEY_PATH` | Uniquement si `access.host` est renseigne (hote distant) — hote, utilisateur, port, `runtime` (docker/podman) et `deploy.services` viennent de `project-config.json` (`/init-project` Etape 8b) |

Ne deployer que le necessaire : `deploy.services` (optionnel) limite `up`/`pull` aux services listes,
sans toucher aux autres (base de donnees, services tiers...) ; vide = tout le compose. Local ou distant
selon `access.host`.

```bash
# 0. Acces (valides au cadrage / par infra — `access` de project-config.json) : runtime, hote, services
ENV_JSON=$(jq -c --arg n "{ENV_NAME}" '.infrastructure.environments[] | select(.name==$n)' .claude/project-config.json)
RUNTIME=$(echo "$ENV_JSON" | jq -r '.access.runtime // "docker"')          # docker | podman
SSH_HOST=$(echo "$ENV_JSON" | jq -r '.access.host // empty')               # vide = deploiement local
SSH_USER=$(echo "$ENV_JSON" | jq -r '.access.user // empty')
SSH_PORT=$(echo "$ENV_JSON" | jq -r '.access.port // 22')
SERVICES=$(echo "$ENV_JSON" | jq -r '(.deploy.services // []) | join(" ")')  # vide = tous les services du compose
run() { if [ -n "$SSH_HOST" ]; then ssh -o BatchMode=yes -i "$SSH_KEY_PATH" -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "$@"; else bash -c "$*"; fi; }
COMPOSE="$RUNTIME compose"   # docker compose | podman compose

# 1. Verification
run "$RUNTIME image inspect '{PUBLISH_TARGET}:$VERSION'" >/dev/null 2>&1 \
  || { echo "Aucune publication trouvee pour {ENV_NAME} — executer /publish {ENV_NAME_LOWER} d'abord"; exit 1; }

# 2. Install
[ -n "$REGISTRY_USER" ] && echo "$REGISTRY_PASSWORD" | run "$RUNTIME login {PUBLISH_TARGET} -u '$REGISTRY_USER' --password-stdin"
[ -n "$SSH_HOST" ] && scp -i "$SSH_KEY_PATH" -P "$SSH_PORT" {DEPLOY_TARGET} "$SSH_USER@$SSH_HOST:{DEPLOY_TARGET}"
run "$COMPOSE -f {DEPLOY_TARGET} pull $SERVICES && $COMPOSE -f {DEPLOY_TARGET} up -d $SERVICES"
# ou (artefact fichier plutot qu'image) : rsync/scp de l'artefact vers le serveur cible, puis
# restart des seuls $SERVICES via compose

# 3. Smoke tests
# Smoke : commande du projet (tests tag `smoke` de tests/INDEX.md), sinon simple /health
SMOKE_CMD=$(jq -r '.commands.smoke // empty' .claude/project-config.json)
if [ -n "$SMOKE_CMD" ]; then bash -c "$SMOKE_CMD"; else curl -f "https://{ENV_NAME_LOWER}.example.com/health"; fi

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

```bash
run "$COMPOSE -f {DEPLOY_TARGET} logs --tail=50 $SERVICES"
```

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Rapport au teamleader, jamais de correction autonome.

## Rollback

```bash
# (variables de la section 0 ci-dessus : RUNTIME, COMPOSE, SERVICES, run)
run "$COMPOSE -f {DEPLOY_TARGET} up -d --force-recreate --no-deps ${SERVICES:-app}"  # relance l'image precedente si $VERSION n'a pas ete change en place
# ou, si la version precedente a ete ecrasee localement :
run "$RUNTIME pull '{PUBLISH_TARGET}:$PREVIOUS_VERSION' && $COMPOSE -f {DEPLOY_TARGET} up -d $SERVICES"
```
