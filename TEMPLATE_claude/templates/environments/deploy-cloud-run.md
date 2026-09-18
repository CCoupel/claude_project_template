# Deploy — {ENV_NAME} (mecanisme : cloud-run)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-cloud-run.md` — selectionne car
> `infrastructure.environments[].deploy.mechanism = "cloud-run"` pour {ENV_NAME} dans
> `.claude/project-config.json`. Charge par `agents/deploy.md`, Tache DEPLOY {ENV_NAME}, etape
> [2. MECANISME]. Cible : `{DEPLOY_TARGET}` (ex: nom du service Cloud Run / App Engine).

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3).

## Variables attendues

| Variable | Usage |
|----------|-------|
| `GCP_PROJECT` | Projet GCP cible |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optionnel — chemin vers la cle de service account, si `gcloud auth` n'est pas deja configure sur le poste |

```bash
# 1. Verification
# Une publication ({ENV_NAME}) valide doit exister pour $VERSION.

# 2. Install
gcloud run deploy {DEPLOY_TARGET} --image "{PUBLISH_TARGET}:$VERSION" --project "$GCP_PROJECT" --region europe-west1
# ou (App Engine) : gcloud app deploy --image-url="{PUBLISH_TARGET}:$VERSION" --project "$GCP_PROJECT"

# 3. Verification post-deploy
curl -f "https://{ENV_NAME_LOWER}.example.com/health"

# 4. Notification
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Echec

```bash
gcloud run services logs read {DEPLOY_TARGET} --region europe-west1 --limit 50
```

Un echec ici est toujours un echec d'installation — le build (BUILD) et la publication (PUBLISH
{ENV_NAME}) ont deja reussi. Rapport a `main`, jamais de correction autonome.

## Rollback

```bash
gcloud run services update-traffic {DEPLOY_TARGET} --to-revisions=PREVIOUS=100 --region europe-west1
```
