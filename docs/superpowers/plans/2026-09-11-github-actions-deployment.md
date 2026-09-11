# GitHub Actions Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the staging-branch pipeline with pull-request CI, automatic `main`-to-staging deployment, and tag-gated production deployment backed by Doppler.

**Architecture:** Three workflows own distinct events: pull requests validate code without deployment credentials, pushes to `main` deploy the separate staging projects, and semantic-version tags deploy their immutable `main` commit to the separate production projects. Deployment workflows use ordered validation, migration, deployment, and readiness jobs; Doppler service tokens bootstrap job-scoped deployment credentials while Doppler-to-Vercel syncs provide runtime configuration.

**Tech Stack:** GitHub Actions, Node.js 24.14.1, npm, Next.js 16, Doppler Secrets Fetch Action, Supabase CLI, Vercel CLI 59.16.0, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-11-github-actions-deployment-design.md`

## Global Constraints

- Preserve every unrelated uncommitted change; stage only task-owned hunks in the files named by the current task.
- Keep staging and production as separate Vercel and Supabase projects; never expose their credentials to pull-request code, and store only one read-only `DOPPLER_TOKEN` in each GitHub deployment environment.
- Sync application configs `stg` and `prd` to Vercel; keep deployment configs `stg_ci` and `prd_ci` out of Vercel.
- Deploy an immutable tag reachable from `origin/main`; queue each environment with cancellation disabled, and require backward-compatible migrations.
- Never seed automatically, make `/api/readyz` fail closed, and do not invoke production or delete the `staging` branch during implementation.

---

### Task 1: Separate Runtime Configuration From Deployment Tooling

**Files:**

- Modify: `src/config/env.ts:4-19`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: existing Zod `schema` exported through `env` and the npm lockfile.
- Produces: application runtime validation without `SUPABASE_DB_URL`; exact local command `npx vercel` at version `59.16.0`.

- [ ] **Step 1: Verify the database URL has no runtime consumer**

Run:

```powershell
rg -n "SUPABASE_DB_URL" src next.config.ts
```

Expected: the only match is `src/config/env.ts`; stop and revise this task if another runtime consumer exists.

- [ ] **Step 2: Remove the unused runtime requirement**

Delete this property from the Zod object in `src/config/env.ts`:

```typescript
SUPABASE_DB_URL: z.string(),
```

Do not change any other environment requirement.

- [ ] **Step 3: Pin Vercel CLI in the repository lockfile**

Run:

```powershell
npm install --save-dev --save-exact vercel@59.16.0
```

Expected: `package.json` contains `"vercel": "59.16.0"` under `devDependencies`, and `package-lock.json` records that exact direct dependency. Inspect both diffs and preserve the user's existing package changes.

- [ ] **Step 4: Verify configuration and dependency integrity**

Run:

```powershell
npm run typecheck
npm ls vercel --depth=0
```

Expected: typecheck exits 0 and npm reports `vercel@59.16.0`.

- [ ] **Step 5: Commit the focused change**

```powershell
git add -p -- src/config/env.ts package.json package-lock.json
git diff --cached --check
git commit -m "build: separate deployment credentials"
```

Expected: the commit contains only this task's `SUPABASE_DB_URL` removal and Vercel dependency hunks. If a hunk combines unrelated user work with this task, stop and leave the task uncommitted instead of staging the user's work.

---

### Task 2: Add Credential-Free Pull-Request CI

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `tests/workflows/ci-workflow.test.mjs`

**Interfaces:**

- Consumes: npm scripts `format:check`, `lint`, and `typecheck`; pinned Vercel is not used in this workflow.
- Produces: required GitHub status check `Pull Request CI / validate` for pull requests targeting `main`.

- [ ] **Step 1: Write the failing workflow contract test**

Create `tests/workflows/ci-workflow.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = new URL("../../.github/workflows/ci.yml", import.meta.url);

test("pull-request CI validates main without deployment secrets", async () => {
  const workflow = await readFile(path, "utf8");

  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /npm run format:check/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npx next build/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /environment:\s*(staging|production)/);
});
```

- [ ] **Step 2: Run the test and confirm the missing workflow failure**

Run:

```powershell
node --test tests/workflows/ci-workflow.test.mjs
```

Expected: FAIL with `ENOENT` for `.github/workflows/ci.yml`.

- [ ] **Step 3: Create the minimal CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: Pull Request CI

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ci-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ci-public-key
      SUPABASE_SECRET_KEY: ci-secret-key
      UPSTASH_REDIS_REST_URL: https://example.invalid
      UPSTASH_REDIS_REST_TOKEN: ci-redis-token
      ADMIN_SESSION_SECRET: ci-admin-session-secret
      LIGHTSPEED_ACCESS_TOKEN: ci-lightspeed-token
      LIGHTSPEED_DOMAIN_PREFIX: ci-store
    steps:
      - name: Checkout
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24.14.1
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Build without deployment credentials
        run: npx next build
```

