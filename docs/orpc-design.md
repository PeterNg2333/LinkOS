# oRPC Design for LinkOS

A type-safe API layer between the Electron renderer (Vue) and the main process,
built on [oRPC](https://orpc.unnoq.com) `^1.14` over its `message-port` adapter
(the official adapter built for Electron's `MessagePortMain` / `MessagePort`).

## Design principles

1. **Feature-per-file.** One feature = one file. Schemas, logic, and the
   exported router segment live together. Easy to find, easy to grep, easy to
   delete.
2. **Co-locate, don't layer.** No `services/` vs `procedures/` split. Add a
   layer only when there's an *actual* second consumer (CLI, tests, second IPC
   surface) — not speculatively.
3. **Promote to a folder only when a file outgrows itself.** Most features stay
   one file forever. The day `ai.ts` hits ~300 lines, it becomes `ai/`.
4. **Name folders for the consumer, not the mechanism.** `api/` — the
   renderer's "backend" — not `rpc/`, `ipc/`, or `handlers/`.
5. **No premature abstraction.** No `base.ts` until two features share a
   middleware. No `context.ts` until a procedure actually needs context. No
   `errors.ts` until error shapes repeat.
6. **Transport plumbing is written once.** `main.ts` and `preload.ts` set up
   the channel and are never touched again to add features.

---

## Folder layout

```
electron/
├── main.ts                  # Electron entry — transport setup, frozen
├── preload.ts               # 4-line port forwarder, frozen
└── api/
    ├── index.ts             # composes feature routers → exports AppRouter type
    ├── system.ts            # one feature, one file
    ├── settings.ts
    └── ai.ts

src/
├── api.ts                   # singleton client + AppRouter type plumbing
├── App.vue
├── main.ts
└── components/
```

That's the whole thing for an app with three features. No nested layer folders.

### When a feature outgrows its file

When `ai.ts` grows past a comfortable single file (~250–300 lines, or when you
find yourself scrolling to navigate it), promote it:

```
electron/api/
├── index.ts
├── system.ts
├── settings.ts
└── ai/
    ├── index.ts             # exports the feature router; only public surface
    ├── stream.ts            # one procedure
    ├── transcribe.ts        # another procedure
    └── llm-client.ts        # internal helper, not re-exported
```

The shape is the same — `electron/api/ai` exports a router segment — so
`api/index.ts` doesn't change. This is the standard "barrel-on-demand" pattern.

---

## Anatomy of one feature

A feature file contains everything for that feature: input schemas, logic, and
the router segment. No file-hopping to understand what `settings.update` does.

```ts
// electron/api/settings.ts
import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { os } from '@orpc/server'
import { z } from 'zod'

const Settings = z.object({
  theme: z.enum(['light', 'dark']),
  locale: z.string().min(2),
})
type Settings = z.infer<typeof Settings>

const FILE = path.join(app.getPath('userData'), 'settings.json')
const DEFAULTS: Settings = { theme: 'dark', locale: 'en' }

async function read(): Promise<Settings> {
  try {
    return { ...DEFAULTS, ...JSON.parse(await fs.readFile(FILE, 'utf8')) }
  } catch {
    return DEFAULTS
  }
}

async function write(next: Settings): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), 'utf8')
}

export const settings = {
  get: os.handler(read),
  update: os.input(Settings).handler(async ({ input }) => {
    await write(input)
    return input
  }),
}
```

Everything for "settings" — schema, persistence, RPC surface — is on screen at
once. No `services/settings-store.ts` round-trip.

> **When to extract a helper into its own file?** When something else needs it.
> If a second feature reads settings, lift `read`/`write` into a shared module
> *at that moment*, not before. The simple thing is cheap to refactor; the
> over-abstracted thing is expensive to undo.

---

## Composing the router

```ts
// electron/api/index.ts
import { system } from './system'
import { settings } from './settings'
import { ai } from './ai'

export const router = { system, settings, ai }
export type AppRouter = typeof router
```

This file is dumb on purpose: a flat registry. Adding a feature = one import,
one entry.

---

## Transport setup (written once)

### `electron/main.ts`

```ts
// excerpt — only the oRPC-relevant lines
import { MessageChannelMain } from 'electron'
import { RPCHandler } from '@orpc/server/message-port'
import { router } from './api'

const rpc = new RPCHandler(router)

// inside createWindow():
win.webContents.on('did-finish-load', () => {
  const { port1, port2 } = new MessageChannelMain()
  rpc.upgrade(port1)
  port1.start()
  win.webContents.postMessage('orpc-port', null, [port2])
})
```

### `electron/preload.ts`

```ts
import { ipcRenderer } from 'electron'

ipcRenderer.on('orpc-port', (event) => {
  window.postMessage('orpc-port', '*', event.ports)
})
```

`MessagePort` objects can't cross `contextBridge`, but they can cross
`window.postMessage` with a transfer list. That's the entire reason this file
exists.

---

## Renderer client (one file)

```ts
// src/api.ts
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import type { RouterClient } from '@orpc/server'
import type { AppRouter } from '../electron/api'

let cached: Promise<RouterClient<AppRouter>> | null = null

export function api(): Promise<RouterClient<AppRouter>> {
  if (cached) return cached
  cached = new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data !== 'orpc-port' || !event.ports[0]) return
      window.removeEventListener('message', onMessage)
      const port = event.ports[0]
      port.start()
      resolve(createORPCClient<RouterClient<AppRouter>>(new RPCLink({ port })))
    }
    window.addEventListener('message', onMessage)
  })
  return cached
}
```

Used directly in components:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'

const settings = ref<Awaited<ReturnType<Awaited<ReturnType<typeof api>>['settings']['get']>>>()
onMounted(async () => { settings.value = await (await api()).settings.get() })
</script>
```

If a component would have meaningful boilerplate around an API call
(loading state, error toast, lifecycle), *then* extract a composable —
co-located with the component that uses it, or under `src/composables/` if
shared. No `src/composables/` folder up-front.

---

## When to add what

| You're adding… | Touch this |
|---------------|------------|
| A procedure to an existing feature | `electron/api/<feature>.ts` |
| A whole new feature | new file `electron/api/<feature>.ts` + one line in `electron/api/index.ts` |
| Logic shared between 2+ features | extract into `electron/api/<feature>.ts` neighbor file *when the second usage appears*, not before |
| Auth / logging / shared middleware | introduce `electron/api/_base.ts` *when ≥2 features need it*; until then, `os` directly is fine |
| Per-request context (db handle, etc.) | add `context` to `RPCHandler({ context: ... })` and switch features to `os.$context<T>()` |
| Reusable Vue helper around a call | a composable next to its component, or `src/composables/` once shared |
| Transport plumbing | never — `main.ts` / `preload.ts` are done |

---

## Notes

- **Errors:** throw `new ORPCError('FORBIDDEN', { message: ... })` from any handler.
  Catch on the renderer with `instanceof ORPCError`. No central `errors.ts`
  needed until you find yourself repeating error shapes.
- **Streaming:** `os.handler(async function* () { yield ... })` works over
  `message-port` (good for LLM tokens, voice frames). Consume with `for await`
  on the renderer. Cancellation flows through `AbortSignal`.
- **Multiple windows:** one `RPCHandler` instance, each window gets its own
  `MessageChannelMain`. No per-window state in the handler.
- **HMR:** every `did-finish-load` fires a fresh port; renderer's cached client
  is reset by Vite's HMR boundary. No special handling.

---

## What this design is not

- Not DDD. Not hexagonal. Not clean-architecture-by-the-book. If LinkOS grows
  to the size where those help, refactor toward them — but the *shape* above
  scales to dozens of features without bending.
- Not a "pattern" you need to learn. It's: one file per feature, one folder
  for the API surface, one composition file. Standard TS / Node practice.
