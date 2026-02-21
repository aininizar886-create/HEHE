import type { LearningProgress } from "./types";

export type SkillNode = {
  level: number;
  commands: string[];
  types: Array<"construction" | "refactor" | "debug" | "search" | "content">;
  difficulty: "basic" | "intermediate" | "advanced";
};

export const SKILL_GRAPH: SkillNode[] = [
  { level: 1, commands: ["pwd", "ls", "cd"], types: ["construction"], difficulty: "basic" },
  { level: 2, commands: ["mkdir", "touch", "cat"], types: ["construction", "content"], difficulty: "basic" },
  { level: 3, commands: ["rm", "rmdir"], types: ["debug", "refactor"], difficulty: "intermediate" },
  { level: 4, commands: ["mv", "cp"], types: ["refactor"], difficulty: "intermediate" },
  { level: 5, commands: ["echo", "tree"], types: ["content", "search"], difficulty: "intermediate" },
];

export const getSkillNode = (level: number): SkillNode => {
  return SKILL_GRAPH.find((node) => node.level === level) ?? SKILL_GRAPH[SKILL_GRAPH.length - 1];
};

export const pickNextCommand = (progress: LearningProgress, node: SkillNode): string => {
  const notMastered = node.commands.filter((command) => (progress.mastery[command] ?? 0) < 0.6);
  if (notMastered.length) return notMastered[0];
  return node.commands[0];
};