- [ ] **Step 4: Run the contract and repository checks**

Run:

```powershell
node --test tests/workflows/ci-workflow.test.mjs
npx prettier --check .github/workflows/ci.yml tests/workflows/ci-workflow.test.mjs
```

Expected: both commands exit 0.

Run the workflow's commands locally with temporary process-scoped placeholders. Do not use `npm run build`, because that script intentionally invokes Doppler:

```powershell
$env:NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "ci-public-key"
$env:SUPABASE_SECRET_KEY = "ci-secret-key"
$env:UPSTASH_REDIS_REST_URL = "https://example.invalid"
$env:UPSTASH_REDIS_REST_TOKEN = "ci-redis-token"
$env:ADMIN_SESSION_SECRET = "ci-admin-session-secret"
$env:LIGHTSPEED_ACCESS_TOKEN = "ci-lightspeed-token"
$env:LIGHTSPEED_DOMAIN_PREFIX = "ci-store"
npx next build
```

Expected: the build exits 0 without contacting a credentialed environment. Remove those process variables after the check:

```powershell
Remove-Item Env:NEXT_PUBLIC_SITE_URL, Env:NEXT_PUBLIC_SUPABASE_URL, Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Env:SUPABASE_SECRET_KEY, Env:UPSTASH_REDIS_REST_URL, Env:UPSTASH_REDIS_REST_TOKEN, Env:ADMIN_SESSION_SECRET, Env:LIGHTSPEED_ACCESS_TOKEN, Env:LIGHTSPEED_DOMAIN_PREFIX
```

- [ ] **Step 5: Commit pull-request CI**

```powershell
git add -- .github/workflows/ci.yml tests/workflows/ci-workflow.test.mjs
git diff --cached --check
git commit -m "ci: validate pull requests to main"
```

Expected: the commit contains only the CI workflow and its contract test.

---

### Task 3: Deploy Main to Staging

**Files:**

- Modify: `.github/workflows/staging.yml`
- Create: `tests/workflows/staging-workflow.test.mjs`

**Interfaces:**

- Consumes: GitHub `staging` environment secret `DOPPLER_TOKEN`, Doppler `stg_ci` values `SUPABASE_DB_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`, and runtime values synced from Doppler `stg` into the staging Vercel project.
- Produces: automatic serialized staging deployment for each push to `main`, plus `deploy.outputs.deployment_url` for readiness verification.

- [ ] **Step 1: Write the failing staging workflow contract test**

Create `tests/workflows/staging-workflow.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = new URL("../../.github/workflows/staging.yml", import.meta.url);

test("main deploys to staging through ordered jobs", async () => {
  const workflow = await readFile(path, "utf8");

  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.doesNotMatch(workflow, /branches:\s*\n\s*- staging/);
  assert.match(workflow, /^  validate:/m);
  assert.match(workflow, /^  migrate:/m);
  assert.match(workflow, /^  deploy:/m);
  assert.match(workflow, /^  verify:/m);
  assert.match(workflow, /environment: staging/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /dopplerhq\/secrets-fetch-action@451892f/);
  assert.match(workflow, /supabase db push --db-url "\$SUPABASE_DB_URL"/);
  assert.match(workflow, /\/api\/readyz/);
  assert.doesNotMatch(workflow, /seed\.sql|--include-seed/);
  assert.doesNotMatch(workflow, /npm i(?:nstall)? -g vercel/);
  assert.doesNotMatch(workflow, /\|\| echo/);
});
```

- [ ] **Step 2: Run the test and confirm the old-flow failure**

Run:

```powershell
node --test tests/workflows/staging-workflow.test.mjs
```

Expected: FAIL because the current workflow targets `staging`, contains one job, seeds the database, and checks `/api/healthz`.

- [ ] **Step 3: Replace the staging workflow**

Replace `.github/workflows/staging.yml` with:

