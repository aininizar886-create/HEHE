import type { LearningContext, LearningProgress, LearningState } from "./types";
import { buildTaskConstraints } from "./taskConstraints";
import { buildStepFromConstraints } from "./taskGenerator";
import { createInitialProgress, registerCommandUsage, registerError, registerStepCompletion } from "./progress";
import { createId } from "../utils/id";

const MAX_TASKS_PER_BATCH = 10;

export const buildLearningBatch = (progress: LearningProgress): LearningState["batch"] => {
  const steps = [] as LearningState["batch"]["steps"];
  let recentTasks = [...progress.recentTasks];
  for (let index = 0; index < MAX_TASKS_PER_BATCH; index += 1) {
    const constraints = buildTaskConstraints({
      ...progress,
      recentTasks,
      level: progress.level,
    });
    const step = buildStepFromConstraints(constraints);
    steps.push(step);
    recentTasks = [...recentTasks, step.title].slice(-6);
  }
  return {
    id: createId(),
    level: progress.level,
    steps,
    createdAt: new Date().toISOString(),
  };
};

export const createInitialLearningState = (): LearningState => {
  const progress = createInitialProgress();
  const draft: LearningState = {
    batch: { id: createId(), level: 1, steps: [], createdAt: new Date().toISOString() },
    activeIndex: 0,
    progress,
    activeStartedAt: Date.now(),
  };
  return { ...draft, batch: buildLearningBatch(progress) };
};

export const restoreLearningState = (snapshot?: LearningState | null): LearningState => {
  if (!snapshot) return createInitialLearningState();
  const base = createInitialLearningState();
  const progress = snapshot.progress ? { ...base.progress, ...snapshot.progress } : base.progress;
  const batch = buildLearningBatch(progress);
  const activeIndex = Math.min(snapshot.activeIndex ?? 0, Math.max(0, batch.steps.length - 1));
  return {
    ...base,
    progress,
    batch,
    activeIndex,
    activeStartedAt: Date.now(),
  };
};

export type LearningEvent = {
  type: "step-complete" | "batch-complete" | "error" | "hint";
  message: string;
  explanation?: string;
};

export const evaluateLearning = (
  state: LearningState,
  context: LearningContext,
  command: string,
  hadError: boolean
): { state: LearningState; events: LearningEvent[] } => {
  const nextState = { ...state, progress: { ...state.progress } };
  const events: LearningEvent[] = [];

  nextState.progress = registerCommandUsage(nextState.progress, command);
  if (hadError) {
    nextState.progress = registerError(nextState.progress);
    events.push({ type: "error", message: "Masih ada yang perlu dibenerin. Coba ulang ya." });
    return { state: nextState, events };
  }

  const activeStep = nextState.batch.steps[nextState.activeIndex];
  if (!activeStep) return { state: nextState, events };

  if (activeStep.validator(context)) {
    const durationMs = Math.max(0, Date.now() - nextState.activeStartedAt);
    nextState.progress = registerStepCompletion(nextState.progress, durationMs, activeStep.requiredCommands);
    nextState.progress.recentTasks = [...nextState.progress.recentTasks, activeStep.title].slice(-6);

    events.push({
      type: "step-complete",
      message: `✅ ${activeStep.title} selesai!`,
      explanation: activeStep.explanation,
    });

    const nextIndex = nextState.activeIndex + 1;
    if (nextIndex >= nextState.batch.steps.length) {
      nextState.progress.level = Math.min(nextState.progress.level + 1, 5);
      nextState.batch = buildLearningBatch(nextState.progress);
      nextState.activeIndex = 0;
      nextState.activeStartedAt = Date.now();
      events.push({
        type: "batch-complete",
        message: "🎉 Batch 10 task selesai. Batch baru siap!",
      });
    } else {
      nextState.activeIndex = nextIndex;
      nextState.activeStartedAt = Date.now();
    }
  }

  return { state: nextState, events };
};
