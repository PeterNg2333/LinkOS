# Agent instructions

## Read first

- Read [README.md](README.md) before planning or editing. It is the source of truth for the intended LinkOS architecture and current project status.
- The README describes a target design. The old Vue/Vite prototype is archived under `archive/legacy-vue-vite/`; do not treat its structure as the intended architecture.
- Keep the README in sync when an agreed architecture or boundary changes. Write documentation in English unless the user explicitly requests another language. Keep plans and documentation short and readable.

## Architecture boundaries

- Keep one stateful LinkOS Engine in the Electron desktop app. It owns scheduling, context assembly, proactive decisions, the Markdown vault, and Git sync.
- Keep screen capture, system status, microphone capture, and OCR local to Electron. Next.js provides the desktop UI; it does not own a second Engine.
- Keep the ASP.NET Core API stateless. It receives self-contained requests, calls Jev or Gemini, and returns structured results. It does not capture devices, read local folders, own memory, or schedule agent work.
- Send compact text or structured state to Jev for quick decisions. Use Gemini for image and audio understanding, memory work, research, and code suggestions.
- Keep Markdown as canonical memory. Attach `SOUL.md`, short memory, today's note, and long memory to prompts; use summaries and indexes for weekly and monthly memory by default. MVP needs no database.
- The future VS Code extension is a thin adapter to the same Engine. It may provide diffs, diagnostics, cursor context, and codebase references; do not build another agent inside it. Do not implement the extension until requested.
- The runtime assistant may read only user-approved folders and write only its own vault. It may suggest code changes but may not execute local commands or edit project code. Any future execution must go through an explicitly designed MCP or sandbox boundary.
- Keep API contracts explicit. Generate the TypeScript client from the .NET OpenAPI contract when that boundary is implemented.

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
