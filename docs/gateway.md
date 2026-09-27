# Gateway app plan

> Planned files, not an implemented app. [README](../README.md) owns the settled architecture. Nest controllers implement routes declared once in the shared oRPC contract.

## Responsibility and boundaries

The gateway is a **device-local**, loopback-only NestJS service on Fastify. Its controllers implement `apps/packages/src/gateway.ts` through oRPC and use Nest DI. It holds model and configured API credentials, calls Jev and Gemini, searches a device-local Markdown index, and serializes scoped Git sync. It does not capture devices, own agent status, schedule agent runs, decide which tools an agent may execute, or write Markdown as agent memory. The Engine supplies requests and owns vault edits.

Jev uses direct HTTP, consistent with the verified HTTP/Python examples and Playback's .NET direct-HTTP implementation. No JavaScript SDK is planned. Gemini is the only initial generative provider, initialized with `@google/genai` in explicit Vertex AI mode. Missing or ambiguous Vertex configuration fails closed; there is no Developer API fallback. A small internal generation adapter describes requests, responses, tool requests, and usage. Do not create an unused OpenAI adapter or provider registry.

## Proposed tree

```text
apps/gateway/
  package.json
  tsconfig.json                   # Gateway compiler/build settings
  src/
    main.ts                       # Fastify bootstrap, loopback bind, shutdown
    app.module.ts                 # Feature modules and oRPC Nest integration
    config.ts                     # Validate env, paths, Vertex mode/credentials
    local-auth.guard.ts           # Per-session desktop/gateway credential
    ai/
      ai.module.ts
      ai.controller.ts            # Implements decision/generation contract
      ai.service.ts               # Calls, errors, metered usage
      jev.client.ts               # Direct Jev HTTP and response validation
      model-adapter.ts            # Small generation shape
      gemini.adapter.ts           # Explicit Vertex AI initialization
    memory/
      memory.module.ts
      memory.controller.ts        # Implements search/refresh contract
      memory.service.ts           # Markdown page/chunk search
    sync/
      sync.module.ts
      sync.controller.ts          # Implements sync contract
      sync.service.ts             # One serialized, scoped Git operation
  tests/
    ai.http.test.ts               # Validation/auth and failure shapes
    jev.client.test.ts            # HTTP mapping, usage, errors, cache metadata
    jev.live.test.ts              # Explicit opt-in credentialed smoke test
    memory.search.test.ts         # Recent window and changed pages
    sync.integration.test.ts      # Separate worktrees, scope, conflicts
```

Keep the normal Nest module/controller/service set together per feature. Add an API connector folder only when a real configured API-read integration exists. The live test is opt-in and excluded from offline tests; its key comes from local environment, never fixtures or snapshots.

## Development slices

1. **Local gateway and first model path.** Verify the selected oRPC/Nest/Fastify and ESM versions in a build spike. Bootstrap on loopback, receive a generated credential from Electron, require it on every contract route, and implement the generation contract in a Nest controller. The desktop uses a typed oRPC OpenAPILink client. Return normalized text/tool requests, errors, and actual usage. Verify missing Vertex configuration is rejected before any model call.
2. **Jev decision client.** Add a direct-HTTP Jev client and decision route. Pass the configured key; preserve label, probability, confidence, usage, and provider cache metadata in a stable response. Handle 401, timeout, malformed response, and rate limits distinctly. Verify the client against HTTP fixtures and an opt-in live smoke test.
3. **Device-local memory search.** Parse Markdown pages and build a small in-memory page/chunk list on startup. Search at most 30 recent daily notes plus recent weekly/monthly summaries, initially six months; use up to 2,000 characters per daily note for sizing. Search older archives on demand. Refresh changed pages after Engine writes or Git sync. Return path, section, and excerpt; do not create a central database.
4. **Scoped Git sync.** Serialize requests for one vault working tree. Stage only vault-owned Markdown paths including `SOUL.md`, memory, notes, and tasks; never stage approved read-only folders or raw captures. Commit, fetch/integrate, and push without force. Return explicit conflicts and stop automation on conflict. Verify with two temporary working trees and a conflicting edit.
5. **Configured API reads.** Add each connector only with a concrete approved API and scope. Connector credentials stay in the gateway; agent tool permission and orchestration stay in the Engine.

## Proposed HTTP boundary

The exact HTTP paths, inputs, outputs, and errors are declared once in `apps/packages/src/gateway.ts`. Nest controllers implement the corresponding procedures with `@orpc/nest`; they do not repeat paths or DTOs. Initial operations cover `decision`, `generation`, `memory search/refresh`, and `vault sync`. Validate upstream model data before returning it. The gateway accepts a configured vault root, never an arbitrary caller-supplied Git path.

Current oRPC Nest integration supports Fastify, but its v2 documentation uses beta packages and notes ESM requirements for Nest versions below v12. Lock compatible versions and verify auth, validation, errors, and the packaged desktop-to-gateway request before expanding beyond the first route.

## Jev evidence and configuration

The user reports that, after updating `.env`, `pnpm.cmd test:jev-live` passed: `GET /v1/models` succeeded; the sample term `spectrogram` returned `high` with probability `0.84`, confidence `0.53`, and a usage object; a repeated query hit the cache. The prior 401 is resolved. This validates credentials and the direct-HTTP path, but this currently unscaffolded app has no test script yet. When scaffolding, reproduce an opt-in live test without asserting those sample probability values as a fixed API contract.

`JEV_API_KEY` is explicit. Vertex AI setup must specify Google project/location and an unambiguous supported auth mode; `VERTEX_AI_AUTH_MODE=unconfigured` remains an intentional failure state. Keep credentials out of Electron renderer output and logs.

## First checkpoint

The desktop manual request crosses authenticated loopback HTTP and receives a validated Gemini response with measured usage. Invalid auth, invalid body, and missing Vertex configuration have stable errors. The Jev live smoke test can then confirm a model listing, one classification, and provider cache behavior.
