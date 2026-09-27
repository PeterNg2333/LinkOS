# Desktop app plan

> Planned files, not an implemented app. [README](../README.md) owns the settled architecture. Create each group when its development slice begins.

## Boundaries

Electron main owns the single stateful Engine, local capture/OCR, approved tools, and Markdown writes. The loopback gateway handles models, search, and Git sync. The Next.js renderer displays state and sends intent through one oRPC MessagePort; it has no credentials, filesystem access, Node APIs, or second Engine.

Feature modules own their behavior and declare renderer procedures once in local `ipc.ts` files. `main/ipc.ts` composes them and validates the connecting renderer. Keep `contextIsolation: true`, `nodeIntegration: false`, and web security enabled. A renderer reload reconnects to the existing Engine; runs and timers continue in main.

## Proposed tree

Indented names below a file are planned members, not extra files. Create files with their development slice.

### Desktop root

```text
apps/desktop/
|-- package.json
|-- tsconfig.json
|-- next.config.ts              # Static Next.js export for Electron
|-- electron-builder.yml        # Add after the development path works
|-- electron/                   # Main, preload, local capture; see below
|-- src/                        # Next.js renderer; see below
|-- public/brand/linkos.png     # Planned copy of supplied icon
`-- tests/                      # Boundary and behavior tests

<memory-files>/                 # One Git working tree per device
|-- SOUL.md
|-- notes/
|-- tasks/
`-- memory/

<device-data>/                  # Raw captures and runtime state; no Git sync
```

### Electron

```text
electron/
|-- tsconfig.json
|-- main/
|   |-- main.ts
|   |   |-- bootstrap(): single instance, start gateway, Engine, IPC, window
|   |   |-- startGateway(): launch local server and wait for readiness
|   |   `-- shutdown(): stop Engine, ports, and local gateway
|   |-- ipc.ts                   # Compose routers; validate sender; manage ports
|   |-- gateway-client.ts
|   |   `-- createGatewayClient(): typed HTTP calls with session credential
|   |-- engine.ts
|   |   |-- LinkEngine: own one instance of each stateful module
|   |   |-- start(): restore state, connect events, start capture and scheduler
|   |   |-- onObservation(): apply trigger rules, start runs, update status
|   |   `-- stop(): detach events, stop jobs, cancel runs
|   |-- modules/
|   |   |-- assistant/
|   |   |   |-- assistant.ts     # AssistantService: conversations and prompt intent
|   |   |   `-- ipc.ts           # Threads, submit/cancel, progress subscription
|   |   |-- status/
|   |   |   |-- status.ts        # StatusStore: snapshots/subscriptions; reduceStatus()
|   |   |   `-- ipc.ts           # status snapshot/watch procedures
|   |   |-- runs/
|   |   |   |-- runner.ts        # RunManager + runAgent(): limits, IDs, cancellation
|   |   |   |-- triggers.ts      # Pure trigger selection, cooldown, coalescing
|   |   |   `-- usage.ts         # Actual usage and monthly-cost calculations
|   |   |-- capture/
|   |   |   |-- capture.ts       # CaptureManager lifecycle, pause, history, preview
|   |   |   |-- ipc.ts           # Capture, pause/resume, list/preview procedures
|   |   |   |-- screen.ts        # Screenshot and expiry functions
|   |   |   |-- system.ts        # Idle/lock/activity signals
|   |   |   |-- ocr.ts           # Local screen OCR
|   |   |   `-- audio.ts         # Mic consent, recording lifecycle, handoff
|   |   |-- schedules/
|   |   |   |-- schedules.ts     # Scheduler: definitions/timers; computeNextDue()
|   |   |   `-- ipc.ts           # Schedule CRUD, run-now, history procedures
|   |   |-- settings/
|   |   |   |-- settings.ts      # Local settings read/update operations
|   |   |   `-- ipc.ts           # Settings procedures
|   |   `-- memory-files/
|   |       |-- store.ts         # MarkdownStore: root, reads, atomic writes
|   |       |-- memory.ts        # Search/read operations via gateway and store
|   |       |-- tasks.ts         # Task list/read/update operations
|   |       |-- permissions.ts   # Resolve approved read and writable paths
|   |       `-- ipc.ts           # Memory and task procedures
|   |-- context/
|   |   |-- default-prompt.ts    # Stable built-in instructions before variable context
|   |   `-- build-context.ts    # SOUL, short memory, today's note, long memory
|   `-- tools/
|       |-- api.ts
|       |   |-- ToolApi.listForRun(): approved tool descriptions
|       |   |-- ToolApi.executeLocal(): validate and invoke a registered handler
|       |   `-- ToolApi.loadSkill(): read checked-in workflow instructions
|       `-- skills/
|           `-- daily-review.md  # Built-in instructions; no extra capability
|-- preload/index.ts             # Relay only the oRPC MessagePort
`-- audio/recorder.ts            # Browser microphone capture in isolated renderer
```

### Electron data flow

```text
User action
Renderer → preload → main/ipc.ts → module ipc.ts → module object
                                                  ↓
                                         RunManager / StatusStore

Observation
Local capture/OCR → Engine → trigger rules → gateway-client.ts → Gateway → Jev
Jev decision → Engine → RunManager → gateway-client.ts → Gateway → Gemini

Gemini tool request
Gateway → Engine → ToolApi → approved local module function
                            ↓
                   tool result → Gateway → Gemini

