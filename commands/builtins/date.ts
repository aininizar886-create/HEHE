import type { CommandDefinition } from "../types";

export const date: CommandDefinition = {
  name: "date",
  description: "Menampilkan waktu sekarang.",
  usage: "date",
  execute: () => ({
    output: new Date().toLocaleString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }),
};
