import { formatUptime } from "../../core/system/systemInfo";
import type { CommandDefinition } from "../types";

export const uptime: CommandDefinition = {
  name: "uptime",
  description: "Menampilkan lama sistem berjalan.",
  usage: "uptime",
  execute: (_args, context) => ({ output: `up ${formatUptime(context.systemInfo)}` }),
};
