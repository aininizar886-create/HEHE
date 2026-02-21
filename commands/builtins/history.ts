import type { CommandDefinition } from "../types";

export const history: CommandDefinition = {
  name: "history",
  description: "Menampilkan riwayat command.",
  usage: "history",
  execute: (_args, context) => ({
    output: context.history.length
      ? context.history.map((item, index) => `${index + 1}  ${item}`).join("\n")
      : "(belum ada riwayat)",
  }),
};
