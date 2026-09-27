# Desktop app plan

> Planned files, not an implemented app. [README](../README.md) owns the settled architecture. Create each group when its development slice begins.

## Responsibility and boundaries

Electron main hosts the **only** stateful LinkOS Engine. It owns event triggers, current status, bounded agent runs, background jobs, local capture and OCR, approved local tools, and all Markdown vault writes. It starts and talks to the loopback gateway. An oRPC router exposes named Engine operations over a MessagePort to the Next.js renderer; the renderer never receives model credentials, filesystem access, Node APIs, or an independent Engine.

The renderer displays Engine state and sends user intent. Feature code stays in its feature folder; `src/core` is only for UI used by multiple features. Microphone capture stays local to Electron with an explicit on/off control. The Engine may read user-approved folders and write only its vault; it cannot execute arbitrary commands or modify project code.

The IPC router is the UI-facing object of named operations; handlers delegate to the Engine, while feature internals use functions or small concrete classes as appropriate. `assistant.submit` and the gateway's `generation` are separate operations, each declared once at its own process boundary.

## Conclusions from reference apps

- Use Electron's single-instance lifecycle and let a reloaded renderer resubscribe to the existing Engine state. `ai-kiosk/main/background.ts` already handles single-instance startup and renderer crashes.
- Put cancellation, operation IDs, stale-result checks, queues, and timers in the Engine. `ai-kiosk` has working conversation cancellation in renderer state, but LinkOS needs those operations to survive renderer reloads.
- Keep the oRPC router limited to approved Engine operations and credentials out of renderer URLs. Set `contextIsolation: true`, `nodeIntegration: false`, and normal web security; a typed RPC client is not an authorization boundary.
- The archived Vue/Vite MessagePort wiring is a useful starting point. Follow the current oRPC Electron adapter for transport and keep the planned Next.js renderer and Engine-to-gateway flow.

## Proposed tree

```text
apps/desktop/
  package.json                    # Desktop scripts and dependencies
  tsconfig.json                   # Next/renderer compiler settings
  next.config.ts                  # Static export for Electron
  electron-builder.yml           # Packaging once the dev flow works
  electron/
    tsconfig.json                 # Main/preload build boundary
    main/
      main.ts                     # Single instance, window and gateway lifecycle
      ipc-transport.ts            # Renderer-initiated MessagePort handshake
      gateway-client.ts           # Typed OpenAPILink with session credential
      ipc/
        index.ts                  # One router and exported AppRouter type
        assistant.ts              # Manual prompt procedure -> Engine
        activity.ts               # Status and pause/resume procedures
        settings.ts               # Approved settings procedures
      engine/
        engine.ts                 # One state owner; manual request entry point
        status.ts                 # Activity/repo/task and running-job snapshot
        triggers.ts               # Event rules, cooldowns, coalescing
        jobs.ts                   # Timers, resume behavior, cancellation
        agent-run.ts              # Prompt assembly and bounded tool loop
        usage.ts                  # Actual model/cache/tool usage and cost meter
      capture/
        screen.ts                 # Local screen capture and retention
        system.ts                 # Idle/lock/activity signals
        ocr.ts                    # Local OCR with bundled language data
        audio.ts                  # Opt-in recording/transcription handoff
      vault/
        vault.ts                  # Markdown read/write and atomic updates
        permissions.ts            # Vault and approved read-folder checks
        context.ts                # SOUL/short/today/long and selected notes
        tools.ts                  # Approved memory/task tool implementations
    preload/
      index.ts                    # Relay only the oRPC MessagePort
    audio/
      recorder.ts                 # Isolated capture renderer, if required
  src/
    app/
      layout.tsx                  # App shell composition
      page.tsx                    # Main screen composition
    features/
      assistant/                  # Prompt, responses, suggestions, usage
      activity/                   # Observation and pause/resume controls
      memory/                     # Search results and page navigation
      tasks/                      # Individual task-file views
      settings/                   # Mic, folders, model/budget settings
    core/
      desktop-client.ts           # Typed oRPC client shared by UI features
  tests/
    manual-request.test.ts        # UI intent -> Engine -> gateway boundary
    vault-permissions.test.ts     # Allowed reads/writes and SOUL protection
    trigger-rules.test.ts         # Cooldowns, coalescing, pause/resume
```

## Development slices

1. **Manual assistant path.** Scaffold Electron and Next.js static export; start the gateway with a generated session credential; define `assistant.submit` once in the main-process oRPC router; call it through the typed MessagePort client, Engine, authenticated gateway, and Gemini. Show text, errors, and usage. Verify the renderer imports only the router type, contains no credential or direct gateway call, and reconnects after reload. Package the app only after this dev path works.
2. **Status and Jev routing.** Add Engine events, current status, trigger rules, cooldown/coalescing, and a gateway decision call. Jev receives compact text or structured state. Pause, idle, and resume suppress or resume work without replaying missed timers. Verify repeated observations do not create duplicate runs.
3. **Local observation.** Add screen/system capture, local OCR, and opt-in microphone capture in that order. Keep raw media outside the Git vault; delete screenshots after three days and raw audio one day after transcription. Verify lock/pause stops relevant inputs.
4. **Memory and approved tools.** Create/read Markdown notes and a task through Engine-owned vault operations. Assemble `SOUL.md`, `memory/short.md`, today's note, and `memory/long.md` before variable context. Allow agent edits to memory, notes, and `tasks/*.md`, but reject writes to `SOUL.md` and outside-vault paths. Verify failed writes leave the original page intact.
5. **Bounded autonomous work.** Add run-time, model-call, and tool-call limits; scheduled jobs; cost meter; suggestions; and visible job status. Keep the monthly target near HK$80 and settle budget behavior before proactive paid work. Verify cancellation and gateway failure leave status consistent.
6. **Sync presentation.** Ask the gateway to sync after vault changes, show pending/conflict state, and refresh pages after incoming changes. The desktop never runs Git. Verify a conflict stops automatic sync until reviewed.

## IPC and data rules

- The main-process router declares each UI operation once with input/output validation; the renderer imports `AppRouter` as a type and calls named procedures. Preload forwards only the MessagePort, never a generic `ipcRenderer` or filesystem method.
- The port handshake accepts only the app's renderer. Main validates oRPC input and gateway responses. Shared desktop/gateway HTTP contracts live in `apps/packages/src/gateway.ts`; Electron-only IPC procedures remain in this app.
- Raw screenshots, audio, and runtime state live under device-local data, never the synced vault. Persist useful Markdown outcomes.
- `SOUL.md` is user-editable only, including through UI and agent tools.

## Open decision

The current uncommitted `system design.md` says two days for screenshots and two days after transcription for raw audio, while `README.md` and `AGENTS.md` specify three and one. This plan follows the README/agent boundary until that product retention choice is reconciled.