```yaml
name: Staging Deployment

on:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: deploy-staging
  cancel-in-progress: false

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24.14.1
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

  migrate:
    needs: validate
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: staging
    steps:
      - name: Checkout
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Fetch staging deployment secrets
        uses: dopplerhq/secrets-fetch-action@451892f16195f9ac360e1a5bcbf0b5fd0e957534 # v2.0.0
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
          inject-env-vars: true

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520 # v3.0.0

      - name: Preview pending migrations
        run: supabase db push --db-url "$SUPABASE_DB_URL" --dry-run

      - name: Apply pending migrations
        run: supabase db push --db-url "$SUPABASE_DB_URL"

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: staging
    outputs:
      deployment_url: ${{ steps.deploy.outputs.deployment_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24.14.1
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Fetch staging deployment secrets
        uses: dopplerhq/secrets-fetch-action@451892f16195f9ac360e1a5bcbf0b5fd0e957534 # v2.0.0
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
          inject-env-vars: true

      - name: Pull Vercel project configuration
        run: npx vercel pull --yes --environment=production --token="$VERCEL_TOKEN"

      - name: Build staging deployment
        run: npx vercel build --prod --token="$VERCEL_TOKEN"

      - name: Deploy staging build
        id: deploy
        shell: bash
        run: |
          deployment_url="$(npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN")"
          echo "deployment_url=$deployment_url" >> "$GITHUB_OUTPUT"

  verify:
    needs: deploy
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: Check staging readiness
        shell: bash
        env:
          DEPLOYMENT_URL: ${{ needs.deploy.outputs.deployment_url }}
        run: |
          for attempt in 1 2 3 4 5 6; do
            if curl --fail --silent --show-error --max-time 10 "$DEPLOYMENT_URL/api/readyz"; then
              exit 0
            fi
            if [ "$attempt" -lt 6 ]; then
              sleep 10
            fi
          done
          exit 1
```

- [ ] **Step 4: Run the staging checks**

Run:

```powershell
node --test tests/workflows/staging-workflow.test.mjs
npx prettier --check .github/workflows/staging.yml tests/workflows/staging-workflow.test.mjs
```

Expected: both commands exit 0. Full Actions schema validation runs in Task 5 with a pinned temporary `actionlint` binary.

- [ ] **Step 5: Commit staging deployment**

```powershell
git add -- .github/workflows/staging.yml tests/workflows/staging-workflow.test.mjs
git diff --cached --check
git commit -m "ci: deploy main to staging"
```

Expected: the commit contains only the staging workflow and its contract test.

---

### Task 4: Add Tag-Gated Production Deployment

**Files:**

- Modify: `.github/workflows/production.yml`
- Create: `tests/workflows/production-workflow.test.mjs`

**Interfaces:**

- Consumes: a tag matching `v*.*.*`, GitHub `production` environment secret `DOPPLER_TOKEN`, Doppler `prd_ci` values `SUPABASE_DB_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`, and runtime values synced from Doppler `prd` into the production Vercel project.
- Produces: serialized production deployment of the immutable tagged SHA and `deploy.outputs.deployment_url` for readiness verification.

- [ ] **Step 1: Write the failing production workflow contract test**

Create `tests/workflows/production-workflow.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = new URL("../../.github/workflows/production.yml", import.meta.url);

test("semantic tags deploy production only from main history", async () => {
  const workflow = await readFile(path, "utf8");

  assert.match(workflow, /tags:\s*\n\s*- "v\*\.\*\.\*"/);
  assert.match(workflow, /git merge-base --is-ancestor "\$GITHUB_SHA" origin\/main/);
  assert.match(workflow, /GITHUB_REF_NAME/);
  assert.match(workflow, /^  validate-release:/m);
  assert.match(workflow, /^  migrate:/m);
  assert.match(workflow, /^  deploy:/m);
  assert.match(workflow, /^  verify:/m);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /dopplerhq\/secrets-fetch-action@451892f/);
  assert.match(workflow, /supabase db push --db-url "\$SUPABASE_DB_URL"/);
  assert.match(workflow, /\/api\/readyz/);
  assert.doesNotMatch(workflow, /workflow_dispatch/);
  assert.doesNotMatch(workflow, /\|\| echo/);
});
```

- [ ] **Step 2: Run the test and confirm the missing release guard**

Run:

```powershell
node --test tests/workflows/production-workflow.test.mjs
```

Expected: FAIL because the current production workflow lacks the `main` ancestry guard, separate jobs, and `/api/readyz` verification.

- [ ] **Step 3: Replace the production workflow**

Replace `.github/workflows/production.yml` with:

