# oRPC MVP Tutorial — Your First Procedure

A practical, copy-paste-able walkthrough that matches the codebase's actual
style. By the end you will have called a type-safe function defined in the
Electron main process from a Vue component, and you'll understand **why** each
of the five files exists.

This version uses the **renderer-initiated handshake** — the recommended
pattern. The renderer asks main for a `MessagePort`, main creates one and
ships it back. No timing assumptions, no race conditions, survives `Ctrl+R`
reloads and HMR cleanly.

---

## 0. Mental model — what you're actually building

oRPC is **not** magic IPC. It's three things stacked:

```
your code:           api.demo.ping()              ◄── typed proxy in renderer
                          │
oRPC client:         encodes call, ships bytes
                          │
transport:           MessagePort (one channel, multiplexed for all calls)
                          │
oRPC server:         decodes, validates, routes
                          │
your code:           the handler function          ◄── runs in main process
```

Five files cooperate. After the initial setup you only ever touch **one**
of them per new feature — the feature file itself.

| File | Role | How often you edit it |
|------|------|------|
| `electron/api/<feature>.ts` | The feature: schema + handlers | Every change to this feature |
| `electron/api/index.ts` | Combines features into one router | Once per new feature |
| `electron/main.ts` | Boots the RPC handler, handles handshake | Once, ever |
| `electron/preload.ts` | Forwards the port + exposes handshake trigger | Once, ever |
| `src/api.ts` | Renderer-side typed client (initiates handshake) | Once, ever |

Lock that table in. Everything below is just filling it in.

> **One port, all calls.** The handshake happens once at startup. After
> that, every `api.foo.bar()` flows through the same `MessagePort`. oRPC
> multiplexes them internally (each call gets an ID, responses are matched
> by ID). You don't open a new channel per call — think HTTP keep-alive,
> not a new TCP connection per request.

---

## 1. Write the feature — `electron/api/health.ts`

Start with the simplest possible procedure: no input, returns a string.

```ts
// electron/api/health.ts
import { os } from "@orpc/server";

const health = {
  ping: os.handler(async () => "pong"),
};

export default health;
```

**What's happening:**

- `os` is the **procedure builder** from oRPC. Fluent chain:
  `os.input(...).handler(...)`. Skip `.input(...)` if you don't need an
  argument.
- `os.handler(fn)` says: "this procedure runs `fn` on the server."
- `health` is a **plain object**. oRPC treats objects as routers — `health.ping`
  becomes a procedure path. Nest objects to nest paths.
- `export default` lets the importing file rename it (we'll see this next).

**Why one file per feature?** When the app grows you'll have `health.ts`,
`settings.ts`, `system.ts`, `ai.ts` — each self-contained and grep-able.

---

## 2. Register the feature — `electron/api/index.ts`

This file does one job: collect every feature into one root router, and
export its **type** so the renderer can use it.

```ts
// electron/api/index.ts
import demo from "./health";

const appRouter = {
  demo,
  // settings, system, ai, …  ← add new features here
};

export default appRouter;
export type AppRouter = typeof appRouter;
```

**Tip — default exports can be renamed on import.** The file is `health.ts`
but we import it as `demo`. The renderer will call `rpc.demo.ping()`. That's
your choice; rename `demo` → `health` if you want consistency.

**The two exports matter for different reasons:**

- `appRouter` (the value) is used by the main process to register handlers.
- `AppRouter` (the type) is used by the renderer to infer call signatures.
  *Only the type crosses the process boundary* — TypeScript erases it at
  build time, so no main-process code leaks into the renderer bundle.

---

## 3. Wire the transport — `electron/main.ts`

This file boots Electron *and* boots the RPC server. The key idea: **don't
push the port to the renderer; wait for it to ask.**

```ts
// electron/main.ts
import { app, BrowserWindow, MessageChannelMain, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { RPCHandler } from "@orpc/server/message-port";

import appRouter from "./api/index";

// ==========================================
// 1. Initialization & Paths
// ==========================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

// ==========================================
// 2. RPC Setup (handshake handler)
// ==========================================
const rpcHandler = new RPCHandler(appRouter);

// Wait for the renderer to ask. Then build a channel, attach the handler to
// port1, and ship port2 back. This avoids any timing race — the renderer
// only asks once it has a listener installed.
ipcMain.on("orpc-request-port", (event) => {
  const { port1, port2 } = new MessageChannelMain();
  rpcHandler.upgrade(port1);
  port1.start();
  event.sender.postMessage("orpc-port", null, [port2]);
});

// ==========================================
// 3. Window Management
// ==========================================
let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  VITE_DEV_SERVER_URL // Dev or build? Load URL or file accordingly
    ? mainWindow.loadURL(VITE_DEV_SERVER_URL)
    : mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// ==========================================
// 4. App Lifecycle
// ==========================================
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

export { VITE_DEV_SERVER_URL, MAIN_DIST, RENDERER_DIST };
```

**The 5-second explanation:**

A `MessageChannel` is a pair of ports linked end-to-end. On each handshake we:

1. Create a channel.
2. Give `port1` to the oRPC handler — it now listens for incoming calls.
3. Send `port2` back to the renderer that asked.

Anything the renderer writes to `port2` arrives at `port1` and vice versa.

> **Why handshake instead of pushing on `did-finish-load`?**
> If main pushes the port the moment the page finishes loading, the
> renderer's listener may not be attached yet (especially with lazy imports
> or HMR), and the port is lost. Letting the renderer initiate means the
> renderer's listener is *guaranteed* to be in place — it installs it
> before sending the request.

