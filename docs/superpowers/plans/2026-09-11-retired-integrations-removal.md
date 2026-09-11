# Retired Integrations Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make jacob-dev run with only the ten approved application environment variables by deleting retired checkout, order, fulfillment, custom-email, and vendor integration code while keeping catalog, cart, Supabase Auth, chat, customer profiles, store access, and a static unavailable checkout page.

**Architecture:** Remove callers before implementations. Keep /checkout as a dependency-free server page, keep catalog/inventory on direct Supabase paths, reduce customer/admin views to profile, catalog, and traffic data, and let deleted routes use normal Next.js 404 behavior. Historical migrations and generated database types remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase, Jest 30, ESLint, npm.

**Spec:** docs/superpowers/specs/2026-09-11-retired-integrations-removal-design.md

## Global Constraints

- Do not edit supabase/migrations/** or src/types/db/database.types.ts.
- Keep LIGHTSPEED_ACCESS_TOKEN and LIGHTSPEED_DOMAIN_PREFIX declared and injected as reserved values, but no runtime code may consume them.
- Keep Supabase Auth verification, OTP, OAuth, and password-reset behavior; remove only custom AWS mail side effects.
- Do not add replacement vendors, compatibility routes, stubs, packages, or migrations.
- Stage exact files so the intentionally red structural guard is not committed until Task 7.

---

## Task 1: Establish removal regression checks

**Files:**

- Create: tests/unit/retired-integrations-structure.test.ts
- Modify: tests/unit/checkout-page.test.tsx

- [ ] **Step 1: Add the forbidden-reference test**

Use only node:child_process and node:fs. Get files with git ls-files --cached --others --exclude-standard. Exclude supabase/migrations/**, src/types/db/database.types.ts, this plan, the approved design, and the test itself. Strip the two exact reserved Lightspeed env identifiers before applying this case-insensitive pattern:

~~~ts
const FORBIDDEN =
  /stripe|payrilla|lightspeed|@aws-sdk\/client-(?:sesv2?|ssm)|nodemailer|nofraud|here[_ -]?maps?|shippo|@vercel\/(?:analytics|speed-insights)|vercel-scripts|vercel telemetry|NEXT_TELEMETRY_DISABLED|VERCEL_ANALYTICS|VERCEL_SPEED_INSIGHTS|ziptax/i;
~~~

Collect matching filenames and assert expect(violations).toEqual([]). Binary read failures return no violation; do not add live-code allowlists.

- [ ] **Step 2: Prove the structural test is red**

Run:

~~~powershell
npx jest --config jest.config.ts tests/unit/retired-integrations-structure.test.ts --runInBand
~~~

Expected: FAIL with current provider files. This proves the guard detects the code being removed.

- [ ] **Step 3: Replace the checkout test with the approved behavior**

Use react-dom/server and assert the visible unavailable statement:

~~~tsx
import { renderToStaticMarkup } from "react-dom/server";

import CheckoutPage from "../../app/checkout/page";

it("keeps checkout visible and unavailable", () => {
  expect(renderToStaticMarkup(<CheckoutPage />)).toContain(
    "Checkout is currently unavailable",
  );
});
~~~

- [ ] **Step 4: Prove the checkout test is red**

Run the checkout test alone. Expected: FAIL because the current page still gates and redirects into executable checkout.

---

## Task 2: Replace checkout with a static unavailable page

**Files:**

- Modify: app/checkout/page.tsx, app/cart/page.tsx
- Delete: app/checkout/cancel/page.tsx, error.tsx, layout.tsx, processing/layout.tsx, processing/page.tsx, start/page.tsx, success/page.tsx
- Delete: app/api/checkout/**, app/api/cart/snapshot/route.ts, app/api/cart/restore/route.ts
- Delete: app/api/admin/payrilla/credentials/route.ts, app/api/webhooks/payrilla/route.ts
- Delete: src/components/checkout/**
- Delete: src/lib/cart/snapshot.ts, src/lib/checkout/**
- Delete: src/lib/secrets/payrilla-secrets.ts, src/lib/validation/checkout.ts
- Delete: src/services/checkout-pricing-service.ts, nofraud-service.ts, payrilla-charge-service.ts, ziptax-service.ts
- Delete: src/types/domain/checkout.ts, src/types/domain/payrilla.ts
- Modify: src/lib/http/admin-session-cookie.ts, src/lib/supabase/server.ts, src/proxy/rate-limit.ts, src/proxy/security-headers.ts

- [ ] **Step 1: Implement the dependency-free page**

Replace app/checkout/page.tsx with:

~~~tsx
export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-white">
        Checkout is currently unavailable
      </h1>
      <p className="mt-4 text-gray-400">
        You can continue browsing and updating your cart.
      </p>
    </main>
  );
}
~~~

- [ ] **Step 2: Keep cart controls without provider behavior**

Remove next/script and the NoFraud loader from app/cart/page.tsx. Keep the button route to /checkout, label it Checkout unavailable, and remove claims that shipping/tax will be calculated.

- [ ] **Step 3: Delete every listed checkout/payment implementation**

Do not add replacement route handlers. Direct visits to removed subroutes should 404.

- [ ] **Step 4: Fix built-in environment reads**

Replace surviving env.NODE_ENV reads with process.env.NODE_ENV. Do not add NODE_ENV to either Zod schema.

- [ ] **Step 5: Verify and commit**

~~~powershell
npx jest --config jest.config.ts tests/unit/checkout-page.test.tsx --runInBand
rg -n -i "payrilla|nofraud|ziptax|NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED" app src --glob "!src/types/db/database.types.ts"
~~~

Expected: test PASS and scan empty.

Commit: git commit -m "refactor: retire checkout and payment flow"

---

## Task 3: Remove orders, transactions, financial analytics, and order-backed customer data

**Files:**

- Delete: app/order-status/[orderId]/page.tsx
- Delete: app/admin/orders/**, app/admin/transactions/**, app/admin/sales/page.tsx, app/admin/analytics/financials/page.tsx
- Delete: app/api/orders/**, app/api/account/orders/route.ts
- Delete: app/api/admin/orders/**, app/api/admin/transactions/**, app/api/admin/analytics/route.ts
- Delete: src/components/orders/**, src/components/admin/orders/**, src/components/admin/charts/SalesChart.tsx
- Delete: src/lib/orders/**, src/lib/payments/card-brand.ts
- Delete: src/repositories/order-access-tokens-repo.ts, order-events-repo.ts, orders-repo.ts, payment-transactions-repo.ts, payment-webhook-events-repo.ts
- Delete: src/services/evidence-service.ts, order-access-token-service.ts, orders-service.ts
- Modify: app/admin/dashboard/page.tsx
- Modify: app/admin/customers/page.tsx, app/admin/customers/[customerId]/page.tsx
- Modify: app/api/admin/customers/route.ts, app/api/admin/customers/[customerId]/route.ts
- Modify: src/components/account/AccountProfile.tsx, app/account/page.tsx
- Modify: src/components/admin/AdminSidebar.tsx, src/services/analytics-service.ts

- [ ] **Step 1: Remove all transaction route and navigation entry points**

Delete the listed pages/routes and remove their links/active states from AdminSidebar. Keep /admin/analytics/traffic.

- [ ] **Step 2: Reduce the dashboard**

Remove order/analytics fetches, revenue/order cards, recent orders, and SalesChart. Keep the shell and existing catalog/product information; do not invent metrics.

- [ ] **Step 3: Preserve profile-only customer administration**

Make both customer APIs query profiles only. Remove guest synthesis, payment method, spend, payment count, and orders. Update list/detail UI and search to use only returned profile fields.

- [ ] **Step 4: Remove account order history**

Remove order types, fetch/state, tracking display, and order-access copy from AccountProfile. Change account page copy to Access your profile and account settings.

- [ ] **Step 5: Delete orphaned implementations and prune analytics**

Delete the listed repositories/services/components. Keep only pageview/traffic operations in analytics-service.ts used by /api/analytics/track and /admin/analytics/traffic.

- [ ] **Step 6: Verify and commit**

~~~powershell
rg -n -i "orders-repo|payment-transactions|payment-webhook|order-access|order-status|admin/transactions|admin/orders|primaryPaymentMethod|totalSpend|paymentCount" app src --glob "!src/types/db/database.types.ts"
npx tsc --noEmit --pretty false 2>&1 | Select-String "orders|transaction|payment|analytics|customer"
~~~

Expected: first scan empty; second has no errors from this slice.

Commit: git commit -m "refactor: remove order and transaction surfaces"

---

## Task 4: Remove fulfillment, provider address validation, and transaction-backed tax

**Files:**

- Delete: app/admin/pickups/page.tsx, app/admin/shipping/page.tsx
- Delete: app/admin/settings/shipping/page.tsx, app/admin/settings/taxes/page.tsx
- Delete: app/api/account/shipping/route.ts, app/api/account/addresses/**
- Delete: app/api/admin/shipping/**, app/api/admin/tax-settings/route.ts
- Delete: app/api/admin/nexus/sales-log/route.ts, app/api/maps/validate/route.ts, app/api/webhooks/shippo/route.ts
- Delete: src/components/admin/shipping/**, src/components/admin/settings/TaxSettingsPanel.tsx
- Delete: src/components/shared/AddressInput.tsx, src/components/shared/AddressSuggestionModal.tsx
- Delete: src/config/constants/shipping.ts, src/config/pickup.ts, src/lib/shippo/**
- Delete: src/repositories/addresses-repo.ts, shipping-carriers-repo.ts, shipping-defaults-repo.ts, shipping-origins-repo.ts, shipping-repo.ts, tax-settings-repo.ts
- Delete: src/services/here-maps-service.ts, refund-notification-service.ts, shipping-carriers-service.ts, shipping-defaults-service.ts, shipping-label-service.ts, shipping-service.ts
- Delete: src/types/domain/shipping.ts
- Modify: src/components/account/AccountProfile.tsx, src/components/admin/AdminSidebar.tsx
- Modify: src/repositories/nexus-repo.ts, src/services/nexus-service.ts
- Modify: src/components/admin/nexus/NexusTrackerClient.tsx, StateDetailModal.tsx
- Modify: src/types/domain/nexus.ts, app/api/admin/nexus/summary/route.ts

- [ ] **Step 1: Delete fulfillment/address entry points and implementations**

Delete every listed shipping, pickup, tracking, label, rate, carrier, account-address, Shippo, and HERE file. Remove associated sidebar and AccountProfile UI. No disabled manual-fulfillment control remains.

- [ ] **Step 2: Remove checkout-only tax settings**

Delete the tax settings page/API/panel/repository and its sidebar link.

- [ ] **Step 3: Keep nexus manual configuration only**

Retain state registration and home-office/nexus-type methods. Remove order reads, sales logs, taxable sales, transaction counts, collected-tax aggregation, and corresponding UI/types. Keep app/api/maps/us-states/route.ts because it serves local map data and does not call HERE.

- [ ] **Step 4: Verify and commit**

~~~powershell
rg -n -i "shippo|here[_ -]?maps?|shipping-label|shipping-carriers|shipping-defaults|tracking_number|tax-settings|taxable_sales|transaction_count|tax_collected" app src --glob "!src/types/db/database.types.ts"
npx tsc --noEmit --pretty false 2>&1 | Select-String "shipping|pickup|nexus|tax"
~~~

Expected: scans show no retired flow and no errors in retained nexus configuration.

Commit: git commit -m "refactor: remove fulfillment and transaction tax flows"

---

## Task 5: Remove AWS and custom email flows

**Files:**

- Delete: app/api/contact/route.ts, app/api/email/**, app/email/confirm/page.tsx
- Delete: src/components/contact/ContactForm.tsx
- Delete: src/config/constants/contact.ts
- Delete: src/lib/email/**
- Delete: src/repositories/contact-messages-repo.ts
- Delete: src/repositories/email-subscriber-repo.ts, email-subscription-token-repo.ts
- Delete: src/services/contact-attachment-service.ts
- Delete: src/services/admin-order-email-service.ts, chat-email-service.ts, email-subscription-service.ts, order-completion-email-service.ts, order-email-service.ts
- Delete: src/types/domain/email.ts, src/config/constants/email.ts
- Modify: app/contact/page.tsx, app/api/account/password/route.ts, src/components/shell/Footer.tsx
- Modify: src/services/auth-service.ts, src/services/chat-service.ts
- Modify: src/components/account/AccountProfile.tsx, app/api/account/notifications/route.ts
- Modify: app/admin/profile/page.tsx, app/api/admin/profile/route.ts, src/lib/validation/admin.ts, src/repositories/profile-repo.ts
- Modify: src/services/admin-notification-service.ts
- Modify: src/components/admin/AdminNotificationCenter.tsx, AdminNotificationsDrawer.tsx, app/admin/notifications/page.tsx

- [ ] **Step 1: Remove public submission surfaces**

Keep app/contact/page.tsx as static contact information. Delete the contact form/API and newsletter subscribe/confirm UI/routes. Remove newsletter request state and success claims from Footer.

- [ ] **Step 2: Preserve Supabase Auth while removing custom mail**

Keep the Supabase password update and remove only sendEmail from the account password route. Remove automatic email_subscribers writes from auth-service.ts without changing sign-up, OAuth, verification, OTP, or reset logic.

- [ ] **Step 3: Preserve chat and in-app chat notifications**

Remove ChatEmailService from chat-service.ts. Remove customer chat-email preference UI/API. Keep the admin chat-notification preference and in-app notifications; remove admin_order_notifications_enabled and order_placed branches from profile, validation, repository projection, notification service, center, drawer, and page.

- [ ] **Step 4: Delete the mail implementation tree**

Delete every listed contact helper, template, transport, repository, service, type, and constant. Add no transport replacement.

- [ ] **Step 5: Verify and commit**

~~~powershell
rg -n -i "@aws-sdk|nodemailer|SES_|AWS_REGION|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|SUPPORT_INBOX_EMAIL|sendEmail|email_subscribers|admin_order_notifications" app src --glob "!src/types/db/database.types.ts"
npx tsc --noEmit --pretty false 2>&1 | Select-String "email|mailer|notification|contact"
~~~

Expected: first scan empty; Supabase Auth routes still exist.

Commit: git commit -m "refactor: remove custom email delivery"

---

## Task 6: Remove the existing Lightspeed implementation

**Files:**

- Delete: app/admin/settings/lightspeed/page.tsx, app/api/admin/lightspeed/**, app/api/webhooks/lightspeed/route.ts
- Delete: src/components/admin/inventory/SyncProductPreviewModal.tsx, src/components/admin/settings/LightspeedSettingsPanel.tsx
- Delete: src/config/constants/lightspeed.ts, src/lib/lightspeed/**
- Delete: src/repositories/deleted-product-recovery-repo.ts, lightspeed-links-repo.ts, lightspeed-settings-repo.ts, lightspeed-webhook-events-repo.ts
- Delete: every src/services/lightspeed-*.ts
- Modify: app/admin/inventory/client.tsx, create/actions.ts, [id]/edit/actions.ts
- Modify: app/api/admin/products/route.ts, app/api/admin/products/[id]/route.ts
- Modify: src/lib/validation/admin.ts, src/lib/validation/product.ts
- Modify: src/repositories/product-repo.ts, src/services/product-service.ts, src/components/admin/AdminSidebar.tsx
- Delete: tests/unit/lightspeed-*.test.ts, tests/unit/deleted-product-recovery-repo.test.ts, tests/unit/repair-lightspeed-sku-conflicts.test.ts
- Delete: tests/unit/debug-sku-conflict.test.ts, tests/unit/list-products-without-images.test.ts
- Modify: tests/unit/csrf.test.ts, product-archive-api.test.ts, product-archive-service.test.ts

- [ ] **Step 1: Remove UI, routes, and navigation**

Delete settings/sync/import/debug/webhook surfaces. Remove sync buttons, modal state, progress subscriptions, provider badges, and settings navigation.

- [ ] **Step 2: Restore direct Supabase catalog writes**

Remove outbound sync, reconciliation, SKU reservation, link creation, and recovery calls from product create/edit/API paths. Keep existing ProductRepository/ProductService Supabase create, update, archive, restore, stock, image, and tag behavior. Remove provider-only validation fields.

- [ ] **Step 3: Delete implementation and obsolete tests**

Delete all listed provider libraries/repositories/services/tests. Remove provider mocks/assertions from retained product and CSRF tests.

- [ ] **Step 4: Verify and commit**

~~~powershell
npx jest --config jest.config.ts tests/unit/product-service.test.ts tests/unit/product-archive-api.test.ts tests/unit/product-archive-service.test.ts tests/unit/product-archive-repo.test.ts --runInBand
rg -n -i "lightspeed" app src tests --glob "!src/config/env.ts" --glob "!src/types/db/database.types.ts"
~~~

Expected: retained product tests PASS and scan empty.

Commit: git commit -m "refactor: remove legacy Lightspeed integration"

---

## Task 7: Clean environment fixtures, security, CI, framework config, and docs

**Files:**

- Modify: src/config/env.ts, src/config/client-env.ts
- Delete: src/config/ci-env.ts
- Modify: src/config/security.ts, next.config.ts
- Modify: jest.config.ts, jest.integration.config.ts
- Modify: .github/workflows/production.yml, .github/workflows/staging.yml
- Modify: README.md
- Delete: the eight provider-bearing docs/legacy/*.md files reported by the guard
- Delete: all pre-removal Lightspeed files under docs/superpowers/plans and docs/superpowers/specs
- Finalize: tests/unit/retired-integrations-structure.test.ts

- [ ] **Step 1: Match schemas and Jest fixtures to the approved ten**

client-env.ts has the three approved NEXT_PUBLIC values. env.ts and each Jest default map have the ten approved values only. NODE_ENV is not in the schemas/maps.

- [ ] **Step 2: Remove stale security/framework allowances**

Remove retired webhook bypasses, provider CSP origins, NoFraud/PayRilla/Shippo/Vercel telemetry hosts, and the Lightspeed CDN image host. Keep only sources required by surviving app behavior.

- [ ] **Step 3: Clean CI while preserving deployment auth**

Remove Shippo, order-token, Google OAuth, AWS/SES, HERE, PayRilla, NoFraud, ZipTax, and guest-checkout values from both workflows. Keep Vercel CLI auth because it deploys the app, the ten approved application values, and LOCAL_SUPABASE_DB_URL used only for migration validation.

- [ ] **Step 4: Remove stale docs and update README**

Delete provider-bearing legacy docs and old Lightspeed plans/specs. Rewrite README env/setup/features to reflect only surviving behavior. Preserve the approved removal design and this plan as audit records.

- [ ] **Step 5: Make the guard green and commit**

~~~powershell
npx jest --config jest.config.ts tests/unit/retired-integrations-structure.test.ts --runInBand
~~~

Expected: PASS. Do not add a live-code exception to make it pass.

Commit: git commit -m "chore: remove retired integration configuration"

---

## Task 8: Audit and remove unused packages

**Files:**

- Modify: package.json, package-lock.json

- [ ] **Step 1: Audit exact module and CLI consumers**

For each direct dependency/devDependency, search exact import(), require(), and from module specifiers in app, src, tests, and configs. Separately map package.json scripts to CLI packages. Do not install an audit tool.

- [ ] **Step 2: Remove confirmed unused production packages**

~~~powershell
npm uninstall @aws-sdk/client-ses @aws-sdk/client-sesv2 @aws-sdk/client-ssm nodemailer shippo dayjs exceljs flags nanoid picocolors pino pino-pretty uuid
~~~

- [ ] **Step 3: Remove confirmed unused development packages**

~~~powershell
npm uninstall -D @types/nodemailer @redocly/cli @types/pg baseline-browser-mapping concurrently globby pg prettier-plugin-tailwindcss ts-jest tsup whatwg-url
~~~

Keep @vnedyalk0v/react19-simple-maps because Task 4 retains the local nexus map. Keep framework/config/CLI packages with a direct config or npm-script consumer.

- [ ] **Step 4: Verify and commit**

~~~powershell
npm run typecheck
npm run test:jest:unit
npm run lint
~~~

Expected: all exit 0. If a removed package is required by a configured command, restore only that package and record its exact consumer.

Commit: git commit -m "chore: remove unused dependencies"

---

## Task 9: Final repository verification

**Files:** Verify the entire repository only.

- [ ] **Step 1: Confirm immutable exceptions**

~~~powershell
git diff 1bff7223..HEAD -- supabase/migrations src/types/db/database.types.ts
~~~

Expected: no output.

- [ ] **Step 2: Run the quality gate**

~~~powershell
npm run typecheck
npm run test:jest
npm run lint
npm run build
~~~

Expected: all exit 0. If build reports fetch failed, first verify local Supabase at 127.0.0.1:54321 before editing route/cache code.

- [ ] **Step 3: Run structural and environment scans**

~~~powershell
npx jest --config jest.config.ts tests/unit/retired-integrations-structure.test.ts --runInBand
rg -n "process\.env\.|env\." app src --glob "!src/types/db/database.types.ts"
~~~

Expected: guard PASS; every app env read maps to the approved schema or direct process.env.NODE_ENV.

- [ ] **Step 4: Inspect final diff and history**

~~~powershell
git diff --check 1bff7223..HEAD
git status --short
git log --oneline 1bff7223..HEAD
~~~

Expected: no whitespace errors, clean status, and bounded commits for checkout, transactions, fulfillment/tax, email, Lightspeed, configuration, and dependencies.

- [ ] **Step 5: Report verified outcomes**

Report four quality-gate exit codes, guard result, final direct dependency count, static /checkout behavior, and confirmation that migrations/generated DB types were untouched. Do not describe local evidence as deployment proof.
