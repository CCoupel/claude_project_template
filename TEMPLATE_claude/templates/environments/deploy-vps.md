# Deploy — {ENV_NAME} (mecanisme : vps)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-vps.md` — selectionne car
> `infrastructure.environments[].deploy.mechanism = "vps"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, etape
> [2. MECANISME]. Cible : `{DEPLOY_TARGET}` (ex: `user@host:/opt/app`).

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3).

## Variables attendues

| Variable | Usage |
|----------|-------|
| `SSH_KEY_PATH` | Cle privee pour `scp`/`ssh` vers `{DEPLOY_TARGET}` |

Port SSH (`access.port`, defaut 22) et unites a redemarrer (`deploy.services`, optionnel, defaut `app`)
viennent de `project-config.json` (`/init-project` Etape 8b) : seules les unites listees sont redemarrees.

```bash
ENV_JSON=$(jq -c --arg n "{ENV_NAME}" '.infrastructure.environments[] | select(.name==$n)' .claude/project-config.json)
SSH_PORT=$(echo "$ENV_JSON" | jq -r '.access.port // 22')
SERVICES=$(echo "$ENV_JSON" | jq -r '(.deploy.services // ["app"]) | join(" ")')

# 1. Verification
test -f "{PUBLISH_TARGET}/app-$VERSION.tar.gz" \
  || { echo "Aucune publication trouvee pour {ENV_NAME} — executer /publish {ENV_NAME_LOWER} d'abord"; exit 1; }

# 2. Install
scp -i "$SSH_KEY_PATH" -P "$SSH_PORT" "{PUBLISH_TARGET}/app-$VERSION.tar.gz" {DEPLOY_TARGET}/
ssh -i "$SSH_KEY_PATH" -p "$SSH_PORT" {DEPLOY_TARGET%%:*} "cd ${DEPLOY_TARGET#*:} && tar -xzf app-$VERSION.tar.gz && systemctl restart $SERVICES"

# 3. Verification post-deploy
# Smoke : commande du projet (tests tag `smoke` de tests/INDEX.md), sinon simple /health
SMOKE_CMD=$(jq -r '.commands.smoke // empty' .claude/project-config.json)
if [ -n "$SMOKE_CMD" ]; then bash -c "$SMOKE_CMD"; else curl -f "https://{ENV_NAME_LOWER}.example.com/health"; fi

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

```bash
ssh -i "$SSH_KEY_PATH" -p "$SSH_PORT" {DEPLOY_TARGET%%:*} "journalctl $(printf -- '-u %s ' $SERVICES) --since '5 min ago'"
```

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Rapport au teamleader, jamais de correction autonome.

## Rollback

```bash
ssh -i "$SSH_KEY_PATH" -p "$SSH_PORT" {DEPLOY_TARGET%%:*} "cd ${DEPLOY_TARGET#*:} && tar -xzf app-$PREVIOUS_VERSION.tar.gz && systemctl restart $SERVICES"
```
