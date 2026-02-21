import {
  buildTree,
  copyEntry,
  findChild,
  getNode,
  getPathSegments,
  listDirectory,
  makeDirectory,
  makeFile,
  moveEntry,
  readFile,
  removeEntry,
  resolvePath,
} from "../filesystem/fs";
import type { CommandDefinition } from "./types";

const canRead = (node: ReturnType<typeof getNode>) => Boolean(node?.permissions.read);
const canWrite = (node: ReturnType<typeof getNode>) => Boolean(node?.permissions.write);
const canExecute = (node: ReturnType<typeof getNode>) => Boolean(node?.permissions.execute);

const formatPermissions = (node: ReturnType<typeof getNode> | null) => {
  if (!node) return "---------";
  const r = node.permissions.read ? "r" : "-";
  const w = node.permissions.write ? "w" : "-";
  const x = node.permissions.execute ? "x" : "-";
  return `${r}${w}${x}`;
};

const longListLine = (
  name: string,
  type: "file" | "directory",
  size: number,
  owner: string,
  node?: ReturnType<typeof getNode>
) => {
  const perms = type === "directory" ? `d${formatPermissions(node ?? null)}` : `-${formatPermissions(node ?? null)}`;
  return `${perms} 1 ${owner} ${size.toString().padStart(4, " ")} ${name}${type === "directory" ? "/" : ""}`;
};

