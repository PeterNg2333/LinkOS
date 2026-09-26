# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- A local NestJS gateway on Fastify groups Jev, Gemini, memory search, and Git sync into feature modules. Nest controllers own its HTTP routes.
- Electron separates main, preload, and renderer code. Next.js organizes renderer UI by feature. A future VS Code extension feeds the same Engine.
- Each device keeps a separate Markdown Git working tree. All memory, notes, tasks, and `SOUL.md` sync through the remote; raw captures and any runtime search list stay device-local.

## Next build session

- Scaffold the `pnpm` workspace, desktop app, and local gateway. Add `apps/contracts` when the first schema is shared.
- Make one manual request travel from Next.js through preload, the Engine, and the gateway to Gemini; show the result and usage in the UI.
- Check the loopback credential, gateway-only API keys, and Electron IPC boundary on that path.
- Then add capture, event rules, memory search, and Git sync as separate working slices.
- Settle the remaining behavior choices in [system design](<../system design.md>) as their slices begin.

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
- `apps/gateway`: `@nestjs/common`, `@nestjs/core`, and `@nestjs/platform-fastify` provide modules, controllers, routes, and DI on a loopback Fastify server. Reuse Zod schemas from `apps/contracts` with Nest's Standard Schema validation. `@typesafe-ai/sdk` calls Jev and `@google/genai` calls Gemini. `simple-git` runs scoped, serialized vault sync using the installed Git binary. `@orama/orama` builds a device-local Markdown search index; trial `@orama/tokenizers` for Chinese notes.
- `apps/gateway` later: `@nestjs/swagger` generates OpenAPI from controller routes and Zod schemas if a client needs it. Add an OpenAI client only when access is available; OpenRouter remains unverified. Nest provides DI, so do not add `tsyringe`. Add `neverthrow` only if explicit Result values simplify real error flows; confirm this is the intended package name.
- `apps/desktop`: `electron` runs main, preload, the Engine, capture, and vault writes. `next`, `react`, and `react-dom` build the static UI; `zustand` holds visible UI state, not Engine state. `tailwindcss` plus selected `shadcn/ui` components is the proposed UI pair; MUI is an alternative, not a second component system. `tesseract.js` is a local OCR trial with bundled language data. Electron main calls the gateway through native `fetch` and validates boundary data with Zod; the Next.js renderer uses preload IPC.
- `apps/contracts`: `zod` only. Export cross-process schemas and inferred types; no Nest decorators, clients, routes, state, or business logic.
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

- Use NestJS feature modules on Fastify for the local API. A controller owns each route; a service owns related work. Do not maintain a parallel oRPC router or a separate routes directory.
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
  electron/
    main/
      main.ts          # Windows and gateway lifecycle
      engine/           # Events, status, jobs, bounded agent runs
      capture/          # Screen, system status, OCR
      vault/            # Allowed Markdown reads and writes
      gateway/          # Local HTTP client
    preload/            # Narrow UI-to-Engine IPC
    audio/              # Optional MediaRecorder capture renderer
  src/
    app/                # Next.js routes and page composition
      layout.tsx
      page.tsx
    core/               # Shared UI, never business logic
      components/       # App shell and reusable UI
      helpers/          # Shared UI utilities
      stores/           # Global view state
      hooks/            # Shared React hooks
    features/           # Feature-owned components, hooks, stores
      activity/
      memory/
      tasks/
      settings/
apps/gateway/
  src/
    main.ts             # Nest bootstrap with Fastify, loopback only
    app.module.ts       # Imports feature modules
    ai/
      ai.module.ts
      ai.controller.ts  # Decide and generate routes
      ai.service.ts     # Model selection, usage, request flow
      model.adapter.ts  # Shared generation shape
      gemini.adapter.ts # Initial generative provider
      jev.client.ts     # Quick classification
    memory/
      memory.module.ts
      memory.controller.ts
      memory.service.ts # Local index and page/chunk search
    sync/
      sync.module.ts
      sync.controller.ts
      sync.service.ts   # Scoped Git queue and conflicts
apps/contracts/
  src/
    gateway.ts          # Shared Zod schemas and inferred types only
```

- `src/core` gains `components`, `stores`, `hooks`, or `helpers` only when code is genuinely shared across features. Feature-specific code stays inside its feature folder.
- Each Nest feature folder stays small: controller for transport, service for its work, module for wiring. Split files further when a real responsibility grows.

## Sources for provisional choices

- Jev JavaScript SDK: https://docs.typesafe.ai/sdk/javascript
- Google GenAI JavaScript SDK: https://ai.google.dev/gemini-api/docs/libraries
- Nest modules, Fastify adapter, and native Zod/OpenAPI integration: https://docs.nestjs.com/modules, https://docs.nestjs.com/techniques/performance, and https://docs.nestjs.com/openapi/introduction
- Next.js `src/app` convention: https://nextjs.org/docs/app/api-reference/file-conventions/src-folder
- LlamaIndex.TS deprecation: https://github.com/run-llama/LlamaIndexTS
- Orama local search: https://docs.orama.com/docs/orama-js/search
- Orama Chinese tokenization: https://docs.orama.com/docs/orama-js/text-analysis/stemming
