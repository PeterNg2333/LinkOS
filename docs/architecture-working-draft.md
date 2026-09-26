# LinkOS architecture working draft

> Temporary discussion notes. [README.md](../README.md) records settled boundaries.

## Current direction

- Electron Engine owns events, status, jobs, agent runs, local capture, OCR, and Markdown memory writes.
- Gateway handles Jev/Gemini, configured API clients, and scoped Git updates.
- Next.js is the desktop UI. A future VS Code extension feeds the same Engine.
- Markdown is canonical; IndexedDB holds rebuildable search and runtime state.

## Candidate flow

1. A timer or local action emits an event.
2. A trigger rule selects capture, OCR, Jev, or an agent run.
3. The Engine updates activity, repo, task, and job status.
4. An agent run reads relevant memory and asks the gateway for model or remote API calls.
5. Approved local tools return memory/task results. The Engine writes accepted outcomes to the vault.
6. A scoped Git update syncs vault changes; the executor and conflict policy remain open.

## Boundary questions

- Is the gateway a local sidecar or a hosted service?
- Does Git update mean commit/push of the local vault, changes to a server worktree, or remote Git API calls?
- Which remote API clients need gateway-held credentials?
- Should the gateway use TypeScript/Fastify or C#/ASP.NET Core?

## Decision criteria

- Prioritize development speed and easy debugging.
- Keep one owner for each vault write and Git update.
- A hosted gateway cannot access the local vault without an explicit change-transfer protocol.
- Share schemas only where processes exchange data; validate requests at that boundary.

## Candidate folders

```text
apps/desktop/        # Electron Engine and Next.js UI
services/gateway/    # Models, remote APIs, scoped Git operations
packages/contracts/  # Schemas shared across process boundaries only
```
