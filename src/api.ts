import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "../electron/api";

// Attach the port listener IMMEDIATELY on module load, before any caller awaits.
// The main process posts the port right after did-finish-load, which can happen
// before any component calls apiClient() — so we must already be listening.
const portReady = new Promise<MessagePort>((resolve) => {
  const onMessage = (event: MessageEvent) => {
    if (event.data !== "orpc-port" || !event.ports?.[0]) return;
    window.removeEventListener("message", onMessage);
    resolve(event.ports[0]);
  };
  window.addEventListener("message", onMessage);
});

const clientPromise = portReady.then((port) => {
  port.start();
  return createORPCClient<RouterClient<AppRouter>>(new RPCLink({ port }));
});

const apiClient = (): Promise<RouterClient<AppRouter>> => clientPromise;

export default apiClient;
