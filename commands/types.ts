import type { FileSystemState } from "../core/filesystem/types";
import type { SystemInfo } from "../core/system/systemInfo";
import type { TerminalMode } from "../modes/modes";

export type CommandContext = {
  fileSystem: FileSystemState;
  cwdId: string;
  systemInfo: SystemInfo;
  history: string[];
  mode: TerminalMode;
  userName: string;
  flags: Record<string, string | boolean>;
  availableCommands: string[];
};

export type CommandOutput = {
  output?: string;
  error?: string;
  stateChanges?: {
    fileSystem?: FileSystemState;
    cwdId?: string;
    systemInfo?: SystemInfo;
    clearHistory?: boolean;
  };
};

export type CommandDefinition = {
  name: string;
  description: string;
  usage: string;
  flags?: Record<string, string>;
  execute: (args: string[], context: CommandContext) => CommandOutput;
};
