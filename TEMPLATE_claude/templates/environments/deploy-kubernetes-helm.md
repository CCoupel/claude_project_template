# Deploy — {ENV_NAME} (mecanisme : kubernetes/helm)

> Genere depuis `TEMPLATE_claude/templates/environments/deploy-kubernetes-helm.md` —
> selectionne car `infrastructure.environments[].deploy.mechanism` vaut `"kubernetes"` ou
> `"helm"` pour {ENV_NAME} dans `.claude/project-config.json`. Charge par `agents/deploy.md`,
> Tache DEPLOY {ENV_NAME}, etape [2. MECANISME]. Chart/values : `{DEPLOY_TARGET}`.

Installation pure de l'artefact deja publie par PUBLISH {ENV_NAME} — aucun build, aucune
publication ici (principe BORE, `agents/infra.md` section 3). BORE : jamais de rebuild, jamais
de retag qui re-uploaderait un nouveau contenu.

## Variables attendues

| Variable | Usage |
|----------|-------|
| `KUBE_CONTEXT` | Contexte kubectl a selectionner pour {ENV_NAME} (cluster/namespace) |
| `KUBECONFIG` | Optionnel — chemin vers le kubeconfig si different de celui par defaut du poste |

```bash
# 1. Verification
# Une publication ({ENV_NAME}) valide doit exister pour $VERSION — confirmee par le CDP/le
# rapport PUBLISH DONE avant cet ordre.
kubectl config use-context "$KUBE_CONTEXT"

# 2. Install
helm upgrade --install app {DEPLOY_TARGET} --kube-context "$KUBE_CONTEXT" --set image.tag=$VERSION -f custom-values.yaml
# ou, sans Helm : kubectl set image deployment/app app={PUBLISH_TARGET}:$VERSION

# 3. Verifier le rollout
kubectl rollout status deployment/app --timeout=5m
ROLLOUT_STATUS=$?
```

**ROLLOUT_STATUS = 0 → continuer vers Notification.**

**ROLLOUT_STATUS ≠ 0 → executer le protocole d'echec ci-dessous.**

## Echec

Le deployer ne corrige rien lui-même. Il rollback l'infra, et remonte à `main`. La publication
(PUBLISH {ENV_NAME}) ayant déjà réussi, un échec ici est toujours un échec
d'installation/rollout — jamais un échec de code ni de build.

```
SendMessage({
  to: "main",
  content: "DEPLOY FAILED
Environnement : {ENV_NAME}
Version  : v[X.Y.Z]
Etape    : Installation
Rollback : rollout undo"
})
```

```bash
# 4. Notification (si ROLLOUT_STATUS = 0)
echo "Deploiement {ENV_NAME} termine - $VERSION"
```

## Rollback

```bash
kubectl rollout undo deployment/app
# ou (Helm) :
helm rollback app
```
