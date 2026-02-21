import { listDirectory } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const ls: CommandDefinition = {
  name: "ls",
  description: "Melihat isi folder.",
  usage: "ls [-a] [-1]",
  flags: {
    a: "Tampilkan file tersembunyi.",
    "1": "Tampilkan satu kolom.",
  },
  execute: (_args, context) => {
    const result = listDirectory(context.fileSystem, context.cwdId);
    if (result.error) return { error: result.message };
    const hasAll = Boolean(context.flags.a);
    const singleColumn = Boolean(context.flags["1"]);
    const items = result.value
      .map((entry) => `${entry.name}${entry.type === "directory" ? "/" : ""}`)
      .sort((a, b) => a.localeCompare(b));
    const displayItems = hasAll ? [".", "..", ...items] : items;
    return { output: displayItems.length ? displayItems.join(singleColumn ? "\n" : "  ") : "(kosong)" };
  },
};
