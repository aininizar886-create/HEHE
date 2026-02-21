import { readFile } from "../core/filesystem/filesystem";
import { createId } from "../utils/id";
import type { LearningBatch, LearningContext, LearningStep } from "./types";
import { buildTaskConstraints } from "./taskConstraints";
import type { TaskConstraints } from "./taskConstraints";

const randomName = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 6)}`;

const findNodeByName = (context: LearningContext, name: string, type: "file" | "directory") => {
  return Object.values(context.fileSystem.nodes).find((node) => node.name === name && node.type === type) ?? null;
};

const hasEntry = (context: LearningContext, name: string, type: "file" | "directory") => {
  return Boolean(findNodeByName(context, name, type));
};

const fileContains = (context: LearningContext, name: string, text: string) => {
  const node = findNodeByName(context, name, "file");
  if (!node) return false;
  const content = readFile(context.fileSystem, node.id);
  if (content.error) return false;
  return content.value.includes(text);
};

const createConstructionTask = (constraints: TaskConstraints): LearningStep => {
  const folder = randomName("project");
  const file = randomName("catatan") + ".txt";
  const text = "hello";
  return {
    id: createId(),
    title: "Bangun struktur dasar",
    instruction: `Buat folder '${folder}', masuk ke sana, lalu buat file '${file}' berisi kata '${text}'.`,
    hint: "Gunakan mkdir, cd, lalu echo > file.",
    explanation: "Tujuannya melatih navigasi folder + menulis file dengan redirect.",
    requiredCommands: ["mkdir", "cd", "echo"],
    difficulty: constraints.difficulty,
    type: "construction",
    validator: (context) =>
      hasEntry(context, folder, "directory") && hasEntry(context, file, "file") && fileContains(context, file, text),
  };
};

const createRefactorTask = (constraints: TaskConstraints): LearningStep => {
  const source = randomName("draft") + ".txt";
  const target = randomName("final") + ".txt";
  return {
    id: createId(),
    title: "Rapikan file",
    instruction: `Buat file '${source}', lalu rename jadi '${target}'.`,
    hint: "Gunakan touch lalu mv.",
    explanation: "Latihan rename file dengan mv.",
    requiredCommands: ["touch", "mv"],
    difficulty: constraints.difficulty,
    type: "refactor",
    validator: (context) => !hasEntry(context, source, "file") && hasEntry(context, target, "file"),
  };
};

const createDebugTask = (constraints: TaskConstraints): LearningStep => {
  const target = randomName("hapus") + ".log";
  return {
    id: createId(),
    title: "Bersihin file liar",
    instruction: `Buat file '${target}', lalu hapus file tersebut.`,
    hint: "Gunakan touch lalu rm.",
    explanation: "Latihan menghapus file dengan benar.",
    requiredCommands: ["touch", "rm"],
    difficulty: constraints.difficulty,
    type: "debug",
    validator: (context) => !hasEntry(context, target, "file"),
  };
};

const createContentTask = (constraints: TaskConstraints): LearningStep => {
  const file = randomName("note") + ".txt";
  const text = "melpin";
  return {
    id: createId(),
    title: "Isi catatan",
    instruction: `Buat file '${file}' lalu isi dengan kata '${text}'.`,
    hint: "Gunakan echo > file.",
    explanation: "Latihan redirect output ke file.",
    requiredCommands: ["echo"],
    difficulty: constraints.difficulty,
    type: "content",
    validator: (context) => hasEntry(context, file, "file") && fileContains(context, file, text),
  };
};

const createSearchTask = (constraints: TaskConstraints): LearningStep => ({
  id: createId(),
  title: "Pahami struktur",
  instruction: "Jalankan tree untuk melihat struktur folder sekarang.",
  hint: "Gunakan perintah tree.",
  explanation: "Tree membantu memahami struktur folder dengan cepat.",
  requiredCommands: ["tree"],
  difficulty: constraints.difficulty,
  type: "search",
  validator: (context) => context.lastCommand === "tree",
});

const buildTask = (constraints: TaskConstraints): LearningStep => {
  switch (constraints.type) {
    case "refactor":
      return createRefactorTask(constraints);
    case "debug":
      return createDebugTask(constraints);
    case "search":
      return createSearchTask(constraints);
    case "content":
      return createContentTask(constraints);
    default:
      return createConstructionTask(constraints);
  }
};

export const generateTaskBatch = (level: number, batchSize = 10): LearningBatch => {
  const steps: LearningStep[] = [];
  for (let i = 0; i < batchSize; i += 1) {
    const constraints = buildTaskConstraints({
      usedCommands: [],
      mastery: {},
      level,
      recentTasks: steps.map((step) => step.title),
      completedSteps: 0,
      errors: 0,
      averageDurationMs: 0,
    });
    steps.push(buildTask(constraints));
  }
  return {
    id: createId(),
    level,
    steps,
    createdAt: new Date().toISOString(),
  };
};

export const generateTaskBatchWithProgress = (progress: LearningBatch["steps"], level: number) => {
  return { batch: generateTaskBatch(level), progress };
};

export const buildStepFromConstraints = (constraints: TaskConstraints): LearningStep => buildTask(constraints);
