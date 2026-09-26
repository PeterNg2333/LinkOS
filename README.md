# LinkOS

A local-first personal AI assistant. It observes work context, keeps Markdown memory, and offers help without waiting for every request.

> Status: architecture design. The old Vue/Vite/Electron prototype is in [`archive/legacy-vue-vite/`](archive/legacy-vue-vite/). The new app is not implemented yet.

## Architecture

- **Monorepo:** `pnpm` for the desktop app, local TypeScript gateway, and shared contracts where needed.
- **Desktop:** Electron runs one long-lived Engine; Next.js static export provides the UI.
- **Local inputs:** Electron captures screen images, system status, and microphone audio. OCR runs locally. The microphone can be turned off.
- **Gateway:** A local TypeScript API handles model calls, configured API clients, memory search, and scoped Git sync. It does not own agent scheduling or device capture.
- **Models:** Jev classifies compact text or structured state. Gemini is the initial generative model family for image and audio understanding, memory work, research, and code suggestions. The gateway uses a small model adapter so another provider, such as OpenAI, can be selected later.
- **Storage:** Each device keeps its own Git working tree; all Markdown memory, notes, tasks, and `SOUL.md` sync through a Git remote on a remote filesystem. The gateway searches a small device-local set of Markdown pages; no central application database is required. Raw captures and runtime state remain separate on each device.

## Event flow

1. Electron takes a screenshot every minute and observes system status and enabled audio. Missed timer events are not replayed after resume.
2. Local capture, OCR, screen changes, keyboard activity counts, timers, and later editor adapters emit events.
3. A trigger list chooses the next stage by event, frequency or threshold, and cooldown. A rule can run directly or wait for OCR or Jev classification.
4. The Engine updates current status: activity, repo, task, and running jobs. Meaningful events can start bounded agent runs; scheduled jobs handle checks and memory compression.
5. Jev routes compact context. When needed, Gemini receives relevant context and can request approved memory, task, research, or API tools through the Engine.
6. The Engine presents suggestions and records useful outcomes in Markdown. It meters model and tool costs against a target of about HK$80 per month.
7. A scoped sync job commits vault changes, integrates remote changes, and pushes them. Incoming Markdown changes refresh the local search list; conflicts pause sync for review.

## Memory and permissions

- `SOUL.md`, `short.md`, today's note, and `long.md` are included in agent prompts. Only the user edits `SOUL.md`. Keep stable prompt content before changing context so provider caching can apply.
- Search the latest 30 daily notes plus recent weekly and monthly summaries; start with a six-month summary window. Use up to 2,000 characters per daily note for sizing.
- Page indexes and summaries guide discovery. Read `short.md` and `long.md` directly; look up tasks and notes by path or search them when needed.
- Older detail moves to an accessible Markdown archive. The agent reads archive pages through constrained search when needed.
- A small in-memory page/chunk list narrows search candidates; Jev can judge their relevance. Markdown remains the source of truth.
- The agent and user can edit memory, notes, and individual task files in the Git-synced vault, except `SOUL.md`.
- Keep screenshots locally for three days after capture and raw audio locally for one day after transcription. Neither is Git-synced.
- The runtime agent reads only user-approved folders and writes only its own vault. It can use approved tools for memory, tasks, research, and API reads; it cannot run arbitrary local commands or edit project code.

## Planned folders

```text
linkos/
  apps/desktop/             # Electron Engine, capture, OCR, Next.js UI
  apps/gateway/             # Local TypeScript API, model clients, Git sync
  apps/contracts/           # Shared schemas, only when both apps need them
  archive/legacy-vue-vite/  # Historical prototype
  AGENTS.md                 # Coding rules and architecture boundaries
  README.md

<shared-vault>/              # One local Git working tree per device
  SOUL.md
  notes/
  tasks/
    task_1.md
  memory/
    short.md
    long.md
    active/<YYYY-MM>/
    archive/<YYYY-MM>/

<device-data>/              # Raw captures and runtime state; never Git-synced
```

## Later

- No VS Code extension in MVP. A future extension will be a thin input/output adapter to the same Engine.
- It can provide unsaved diffs, cursor position, diagnostics, and codebase references for suggestions and code smell detection.
- Any future code execution must use an explicitly designed MCP or sandbox permission boundary.
