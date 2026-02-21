import type { CommandDefinition } from "../types";

export const hostname: CommandDefinition = {
  name: "hostname",
  description: "Menampilkan hostname.",
  usage: "hostname",
  execute: (_args, context) => ({ output: context.systemInfo.hostname }),
};
