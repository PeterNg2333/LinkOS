# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- A local TypeScript gateway handles Jev/Gemini, configured API clients, memory search, and scoped Git sync.
- Next.js is the desktop UI. A future VS Code extension feeds the same Engine.
- Each device keeps a separate Markdown Git working tree. All memory, notes, tasks, and `SOUL.md` sync through the remote; raw captures and any runtime search list stay device-local.

## Candidate flow

1. A timer or local action emits an event.
2. A trigger rule selects capture, OCR, Jev, or an agent run.
3. The Engine updates activity, repo, task, and job status.
4. An agent run searches recent daily notes and summaries through the gateway, then asks it for model or remote API calls.
5. Approved tools return memory/task results. The Engine writes memory, notes, and task changes to the vault; only the user edits `SOUL.md`.
6. The gateway serializes sync: stage vault-owned paths, commit changed Markdown, fetch and integrate remote commits, then push. It reports conflicts instead of overwriting files.
7. Incoming Markdown changes refresh the search list. The Engine resumes memory reads from the updated vault.

## Boundary questions

- Should the remote be a bare repository used only for Git sync, or should Markdown also be visible as files there?
- Which remote API clients need gateway-held credentials?

## Decision criteria

- Prioritize development speed and easy debugging; start with Fastify for the local TypeScript API.
- The Engine owns vault writes; the gateway owns the Git sync queue. Git is a fixed internal operation, not an arbitrary agent command tool.
- Search at most 30 daily notes plus recent weekly/monthly summaries; start with six months of summaries. At up to 2,000 characters per daily note, use direct file search or a small in-memory page/chunk list. Add a persisted index only if measurement shows a need.
- Use one shared branch for the vault initially. Never force-push or auto-resolve conflicting memory edits.
- Share schemas only where processes exchange data; validate requests at that boundary.

## Candidate folders

```text
apps/desktop/    # Electron Engine, capture, OCR, Next.js UI
apps/gateway/    # Local Fastify API, model and remote clients, Git sync
apps/contracts/  # Add only for schemas used on both sides
```
