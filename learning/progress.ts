import type { LearningProgress } from "./types";

export const createInitialProgress = (): LearningProgress => ({
  usedCommands: [],
  mastery: {},
  level: 1,
  recentTasks: [],
  completedSteps: 0,
  errors: 0,
  averageDurationMs: 0,
});

export const registerCommandUsage = (
  progress: LearningProgress,
  command: string
): LearningProgress => {
  const usedCommands = progress.usedCommands.includes(command)
    ? progress.usedCommands
    : [...progress.usedCommands, command];
  const mastery = { ...progress.mastery };
  const current = mastery[command] ?? 0;
  mastery[command] = Math.min(1, current + 0.05);
  return { ...progress, usedCommands, mastery };
};

export const registerStepCompletion = (
  progress: LearningProgress,
  durationMs: number,
  requiredCommands: string[]
): LearningProgress => {
  const totalSteps = progress.completedSteps + 1;
  const averageDurationMs =
    progress.averageDurationMs === 0
      ? durationMs
      : Math.round((progress.averageDurationMs * progress.completedSteps + durationMs) / totalSteps);

  let updated = { ...progress, completedSteps: totalSteps, averageDurationMs };
  requiredCommands.forEach((command) => {
    updated = registerCommandUsage(updated, command);
  });

  return updated;
};

export const registerError = (progress: LearningProgress): LearningProgress => ({
  ...progress,
  errors: progress.errors + 1,
});
