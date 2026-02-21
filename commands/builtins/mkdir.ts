import { makeDirectory } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const mkdir: CommandDefinition = {
  name: "mkdir",
  description: "Membuat folder baru.",
  usage: "mkdir <nama>",
  execute: (args, context) => {
    const name = args[0];
    if (!name) return { error: "Kasih nama folder dulu ya." };
    const result = makeDirectory(context.fileSystem, context.cwdId, name, context.userName);
    if (result.error) return { error: result.message };
    return { output: `Folder '${name}' dibuat.`, stateChanges: { fileSystem: result.value } };
  },
};
