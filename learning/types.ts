import type { FileSystemState } from "../core/filesystem/types";

export type LearningContext = {
  fileSystem: FileSystemState;
  cwdId: string;
  lastCommand: string | null;
  lastOutput: string | null;
  commandHistory: string[];
};

export type LearningStep = {
  id: string;
  title: string;
  instruction: string;
  hint: string;
  explanation: string;
  requiredCommands: string[];
  validator: (context: LearningContext) => boolean;
  difficulty: "basic" | "intermediate" | "advanced";
  type: "construction" | "refactor" | "debug" | "search" | "content";
};

export type LearningBatch = {
  id: string;
  level: number;
  steps: LearningStep[];
  createdAt: string;
};

export type LearningProgress = {
  usedCommands: string[];
  mastery: Record<string, number>;
  level: number;
  recentTasks: string[];
  completedSteps: number;
  errors: number;
  averageDurationMs: number;
};

export type LearningState = {
  batch: LearningBatch;
  activeIndex: number;
  progress: LearningProgress;
  activeStartedAt: number;
};
