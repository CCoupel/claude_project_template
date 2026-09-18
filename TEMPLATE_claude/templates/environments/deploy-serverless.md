# Deploy — {ENV_NAME} (mecanisme : serverless)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-serverless.md` — selectionne car
> `infrastructure.environments[].deploy.mechanism = "serverless"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, etape
> [2. MECANISME]. Cible : `{DEPLOY_TARGET}` (ex: nom de la fonction Lambda, du projet
> Vercel/Netlify).

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3).

## Variables attendues

| Variable | Usage |
|----------|-------|
| `AWS_PROFILE` (ou `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) | Variante Lambda |
| `VERCEL_TOKEN` | Variante Vercel |
| `NETLIFY_AUTH_TOKEN` | Variante Netlify |

Une seule des trois selon la plateforme retenue pour {DEPLOY_TARGET}.

```bash
# 1. Verification
# Une publication ({ENV_NAME}) valide doit exister pour $VERSION.

# 2. Install — adapter a la plateforme retenue pour {DEPLOY_TARGET}
AWS_PROFILE="$AWS_PROFILE" aws lambda update-function-code --function-name {DEPLOY_TARGET} --s3-bucket {PUBLISH_TARGET} --s3-key "app-$VERSION.zip"
# ou (Vercel) : vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
# ou (Netlify) : netlify deploy --prod --dir=dist --auth="$NETLIFY_AUTH_TOKEN"

# 3. Verification post-deploy
curl -f "https://{ENV_NAME_LOWER}.example.com/health"

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Consulter les logs de la plateforme (CloudWatch / Vercel / Netlify
build logs). Rapport a `main`, jamais de correction autonome.

## Rollback

```bash
aws lambda update-function-code --function-name {DEPLOY_TARGET} --s3-bucket {PUBLISH_TARGET} --s3-key "app-$PREVIOUS_VERSION.zip"
# ou (Vercel/Netlify) : revenir au deploiement precedent via le dashboard/CLI (vercel rollback / netlify rollback)
```
