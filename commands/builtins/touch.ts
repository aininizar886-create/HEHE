import { makeFile } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const touch: CommandDefinition = {
  name: "touch",
  description: "Membuat file kosong.",
  usage: "touch <nama>",
  execute: (args, context) => {
    const name = args[0];
    if (!name) return { error: "Kasih nama file dulu ya." };
    const result = makeFile(context.fileSystem, context.cwdId, name, context.userName);
    if (result.error) return { error: result.message };
    return { output: `File '${name}' siap.`, stateChanges: { fileSystem: result.value } };
  },
};
