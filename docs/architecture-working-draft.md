# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- A local TypeScript gateway handles Jev/Gemini, configured API clients, memory search, and scoped Git sync.
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

## Candidate libraries

- `pnpm` workspace; Next.js static export for UI; Electron IPC and preload for UI-to-Engine calls.
- Fastify on loopback for the local gateway; TypeBox schemas shared in `apps/contracts` only for cross-process requests and replies.
- `@typesafe-ai/sdk` for Jev and `@google/genai` for Gemini. Keep provider keys in the gateway.
- Pass `JEV_API_KEY` and `GOOGLE_AI_STUDIO_API_KEY` to those SDKs explicitly. Project and location settings matter only if Google access later moves to Vertex AI.
- Electron `desktopCapturer` and `nativeImage` for screenshots and change checks; `MediaRecorder` in an Electron renderer for enabled microphone capture.
- Trial `tesseract.js` in a local worker for OCR; bundle language data and measure Chinese/English accuracy and latency.
- Node timers, file APIs, and fixed Git CLI arguments for jobs, Markdown, and sync. Add an MCP client only for an approved MCP integration.

## Gateway operations

- `decide(state, questions)` returns Jev answers and token usage.
- `generate(context, media, tools)` returns Gemini text or tool requests and usage.
- `searchMemory(query, scope)` returns page paths, sections, and matched chunks.
- `syncVault()` returns sync status or conflicts.

## Boundary questions

- Should the remote be a bare repository used only for Git sync, or should Markdown also be visible as files there?
- Which remote API clients need gateway-held credentials?

## Decision criteria

- Prioritize development speed and easy debugging; start with Fastify for the local TypeScript API.
- The Engine owns vault writes; the gateway owns the Git sync queue. Git is a fixed internal operation, not an arbitrary agent command tool.
- Coalesce repeated events and cap each agent run by time, model calls, and tool calls.
- The Engine owns approved local and MCP tools. Markdown skills provide instructions, not permissions. The gateway owns remote API connectors.
- Bind the gateway to loopback and require a per-session credential; the UI reaches the Engine through a narrow Electron preload API.
- Search at most 30 daily notes plus recent weekly/monthly summaries; start with six months of summaries. At up to 2,000 characters per daily note, use direct file search or a small in-memory page/chunk list. Add a persisted index only if measurement shows a need.
- Use one shared branch for the vault initially. Never force-push or auto-resolve conflicting memory edits.
- Share schemas only where processes exchange data; validate requests at that boundary.

## Candidate folders

```text
apps/desktop/
  app/           # Next.js UI
  electron/      # Engine, capture, OCR, vault writes, preload
apps/gateway/
  src/           # Fastify routes, Jev/Gemini clients, search, Git sync
apps/contracts/
  src/           # Shared request and response schemas only
```