```yaml
name: Production Deployment

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: read

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  validate-release:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout tag
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0

      - name: Validate semantic version and main ancestry
        shell: bash
        run: |
          if [[ ! "$GITHUB_REF_NAME" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
            echo "Tag must use canonical vMAJOR.MINOR.PATCH format." >&2
            exit 1
          fi
          git fetch origin main --no-tags
          if ! git merge-base --is-ancestor "$GITHUB_SHA" origin/main; then
            echo "Production tag must point to a commit in main history." >&2
            exit 1
          fi

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24.14.1
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

  migrate:
    needs: validate-release
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: production
    steps:
      - name: Checkout tag
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Fetch production deployment secrets
        uses: dopplerhq/secrets-fetch-action@451892f16195f9ac360e1a5bcbf0b5fd0e957534 # v2.0.0
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
          inject-env-vars: true

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520 # v3.0.0

      - name: Preview pending migrations
        run: supabase db push --db-url "$SUPABASE_DB_URL" --dry-run

      - name: Apply pending migrations
        run: supabase db push --db-url "$SUPABASE_DB_URL"

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: production
    outputs:
      deployment_url: ${{ steps.deploy.outputs.deployment_url }}
    steps:
      - name: Checkout tag
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 24.14.1
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Fetch production deployment secrets
        uses: dopplerhq/secrets-fetch-action@451892f16195f9ac360e1a5bcbf0b5fd0e957534 # v2.0.0
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
          inject-env-vars: true

      - name: Pull Vercel project configuration
        run: npx vercel pull --yes --environment=production --token="$VERCEL_TOKEN"

      - name: Build production deployment
        run: npx vercel build --prod --token="$VERCEL_TOKEN"

      - name: Deploy production build
        id: deploy
        shell: bash
        run: |
          deployment_url="$(npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN")"
          echo "deployment_url=$deployment_url" >> "$GITHUB_OUTPUT"

  verify:
    needs: deploy
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: Check production readiness
        shell: bash
        env:
          DEPLOYMENT_URL: ${{ needs.deploy.outputs.deployment_url }}
        run: |
          for attempt in 1 2 3 4 5 6; do
            if curl --fail --silent --show-error --max-time 10 "$DEPLOYMENT_URL/api/readyz"; then
              exit 0
            fi
            if [ "$attempt" -lt 6 ]; then
              sleep 10
            fi
          done
          exit 1
```

- [ ] **Step 4: Run the production checks without deploying**

Run:

```powershell
node --test tests/workflows/production-workflow.test.mjs
npx prettier --check .github/workflows/production.yml tests/workflows/production-workflow.test.mjs
```

Expected: both commands exit 0. Do not create or push a tag.

- [ ] **Step 5: Commit production deployment**

```powershell
git add -- .github/workflows/production.yml tests/workflows/production-workflow.test.mjs
git diff --cached --check
git commit -m "ci: gate production deployment by tag"
```

Expected: the commit contains only the production workflow and its contract test.

---

### Task 5: Document Operations and Verify the Complete Pipeline

**Files:**

- Modify: `docs/legacy/DEPLOYMENT_PIPELINE.md`
- Modify: `package.json`
- Modify: `package-lock.json` only if npm rewrites lockfile metadata after the script change; otherwise leave it unchanged.

**Interfaces:**

- Consumes: all three workflows and their contract tests.
- Produces: `npm run test:workflows` and the operator-facing GitHub, Doppler, Vercel, release, rerun, and recovery procedure.

- [ ] **Step 1: Add the combined workflow test command**

Add this script to `package.json` without changing existing scripts:

```json
"test:workflows": "node --test tests/workflows/ci-workflow.test.mjs tests/workflows/staging-workflow.test.mjs tests/workflows/production-workflow.test.mjs"
```

Run:

```powershell
npm run test:workflows
```

Expected: three tests pass.

- [ ] **Step 2: Replace the deployment runbook with the approved flow**

Replace `docs/legacy/DEPLOYMENT_PIPELINE.md` with this operational content, retaining any unrelated user-authored additions that remain accurate:

````markdown
# Deployment Pipeline

## Release flow

1. Open a feature-branch pull request into `main` and wait for `Pull Request CI / validate`.
2. Merge the pull request; the `Staging Deployment` workflow deploys that `main` SHA.
3. Verify the staging deployment and its `/api/readyz` job.
4. Create `vMAJOR.MINOR.PATCH` from the verified `main` commit.
5. The `Production Deployment` workflow deploys that immutable tag.

## One-time GitHub setup

In **Settings -> Environments**, create `staging` and `production`. Add one environment secret named `DOPPLER_TOKEN` to each: staging receives the read-only `stg_ci` service token and production receives the read-only `prd_ci` service token. Restrict staging to `main`, restrict production to protected `v*.*.*` tags, and enable required production reviewers when the repository plan supports them.

