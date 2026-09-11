# Next.js `src` Layout Design

## Goal

Adopt Next.js's supported `src` layout without changing routes or runtime behavior:

- move `app/` to `src/app/`
- move `proxy.ts` to `src/proxy.ts`

## Scope

The move is structural only. Every page, layout, route handler, and proxy matcher keeps its existing URL and behavior. Existing `@/` imports already resolve to `src/` and should remain unchanged.

Path-sensitive relative imports in tests and documentation will be updated to the new locations. Next.js generated route types will be regenerated after the move.

Unrelated working-tree changes to `.gitignore`, `package.json`, `.npmrc`, `mise.toml`, and `jest.setup.ts` will be preserved and excluded from this change unless verification proves one is directly required.

## Implementation

1. Add a structural regression test requiring `src/app`, `src/proxy.ts`, and the absence of the old root locations.
2. Move the tracked `app/` tree to `src/app/` and `proxy.ts` to `src/proxy.ts` with Git history preserved.
3. Update relative route imports in tests and root-proxy references in documentation.
4. Regenerate Next.js route types through Doppler.
5. Run the structural test, unit tests, typecheck, targeted lint, and production build.

## Success Criteria

- Next.js discovers all existing routes from `src/app/`.
- Next.js discovers the proxy entry at `src/proxy.ts`.
- No tracked root `app/` directory or root `proxy.ts` remains.
- Route URLs and proxy behavior remain unchanged.
- Tests, typecheck, and production build pass.
