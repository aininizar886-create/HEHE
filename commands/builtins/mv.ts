import { getNode, moveEntry, resolveEntry, resolvePath } from "../../core/filesystem/filesystem";
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

export const mv: CommandDefinition = {
  name: "mv",
  description: "Memindahkan atau rename file/folder.",
  usage: "mv <source> <target>",
  execute: (args, context) => {
    const source = args[0];
    const target = args[1];
    if (!source || !target) return { error: "Format: mv <source> <target>" };

    const resolvedSource = resolveEntry(context.fileSystem, context.cwdId, source);
    if (resolvedSource.error) return { error: resolvedSource.message };
    const sourceNode = getNode(context.fileSystem, resolvedSource.value.nodeId);
    if (!sourceNode) return { error: "Source tidak ditemukan." };

    const targetAsDir = resolvePath(context.fileSystem, context.cwdId, target);
    if (!targetAsDir.error) {
      const result = moveEntry(context.fileSystem, sourceNode.id, targetAsDir.value.nodeId, undefined);
      if (result.error) return { error: result.message };
      return { output: "Berhasil dipindah.", stateChanges: { fileSystem: result.value } };
    }

    const { dir, name } = splitTarget(target);
    if (!name) return { error: "Nama target kosong." };
    const targetDir = resolvePath(context.fileSystem, context.cwdId, dir);
    if (targetDir.error) return { error: targetDir.message };

    const result = moveEntry(context.fileSystem, sourceNode.id, targetDir.value.nodeId, name);
    if (result.error) return { error: result.message };
    return { output: "Berhasil dipindah.", stateChanges: { fileSystem: result.value } };
  },
};
