import type { FileSystemState } from "../core/filesystem/types";
import { LESSONS } from "./curriculum/lessons";
import type { LearningState, Lesson } from "./types";

const initialMastery = () => ({ success: 0, error: 0, srsLevel: 0, lastPracticed: Date.now() });

export const createLearningState = (): LearningState => ({
  lessonIndex: 0,
  stepIndex: 0,
  xp: 0,
  level: 1,
  mastery: {},
  badges: [],
});

export const getActiveLesson = (state: LearningState): Lesson => {
  return LESSONS[state.lessonIndex] ?? LESSONS[LESSONS.length - 1];
};

const updateMastery = (state: LearningState, command: string, ok: boolean): LearningState => {
  const current = state.mastery[command] ?? initialMastery();
  const next = {
    ...current,
    success: current.success + (ok ? 1 : 0),
    error: current.error + (ok ? 0 : 1),
    lastPracticed: Date.now(),
    srsLevel: ok ? Math.min(5, current.srsLevel + 1) : Math.max(0, current.srsLevel - 1),
  };
  return { ...state, mastery: { ...state.mastery, [command]: next } };
};

export const applySrsReview = (state: LearningState, command: string, ok: boolean): LearningState => {
  return updateMastery(state, command, ok);
};

const grantBadges = (state: LearningState): LearningState => {
  const badges = new Set(state.badges);
  const rmMastery = state.mastery.rm?.success ?? 0;
  if (rmMastery >= 10) badges.add("File Janitor");
  if (state.xp >= 100) badges.add("Starter Spark");
  return { ...state, badges: Array.from(badges) };
};

export type LearningUpdate = {
  state: LearningState;
  stepCompleted: boolean;
  lessonCompleted: boolean;
  activeLesson: Lesson;
};

export const evaluateLearning = (
  state: LearningState,
  fs: FileSystemState,
  cwdId: string,
  history: string[],
  command: string,
  ok: boolean
): LearningUpdate => {
  let nextState = updateMastery(state, command, ok);
  const activeLesson = getActiveLesson(nextState);
  const step = activeLesson.steps[nextState.stepIndex];
  let stepCompleted = false;
  let lessonCompleted = false;

  if (ok && step) {
    const actionOk = step.actionValidator(history);
    const stateOk = step.stateValidator(fs, cwdId);
    if (actionOk && stateOk) {
      stepCompleted = true;
      nextState = { ...nextState, stepIndex: nextState.stepIndex + 1, xp: nextState.xp + 10 };
      if (nextState.stepIndex >= activeLesson.steps.length) {
        lessonCompleted = true;
        nextState = {
          ...nextState,
          lessonIndex: Math.min(LESSONS.length - 1, nextState.lessonIndex + 1),
          stepIndex: 0,
          level: nextState.level + 1,
        };
      }
    }
  }

  nextState = grantBadges(nextState);
  return { state: nextState, stepCompleted, lessonCompleted, activeLesson: getActiveLesson(nextState) };
};
