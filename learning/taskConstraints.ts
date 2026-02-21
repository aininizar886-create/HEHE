import { getSkillNode, pickNextCommand } from "./skillGraph";
import type { LearningProgress } from "./types";

export type TaskConstraints = {
  level: number;
  mustInclude: string[];
  avoidCommands: string[];
  difficulty: "basic" | "intermediate" | "advanced";
  requireMultiStep: boolean;
  includeExplanation: boolean;
  includeValidationLogic: boolean;
  type: "construction" | "refactor" | "debug" | "search" | "content";
};

export const buildTaskConstraints = (progress: LearningProgress): TaskConstraints => {
  const level = Math.min(progress.level, 5);
  const node = getSkillNode(level);
  const mustInclude = [pickNextCommand(progress, node)];
  const avoidCommands = progress.recentTasks.slice(-2);
  const type = node.types[Math.floor(Math.random() * node.types.length)] ?? "construction";

  return {
    level,
    mustInclude,
    avoidCommands,
    difficulty: node.difficulty,
    requireMultiStep: true,
    includeExplanation: true,
    includeValidationLogic: true,
    type,
  };
};
