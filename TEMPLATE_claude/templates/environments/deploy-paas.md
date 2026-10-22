# Deploy — {ENV_NAME} (mecanisme : paas)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-paas.md` — selectionne car
> `infrastructure.environments[].deploy.mechanism = "paas"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, etape
> [2. MECANISME]. Cible : `{DEPLOY_TARGET}` (ex: nom de l'app Heroku/Railway/Render).

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3).

## Variables attendues

| Variable | Usage |
|----------|-------|
| `HEROKU_API_KEY` | Variante Heroku |
| `RAILWAY_TOKEN` | Variante Railway |
| `RENDER_API_KEY` | Variante Render |

Une seule des trois selon la plateforme : `access.platform` (`heroku` / `railway` / `render`) vient de `project-config.json` (`/init-project` Etape 8b).

```bash
# 1. Verification
# Une publication ({ENV_NAME}) valide doit exister pour $VERSION.

# 2. Install — plateforme validee au cadrage (access.platform)
ENV_JSON=$(jq -c --arg n "{ENV_NAME}" '.infrastructure.environments[] | select(.name==$n)' .claude/project-config.json)
acc() { echo "$ENV_JSON" | jq -r ".access.$1 // empty"; }   # coordonnees validees au cadrage (/init-project Etape 8b)
case "$(acc platform)" in
  heroku)  HEROKU_API_KEY="$HEROKU_API_KEY" heroku container:release web -a {DEPLOY_TARGET} ;;
  railway) RAILWAY_TOKEN="$RAILWAY_TOKEN" railway up --service {DEPLOY_TARGET} ;;
  render)  render deploys create {DEPLOY_TARGET} --image "{PUBLISH_TARGET}:$VERSION" --api-key "$RENDER_API_KEY" ;;
  *)       echo "access.platform absent ou inconnu pour {ENV_NAME} — relancer /init-project (Etape 8b)"; exit 1 ;;
esac

# 3. Verification post-deploy
# Smoke : commande du projet (tests tag `smoke` de tests/INDEX.md), sinon simple /health
SMOKE_CMD=$(jq -r '.commands.smoke // empty' .claude/project-config.json)
if [ -n "$SMOKE_CMD" ]; then bash -c "$SMOKE_CMD"; else curl -f "https://{ENV_NAME_LOWER}.example.com/health"; fi

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Consulter les logs de la plateforme (`heroku logs -a {DEPLOY_TARGET}`
/ dashboard Railway ou Render). Rapport au teamleader, jamais de correction autonome.

## Rollback

```bash
heroku rollback -a {DEPLOY_TARGET}
# ou (Railway/Render) : revenir au deploiement precedent via le dashboard/CLI
```
