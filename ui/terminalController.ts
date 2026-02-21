import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileSystem, getPathSegments, listDirectory } from "../core/filesystem/filesystem";
import { createTerminalState, runCommandLine, TerminalLine, TerminalState } from "../core/process/terminalEngine";
import { loadSnapshot, saveSnapshot, clearSnapshot } from "../persistence/localStorage";
import { commandList } from "../commands/registry";
import type { TerminalMode } from "../modes/modes";
import { restoreLearningState } from "../learning/learningEngine";

export type TerminalProfile = {
  name?: string | null;
  terminalHost?: string | null;
  terminalName?: string | null;
};

export type TerminalSuggestion = {
  value: string;
  label: string;
  description?: string;
  type: "command" | "file" | "directory";
};

const DEFAULT_USERNAME = "cinta";
const DEFAULT_HOSTNAME = "melpin";

export const useTerminalController = (
  profile: TerminalProfile | null,
  mode: TerminalMode = "learn",
  onStepComplete?: (count: number) => void
) => {
  const [state, setState] = useState<TerminalState>(() => {
    const snapshot = loadSnapshot();
    if (snapshot) {
      return {
        fileSystem: snapshot.fileSystem,
        cwdId: snapshot.cwdId,
        systemInfo: snapshot.systemInfo,
        history: [],
        commandHistory: snapshot.history,
        learning: restoreLearningState(snapshot.learning),
        mode,
        lastCommand: null,
        lastOutput: null,
      } as TerminalState;
    }
    const username = profile?.name?.trim().toLowerCase() || DEFAULT_USERNAME;
    const hostname = profile?.terminalHost?.trim().toLowerCase() || DEFAULT_HOSTNAME;
    const fs = createFileSystem(username || DEFAULT_USERNAME);
    const homeDir = Object.keys(fs.nodes).find((id) => fs.nodes[id].name === username) ?? fs.rootId;
    return createTerminalState(fs, homeDir, hostname, username, mode);
  });
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const lastSavedRef = useRef(0);

  const resolvedSystemInfo = useMemo(
    () => ({
      ...state.systemInfo,
      hostname: profile?.terminalHost?.trim().toLowerCase() || state.systemInfo.hostname,
      username: profile?.name?.trim().toLowerCase() || state.systemInfo.username,
    }),
    [profile?.terminalHost, profile?.name, state.systemInfo]
  );
  const resolvedState = useMemo(
    () => ({ ...state, systemInfo: resolvedSystemInfo, mode }),
    [mode, resolvedSystemInfo, state]
  );

  useEffect(() => {
    const now = Date.now();
    if (now - lastSavedRef.current < 800) return;
    lastSavedRef.current = now;
    saveSnapshot({
      fileSystem: state.fileSystem,
      cwdId: state.cwdId,
      systemInfo: state.systemInfo,
      learning: state.learning,
      history: state.commandHistory,
    });
  }, [state]);

  const cwdPath = useMemo(
    () => getPathSegments(resolvedState.fileSystem, resolvedState.cwdId),
    [resolvedState]
  );
  const prompt = useMemo(() => {
    const location = cwdPath.length ? `/${cwdPath.join("/")}` : "/";
    return `${resolvedSystemInfo.username}@${resolvedSystemInfo.hostname}:${location}$`;
  }, [cwdPath, resolvedSystemInfo.hostname, resolvedSystemInfo.username]);

  const activeStep = resolvedState.learning.batch.steps[resolvedState.learning.activeIndex] ?? null;

  const suggestions = useMemo<TerminalSuggestion[]>(() => {
    const raw = input;
    if (!raw.trim()) return [];
    const parts = raw.trim().split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    const isCommandFocus = parts.length <= 1 && !raw.endsWith(" ");
    if (isCommandFocus) {
      return commandList
        .filter((command) => command.name.startsWith(last))
        .slice(0, 6)
        .map((command) => ({
          value: command.name,
          label: command.name,
          description: command.description,
          type: "command",
        }));
    }
    if (raw.endsWith(" ")) return [];
    const entries = listDirectory(resolvedState.fileSystem, resolvedState.cwdId);
    if (entries.error) return [];
    return entries.value
      .filter((entry) => entry.name.startsWith(last))
      .slice(0, 6)
      .map((entry) => ({
        value: entry.name,
        label: entry.name,
        description: entry.type === "directory" ? "Folder" : "File",
        type: entry.type,
      }));
  }, [input, resolvedState.cwdId, resolvedState.fileSystem]);

  const reset = useCallback(() => {
    clearSnapshot();
    const username = profile?.name?.trim().toLowerCase() || DEFAULT_USERNAME;
    const hostname = profile?.terminalHost?.trim().toLowerCase() || DEFAULT_HOSTNAME;
    const fs = createFileSystem(username || DEFAULT_USERNAME);
    const homeId = Object.keys(fs.nodes).find((id) => fs.nodes[id].name === username) ?? fs.rootId;
    setState(createTerminalState(fs, homeId, hostname, username, mode));
    setInput("");
    setHistoryIndex(null);
  }, [mode, profile?.name, profile?.terminalHost]);

  const submit = useCallback(
    (rawInput: string) => {
      const prevCompleted = resolvedState.learning.progress.completedSteps;
      const stateWithSystem = resolvedState;
      const result = runCommandLine(stateWithSystem, rawInput);
      const delta = result.state.learning.progress.completedSteps - prevCompleted;
      if (delta > 0 && onStepComplete) onStepComplete(delta);
      setState(result.state);
      setInput("");
      setHistoryIndex(null);
      return result.lines;
    },
    [onStepComplete, resolvedState]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const history = state.commandHistory;
        if (!history.length) return;
        const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const history = state.commandHistory;
        if (!history.length) return;
        if (historyIndex === null) return;
        const nextIndex = historyIndex + 1;
        if (nextIndex >= history.length) {
          setHistoryIndex(null);
          setInput("");
          return;
        }
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const suggestion = suggestions[0];
        if (!suggestion) return;
        if (input.endsWith(" ")) {
          setInput(input + suggestion.value);
          return;
        }
        const parts = input.trim().split(/\s+/);
        parts[parts.length - 1] = suggestion.value;
        setInput(parts.join(" "));
      }
    },
    [historyIndex, input, suggestions, state.commandHistory]
  );

  return {
    state: resolvedState,
    input,
    setInput,
    prompt,
    cwdPath,
    submit,
    reset,
    handleKeyDown,
    activeStep,
    steps: resolvedState.learning.batch.steps,
    activeStepIndex: resolvedState.learning.activeIndex,
    lines: resolvedState.history as TerminalLine[],
    suggestions,
    applySuggestion: (value: string) => {
      if (input.endsWith(" ")) {
        setInput(input + value);
        return;
      }
      const parts = input.trim().split(/\s+/);
      if (parts.length <= 1) {
        setInput(value);
        return;
      }
      parts[parts.length - 1] = value;
      setInput(parts.join(" "));
    },
  };
};
