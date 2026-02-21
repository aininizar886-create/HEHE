import { getPathSegments } from "../../core/filesystem/filesystem";
import type { CommandDefinition } from "../types";

export const pwd: CommandDefinition = {
  name: "pwd",
  description: "Menampilkan direktori aktif.",
  usage: "pwd",
  execute: (_args, context) => {
    const segments = getPathSegments(context.fileSystem, context.cwdId);
    return { output: `/${segments.join("/")}` || "/" };
  },
};
