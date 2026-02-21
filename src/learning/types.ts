import type { FileSystemState } from "../core/filesystem/types";

export type LessonStep = {
  id: string;
  title: string;
  instruction: string;
  focusCommand: string;
  explanation: string;
  actionValidator: (history: string[]) => boolean;
  stateValidator: (state: FileSystemState, cwdId: string) => boolean;
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  focusCommand: string;
  steps: LessonStep[];
  difficulty: "beginner" | "intermediate" | "advanced";
};

export type LearningState = {
  lessonIndex: number;
  stepIndex: number;
  xp: number;
  level: number;
  mastery: Record<string, { success: number; error: number; srsLevel: number; lastPracticed: number }>;
  badges: string[];
};
