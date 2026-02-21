import type { CommandDefinition } from "../types";

export const help: CommandDefinition = {
  name: "help",
  description: "Menampilkan daftar command.",
  usage: "help",
  execute: (_args, context) => ({
    output: [
      "Commands tersedia:",
      context.availableCommands.sort().join(", "),
      "Tips: pakai --flag atau -r sesuai command.",
    ].join("\n"),
  }),
};
