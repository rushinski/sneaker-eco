# Deployment Pipeline

## Release flow

1. Open a feature-branch pull request into `main` and wait for `Pull Request CI / validate`.
2. Merge the pull request; `Staging Deployment` deploys that `main` SHA.
3. Verify the staging deployment and its `/api/readyz` job.
4. Create `vMAJOR.MINOR.PATCH` from the verified `main` commit.
5. `Production Deployment` deploys that immutable tag.

## One-time GitHub setup

In **Settings -> Environments**, create `staging` and `production`. Add one environment secret named `DOPPLER_TOKEN` to each: staging receives the read-only `stg_ci` service token and production receives the read-only `prd_ci` service token. Restrict staging to `main`, restrict production to protected `v*.*.*` tags, and enable required production reviewers when the repository plan supports them.

In **Settings -> Rules -> Rulesets**, protect `main` by requiring pull requests, the `Pull Request CI / validate` status, an up-to-date branch, and blocked force pushes and deletion. Where supported, add a `v*` tag ruleset that restricts tag creation, update, and deletion to release owners.

In **Settings -> Actions -> General**, set default workflow permissions to read-only.

## One-time Doppler and Vercel setup

Create `stg_ci` and `prd_ci` Doppler configs. Each contains its environment's `SUPABASE_DB_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Generate one read-only service token from each config for the matching GitHub environment.

Create Sensitive Doppler syncs from `stg` to the staging Vercel project's Production environment and from `prd` to the production Vercel project's Production environment. Vercel builds uploaded source inside the target project, where those Sensitive variables are available without exposing them to GitHub.

Disconnect Git auto-deployment on both Vercel projects so GitHub Actions is the only deployment path.

## Production release

Create a GitHub release from the verified `main` commit:

```powershell
gh release create v1.2.3 --target main --generate-notes
```

The production workflow rejects noncanonical versions and tags outside `main` history. Never move or rewrite a released tag.

## Reruns and recovery

GitHub reruns jobs, not steps. From a workflow run, select **Re-run jobs -> Re-run failed jobs**, or use `gh run rerun RUN_ID --failed`. A repeated migration is safe because Supabase applies only migrations absent from its migration-history table.

If staging fails, do not create a production tag. If production deployment or readiness fails, restore the previously verified deployment from Vercel, retain the failed tag for diagnosis, and ship a new patch version after repair.

The `/api/healthz` endpoint verifies process liveness. Deployment gates use `/api/readyz` because it also verifies Supabase and Redis.

The `staging` Git branch is obsolete after the first verified `main` deployment. Deleting it requires a separate explicit confirmation.
