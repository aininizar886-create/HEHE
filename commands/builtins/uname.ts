import type { CommandDefinition } from "../types";

export const uname: CommandDefinition = {
  name: "uname",
  description: "Menampilkan informasi OS.",
  usage: "uname",
  execute: (_args, context) => ({
    output: `Linux ${context.systemInfo.hostname} ${context.systemInfo.osVersion}`,
  }),
};
