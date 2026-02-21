import { createId } from "../../utils/id";
import type { Lesson } from "../types";
import { getPathSegments, resolvePath } from "../../core/filesystem/fs";

export const LESSONS: Lesson[] = [
  {
    id: createId(),
    title: "Kenalan dengan Lokasi",
    description: "Belajar tahu kamu berada di folder mana.",
    focusCommand: "pwd",
    difficulty: "beginner",
    steps: [
      {
        id: createId(),
        title: "Cek lokasi sekarang",
        instruction: "Ketik pwd untuk melihat lokasi folder kamu.",
        focusCommand: "pwd",
        explanation: "pwd = print working directory. Ini seperti nanya: kamu lagi di ruangan mana?",
        actionValidator: (history) => history[history.length - 1]?.startsWith("pwd") ?? false,
        stateValidator: () => true,
      },
      {
        id: createId(),
        title: "Lihat isi folder",
        instruction: "Ketik ls untuk melihat isi folder.",
        focusCommand: "ls",
        explanation: "ls menampilkan isi folder. Analoginya: lihat isi lemari.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("ls") ?? false,
        stateValidator: () => true,
      },
    ],
  },
  {
    id: createId(),
    title: "Navigasi Folder",
    description: "Masuk dan keluar folder dengan aman.",
    focusCommand: "cd",
    difficulty: "beginner",
    steps: [
      {
        id: createId(),
        title: "Buat folder latihan",
        instruction: "Ketik mkdir latihan untuk membuat folder baru.",
        focusCommand: "mkdir",
        explanation: "mkdir membuat folder baru, seperti bikin kotak penyimpanan.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("mkdir") ?? false,
        stateValidator: (state, cwdId) => {
          const resolved = resolvePath(state, cwdId, "latihan", false);
          return resolved.ok;
        },
      },
      {
        id: createId(),
        title: "Masuk ke folder",
        instruction: "Ketik cd latihan untuk masuk ke folder latihan.",
        focusCommand: "cd",
        explanation: "cd = change directory, berpindah ruangan.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("cd") ?? false,
        stateValidator: (state, cwdId) => {
          const segments = getPathSegments(state, cwdId);
          return segments[segments.length - 1] === "latihan";
        },
      },
      {
        id: createId(),
        title: "Kembali ke atas",
        instruction: "Ketik cd .. untuk kembali ke folder sebelumnya.",
        focusCommand: "cd",
        explanation: "cd .. artinya naik satu tingkat folder.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("cd") ?? false,
        stateValidator: (state, cwdId) => {
          const segments = getPathSegments(state, cwdId);
          return segments[segments.length - 1] !== "latihan";
        },
      },
    ],
  },
  {
    id: createId(),
    title: "File Pertama",
    description: "Membuat dan membaca file sederhana.",
    focusCommand: "touch",
    difficulty: "beginner",
    steps: [
      {
        id: createId(),
        title: "Buat file",
        instruction: "Ketik touch catatan.txt untuk membuat file.",
        focusCommand: "touch",
        explanation: "touch membuat file kosong sebagai tempat menulis.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("touch") ?? false,
        stateValidator: (state, cwdId) => {
          const resolved = resolvePath(state, cwdId, "catatan.txt", true);
          return resolved.ok;
        },
      },
      {
        id: createId(),
        title: "Isi catatan",
        instruction: "Ketik echo " + '"' + "halo" + '"' + " > catatan.txt.",
        focusCommand: "echo",
        explanation: "echo menulis teks. Dengan >, teks masuk ke file.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("echo") ?? false,
        stateValidator: (state, cwdId) => {
          const resolved = resolvePath(state, cwdId, "catatan.txt", true);
          if (!resolved.ok || resolved.value.node.type !== "file") return false;
          return resolved.value.node.content.includes("halo");
        },
      },
      {
        id: createId(),
        title: "Baca isi file",
        instruction: "Ketik cat catatan.txt untuk membaca isi file.",
        focusCommand: "cat",
        explanation: "cat menampilkan isi file di terminal.",
        actionValidator: (history) => history[history.length - 1]?.startsWith("cat") ?? false,
        stateValidator: () => true,
      },
    ],
  },
];
