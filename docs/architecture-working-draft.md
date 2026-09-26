# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- A local TypeScript gateway handles Jev, Gemini through a model adapter, configured API clients, memory search, and scoped Git sync.
- Next.js is the desktop UI. A future VS Code extension feeds the same Engine.
- Each device keeps a separate Markdown Git working tree. All memory, notes, tasks, and `SOUL.md` sync through the remote; raw captures and any runtime search list stay device-local.

## Candidate flow

1. Electron starts the local gateway and keeps API keys out of the Next.js UI.
2. A timer captures a screenshot and system status. A small image comparison and trigger rules decide whether to run local OCR or send compact state to Jev.
3. Jev answers batched intent, image-analysis, and agent-run questions. The Engine applies confidence, cooldown, and budget rules before a Gemini call.
4. The Engine assembles `SOUL.md`, short/today/long memory, and selected daily or summary chunks. Gemini may request approved tools; the Engine owns the tool loop.
5. The Engine writes memory, notes, and task changes to the vault; only the user edits `SOUL.md`. It publishes job status to the UI.
6. The gateway batches vault changes, then serializes Git sync: stage vault-owned paths, commit, fetch and integrate remote commits, then push. Conflicts pause sync.
7. Incoming Markdown changes refresh the local search list.

## Candidate packages by folder

- Root: `pnpm` workspace and TypeScript. Keep aliases inside each app; use workspace imports between apps.
- `apps/gateway`: `fastify` hosts the loopback API. `@orpc/server` exposes one typed RPC router; Zod schemas come from `apps/contracts`. `@typesafe-ai/sdk` calls Jev and `@google/genai` calls Gemini. `simple-git` runs the scoped, serialized vault sync using the installed Git binary. `@orama/orama` indexes a rebuildable, device-local Markdown page/chunk list and serves full-text search; trial `@orama/tokenizers` for Chinese notes.
- `apps/gateway` later: `@orpc/openapi` and `@orpc/zod` generate OpenAPI from the same router if another client needs REST docs. Add an OpenAI client only when OpenAI access is available; OpenRouter remains an unverified option. `tsyringe` and `reflect-metadata` only if manual constructor injection becomes unwieldy. `neverthrow` only if explicit Result values simplify several real error flows; confirm this is the intended package name.
- `apps/desktop`: `electron` runs the Engine, capture, vault writes, and preload IPC. `next`, `react`, and `react-dom` build the static UI; `zustand` holds visible UI state, not Engine state. `tailwindcss` plus selected `shadcn/ui` components is the proposed UI pair; choose MUI instead if its ready-made component set is preferred, without maintaining two component systems. `tesseract.js` is a local OCR trial with bundled language data. `@orpc/client` calls the gateway from Electron main, not directly from the renderer. Zod validates device settings and any boundary payloads.
- `apps/contracts`: `zod` only. Export cross-process schemas and inferred types; no clients, routes, state, or business logic. The desktop may import the gateway router type with `import type` for oRPC inference; this adds no gateway runtime to the desktop.
- Platform APIs: Electron `desktopCapturer` and `nativeImage`, renderer `MediaRecorder`, Node timers and file APIs. Add an MCP client only for an approved MCP integration.
- Jev and Gemini both have official TypeScript SDKs. Pass `JEV_API_KEY` and `GOOGLE_AI_STUDIO_API_KEY` explicitly. Google project/location settings matter only if access later moves to Vertex AI.
- LlamaIndex.TS has been deprecated by its maintainers. Keep search in one process, the local gateway; do not install a second index in Electron. Add vector embeddings only if real retrieval examples justify hybrid search.

## Gateway operations

- `decide(state, questions)` returns Jev answers and token usage.
- `generate(context, media, tools)` calls the selected model adapter and returns text or tool requests and usage. Gemini is the only initial implementation; Jev remains a separate decision client.
- `searchMemory(query, scope)` returns page paths, sections, and matched chunks.
- `syncVault()` returns sync status or conflicts.

## Boundary questions

- Should the remote be a bare repository used only for Git sync, or should Markdown also be visible as files there?
- Which remote API clients need gateway-held credentials?

## Decision criteria

- Prioritize development speed and easy debugging; start with Fastify for the local TypeScript API.
- Keep one internal `ModelAdapter` shape for the generation request, response, tool requests, and usage. The gateway maps it to Gemini now; choose a Gemini model ID per job without creating an adapter per model. Add an OpenAI implementation and provider selection only when access is available; keep the Engine's tool loop provider-independent.
- The Engine owns vault writes; the gateway owns the Git sync queue. Git is a fixed internal operation, not an arbitrary agent command tool.
- Coalesce repeated events and cap each agent run by time, model calls, and tool calls.
- The Engine owns approved local and MCP tools. Markdown skills provide instructions, not permissions. The gateway owns remote API connectors.
- Bind the gateway to loopback and require a per-session credential; the UI reaches the Engine through a narrow Electron preload API.
- Search at most 30 daily notes plus recent weekly/monthly summaries; start with six months of summaries. At up to 2,000 characters per daily note, build Orama's small in-memory index from Markdown on startup and refresh changed pages after vault writes or Git sync. Persist the index only if startup measurements justify it.
- Use one shared branch for the vault initially. Never force-push or auto-resolve conflicting memory edits.
- Share schemas only where processes exchange data; validate requests at that boundary.

## Candidate folders

```text
apps/desktop/
  app/                 # Next.js UI and Zustand view state
  electron/
    main.ts            # Starts the Engine and gateway
    engine.ts          # Event rules, status, jobs, bounded agent loop
    capture.ts         # Screen, status, optional audio, OCR
    vault.ts           # Markdown reads and allowed writes
    gateway-client.ts  # oRPC client in Electron main
    preload.ts         # Narrow UI-to-Engine IPC
apps/gateway/
  src/
    server.ts          # Fastify loopback listener and RPC adapter
    rpc.ts             # Typed gateway operations and router type
    models.ts          # Shared generation shape and Gemini adapter
    jev.ts             # Quick classification client
    memory-search.ts   # Local Orama index, page/chunk lookup
    git-sync.ts        # Scoped Git sync queue and conflicts
apps/contracts/
  src/
    gateway.ts         # Zod request/response schemas and inferred types only
```

## Sources for provisional choices

- Jev JavaScript SDK: https://docs.typesafe.ai/sdk/javascript
- Google GenAI JavaScript SDK: https://ai.google.dev/gemini-api/docs/libraries
- oRPC Fastify adapter and type-only client import: https://orpc.dev/docs/adapters/fastify and https://orpc.dev/docs/getting-started
- LlamaIndex.TS deprecation: https://github.com/run-llama/LlamaIndexTS
- Orama local search: https://docs.orama.com/docs/orama-js/search
- Orama Chinese tokenization: https://docs.orama.com/docs/orama-js/text-analysis/stemming
