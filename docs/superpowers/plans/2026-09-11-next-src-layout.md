# Next.js `src` Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Next.js application and proxy entry into `src/` without changing routes or behavior.

**Architecture:** Use Next.js's native `src/app` and `src/proxy.ts` discovery. Preserve the existing `@/` alias and update only filesystem-relative references that depend on the old root locations.

**Tech Stack:** Next.js 16, TypeScript, Jest, Git

**Spec:** `docs/superpowers/specs/2026-09-11-next-src-layout-design.md`

## Global Constraints

- Work inline on `jacob-dev`; do not create a worktree.
- Preserve all route URLs and proxy behavior.
- Do not modify unrelated working-tree changes.
- Do not add dependencies or compatibility shims.

---

### Task 1: Move Next.js discovery roots

**Files:**
- Create: `tests/unit/next-src-layout.test.ts`
- Move: `app/` to `src/app/`
- Move: `proxy.ts` to `src/proxy.ts`
- Modify: `tests/unit/checkout-page.test.tsx`
- Modify: `tests/unit/product-archive-api.test.ts`
- Modify: `tests/unit/store-access-api.test.ts`
- Modify: `docs/legacy/PROXY_PIPELINE.md`

**Interfaces:**
- Consumes: Next.js native `src/app` and `src/proxy.ts` discovery.
- Produces: unchanged application routes and proxy exports from their new filesystem locations.

- [ ] **Step 1: Write the failing structural test**

```ts
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Next.js source layout", () => {
  it("keeps application discovery roots under src", () => {
    expect(existsSync(resolve("src/app/layout.tsx"))).toBe(true);
    expect(existsSync(resolve("src/proxy.ts"))).toBe(true);
    expect(existsSync(resolve("app"))).toBe(false);
    expect(existsSync(resolve("proxy.ts"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the structural test and verify red**

Run: `npm run test:jest:unit -- tests/unit/next-src-layout.test.ts --runInBand`

Expected: FAIL because `src/app/layout.tsx` and `src/proxy.ts` do not exist yet.

- [ ] **Step 3: Move the tracked roots**

Verify the resolved source and destination paths are under the repository root, then run:

```powershell
git mv app src/app
git mv proxy.ts src/proxy.ts
```

- [ ] **Step 4: Update relative test imports and proxy documentation**

Change route imports from `../../app/...` to `../../src/app/...`. Change documentation references from the root `proxy.ts` path to `src/proxy.ts`. Do not change `@/` imports.

- [ ] **Step 5: Regenerate Next.js route types**

Run: `doppler run -- npx next typegen`

Expected: `Types generated successfully` with routes discovered from `src/app/`.

- [ ] **Step 6: Run focused verification**

Run: `npm run test:jest:unit -- tests/unit/next-src-layout.test.ts tests/unit/checkout-page.test.tsx tests/unit/product-archive-api.test.ts tests/unit/store-access-api.test.ts --runInBand`

Expected: all focused suites pass.

- [ ] **Step 7: Run full verification**

Run these commands:

```powershell
npm run typecheck
npm run test:jest
npm run build
```

Lint only files changed by this task because unrelated local worktree and line-ending issues are outside scope.

- [ ] **Step 8: Commit only this task's files**

```powershell
git add src/app src/proxy.ts tests/unit/next-src-layout.test.ts tests/unit/checkout-page.test.tsx tests/unit/product-archive-api.test.ts tests/unit/store-access-api.test.ts docs/legacy/PROXY_PIPELINE.md
git commit -m "refactor: adopt Next.js src layout"
```
