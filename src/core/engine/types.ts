import type { FileSystemState } from "../filesystem/types";

export type CommandContext = {
  fileSystem: FileSystemState;
  cwdId: string;
  user: string;
  history: string[];
  input?: string[];
};

export type CommandOutput = {
  output?: string[];
  error?: string;
  state?: {
    fileSystem?: FileSystemState;
    cwdId?: string;
    clearHistory?: boolean;
  };
};

export type CommandDefinition = {
  name: string;
  description: string;
  usage: string;
  supportedFlags: string[];
  example: string;
  realWorld: string;
  execute: (args: string[], flags: Record<string, string | boolean>, context: CommandContext) => CommandOutput;
};

export type CommandInfo = Omit<CommandDefinition, "execute">;
