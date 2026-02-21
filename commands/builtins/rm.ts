import { getNode, removeEntry, resolveEntry } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const rm: CommandDefinition = {
  name: "rm",
  description: "Menghapus file atau folder.",
  usage: "rm [-r] <target>",
  flags: {
    r: "Hapus folder beserta isinya.",
  },
  execute: (args, context) => {
    const target = args[0];
    if (!target) return { error: "Ketik nama yang mau dihapus." };
    const resolved = resolveEntry(context.fileSystem, context.cwdId, target);
    if (resolved.error) return { error: resolved.message };
    const node = getNode(context.fileSystem, resolved.value.nodeId);
    if (!node || !node.parentId) return { error: "Target tidak ditemukan." };
    const result = removeEntry(
      context.fileSystem,
      node.parentId,
      node.name,
      Boolean(context.flags.r)
    );
    if (result.error) return { error: result.message };
    return { output: `Berhasil menghapus '${node.name}'.`, stateChanges: { fileSystem: result.value } };
  },
};
