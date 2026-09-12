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
  assert.match(workflow, /npx --yes vercel@59\.16\.0/);
  assert.match(workflow, /\/api\/readyz/);
  assert.doesNotMatch(workflow, /seed\.sql|--include-seed/);
  assert.doesNotMatch(workflow, /npm i(?:nstall)? -g vercel/);
  assert.doesNotMatch(workflow, /\|\| echo/);
});
