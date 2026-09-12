# Retired Integrations Removal Design

## Goal

Make the `jacob-dev` branch run, typecheck, test, lint, and build using only the approved environment variables by completely removing obsolete vendor integrations and the application features that depend on them.

The approved environment surface is:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_DB_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
ADMIN_SESSION_SECRET
LIGHTSPEED_ACCESS_TOKEN
LIGHTSPEED_DOMAIN_PREFIX
```

`NODE_ENV` is provided by Node.js and Next.js. Code that needs it will read `process.env.NODE_ENV` directly rather than adding it to the application environment schema.

## Scope

Remove all live application implementations and references for:

- Stripe
- PayRilla
- the existing Lightspeed integration
- AWS SES and its AWS Systems Manager credential storage
- NoFraud
- HERE Maps
- Shippo
- Vercel Analytics, Speed Insights, and telemetry
- ZipTax

This includes provider-specific UI, API routes, services, repositories, types, constants, helpers, webhooks, configuration, security allowlists, CI variables, tests, scripts, current documentation, and direct package dependencies.

The two approved Lightspeed environment variables remain reserved for a future integration. No current Lightspeed behavior will consume them.

## Explicit Exceptions

### Historical migrations

Existing Supabase migration files are immutable and remain unchanged, including migrations whose filenames or SQL contain retired provider names. Removing or rewriting applied migrations would corrupt migration history and is outside this cleanup.

### Generated database types

`src/types/db/database.types.ts` continues to reflect the deployed schema, including historical provider-specific columns and tables. Those names remain until a future database cleanup is implemented with new forward-only migrations and the types are regenerated.

### Stored database data

Existing order, payment, shipping, tax, and provider data remains in the database. This change removes application access and behavior; it does not delete production data.

### Supabase authentication email

Supabase-managed verification, OTP, and password-reset flows remain. They do not use the application AWS SES mailer and are required for authentication.

## Surviving Product Surface

The storefront keeps:

- homepage and informational/legal pages
- catalog browsing, search, filters, and product detail pages
- client-side cart behavior needed to add, remove, and change item quantities
- login, registration, OTP, password reset, and account profile behavior backed by Supabase Auth
- a visible `/checkout` route that clearly states checkout is unavailable

The admin keeps:

- authentication and authorization
- dashboard framing without order, payment, shipping, tax, or provider metrics
- catalog and inventory management backed directly by Supabase
- customer profile management that does not expose orders, payments, or provider identifiers
- admin profile and store-access controls that do not rely on retired providers
- nexus configuration only where it is independent of order history, ZipTax, and retired payment data

## Removed Product Surface

### Checkout and payment

The executable checkout flow is removed. `/checkout` renders a static unavailable state and performs no initialization or provider calls. Remove payment fields, tokenization, wallet setup, payment submission, fraud fingerprinting, tax calculation, shipping-rate lookup, order creation, processing, success, and payment webhooks.

Checkout subroutes and APIs that exist only to execute or observe the retired flow are deleted. Direct navigation to removed subroutes may use the existing Next.js not-found behavior; only `/checkout` is guaranteed to remain visible.

### Orders and transactions

Remove customer order history, order-status access, admin order/transaction listings, transaction detail, refunds, payment-event history, checkout logs, evidence views, and order email controls. Repositories and services that exist solely for those surfaces are removed after all callers are eliminated.

Database tables and historical rows remain under the database exceptions above.

### Fulfillment

Remove shipping and pickup administration, manual fulfillment, manual tracking updates, label creation, rate lookup, label printing, carrier configuration, shipping defaults, and Shippo webhooks. No replacement or disabled fulfillment control remains.

### Application email

Remove the AWS SES mailer, AWS SDK credential usage, order emails, refund emails, chat emails, contact-form delivery, newsletter confirmation delivery, and admin resend-email behavior. Remove UI controls whose only purpose is configuring or triggering these messages.

Contact and newsletter presentation may remain only when they do not claim to submit or deliver email. Otherwise the interactive forms are removed.

### Existing Lightspeed integration

Remove Lightspeed settings pages, sync/import/debug routes, webhook routes, clients, mappings, reconciliation, recovery, propagation, SKU synchronization, repositories, scripts, navigation entries, UI controls, tests, remote image configuration, and provider-specific branches in shared product/order code.

Local catalog and inventory operations must continue to use their existing Supabase paths. No compatibility facade, stub client, or placeholder abstraction will be added for the future Lightspeed rebuild.

### Analytics and telemetry

Remove Vercel Analytics and Speed Insights components, packages, configuration, and CSP allowances if any survive. Remove framework telemetry customization if present.

Custom first-party analytics is not automatically removed merely because it is analytics. It remains only if it has no dependency on orders or any retired vendor and does not require an unapproved environment variable.

## Removal Method

Work from callers toward implementations:

1. Add structural regression tests that identify forbidden live-code references and assert the checkout-unavailable behavior.
2. Remove navigation and UI entry points for retired features.
3. Remove API routes and shared call sites.
4. Delete now-unreachable services, repositories, types, constants, scripts, and tests.
5. Remove configuration, CI variables, CSP and image-host allowances, documentation, and packages after import scans confirm they are unused.

This order prevents deleting a low-level implementation while leaving broken callers behind. No vendor-neutral abstraction is created for functionality that no longer exists.

## Forbidden-Reference Guard

A focused test will scan live application and configuration paths for retired provider identifiers. It will exclude:

- `supabase/migrations/**`
- `src/types/db/database.types.ts`
- package lock metadata only while a package is still being removed in the same task

The guard covers case-insensitive identifiers and known package/import names for Stripe, PayRilla, Lightspeed, AWS SES/SSM mail infrastructure, NoFraud, HERE Maps, Shippo, Vercel analytics/telemetry, and ZipTax.

Provider-specific documentation is deleted or rewritten even when it currently lives under `docs/legacy/**`. Historical migrations and generated database types are the only reference-scan exceptions.

Generic words such as `shipping`, `email`, `order`, `transaction`, `map`, or `analytics` are not globally forbidden because they produce false positives and can describe surviving domain concepts. Provider-specific terms, imports, routes, and environment variables are forbidden.

## Package Audit

After source removal, audit every direct dependency and development dependency in `package.json` against:

- static `import`, dynamic `import()`, and `require()` usage
- configuration files and executable scripts
- test setup and test-only imports
- framework-required packages and command-line binaries referenced by npm scripts
- transitive requirements that should not be declared directly

Remove only dependencies with no surviving direct use. The expected vendor removals include the three AWS SDK clients, `nodemailer`, its type package, and `shippo`. Stripe and Vercel analytics packages are already absent and require verification rather than package changes.

Use the existing package manager to update both `package.json` and `package-lock.json`. Do not add a dependency-audit package for this one-time audit.

## Error Handling

The checkout unavailable page is static and has no provider-dependent failure path. Removed API routes use normal Next.js 404 behavior instead of compatibility responses.

Surviving shared workflows must not swallow missing-provider errors because no provider call should remain. A missing approved environment variable continues to fail through the existing Zod schemas.

## Testing Strategy

Use test-driven removal:

1. Add the forbidden-reference test and verify that it fails against the current branch.
2. Add a checkout page test and verify that it fails until the unavailable page replaces the executable checkout.
3. Remove one integration cluster at a time and rerun the focused guards.
4. Delete obsolete provider tests only when their corresponding production surface is deleted.
5. Run the full repository verification after all clusters are removed.

The final verification sequence is:

```powershell
npm run typecheck
npm run test:jest
npm run lint
npm run build
```

Also run a final case-insensitive reference scan using the same exclusions as the structural test and inspect `git diff --check` plus `git status --short`.

## Success Criteria

- The application environment schemas expose only the ten approved application variables.
- `/checkout` renders a clear unavailable state without loading or calling a retired integration.
- No live order, transaction, payment, refund, shipping, pickup, fulfillment, custom-email, provider-tax, or provider-address-validation flow remains.
- The existing Lightspeed implementation is completely absent while its two reserved environment variables remain.
- Provider-specific CI variables, CSP entries, image hosts, documentation, scripts, tests, and dependencies are removed outside the explicit exceptions.
- Every remaining direct package dependency has a confirmed source, configuration, script, or test consumer.
- Typecheck, Jest suites, lint, and production build complete successfully.
