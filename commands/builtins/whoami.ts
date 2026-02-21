import type { CommandDefinition } from "../types";

export const whoami: CommandDefinition = {
  name: "whoami",
  description: "Menampilkan username aktif.",
  usage: "whoami",
  execute: (_args, context) => ({ output: context.systemInfo.username }),
};
