import { resolvePath } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const cd: CommandDefinition = {
  name: "cd",
  description: "Berpindah direktori.",
  usage: "cd <path>",
  execute: (args, context) => {
    const target = args[0];
    if (!target) return { error: "Mau pindah ke mana?" };
    const result = resolvePath(context.fileSystem, context.cwdId, target);
    if (result.error) return { error: result.message };
    return { stateChanges: { cwdId: result.value.nodeId } };
  },
};
