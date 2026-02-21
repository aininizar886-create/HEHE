import { getNode, removeEntry, resolveEntry } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const rmdir: CommandDefinition = {
  name: "rmdir",
  description: "Menghapus folder kosong.",
  usage: "rmdir <folder>",
  execute: (args, context) => {
    const target = args[0];
    if (!target) return { error: "Ketik nama folder yang mau dihapus." };
    const resolved = resolveEntry(context.fileSystem, context.cwdId, target);
    if (resolved.error) return { error: resolved.message };
    const node = getNode(context.fileSystem, resolved.value.nodeId);
    if (!node || !node.parentId) return { error: "Folder tidak ditemukan." };
    if (node.type !== "directory") return { error: "Itu bukan folder." };
    const result = removeEntry(context.fileSystem, node.parentId, node.name, false);
    if (result.error) return { error: result.message };
    return { output: `Folder '${node.name}' dihapus.`, stateChanges: { fileSystem: result.value } };
  },
};
