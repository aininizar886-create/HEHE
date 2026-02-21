/// <reference lib="webworker" />
import { buildTreeNodes, createFileSystem, getPathSegments } from "../filesystem/fs";
import type { FileSystemState } from "../filesystem/types";
import { runCommand } from "../engine/run";
import { COMMANDS } from "../engine/commands";
import type { CommandInfo } from "../engine/types";
import { applySrsReview, createLearningState, evaluateLearning, getActiveLesson } from "../../learning/engine";
import type { LearningState } from "../../learning/types";
import { getDueReviews } from "../../learning/srs/tracking";

type WorkerState = {
  fs: ReturnType<typeof createFileSystem>;
  cwdId: string;
  history: string[];
  learning: LearningState;
  snapshot: ReturnType<typeof createFileSystem>;
  homeId: string;
  username: string;
  mode: "learn" | "practice" | "real";
};

type WorkerSnapshot = {
  fs: FileSystemState;
  cwdId: string;
  learning: LearningState;
};

type WorkerMessage =
  | { type: "init"; payload: { username: string; mode: "learn" | "practice" | "real"; snapshot?: WorkerSnapshot } }
  | { type: "command"; payload: { input: string } }
  | { type: "reset" }
  | { type: "set-mode"; payload: { mode: "learn" | "practice" | "real" } }
  | { type: "review"; payload: { command: string; success: boolean } };

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

let state: WorkerState | null = null;

const sanitize = (value: unknown): unknown => {
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      const cleaned = sanitize(item);
      if (cleaned !== undefined) output[key] = cleaned;
    });
    return output;
  }
  return value;
};

const post = (payload: Record<string, unknown>) => {
  const safePayload = sanitize(payload) as Record<string, unknown>;
  ctx.postMessage(safePayload);
};

const buildLessonPayload = (learning: LearningState) => {
  const lesson = getActiveLesson(learning);
  const step = lesson.steps[learning.stepIndex];
  return {
    lessonTitle: lesson.title,
    lessonDescription: lesson.description,
    stepTitle: step?.title ?? "",
    stepInstruction: step?.instruction ?? "",
    stepExplanation: step?.explanation ?? "",
    progress: `${Math.min(learning.stepIndex + 1, lesson.steps.length)}/${lesson.steps.length}`,
    focusCommand: lesson.focusCommand,
  };
};

const serializeCommand = (command: (typeof COMMANDS)[number] | null | undefined): CommandInfo | null => {
  if (!command) return null;
  const { name, description, usage, supportedFlags, example, realWorld } = command;
  return { name, description, usage, supportedFlags, example, realWorld };
};

const buildTree = () => {
  if (!state) return [];
  return buildTreeNodes(state.fs, state.cwdId);
};

const handleCommand = (input: string) => {
  if (!state) return;
  const normalized = input.trim();
  if (!normalized) return;

  const result = runCommand(normalized, {
    fileSystem: state.fs,
    cwdId: state.cwdId,
    user: state.username,
    history: state.history,
  });

  const nextFs = result.state ?? state.fs;
  const nextCwd = result.cwdId ?? state.cwdId;
  const history = [...state.history, normalized];

  const ok = !result.error;
  const learningResult = evaluateLearning(state.learning, nextFs, nextCwd, history, result.command ?? "", ok);
  state = {
    ...state,
    fs: nextFs,
    cwdId: nextCwd,
    history,
    learning: learningResult.state,
  };

  const lines = [
    { type: "input", text: `$ ${normalized}` },
    ...(result.error ? [{ type: "error", text: result.error }] : []),
    ...result.output.map((line) => ({ type: "output", text: line })),
  ];

  post({
    type: "result",
    payload: {
      lines,
      clearHistory: result.clearHistory ?? false,
      cwdPath: getPathSegments(state.fs, state.cwdId),
      tree: buildTree(),
      lesson: buildLessonPayload(state.learning),
      mastery: state.learning.mastery,
      xp: state.learning.xp,
      level: state.learning.level,
      badges: state.learning.badges,
      commandInfo: serializeCommand(result.meta?.commandDef),
      effect: result.effect ?? null,
      stepCompleted: learningResult.stepCompleted,
      lessonCompleted: learningResult.lessonCompleted,
      supportedCommands: COMMANDS.map((command) => command.name),
      srsDue: getDueReviews(state.learning),
      snapshot: { fs: state.fs, cwdId: state.cwdId, learning: state.learning },
    },
  });
};

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === "init") {
    const username = message.payload.username || "user";
    const restored = message.payload.snapshot;
    const fs = restored?.fs ?? createFileSystem(username);
    const cwdId =
      restored?.cwdId ?? Object.keys(fs.nodes).find((id) => fs.nodes[id].name === username) ?? fs.rootId;
    const learning = restored?.learning ?? createLearningState();
    state = {
      fs,
      cwdId,
      history: [],
      learning,
      snapshot: fs,
      homeId: cwdId,
      username,
      mode: message.payload.mode,
    };
    post({
      type: "ready",
      payload: {
        cwdPath: getPathSegments(fs, cwdId),
        tree: buildTree(),
        lesson: buildLessonPayload(learning),
        mastery: learning.mastery,
        xp: learning.xp,
        level: learning.level,
        badges: learning.badges,
        supportedCommands: COMMANDS.map((command) => command.name),
        srsDue: getDueReviews(learning),
      },
    });
    return;
  }
  if (!state) return;
  if (message.type === "reset") {
    state = {
      ...state,
      fs: state.snapshot,
      cwdId: state.homeId,
      history: [],
      learning: createLearningState(),
    };
    post({
      type: "reset",
      payload: {
        cwdPath: getPathSegments(state.fs, state.cwdId),
        tree: buildTree(),
        lesson: buildLessonPayload(state.learning),
        srsDue: getDueReviews(state.learning),
      },
    });
    return;
  }
  if (message.type === "review") {
    state = {
      ...state,
      learning: applySrsReview(state.learning, message.payload.command, message.payload.success),
    };
    post({
      type: "reviewed",
      payload: {
        mastery: state.learning.mastery,
        srsDue: getDueReviews(state.learning),
      },
    });
    return;
  }
  if (message.type === "set-mode") {
    state = { ...state, mode: message.payload.mode };
    post({ type: "mode", payload: { mode: state.mode } });
    return;
  }
  if (message.type === "command") {
    handleCommand(message.payload.input);
  }
};
