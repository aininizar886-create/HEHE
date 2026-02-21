import type { LearningState } from "../types";

export const getDueReviews = (state: LearningState): string[] => {
  const now = Date.now();
  const due: string[] = [];
  Object.entries(state.mastery).forEach(([command, meta]) => {
    const interval = (meta.srsLevel + 1) * 60 * 60 * 1000;
    if (now - meta.lastPracticed > interval) {
      due.push(command);
    }
  });
  return due;
};
