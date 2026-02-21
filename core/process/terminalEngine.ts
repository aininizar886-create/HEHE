import { commandRegistry, commandNames } from "../../commands/registry";
import type { CommandDefinition } from "../../commands/types";
import { parseCommandLine } from "../parser/parser";
import { writeFile } from "../filesystem/filesystem";
import type { FileSystemState } from "../filesystem/types";
import type { SystemInfo } from "../system/systemInfo";
import { createSystemInfo } from "../system/systemInfo";
import type { TerminalMode } from "../../modes/modes";
import { MODE_CONFIGS } from "../../modes/modes";
import type { LearningState } from "../../learning/types";
import { createInitialLearningState, evaluateLearning } from "../../learning/learningEngine";

export type TerminalLine = {
  type: "input" | "output" | "error" | "system" | "hint";
  text: string;
};

export type TerminalState = {
  fileSystem: FileSystemState;
  cwdId: string;
  systemInfo: SystemInfo;
  history: TerminalLine[];
  commandHistory: string[];
  learning: LearningState;
  mode: TerminalMode;
  lastCommand: string | null;
  lastOutput: string | null;
};

export type TerminalRunResult = {
  state: TerminalState;
  lines: TerminalLine[];
};

const suggestCommands = (input: string, registry: Record<string, CommandDefinition>): string[] => {
  const trimmed = input.trim();
  if (!trimmed) return [];
  return Object.keys(registry).filter((name) => name.startsWith(trimmed));
};

export const createTerminalState = (
  fileSystem: FileSystemState,
  cwdId: string,
  hostname: string,
  username: string,
  mode: TerminalMode
): TerminalState => ({
  fileSystem,
  cwdId,
  systemInfo: createSystemInfo(hostname, username),
  history: [
    { type: "system", text: "Selamat datang di Terminal Linux interaktif." },
    { type: "hint", text: "Mulai dari task di panel kiri, atau ketik help untuk daftar command." },
  ],
  commandHistory: [],
  learning: createInitialLearningState(),
  mode,
  lastCommand: null,
  lastOutput: null,
});

export const runCommandLine = (state: TerminalState, input: string): TerminalRunResult => {
  const trimmed = input.trim();
  if (!trimmed) return { state, lines: [] };

  const normalized = trimmed.toLowerCase();
  const parseResult = parseCommandLine(normalized);
  const lines: TerminalLine[] = [{ type: "input", text: `$ ${normalized}` }];
  const nextState = { ...state };

  if (!parseResult.ok) {
    lines.push({ type: "error", text: parseResult.error });
    return { state: { ...nextState, history: [...nextState.history, ...lines] }, lines };
  }

  const { command, args, flags, redirect, pipe } = parseResult.value;
  if (pipe) {
    lines.push({ type: "error", text: "Pipe belum didukung, tapi siap diupgrade." });
  }

  const definition = commandRegistry[command];
  if (!definition) {
    const suggestions = suggestCommands(command, commandRegistry);
    const hint = suggestions.length
      ? `Mungkin maksudmu: ${suggestions.join(", ")}`
      : "Ketik help untuk lihat command.";
    lines.push({ type: "error", text: `Command '${command}' tidak dikenal.` });
    if (MODE_CONFIGS[nextState.mode].showSuggestions) {
      lines.push({ type: "hint", text: hint });
    }
    nextState.commandHistory = [...nextState.commandHistory, normalized];
    nextState.lastCommand = command;
    nextState.lastOutput = null;
    nextState.history = [...nextState.history, ...lines];
    return { state: nextState, lines };
  }

  const result = definition.execute(args, {
    fileSystem: nextState.fileSystem,
    cwdId: nextState.cwdId,
    systemInfo: nextState.systemInfo,
    history: nextState.commandHistory,
    mode: nextState.mode,
    userName: nextState.systemInfo.username,
    flags,
    availableCommands: commandNames,
  });

  let outputText = result.output;
  let hadError = Boolean(result.error);

  if (result.error) {
    lines.push({ type: "error", text: result.error });
    if (MODE_CONFIGS[nextState.mode].verboseErrors) {
      lines.push({ type: "hint", text: definition.usage });
    }
  }

  if (result.stateChanges?.clearHistory) {
    nextState.history = [];
  }

  if (result.stateChanges?.fileSystem) {
    nextState.fileSystem = result.stateChanges.fileSystem;
  }
  if (result.stateChanges?.cwdId) {
    nextState.cwdId = result.stateChanges.cwdId;
  }
  if (result.stateChanges?.systemInfo) {
    nextState.systemInfo = result.stateChanges.systemInfo;
  }

  if (!hadError && outputText && redirect) {
    const writeResult = writeFile(
      nextState.fileSystem,
      nextState.cwdId,
      redirect.target,
      nextState.systemInfo.username,
      outputText + "\n",
      redirect.type === ">>"
    );
    if (writeResult.error) {
      hadError = true;
      lines.push({ type: "error", text: writeResult.message });
    } else {
      nextState.fileSystem = writeResult.value;
      outputText = undefined;
    }
  }

  if (outputText) {
    lines.push({ type: "output", text: outputText });
  }

  nextState.commandHistory = [...nextState.commandHistory, normalized];
  nextState.lastCommand = command;
  nextState.lastOutput = outputText ?? null;

  const learningResult = evaluateLearning(
    nextState.learning,
    {
      fileSystem: nextState.fileSystem,
      cwdId: nextState.cwdId,
      lastCommand: nextState.lastCommand,
      lastOutput: nextState.lastOutput,
      commandHistory: nextState.commandHistory,
    },
    command,
    hadError
  );

  nextState.learning = learningResult.state;
  learningResult.events.forEach((event) => {
    lines.push({ type: event.type === "error" ? "error" : "system", text: event.message });
    if (event.explanation && MODE_CONFIGS[nextState.mode].showHints) {
      lines.push({ type: "hint", text: event.explanation });
    }
  });

  nextState.history = result.stateChanges?.clearHistory ? [...lines] : [...nextState.history, ...lines];

  return { state: nextState, lines };
};
