# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- A local TypeScript gateway handles Jev/Gemini, configured API clients, and scoped Git sync.
- Next.js is the desktop UI. A future VS Code extension feeds the same Engine.
- Each device keeps a local Markdown Git working tree. A Git remote on a remote filesystem connects devices; IndexedDB holds rebuildable search and local runtime state.

## Candidate flow

1. A timer or local action emits an event.
2. A trigger rule selects capture, OCR, Jev, or an agent run.
3. The Engine updates activity, repo, task, and job status.
4. An agent run reads relevant memory and asks the gateway for model or remote API calls.
5. Approved local tools return memory/task results. The Engine writes accepted outcomes to the vault.
6. The gateway serializes sync: stage vault-owned paths, commit changed Markdown, fetch and integrate remote commits, then push. It reports conflicts instead of overwriting files.
7. Incoming Markdown changes trigger index refresh. The Engine resumes memory reads from the updated vault.

## Boundary questions

- Should the remote be a bare repository used only for Git sync, or should Markdown also be visible as files there?
- Where should IndexedDB run so the Electron Engine can query it without moving agent state into the UI?
- Which remote API clients need gateway-held credentials?

## Decision criteria

- Prioritize development speed and easy debugging; start with Fastify for the local TypeScript API.
- The Engine owns vault writes; the gateway owns the Git sync queue. Git is a fixed internal operation, not an arbitrary agent command tool.
- Use one shared branch for the vault initially. Never force-push or auto-resolve conflicting memory edits.
- Share schemas only where processes exchange data; validate requests at that boundary.

## Candidate folders

```text
apps/desktop/        # Electron Engine, capture, OCR, Next.js UI
services/gateway/    # Local Fastify API, model and remote clients, Git sync
packages/contracts/  # Add only for schemas used on both sides
```