In **Settings -> Rules -> Rulesets**, protect `main` by requiring pull requests, the `Pull Request CI / validate` status, an up-to-date branch, and blocked force pushes and deletion. Where supported, add a `v*` tag ruleset that restricts tag creation, update, and deletion to release owners.

In **Settings -> Actions -> General**, set default workflow permissions to read-only.

## One-time Doppler and Vercel setup

Create `stg_ci` and `prd_ci` Doppler configs. Each contains its environment's `SUPABASE_DB_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Generate one read-only service token from each config for the matching GitHub environment.

Create Sensitive Doppler syncs from `stg` to the staging Vercel project's Production environment and from `prd` to the production Vercel project's Production environment. Disconnect Git auto-deployment on both Vercel projects so GitHub Actions is the only deployment path.

## Production release

Create a GitHub release from the verified `main` commit:

```powershell
gh release create v1.2.3 --target main --generate-notes
```

The production workflow rejects noncanonical versions and tags outside `main` history. Never move or rewrite a released tag.

## Reruns and recovery

GitHub reruns jobs, not steps. From a workflow run, select **Re-run jobs -> Re-run failed jobs**, or use `gh run rerun RUN_ID --failed`. A repeated migration is safe because Supabase applies only migrations absent from its migration-history table.

If staging fails, do not create a production tag. If production deployment or readiness fails, restore the previously verified deployment from Vercel, retain the failed tag for diagnosis, and ship a new patch version after repair.

The `staging` Git branch is obsolete after the first verified `main` deployment. Deleting it requires a separate explicit confirmation.
````

- [ ] **Step 3: Run all local verification**

Run:

```powershell
npm run test:workflows
npm run format:check
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: every command exits 0. `npm run build` uses the developer's existing development-only Doppler authentication; it is not production evidence.

Download the pinned `actionlint` 1.7.12 Windows binary into a dedicated temporary directory, verify its SHA-256 digest, and run it across the final workflow set:

```powershell
$actionlintDir = Join-Path ([IO.Path]::GetTempPath()) "rdk-actionlint-1.7.12"
$actionlintZip = Join-Path $actionlintDir "actionlint_1.7.12_windows_amd64.zip"
New-Item -ItemType Directory -Force -Path $actionlintDir | Out-Null
Invoke-WebRequest "https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_windows_amd64.zip" -OutFile $actionlintZip
if ((Get-FileHash -Algorithm SHA256 $actionlintZip).Hash.ToLowerInvariant() -ne "6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9") { throw "actionlint checksum mismatch" }
Expand-Archive -LiteralPath $actionlintZip -DestinationPath $actionlintDir -Force
& (Join-Path $actionlintDir "actionlint.exe") .github/workflows/ci.yml .github/workflows/staging.yml .github/workflows/production.yml
Remove-Item -LiteralPath $actionlintDir -Recurse -Force
```

Expected: exit 0 with no findings.

- [ ] **Step 4: Inspect security and release invariants**

Run:

```powershell
rg -n "secrets\.|DOPPLER_TOKEN|SUPABASE_DB_URL|VERCEL_TOKEN|workflow_dispatch|seed\.sql|healthz|readyz|cancel-in-progress" .github/workflows
git diff --stat HEAD~4..HEAD
git status --short
```

Expected:

- PR CI contains no `${{ secrets.* }}` reference.
- Deployment workflows reference only `${{ secrets.DOPPLER_TOKEN }}` directly.
- No workflow contains `seed.sql`, `/api/healthz`, or `workflow_dispatch`.
- Both deployment workflows contain `/api/readyz` and `cancel-in-progress: false`.
- Unrelated pre-existing worktree changes remain present and unstaged.

- [ ] **Step 5: Commit the runbook and test command**

```powershell
git add -- docs/legacy/DEPLOYMENT_PIPELINE.md
git add -p -- package.json package-lock.json
git diff --cached --check
git commit -m "docs: document deployment operations"
```

Expected: the commit contains the runbook, package script, and lockfile only when the lockfile actually changed.

## External Activation Checklist

These actions happen after code review and are not performed by this implementation plan:

1. Populate Doppler `stg`, `prd`, `stg_ci`, and `prd_ci`; create both Vercel Sensitive syncs and both read-only service tokens.
2. Configure GitHub `staging` and `production` environments, rulesets, environment tokens, and read-only Actions permissions.
3. Disconnect Vercel Git auto-deployment for both projects.
4. Merge the workflow change and observe one successful `main` staging deployment with no duplicate Vercel deployment.
5. Create the first production tag only during an explicitly approved release window; delete the obsolete `staging` branch only through a later confirmed cleanup.
