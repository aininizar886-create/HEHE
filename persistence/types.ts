import type { FileSystemState } from "../core/filesystem/types";
import type { SystemInfo } from "../core/system/systemInfo";
import type { LearningState } from "../learning/types";

export type TerminalSnapshot = {
  schemaVersion: number;
  savedAt: string;
  fileSystem: FileSystemState;
  cwdId: string;
  systemInfo: SystemInfo;
  learning: LearningState;
  history: string[];
};