---

## 4. Forward the port + expose the trigger — `electron/preload.ts`

Two responsibilities:

1. **Receive the port from main** and forward it into the renderer's main
   world (via `window.postMessage` with a transfer list — the only legal
   way to hand a `MessagePort` across the `contextIsolation` boundary).
2. **Expose `window.orpc.requestPort()`** so the renderer can kick off the
   handshake.

```ts
// electron/preload.ts
import { ipcRenderer, contextBridge } from "electron";

// 1. Main → renderer: forward the transferred MessagePort to the main world.
ipcRenderer.on("orpc-port", (event) => {
  window.postMessage("orpc-port", "*", event.ports);
});

// 2. Renderer → main: kick off the handshake.
contextBridge.exposeInMainWorld("orpc", {
  requestPort: () => ipcRenderer.send("orpc-request-port"),
});
```

**Why two halves?** `contextBridge` cannot serialize a `MessagePort`
object — it can only pass cloneable data. But preload's `window` *is* the
same `window` as the renderer's main world; they just have isolated JS
contexts. `window.postMessage(..., transfer)` is the one mechanism that can
hand a `MessagePort` across that isolation boundary.

If you remember nothing else: **`postMessage` with a transfer list is the
only legal way to give a MessagePort to your renderer code.**

---

## 5. Create the client — `src/api.ts`

This file lives in the renderer. It:

1. Installs a `message` listener (must exist *before* the port arrives).
2. Asks main for the port via `window.orpc.requestPort()`.
3. When the port arrives, wraps it in an `RPCLink` and creates a typed
   proxy.

```ts
// src/api.ts
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "../electron/api";

declare global {
  interface Window {
    orpc: { requestPort: () => void };
  }
}

// Step 1 + 2: install listener, then request port. Order matters —
// the listener MUST exist before main can respond.
const portReady = new Promise<MessagePort>((resolve) => {
  const onMessage = (event: MessageEvent) => {
    if (event.data !== "orpc-port" || !event.ports?.[0]) return;
    window.removeEventListener("message", onMessage);
    resolve(event.ports[0]);
  };
  window.addEventListener("message", onMessage);
  window.orpc.requestPort();
});

// Step 3: once we have a port, build the typed client. This promise resolves
// once and is reused for every call (singleton).
const clientPromise = portReady.then((port) => {
  port.start();
  return createORPCClient<RouterClient<AppRouter>>(new RPCLink({ port }));
});

const apiClient = (): Promise<RouterClient<AppRouter>> => clientPromise;

export default apiClient;
```

**Important details:**

- The listener is installed at **module load time** (not inside `apiClient()`),
  which means the moment `src/api.ts` is imported, the handshake is initiated.
  By the time any component calls `apiClient()`, the client is either ready
  or will be very soon.
- `clientPromise` is a module-level constant — **one client for the whole
  app**. Calling `apiClient()` from any component gives you the same
  instance. Every `api.demo.ping()`, `api.settings.get()`, etc. flows
  through the same `MessagePort`.
- `import type { AppRouter }` is purely compile-time. Build output contains
  zero bytes from this line.
- `RouterClient<AppRouter>` transforms the server-side router type into the
  *client-side* shape: input-only signatures, async returns, unwrapped
  outputs.

---

## 6. Call it from a Vue component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import apiClient from '@/api'

const pingRes = ref<number>(0)

const fetchPing = async () => {
  const rpc = await apiClient()
  const reply = await rpc.demo.ping()  // ← typed! Hover to see return type.
  if (reply === 'pong') {
    pingRes.value += 1
  } else {
    pingRes.value -= 1
  }
}
</script>

<template>
  <p>Ping says: <strong>{{ pingRes }}</strong></p>
  <button @click="fetchPing">Fetch Ping</button>
