import type { CommandDefinition } from "../types";

export const clear: CommandDefinition = {
  name: "clear",
  description: "Membersihkan layar terminal.",
  usage: "clear",
  execute: () => ({ stateChanges: { clearHistory: true } }),
};
