# Agent instructions

## Read first

- Read [README.md](README.md) before planning or editing. It is the source of truth for the intended LinkOS architecture and current project status.
- The README describes a target design. The old Vue/Vite prototype is archived under `archive/legacy-vue-vite/`; do not treat its structure as the intended architecture.
- Keep the README in sync when an agreed architecture or boundary changes. Write documentation in English unless the user explicitly requests another language. Keep plans and documentation short and readable.

## Architecture boundaries

- Keep one stateful LinkOS Engine in the Electron desktop app. It owns event triggers, current status, background jobs, agent runs, approved local tools, and the Markdown vault.
- Keep screen capture, system status, microphone capture, and OCR local to Electron. Next.js provides the desktop UI; it does not own a second Engine.
- Use a local TypeScript gateway for model calls, configured API clients, device-local memory search, and scoped Git sync. It does not capture devices, own agent state, or schedule agent work.
- Send compact text or structured state to Jev for quick decisions. Use Gemini as the only initial generative provider for image and audio understanding, memory work, research, and code suggestions. Keep a small model adapter inside the gateway so an OpenAI provider can be added later; do not add unused provider implementations or a registry now.
- Keep Markdown as canonical memory, notes, and individual task files. Attach `SOUL.md`, short memory, today's note, and long memory to agent prompts. Search up to 30 daily notes plus recent weekly and monthly summaries; start with a six-month summary window. Use 2,000 characters per daily note for sizing. Read tasks and notes by path or search them when needed; grep older archives on demand.
- Sync all Markdown memory, notes, tasks, and `SOUL.md` between separate local Git working trees through a remote filesystem. Keep raw captures, runtime state, and any rebuildable page/chunk list local to each device; use no central application database. Keep stable prompt content before changing context for possible provider caching; meter actual model, cache, and tool usage against the monthly cost target.
- The agent may edit memory, notes, and task files in its vault, including `long.md` and `tasks/*.md`. Only the user may edit `SOUL.md`. Delete local screenshots three days after capture and raw audio one day after transcription; do not Git-sync raw captures.
- Keep vault writes in the Engine and serialize Git sync in the gateway. Stage only vault-owned paths, never user-approved read-only folders. Stop and report sync conflicts rather than force-pushing or silently overwriting Markdown.
- The future VS Code extension is a thin adapter to the same Engine. It may provide diffs, diagnostics, cursor context, and codebase references; do not build another agent inside it. Do not implement the extension until requested.
- The runtime assistant may read only user-approved folders and write only its own vault. It may call approved memory, task, research, and API-read tools, but may not execute arbitrary local commands or edit project code. Future code execution needs an explicit MCP or sandbox boundary.
- Keep event, tool, and gateway contracts explicit. Share schemas only across process boundaries that need them.
- Keep active workspaces under `apps/`: `desktop`, `gateway`, and `contracts` only when schemas are shared. Do not create `services/` or `packages/` layers for this design.

## Coding rules

- Prefer locality of behavior and KISS. Keep related logic together; do not scatter a small flow across micro-files or helpers.
- Do not add an interface, abstract class, factory, or design pattern for a single implementation. Add an abstraction when real polymorphism or repeated business rules require it.
- Prefer a direct procedural or functional flow over enterprise boilerplate. Extract functions for meaningful responsibilities, not merely to shorten a file.
- Use precise, concise names that explain intent. Avoid vague names such as `data`, `temp`, `res`, or `item` when a specific name is possible.
- Do not comment on what code visibly does. Comment only to explain a non-obvious business reason, constraint, or workaround.
- Write functions top-down as a readable sequence. Use guard clauses and keep conditional nesting at two levels or fewer.
- Let one function complete one logical task. Do not split a short linear flow into several tiny functions just to satisfy a line count.
- Keep types simple. Avoid complex generics and type gymnastics that obscure behavior.
- Handle errors explicitly near their source. Do not silently swallow exceptions or use broad catch-all handling to hide failures.
- Reuse duplicated business rules, but do not combine unrelated behavior in a generic multi-purpose utility.

## Tests and review

- Test behavior and observable outcomes through public functions or API boundaries. Prioritize edge cases, business rules, and integration points.
- Do not add trivial tests for private helpers or tiny functions already exercised through a higher-level test. Avoid heavy internal mocking and coverage-driven tests.
- At every implementation phase, review code and tests as a human maintainer would: remove deep nesting, accidental complexity, needless abstraction, and misleading reuse.
- Before finalizing, check whether a developer can understand each changed flow in about 30 seconds without a debugger. Simplify it if the answer is no.
- Run checks relevant to the changed files, inspect the diff, and report existing failures separately from new ones. Do not commit secrets or unrelated user changes.
