# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- A local NestJS gateway on Fastify groups Jev, Gemini, memory search, and Git sync into feature modules. Nest controllers implement routes from the shared oRPC HTTP contract.
- Electron separates main, preload, and renderer code. Next.js organizes renderer UI by feature. A future VS Code extension feeds the same Engine.
- Each device keeps a separate Markdown Git working tree. All memory, notes, tasks, and `SOUL.md` sync through the remote; raw captures and any runtime search list stay device-local.

## Next build session

- Scaffold the `pnpm` workspace, desktop app, and local gateway. Add `apps/packages` when the first schema is shared.
- Make one manual request travel from Next.js through preload, the Engine, and the gateway to Gemini; show the result and usage in the UI.
- Check the loopback credential, gateway-only model credentials, explicit Vertex AI endpoint, and Electron IPC boundary on that path.
- Then add capture, event rules, memory search, and Git sync as separate working slices.
- Settle the remaining behavior choices in [system design](<../system design.md>) as their slices begin.

## Candidate flow

1. Electron starts the local gateway and keeps model credentials out of the Next.js UI.
2. A timer captures a screenshot and system status. A small image comparison and trigger rules decide whether to run local OCR or send compact state to Jev.
3. Jev answers batched intent, image-analysis, and agent-run questions. The Engine applies confidence, cooldown, and budget rules before a Gemini call.
4. The Engine assembles `SOUL.md`, short/today/long memory, and selected daily or summary chunks. Gemini may request approved tools; the Engine owns the tool loop.
5. The Engine writes memory, notes, and task changes to the vault; only the user edits `SOUL.md`. It publishes job status to the UI.
6. The gateway batches vault changes, then serializes Git sync: stage vault-owned paths, commit, fetch and integrate remote commits, then push. Conflicts pause sync.
7. Incoming Markdown changes refresh the local search list.

## Candidate packages by folder

- Root: `pnpm` workspace and TypeScript. Keep aliases inside each app; use workspace imports between apps.
- `apps/gateway`: NestJS on Fastify provides modules, controllers, and DI. `@orpc/nest` implements the shared HTTP contract from `apps/packages/src/gateway.ts` in those controllers; verify its ESM and Fastify setup in the first slice. Native HTTP calls Jev directly; `@google/genai` calls Gemini through Vertex AI. Git sync and a small Markdown search list remain device-local.
- `apps/gateway` later: Add an OpenAI client only when access is available; OpenRouter remains unverified. Nest provides DI, so do not add `tsyringe`.
- `apps/desktop`: Electron runs main, preload, the Engine, capture, and vault writes. Next.js builds the static renderer. oRPC's Electron MessagePort adapter provides typed UI-to-Engine calls; a typed HTTP client calls the gateway. UI state is not Engine state. Trial local OCR with bundled language data.
- `apps/packages`: Export the gateway oRPC contract and Zod schemas from `src/gateway.ts`; no Nest decorators, handlers, clients, state, or business logic.
- Platform APIs: Electron `desktopCapturer` and `nativeImage`, renderer `MediaRecorder`, Node timers and file APIs. Add an MCP client only for an approved MCP integration.
- Pass `JEV_API_KEY` explicitly. Initialize `@google/genai` with `vertexai: true` and the selected Vertex AI authentication method. Keep `VERTEX_AI_AUTH_MODE=unconfigured` until ADC or a Vertex Express API key is confirmed; reject unconfigured or missing credentials before any request. Never interpret the old `GOOGLE_AI_STUDIO_*` names as permission to call the Gemini Developer API.
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

- Use one gateway oRPC contract for HTTP paths and data shapes; Nest controllers implement its procedures and services own related work. Desktop IPC uses a separate main-process oRPC router. Neither boundary has a second route definition.
- Keep one internal `ModelAdapter` shape for the generation request, response, tool requests, and usage. The gateway maps it to Gemini now; choose a Gemini model ID per job without creating an adapter per model. Add an OpenAI implementation and provider selection only when access is available; keep the Engine's tool loop provider-independent.
- The Engine owns vault writes; the gateway owns the Git sync queue. Git is a fixed internal operation, not an arbitrary agent command tool.
- Coalesce repeated events and cap each agent run by time, model calls, and tool calls.
- The Engine owns approved local and MCP tools. Markdown skills provide instructions, not permissions. The gateway owns remote API connectors.
- Bind the gateway to loopback and require a per-session credential; the UI reaches the Engine through a restricted oRPC MessagePort passed by preload.
- Search at most 30 daily notes plus recent weekly/monthly summaries; start with six months of summaries. At up to 2,000 characters per daily note, build Orama's small in-memory index from Markdown on startup and refresh changed pages after vault writes or Git sync. Persist the index only if startup measurements justify it.
- Use one shared branch for the vault initially. Never force-push or auto-resolve conflicting memory edits.
- Declare each cross-process operation once and validate its input/output at that boundary. The IPC router stays in desktop; the HTTP contract stays in packages.

## Candidate folders

```text
apps/desktop/
  electron/
    main/
      main.ts          # Windows and gateway lifecycle
      ipc-transport.ts # oRPC MessagePort handshake
      ipc/             # Renderer-facing procedures, one router/type
      engine/           # Events, status, jobs, bounded agent runs
      capture/          # Screen, system status, OCR
      vault/            # Allowed Markdown reads and writes
      gateway-client.ts # Typed OpenAPILink HTTP client
    preload/            # Restricted MessagePort relay
    audio/              # Optional MediaRecorder capture renderer
  src/
    app/                # Next.js routes and page composition
      layout.tsx
      page.tsx
    core/               # Shared UI, never business logic
      desktop-client.ts # Typed oRPC IPC client
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
      ai.controller.ts  # Implements shared decision/generation contract
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
apps/packages/
  src/
    gateway.ts          # HTTP paths, Zod schemas, oRPC contract
```

- `src/core` gains `components`, `stores`, `hooks`, or `helpers` only when code is genuinely shared across features. Feature-specific code stays inside its feature folder.
- Each Nest feature folder stays small: controller for transport, service for its work, module for wiring. Split files further when a real responsibility grows.

## Sources for provisional choices

- Jev direct HTTP: the user's live `GET /v1/models` and classification test passed after the `.env` update; Playback's Jev implementation also uses .NET direct HTTP.
- oRPC Electron adapter and Nest integration: https://orpc.dev/docs/adapters/electron and https://orpc.dev/docs/integrations/nest
- Google GenAI Vertex AI initialization: https://googleapis.github.io/js-genai/release_docs/classes/client.GoogleGenAI.html
- Vertex AI Express mode API key example: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-vertexai-express-mode
- Nest modules and Fastify adapter: https://docs.nestjs.com/modules and https://docs.nestjs.com/techniques/performance
- Next.js `src/app` convention: https://nextjs.org/docs/app/api-reference/file-conventions/src-folder
- LlamaIndex.TS deprecation: https://github.com/run-llama/LlamaIndexTS
- Orama local search: https://docs.orama.com/docs/orama-js/search
- Orama Chinese tokenization: https://docs.orama.com/docs/orama-js/text-analysis/stemming