Data and UI
MarkdownStore → Gateway scoped Git sync
StatusStore / AssistantService → status.watch / assistant.watch → Renderer
```

`main.ts` starts and stops the local gateway; `gateway-client.ts` is its authenticated HTTP client. The Engine owns module instances and cross-module events. Jev receives compact decisions; Gemini receives selected context and media. `ToolApi` validates each registered call and delegates to modules. Skills supply instructions, not permissions. Renderer reload releases its port; Engine runs continue.

### Renderer

```text
src/
|-- app/
|   |-- layout.tsx               # Mantine providers, shell, navigation
|   |-- globals.css              # LinkOS surfaces and layout details
|   |-- page.tsx                  # Dashboard
|   |-- capture/page.tsx
|   |-- schedules/page.tsx
|   |-- chat/page.tsx
|   |-- memory/page.tsx
|   |-- tasks/page.tsx
|   `-- settings/page.tsx
|-- core/
|   |-- desktop-client.ts        # Typed oRPC MessagePort client
|   |-- theme.ts                 # Blue, green, gold Mantine theme
|   |-- notify.ts                # Consistent success/error/progress toast
|   |-- stores/uiStore.ts        # Shared view state only
|   |-- hooks/useEngineStatus.ts # Snapshot subscription and reconnect
|   `-- components/
|       |-- Sidebar.tsx
|       |-- ModalFrame.tsx        # Dialog title, actions, size, close behavior
|       |-- FormFrame.tsx         # Field, error, and submit layout
|       |-- FormFlow.tsx          # steps: data, component, check, next
|       |-- CollectionView.tsx    # Array + stable key/row and loading/empty/error
|       `-- ViewerFrame.tsx      # Selected content/actions and empty/error frame
`-- features/
    |-- dashboard/
    |   `-- Overview.tsx         # Status, next run, recent activity, cost
    |-- capture/
    |   |-- useCapture.ts        # Capture actions, history, selected preview
    |   |-- Controls.tsx         # Pause/resume and capture-now
    |   |-- Row.tsx              # One history entry
    |   `-- Preview.tsx          # Selected image and metadata in ViewerFrame
    |-- schedules/
    |   |-- useSchedules.ts      # List, save, toggle, run-now, history
    |   |-- Card.tsx             # One schedule and expandable runs
    |   |-- Form.tsx             # Schedule-specific fields
    |   `-- RunRow.tsx           # One run outcome
    |-- chat/
    |   |-- useChat.ts           # Threads, submit/cancel, progress subscription
    |   |-- Conversation.tsx     # Thread and message list
    |   |-- MessageRow.tsx       # One user/assistant message
    |   `-- Composer.tsx         # Prompt input, submit, cancel
    |-- memory/
    |   |-- useMemory.ts         # Search and selected page
    |   |-- Browser.tsx          # Results and ViewerFrame
    |   `-- ResultRow.tsx        # One search hit
    |-- tasks/
    |   |-- useTasks.ts          # List, read, update
    |   |-- Workspace.tsx        # List and selected task editor
    |   `-- Row.tsx              # One task
    `-- settings/
        |-- useSettings.ts       # Local settings reads/updates
        |-- Panel.tsx            # Settings sections
        `-- SetupForm.tsx        # FormFlow steps for first setup
```

## UI scope and state

Use the Screenpipe reference for a compact sidebar and expandable schedule history. Follow the LinkOS icon with a deep-blue frame, tinted content surfaces, green healthy states, and gold emphasis; status also needs text/icons. The dashboard shows observation, next run, recent outcomes, and actual monthly cost.

Use Mantine for basic controls. Keep Zustand in `core/stores` for renderer-only view state; Engine owns capture, schedules, conversations, memory, and tasks. Share hooks/components through `core` only when used by multiple features. Route pages compose feature components directly.

`ModalFrame` standardizes dialog layout; `notify.ts` handles toasts. `FormFrame` handles simple forms. `FormFlow` takes an ordered step array (`data`, `component`, `check`, optional `next`) and submits once; IPC validates again. `CollectionView` handles list states and rendering, while feature rows/cards own their content. `ViewerFrame` provides a common detail frame, while each feature supplies its viewer content.

## Markdown root

`<memory-files>` is the device-local Git tree for Markdown and `SOUL.md`; `modules/memory-files/` owns writes. Raw media remains under `<device-data>`. `tools/` exposes approved local functions and built-in skill instructions to the Engine.

## Development slices

1. **Manual assistant:** Electron, static Next.js, authenticated gateway, typed IPC, Gemini text/error/usage. Verify renderer reload keeps the run.
2. **Status and Jev:** Engine snapshots, trigger cooldowns, compact Jev decisions. Verify pause/resume and duplicate suppression.
3. **Observation:** Screen, system, OCR, then opt-in microphone. Verify lock/pause and raw-media retention outside Git.
4. **Memory and tools:** Markdown reads/writes, prompt context, approved tools. Reject `SOUL.md` and outside-root agent writes.
5. **Background work:** Bounded runs, schedules, cost meter, cancellation, visible outcomes. Target about HK$80/month.
6. **Sync:** Gateway-only Git sync; show pending/conflicts and refresh changed pages. Never auto-resolve conflicts.

## IPC and data rules

- Module `ipc.ts` files validate inputs/outputs once; `main/ipc.ts` composes them. The renderer imports only `AppRouter` as a type. Preload relays only the MessagePort; main checks the sender and gateway responses.
- `status.watch` and `assistant.watch` begin with full snapshots. IPC exposes capture IDs and validated previews, never arbitrary file paths.
- Prompt order: built-in instructions, selected skill, then changing context. `ToolApi` checks schema and permission again at execution; skills grant no permission. `SOUL.md` is user-editable only.
- Schedules and raw media are device-local. Git sync covers only Markdown; a conflict stops automatic sync.

## Open decision

`system design.md` says two days for screenshots and two days after transcription for raw audio, while `README.md` and `AGENTS.md` specify three and one. This plan follows the README/agent boundary until that product retention choice is reconciled.
