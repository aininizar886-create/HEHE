import { treeLines } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const tree: CommandDefinition = {
  name: "tree",
  description: "Menampilkan struktur folder.",
  usage: "tree",
  execute: (_args, context) => {
    const lines = treeLines(context.fileSystem, context.cwdId);
    const text = lines.length ? [".", ...lines].join("\n") : ".\n(kosong)";
    return { output: text };
  },
};