</template>
```

If your project doesn't have the `@/` alias, use a relative path:
`import apiClient from '../api'`.

---

## 7. Run it

```powershell
npm run dev
```

Click **Fetch Ping** — the counter goes up by 1 per click. Each click does
a real round-trip: renderer → port → handler → port → renderer.

If it doesn't work:

- **Open DevTools** (Ctrl+Shift+I) and check the Console for errors.
- **`window.orpc` is `undefined`** → preload didn't load. Check
  `preload: path.join(__dirname, "preload.mjs")` in `main.ts` resolves to a
  real built file.
- **Counter stays at 0 (button does nothing)** → handshake never completed.
  Add a `console.log("[main] port requested")` inside the
  `ipcMain.on("orpc-request-port", …)` block; you should see it in the
  Electron terminal each time the page loads.
- **Red squiggle under `rpc.demo.ping`** → renderer can't resolve the
  `AppRouter` type. Check `import type { AppRouter } from "../electron/api"`
  and that `tsconfig.json` `include` lists `"electron"`.
- **Red squiggle under `window.orpc`** → the `declare global { … }` block
  is missing or misplaced. Make sure it's at the top of `src/api.ts`.

---

## 8. Make it real — add input validation

A `ping` with no input is fine for a smoke test. Now let's see oRPC's
actual value: **validated input with end-to-end types.**

Extend `electron/api/health.ts`:

```ts
// electron/api/health.ts
import { os } from "@orpc/server";
import { z } from "zod";

const health = {
  ping: os.handler(async () => "pong"),

  echo: os
    .input(
      z.object({
        name: z.string().min(1),
        shout: z.boolean().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const message = `Hello, ${input.name}!`;
      return {
        message: input.shout ? message.toUpperCase() : message,
        at: new Date().toISOString(),
      };
    }),
};

export default health;
```

**Look what you didn't have to do:**

- No edit to `index.ts` — `health` already exports it.
- No edit to `main.ts` or `preload.ts` — transport doesn't care about contents.
- No edit to `src/api.ts` — types flow through `typeof appRouter` automatically.
- No new `MessagePort`, no new IPC channel.

Use it from the component:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import apiClient from '@/api'

const greeting = ref('')

const greet = async () => {
  const rpc = await apiClient()
  const res = await rpc.demo.echo({ name: 'Peter', shout: true })
  greeting.value = `${res.message}  (${res.at})`
}
</script>

<template>
  <p>{{ greeting }}</p>
  <button @click="greet">Greet</button>
</template>
```

Type `rpc.demo.` in the editor — autocomplete shows `ping` and `echo` with
full parameter hints.

---

## 9. The "aha" moment — break it on purpose

Inside your component, try each of these and watch the TypeScript checker
(or `npm run build`):

```ts
await rpc.demo.echo({ name: 42 });             // ❌ Type 'number' is not assignable to 'string'
await rpc.demo.echo({});                       // ❌ Property 'name' is missing
await rpc.demo.echo({ name: 'a', mode: 'x' }); // ❌ 'mode' does not exist
await rpc.demo.pong();                         // ❌ Property 'pong' does not exist
const x: number = await rpc.demo.ping();       // ❌ string is not assignable to number
```

Every one is caught **at compile time, in the renderer**, against the truth
defined **in the main process**, with **no manual type definitions keeping
the two in sync**. That's the entire point of oRPC.

Even better — Zod also validates at *runtime*. If a bug somewhere bypasses
the types and sends bad input, the handler never runs; it throws a
`BAD_REQUEST` error that you can catch with `instanceof ORPCError`.

---

## 10. Recap — what you actually learned

1. **Feature = one file.** `electron/api/health.ts` defines schema + logic
   in one place.
2. **The router is just an object.** `{ demo }` is a router. Nesting objects
   nests paths.
3. **`typeof appRouter` becomes the contract.** Export the type, import as
   `import type`, get end-to-end inference for free.
4. **Transport plumbing is one-time, and renderer-initiated.** Renderer
   sends `orpc-request-port` → main creates `MessageChannelMain` →
   `rpcHandler.upgrade(port1)` → `event.sender.postMessage(…, [port2])` →
   preload forwards via `window.postMessage` → renderer wraps with `RPCLink`.
5. **One port, all calls.** The `MessagePort` is established once and
   multiplexes every procedure call. Adding features never touches the
   transport.
6. **Zod gives compile-time + runtime safety.** Schemas in `.input(...)`
   become both TypeScript types *and* server-side validators.

You will never write `ipcMain.handle("some-magic-string", …)` again.

---

## 11. Next steps

- **Add a second feature.** Create `electron/api/settings.ts`. Register it
  in `index.ts` with one line. Try persisting a value with
  `fs.writeFile(app.getPath("userData") + "/settings.json", …)`.
- **Throw a typed error.**
  `throw new ORPCError("FORBIDDEN", { message: "..." })` from a handler and
  catch it on the renderer with `instanceof ORPCError`.
- **Try streaming.** Replace `.handler(async ({ input }) => …)` with
  `.handler(async function* ({ input }) { yield … })` and consume with
  `for await (…)` on the renderer. Useful for LLM tokens or log tails.
- **Read the design doc:** [`orpc-design.md`](./orpc-design.md) — when to
  add `_base.ts`, when to promote a file to a folder, what the layout looks
  like at 10+ features.

You're done. Go build something.