export const COMMANDS: CommandDefinition[] = [
  {
    name: "pwd",
    description: "Menampilkan lokasi folder saat ini.",
    usage: "pwd",
    supportedFlags: [],
    example: "pwd",
    realWorld: "Pakai untuk memastikan kamu ada di folder yang benar sebelum menghapus file.",
    execute: (_args, _flags, context) => {
      const segments = getPathSegments(context.fileSystem, context.cwdId);
      return { output: [segments.length ? `/${segments.join("/")}` : "/"] };
    },
  },
  {
    name: "ls",
    description: "Melihat isi folder.",
    usage: "ls [-a] [-l]",
    supportedFlags: ["-a", "-l"],
    example: "ls -a",
    realWorld: "Cek file yang tersedia sebelum membuka atau menghapus.",
    execute: (_args, flags, context) => {
      const cwdNode = getNode(context.fileSystem, context.cwdId);
      if (!cwdNode) return { error: "Folder tidak ditemukan." };
      if (!canRead(cwdNode)) return { error: "Tidak punya izin membaca folder ini." };
      const showHidden = Boolean(flags.a);
      const longFormat = Boolean(flags.l);
      const result = listDirectory(context.fileSystem, context.cwdId, showHidden);
      if (!result.ok) return { error: result.error };
      const entries = result.value
        .map((entry) => {
          if (longFormat) {
            const node = getNode(context.fileSystem, entry.id);
            const size = node?.type === "file" ? node.content.length : node?.children.length ?? 0;
            return longListLine(entry.name, entry.type, size, node?.owner ?? context.user, node);
          }
          return `${entry.name}${entry.type === "directory" ? "/" : ""}`;
        })
        .sort((a, b) => a.localeCompare(b));
      if (!entries.length) return { output: ["(kosong)"] };
      return { output: [entries.join(longFormat ? "\n" : "  ")] };
    },
  },
  {
    name: "cd",
    description: "Berpindah folder.",
    usage: "cd <path>",
    supportedFlags: [],
    example: "cd /home",
    realWorld: "Navigasi ke folder project sebelum menjalankan perintah lain.",
    execute: (args, _flags, context) => {
      const target = args[0];
      if (!target) return { error: "Mau pindah ke mana?" };
      const resolved = resolvePath(context.fileSystem, context.cwdId, target, false);
      if (!resolved.ok) return { error: resolved.error };
      if (!canExecute(resolved.value.node)) return { error: "Tidak punya izin masuk ke folder ini." };
      return { state: { cwdId: resolved.value.node.id } };
    },
  },
  {
    name: "mkdir",
    description: "Membuat folder baru.",
    usage: "mkdir [-p] <nama>",
    supportedFlags: ["-p", "-v"],
    example: "mkdir projek",
    realWorld: "Merapikan file dengan membuat folder khusus.",
    execute: (args, flags, context) => {
      const name = args[0];
      if (!name) return { error: "Kasih nama folder dulu." };
      if (flags.p && name.includes("/")) {
        const parts = name.split("/").filter(Boolean);
        let currentId = context.cwdId;
        let fs = context.fileSystem;
        for (const part of parts) {
          const existing = findChild(fs, currentId, part);
          if (existing && existing.type === "directory") {
            currentId = existing.id;
            continue;
          }
          const currentNode = getNode(fs, currentId);
          if (!currentNode || !canWrite(currentNode)) return { error: "Tidak punya izin menulis di folder ini." };
          const created = makeDirectory(fs, currentId, part, context.user);
          if (!created.ok) return { error: created.error };
          fs = created.value;
          currentId = findChild(fs, currentId, part)?.id ?? currentId;
        }
        return { output: flags.v ? ["Folder dibuat (recursive)."] : undefined, state: { fileSystem: fs } };
      }
      const cwdNode = getNode(context.fileSystem, context.cwdId);
      if (!cwdNode || !canWrite(cwdNode)) return { error: "Tidak punya izin menulis di folder ini." };
      const created = makeDirectory(context.fileSystem, context.cwdId, name, context.user);
      if (!created.ok) return { error: created.error };
      return { output: ["Folder dibuat."], state: { fileSystem: created.value } };
    },
  },
  {
    name: "touch",
    description: "Membuat file kosong.",
    usage: "touch <nama>",
    supportedFlags: [],
    example: "touch catatan.txt",
    realWorld: "Siapkan file baru sebelum diisi data.",
    execute: (args, _flags, context) => {
      const name = args[0];
      if (!name) return { error: "Kasih nama file dulu." };
      const cwdNode = getNode(context.fileSystem, context.cwdId);
      if (!cwdNode || !canWrite(cwdNode)) return { error: "Tidak punya izin menulis di folder ini." };
      const created = makeFile(context.fileSystem, context.cwdId, name, context.user);
      if (!created.ok) return { error: created.error };
      return { output: ["File siap."], state: { fileSystem: created.value } };
    },
  },
  {
    name: "cat",
    description: "Membaca isi file.",
    usage: "cat <file>",
    supportedFlags: [],
    example: "cat catatan.txt",
    realWorld: "Cek isi file konfigurasi sebelum diedit.",
    execute: (args, _flags, context) => {
      const name = args[0];
      if (!name) {
        if (context.input && context.input.length) {
          return { output: context.input.length ? context.input : ["(tidak ada input)"] };
        }
        return { error: "Sebut nama file." };
      }
      const resolved = resolvePath(context.fileSystem, context.cwdId, name, true);
      if (!resolved.ok) return { error: resolved.error };
      if (resolved.value.node.type !== "file") return { error: "Itu bukan file." };
      if (!canRead(resolved.value.node)) return { error: "Tidak punya izin membaca file ini." };
      const content = readFile(context.fileSystem, resolved.value.node.id);
      if (!content.ok) return { error: content.error };
      return { output: [content.value || "(file kosong)"] };
    },
  },
  {
    name: "echo",
    description: "Menampilkan teks.",
    usage: "echo <teks>",
    supportedFlags: [],
    example: "echo halo",
    realWorld: "Cocok untuk cek variabel atau menulis ke file dengan redirect.",
    execute: (args) => ({ output: [args.join(" ")] }),
  },
  {
    name: "grep",
    description: "Mencari kata di file atau input pipe.",
    usage: "grep [-i] <kata> [file]",
    supportedFlags: ["-i"],
    example: "grep halo catatan.txt",
    realWorld: "Cari error tertentu di log aplikasi.",
    execute: (args, flags, context) => {
      const needle = args[0];
      if (!needle) return { error: "Format: grep <kata> [file]" };
      const ignoreCase = Boolean(flags.i);
      const matcher = (line: string) => {
        if (ignoreCase) return line.toLowerCase().includes(needle.toLowerCase());
        return line.includes(needle);
      };
      let lines: string[] = [];
      if (args[1]) {
        const resolved = resolvePath(context.fileSystem, context.cwdId, args[1], true);
        if (!resolved.ok) return { error: resolved.error };
        if (resolved.value.node.type !== "file") return { error: "Target harus file." };
        if (!canRead(resolved.value.node)) return { error: "Tidak punya izin membaca file ini." };
        const content = readFile(context.fileSystem, resolved.value.node.id);
        if (!content.ok) return { error: content.error };
        lines = content.value.split("\n");
      } else if (context.input && context.input.length) {
        lines = context.input;
      } else {
        return { error: "grep butuh file atau input pipe." };
      }
      const matched = lines.filter(matcher);
      return { output: matched.length ? matched : ["(tidak ada yang cocok)"] };
    },
  },
  {
    name: "find",
    description: "Mencari file/folder berdasarkan nama.",
    usage: "find [path] -name <pola>",
    supportedFlags: [],
    example: "find . -name catatan.txt",
    realWorld: "Cari file yang terselip di project besar.",
    execute: (args, _flags, context) => {
      let startPath = ".";
      let pattern = "";
      if (args.length === 1) {
        pattern = args[0];
      } else if (args[0] === "-name") {
        pattern = args[1] ?? "";
      } else if (args[1] === "-name") {
        startPath = args[0];
        pattern = args[2] ?? "";
      } else {
        pattern = args[1] ?? "";
      }
      if (!pattern) return { error: "Format: find [path] -name <pola>" };

      const resolved = resolvePath(context.fileSystem, context.cwdId, startPath, false);
      if (!resolved.ok) return { error: resolved.error };
      if (!canRead(resolved.value.node)) return { error: "Tidak punya izin membaca folder ini." };

      const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
      const results: string[] = [];
      const walk = (nodeId: string, prefix: string) => {
        const node = getNode(context.fileSystem, nodeId);
        if (!node) return;
        if (regex.test(node.name)) results.push(`${prefix}${node.name}`);
        if (node.type === "directory") {
          node.children.forEach((childId) => walk(childId, `${prefix}${node.name}/`));
        }
      };

      walk(resolved.value.node.id, resolved.value.node.id === context.cwdId ? "" : "/");
      return { output: results.length ? results : ["(tidak ditemukan)"] };
    },
  },
  {
    name: "chmod",
    description: "Mengubah permission sederhana (r/w/x).",
    usage: "chmod (+r|-r|+w|-w|+x|-x) <target>",
    supportedFlags: [],
    example: "chmod -w catatan.txt",
    realWorld: "Mengunci file agar tidak bisa diubah sembarang.",
    execute: (args, _flags, context) => {
      const mode = args[0];
      const target = args[1];
      if (!mode || !target) return { error: "Format: chmod (+r|-r|+w|-w|+x|-x) <target>" };
      if (!["+r", "-r", "+w", "-w", "+x", "-x"].includes(mode)) {
        return { error: "Mode tidak valid. Contoh: +x atau -w." };
      }
      const resolved = resolvePath(context.fileSystem, context.cwdId, target, true);
      if (!resolved.ok) return { error: resolved.error };
      const node = resolved.value.node;
      if (node.owner !== context.user) return { error: "Hanya owner yang bisa ubah permission." };
      const nextPerms = { ...node.permissions };
      if (mode.endsWith("r")) nextPerms.read = mode.startsWith("+");
      if (mode.endsWith("w")) nextPerms.write = mode.startsWith("+");
      if (mode.endsWith("x")) nextPerms.execute = mode.startsWith("+");
      const next = {
        ...context.fileSystem,
        nodes: {
          ...context.fileSystem.nodes,
          [node.id]: { ...node, permissions: nextPerms, updatedAt: Date.now() },
        },
      };
      return { output: ["Permission diperbarui."], state: { fileSystem: next } };
    },
  },
  {
    name: "rm",
    description: "Menghapus file atau folder.",
    usage: "rm [-r] <target>",
    supportedFlags: ["-r", "-f"],
    example: "rm catatan.txt",
    realWorld: "Membersihkan file yang tidak dipakai lagi.",
    execute: (args, flags, context) => {
      const target = args[0];
      if (!target) return { error: "Sebut nama file/folder." };
      const resolved = resolvePath(context.fileSystem, context.cwdId, target, true);
      if (!resolved.ok) return { error: resolved.error };
      const node = resolved.value.node;
      if (!node.parentId) return { error: "Root tidak bisa dihapus." };
      const parentNode = getNode(context.fileSystem, node.parentId);
      if (!parentNode || !canWrite(parentNode)) return { error: "Tidak punya izin menghapus di folder ini." };
      const removed = removeEntry(context.fileSystem, node.parentId, node.name, Boolean(flags.r));
      if (!removed.ok) return { error: removed.error };
      return { output: ["Berhasil dihapus."], state: { fileSystem: removed.value } };
    },
  },
  {
    name: "mv",
    description: "Memindahkan atau rename file/folder.",
    usage: "mv <source> <target>",
    supportedFlags: [],
    example: "mv draft.txt final.txt",
    realWorld: "Rename file sebelum upload ke server.",
    execute: (args, _flags, context) => {
      const source = args[0];
      const target = args[1];
      if (!source || !target) return { error: "Format: mv <source> <target>" };
      const sourceResolved = resolvePath(context.fileSystem, context.cwdId, source, true);
      if (!sourceResolved.ok) return { error: sourceResolved.error };
      if (sourceResolved.value.node.parentId) {
        const sourceParent = getNode(context.fileSystem, sourceResolved.value.node.parentId);
        if (!sourceParent || !canWrite(sourceParent)) return { error: "Tidak punya izin memindahkan dari folder ini." };
      }
      const targetResolved = resolvePath(context.fileSystem, context.cwdId, target, false);
      if (targetResolved.ok) {
        if (!canWrite(targetResolved.value.node)) return { error: "Tidak punya izin menaruh di folder target." };
        const moved = moveEntry(context.fileSystem, sourceResolved.value.node.id, targetResolved.value.node.id);
        if (!moved.ok) return { error: moved.error };
        return { output: ["Berhasil dipindah."], state: { fileSystem: moved.value } };
      }
      const parts = target.split("/").filter(Boolean);
      const newName = parts.pop();
      const parentPath = target.startsWith("/") ? `/${parts.join("/")}` : parts.join("/");
      const parentResolved = resolvePath(context.fileSystem, context.cwdId, parentPath || ".", false);
      if (!parentResolved.ok || !newName) return { error: "Target tidak valid." };
      if (!canWrite(parentResolved.value.node)) return { error: "Tidak punya izin menaruh di folder target." };
      const moved = moveEntry(context.fileSystem, sourceResolved.value.node.id, parentResolved.value.node.id, newName);
      if (!moved.ok) return { error: moved.error };
      return { output: ["Berhasil dipindah."], state: { fileSystem: moved.value } };
    },
  },
  {
    name: "cp",
    description: "Menyalin file/folder.",
    usage: "cp [-r] <source> <target>",
    supportedFlags: ["-r"],
    example: "cp catatan.txt backup.txt",
    realWorld: "Bikin backup sebelum edit file penting.",
    execute: (args, flags, context) => {
      const source = args[0];
      const target = args[1];
      if (!source || !target) return { error: "Format: cp <source> <target>" };
      const sourceResolved = resolvePath(context.fileSystem, context.cwdId, source, true);
      if (!sourceResolved.ok) return { error: sourceResolved.error };
      if (!canRead(sourceResolved.value.node)) return { error: "Tidak punya izin membaca source." };
      if (sourceResolved.value.node.type === "directory" && !flags.r) {
        return { error: "Folder perlu flag -r." };
      }
      const targetResolved = resolvePath(context.fileSystem, context.cwdId, target, false);
      if (targetResolved.ok) {
        if (!canWrite(targetResolved.value.node)) return { error: "Tidak punya izin menaruh di folder target." };
        const copied = copyEntry(
          context.fileSystem,
          sourceResolved.value.node.id,
          targetResolved.value.node.id,
          undefined,
          context.user
        );
        if (!copied.ok) return { error: copied.error };
        return { output: ["Berhasil disalin."], state: { fileSystem: copied.value } };
      }
      const parts = target.split("/").filter(Boolean);
      const newName = parts.pop();
      const parentPath = target.startsWith("/") ? `/${parts.join("/")}` : parts.join("/");
      const parentResolved = resolvePath(context.fileSystem, context.cwdId, parentPath || ".", false);
      if (!parentResolved.ok || !newName) return { error: "Target tidak valid." };
      if (!canWrite(parentResolved.value.node)) return { error: "Tidak punya izin menaruh di folder target." };
      const copied = copyEntry(
        context.fileSystem,
        sourceResolved.value.node.id,
        parentResolved.value.node.id,
        newName,
        context.user
      );
      if (!copied.ok) return { error: copied.error };
      return { output: ["Berhasil disalin."], state: { fileSystem: copied.value } };
    },
  },
  {
    name: "tree",
    description: "Menampilkan struktur folder.",
    usage: "tree",
    supportedFlags: [],
    example: "tree",
    realWorld: "Melihat struktur project secara cepat.",
    execute: (args, flags, context) => {
      void args;
      void flags;
      const cwdNode = getNode(context.fileSystem, context.cwdId);
      if (!cwdNode || !canRead(cwdNode)) return { error: "Tidak punya izin melihat struktur folder." };
      const lines = buildTree(context.fileSystem, context.cwdId);
      return { output: [lines.length ? [".", ...lines].join("\n") : ".\n(kosong)"] };
    },
  },
  {
    name: "help",
    description: "Menampilkan daftar command.",
    usage: "help",
    supportedFlags: [],
    example: "help",
    realWorld: "Cek command yang tersedia di sandbox ini.",
    execute: (args, flags, context) => {
      void args;
      void flags;
      void context;
      return {
        output: [
          "Commands: " +
            COMMANDS.map((command) => command.name)
              .sort()
              .join(", "),
        ],
      };
    },
  },
  {
    name: "history",
    description: "Melihat riwayat command.",
    usage: "history",
    supportedFlags: [],
    example: "history",
    realWorld: "Ingat langkah sebelumnya untuk debugging.",
    execute: (args, flags, context) => {
      void args;
      void flags;
      return {
        output: context.history.length
          ? context.history.map((item, index) => `${index + 1}  ${item}`)
          : ["(belum ada riwayat)"],
      };
    },
  },
  {
    name: "clear",
    description: "Membersihkan layar terminal.",
    usage: "clear",
    supportedFlags: [],
    example: "clear",
    realWorld: "Bikin terminal lebih rapi.",
    execute: () => ({ state: { clearHistory: true } }),
  },
];

export const commandRegistry = COMMANDS.reduce<Record<string, CommandDefinition>>((acc, command) => {
  acc[command.name] = command;
  return acc;
}, {});
