import { readFile, resolveEntry } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const cat: CommandDefinition = {
  name: "cat",
  description: "Membaca isi file.",
  usage: "cat <file>",
  execute: (args, context) => {
    const target = args[0];
    if (!target) return { error: "Ketik nama file yang mau dibaca." };
    const resolved = resolveEntry(context.fileSystem, context.cwdId, target);
    if (resolved.error) return { error: resolved.message };
    const content = readFile(context.fileSystem, resolved.value.nodeId);
    if (content.error) return { error: content.message };
    return { output: content.value || "(file kosong)" };
  },
};
