import { os } from "@orpc/server";

const health = {
  ping: os.handler(async () => "pong"),
};

export default health;
