import { writeFile } from "../filesystem/fs";
import { parseCommandLine } from "../parser/parser";
import { commandRegistry, COMMANDS } from "./commands";
import type { CommandContext } from "./types";

export type EngineResult = {
  output: string[];
  error?: string;
  command?: string;
  state?: CommandContext["fileSystem"];
  cwdId?: string;
  clearHistory?: boolean;
  effect?: "glitch";
  meta?: {
    commandDef?: (typeof COMMANDS)[number];
  };
};

const isDangerousRm = (command: string, args: string[], flags: Record<string, string | boolean>) => {
  if (command !== "rm") return false;
  const hasR = Boolean(flags.r);
  const hasF = Boolean(flags.f);
  if (!hasR || !hasF) return false;
  const target = args[0];
  return target === "/" || target === "/*";
};

const executeCommand = (
  command: string,
  args: string[],
  flags: Record<string, string | boolean>,
  context: CommandContext
): EngineResult => {
  if (isDangerousRm(command, args, flags)) {
    return {
      output: [
        "Woops! Di dunia nyata, komputer kamu baru saja hancur lebur.",
        "Untung ini simulasi. Jangan pernah ketik itu di server sungguhan!",
      ],
      error: "Simulasi dihentikan demi keamanan.",
      effect: "glitch",
      command,
    };
  }

  const handler = commandRegistry[command];
  if (!handler) {
    return { output: [], error: `Command '${command}' belum didukung.` };
  }

  const result = handler.execute(args, flags, context);
  return {
    output: result.output ?? [],
    error: result.error,
    command,
    state: result.state?.fileSystem ?? context.fileSystem,
    cwdId: result.state?.cwdId ?? context.cwdId,
    clearHistory: result.state?.clearHistory,
    meta: { commandDef: handler },
  };
};

export const runCommand = (input: string, context: CommandContext): EngineResult => {
  const parsed = parseCommandLine(input);
  if (!parsed.ok) {
    return { output: [], error: parsed.error };
  }

  const { command, args, flags, redirect, pipeline } = parsed.value;
  if (pipeline && redirect) {
    return { output: [], error: "Redirect harus di akhir pipe." };
  }

  const firstResult = executeCommand(command, args, flags, context);
  if (firstResult.error) return firstResult;

  let combined = firstResult;
  if (pipeline) {
    const nextContext: CommandContext = {
      ...context,
      fileSystem: firstResult.state ?? context.fileSystem,
      cwdId: firstResult.cwdId ?? context.cwdId,
      input: firstResult.output,
    };
    const second = executeCommand(pipeline.command, pipeline.args, pipeline.flags, nextContext);
    if (second.error) return second;
    combined = second;
  }

  if (!combined.error && pipeline?.redirect && combined.output.length) {
    const nextFs = combined.state ?? context.fileSystem;
    const nextCwd = combined.cwdId ?? context.cwdId;
    const write = writeFile(
      nextFs,
      nextCwd,
      pipeline.redirect.target,
      context.user,
      combined.output.join("\n") + "\n",
      pipeline.redirect.type === ">>"
    );
    if (!write.ok) {
      return { output: [], error: write.error, command: combined.command };
    }
    return {
      output: [],
      command: combined.command,
      state: write.value,
      cwdId: nextCwd,
      clearHistory: combined.clearHistory,
      meta: combined.meta,
    };
  }

  if (!combined.error && redirect && combined.output.length) {
    const nextFs = combined.state ?? context.fileSystem;
    const nextCwd = combined.cwdId ?? context.cwdId;
    const write = writeFile(
      nextFs,
      nextCwd,
      redirect.target,
      context.user,
      combined.output.join("\n") + "\n",
      redirect.type === ">>"
    );
    if (!write.ok) {
      return { output: [], error: write.error, command: combined.command };
    }
    return {
      output: [],
      command: combined.command,
      state: write.value,
      cwdId: nextCwd,
      clearHistory: combined.clearHistory,
      meta: combined.meta,
    };
  }

  return combined;
};
