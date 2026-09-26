# LinkOS

A local-first personal AI assistant. It observes work context, saves useful Markdown memory, and offers help without waiting for every request.

> Status: architecture design. The old Vue/Vite/Electron prototype is in [`archive/legacy-vue-vite/`](archive/legacy-vue-vite/). The new app is not implemented yet.

## Architecture

- **Monorepo:** `pnpm` for the desktop app and shared TypeScript packages; the .NET service lives in the same repository.
- **Desktop:** Electron runs one long-lived Engine; Next.js static export provides the UI.
- **Local inputs:** Electron captures screen images, system status, and microphone audio. OCR runs locally. The microphone can be turned off.
- **AI API:** Stateless ASP.NET Core Minimal API. It receives complete requests, calls models, and returns structured results.
- **Models:** Jev makes quick decisions from compact text or structured state. Gemini handles images, speech, memory, research, and code suggestions.
- **Storage:** Markdown is canonical memory and Git syncs it. Raw screenshots and audio are stored locally; relevant samples can be sent to Gemini. MVP needs no database.

## Flow

1. Electron takes a screenshot every minute, reads system status, and captures audio when the microphone is enabled.
2. Local OCR turns screen content into text. The Engine combines OCR, status, and recent events.
3. The Engine sends compact text through the .NET API to Jev to infer the current task and decide on extra analysis or suggestions.
4. The Engine sends scheduled screenshots and relevant image, audio, or text through the .NET API to Gemini.
5. The Engine assembles prompt context, presents useful results, and writes memory to the local Markdown vault. Git syncs the Markdown.

## Memory and permissions

- `SOUL.md`: lasting assistant instructions; included in prompts.
- `short.md`, today's note, and `long.md`: included in every prompt.
- Weekly and monthly notes: include summaries and indexes by default; load full notes when needed.
- Both the user and AI can edit Markdown. Git keeps history.
- The runtime agent reads only user-approved folders and writes only its own vault.
- MVP may organize memory and suggest actions. It cannot run local commands or edit project code.

## Planned folders

```text
linkos/
├─ apps/desktop/         # Electron Engine, capture, OCR, Next.js UI
├─ services/ai-api/      # Stateless .NET gateway for Jev and Gemini
├─ packages/api-client/  # TypeScript client generated from .NET OpenAPI
├─ archive/legacy-vue-vite/ # Historical prototype
├─ AGENTS.md             # Coding rules and architecture boundaries
└─ README.md

<user-vault>/             # User-selected path; Git syncs Markdown
├─ SOUL.md
└─ memory/
   ├─ short.md
   ├─ long.md
   └─ monthly/
      ├─ summary.md
      └─ weekly/
         ├─ summary.md
         └─ daily/
```

## Later

- No VS Code extension in MVP. A future extension will be a thin input/output adapter to the same Engine.
- It can provide unsaved diffs, cursor position, diagnostics, and codebase references for suggestions and code smell detection.
- Any future code execution must use an explicitly designed MCP or sandbox permission boundary.
