import type { CommandDefinition } from "../types";

export const echo: CommandDefinition = {
  name: "echo",
  description: "Menampilkan teks.",
  usage: "echo <teks>",
  execute: (args) => ({ output: args.join(" ") }),
};
