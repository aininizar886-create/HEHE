import { copyEntry, getNode, resolveEntry, resolvePath } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

const splitTarget = (target: string): { dir: string; name: string } => {
  const cleaned = target.endsWith("/") ? target.slice(0, -1) : target;
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { dir: "/", name: "" };
  }
  const name = parts.pop() ?? "";
  const dir = cleaned.startsWith("/") ? `/${parts.join("/")}` : parts.join("/");
  return { dir: dir || ".", name };
};

export const cp: CommandDefinition = {
  name: "cp",
  description: "Menyalin file/folder.",
  usage: "cp [-r] <source> <target>",
  flags: {
    r: "Salin folder beserta isinya.",
  },
  execute: (args, context) => {
    const source = args[0];
    const target = args[1];
    if (!source || !target) return { error: "Format: cp <source> <target>" };

    const resolvedSource = resolveEntry(context.fileSystem, context.cwdId, source);
    if (resolvedSource.error) return { error: resolvedSource.message };
    const sourceNode = getNode(context.fileSystem, resolvedSource.value.nodeId);
    if (!sourceNode) return { error: "Source tidak ditemukan." };
    if (sourceNode.type === "directory" && !context.flags.r) {
      return { error: "Folder perlu flag -r." };
    }

    const targetAsDir = resolvePath(context.fileSystem, context.cwdId, target);
    if (!targetAsDir.error) {
      const result = copyEntry(
        context.fileSystem,
        sourceNode.id,
        targetAsDir.value.nodeId,
        undefined,
        context.userName
      );
      if (result.error) return { error: result.message };
      return { output: "Berhasil menyalin.", stateChanges: { fileSystem: result.value } };
    }

    const { dir, name } = splitTarget(target);
    if (!name) return { error: "Nama target kosong." };
    const targetDir = resolvePath(context.fileSystem, context.cwdId, dir);
    if (targetDir.error) return { error: targetDir.message };

    const result = copyEntry(context.fileSystem, sourceNode.id, targetDir.value.nodeId, name, context.userName);
    if (result.error) return { error: result.message };
    return { output: "Berhasil menyalin.", stateChanges: { fileSystem: result.value } };
  },
};
