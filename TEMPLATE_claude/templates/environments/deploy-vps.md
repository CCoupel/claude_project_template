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

```bash
# 1. Verification
test -f "{PUBLISH_TARGET}/app-$VERSION.tar.gz" \
  || { echo "Aucune publication trouvee pour {ENV_NAME} — executer /publish {ENV_NAME_LOWER} d'abord"; exit 1; }

# 2. Install
scp -i "$SSH_KEY_PATH" "{PUBLISH_TARGET}/app-$VERSION.tar.gz" {DEPLOY_TARGET}/
ssh -i "$SSH_KEY_PATH" {DEPLOY_TARGET%%:*} "cd ${DEPLOY_TARGET#*:} && tar -xzf app-$VERSION.tar.gz && systemctl restart app"

# 3. Verification post-deploy
curl -f "https://{ENV_NAME_LOWER}.example.com/health"

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

```bash
ssh -i "$SSH_KEY_PATH" {DEPLOY_TARGET%%:*} "journalctl -u app --since '5 min ago'"
```

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Rapport a `main`, jamais de correction autonome.

## Rollback

```bash
ssh -i "$SSH_KEY_PATH" {DEPLOY_TARGET%%:*} "cd ${DEPLOY_TARGET#*:} && tar -xzf app-$PREVIOUS_VERSION.tar.gz && systemctl restart app"
```
