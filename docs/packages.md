# Shared packages workspace plan

> Create `apps/packages` with the first gateway operation shared by Electron main and the gateway. Until then this is a file plan, not a workspace to scaffold speculatively.

## Responsibility and boundaries

This workspace contains the gateway oRPC HTTP contract: route metadata, Zod input/output schemas, and inferred types. Electron main uses it for a typed client; Nest controllers implement it. It contains no handlers, Nest decorators, HTTP client, Electron IPC bridge, runtime state, business rules, provider code, or vault parser. Desktop IPC procedures stay in `apps/desktop`.

## Proposed tree

```text
apps/packages/
  package.json                     # Contract exports and oRPC/Zod dependencies
  tsconfig.json                    # Declaration/build settings
  src/
    gateway.ts                     # One gateway HTTP contract and schemas
```

Start `gateway.ts` with the first generation procedure. Add decision, memory, and sync procedures with their routes and schemas alongside implementation slices. Export it as the workspace's `./gateway` entry; do not maintain a second route or DTO definition in Nest.

## Contract evolution

1. **Manual generation:** define request/response schemas with text, optional selected media references or content, tool requests, error shape, and actual usage. Keep provider-specific raw responses inside the gateway.
2. **Jev decision:** add compact state/question input and answer output with label, probability, confidence, usage, and optional cache metadata. Preserve numeric values as returned; the Engine applies its own thresholds.
3. **Memory and sync:** add scoped search hits and sync outcomes when those gateway features are implemented. A conflict identifies affected vault paths without exposing credentials or arbitrary filesystem paths.

Schema changes are made with a producer and consumer in the same vertical slice. Check malformed/missing fields at both process boundaries. Add a test only when it protects a real compatibility rule or edge case; do not mirror every schema field in trivial tests.

## Ownership checks

- Route paths and data shapes are declared here once; controller implementation and authentication stay in `apps/gateway`.
- Event rules, prompt assembly, permissions, and vault writes stay in `apps/desktop`.
- Cross-process payload validation stays here; no second DTO or route definition is maintained.
- A future VS Code adapter uses the same Engine and does not add agent state here.
