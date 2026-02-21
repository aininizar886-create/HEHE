import { createId } from "../../utils/id";
import type { FileSystemState, FsEntry, FsNode, FsPermissions, FsResult } from "./types";

const defaultPermissions = (): FsPermissions => ({ read: true, write: true, execute: true });

const cloneState = (state: FileSystemState): FileSystemState => ({
  nodes: { ...state.nodes },
  rootId: state.rootId,
});

const nowIso = () => new Date().toISOString();

export const createFileSystem = (username: string): FileSystemState => {
  const rootId = createId();
  const homeId = createId();
  const userId = createId();
  const createdAt = nowIso();

  const root: FsNode = {
    id: rootId,
    name: "",
    type: "directory",
    parentId: null,
    children: [homeId],
    content: "",
    permissions: defaultPermissions(),
    owner: "root",
    createdAt,
    updatedAt: createdAt,
  };

  const home: FsNode = {
    id: homeId,
    name: "home",
    type: "directory",
    parentId: rootId,
    children: [userId],
    content: "",
    permissions: defaultPermissions(),
    owner: "root",
    createdAt,
    updatedAt: createdAt,
  };

  const userDir: FsNode = {
    id: userId,
    name: username,
    type: "directory",
    parentId: homeId,
    children: [],
    content: "",
    permissions: defaultPermissions(),
    owner: username,
    createdAt,
    updatedAt: createdAt,
  };

  return {
    rootId,
    nodes: {
      [rootId]: root,
      [homeId]: home,
      [userId]: userDir,
    },
  };
};

export const getNode = (state: FileSystemState, nodeId: string): FsNode | null =>
  state.nodes[nodeId] ?? null;

export const getPathSegments = (state: FileSystemState, nodeId: string): string[] => {
  const segments: string[] = [];
  let current = getNode(state, nodeId);
  while (current && current.parentId) {
    if (current.name) segments.push(current.name);
    current = current.parentId ? getNode(state, current.parentId) : null;
  }
  return segments.reverse();
};

export const findChildByName = (
  state: FileSystemState,
  parentId: string,
  name: string
): FsNode | null => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return null;
  const childId = parent.children.find((id) => state.nodes[id]?.name === name);
  return childId ? state.nodes[childId] ?? null : null;
};

const canAccess = (node: FsNode, permission: keyof FsPermissions): boolean => node.permissions[permission];

export const resolvePath = (
  state: FileSystemState,
  cwdId: string,
  targetPath: string
): FsResult<{ nodeId: string; path: string[] }> => {
  const normalized = targetPath.trim();
  if (!normalized) {
    return { value: { nodeId: cwdId, path: getPathSegments(state, cwdId) } };
  }

  const isAbsolute = normalized.startsWith("/");
  const segments = normalized
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");

  let currentId = isAbsolute ? state.rootId : cwdId;
  const pathSegments: string[] = isAbsolute ? [] : getPathSegments(state, cwdId);

  for (const segment of segments) {
    if (segment === "..") {
      const current = getNode(state, currentId);
      if (!current || current.parentId === null) {
        continue;
      }
      currentId = current.parentId;
      pathSegments.pop();
      continue;
    }
    const child = findChildByName(state, currentId, segment);
    if (!child) {
      return { error: true, message: `Path '${segment}' tidak ditemukan.` };
    }
    if (child.type !== "directory") {
      return { error: true, message: `'${segment}' bukan folder.` };
    }
    if (!canAccess(child, "execute")) {
      return { error: true, message: "Kamu tidak punya izin masuk folder itu." };
    }
    currentId = child.id;
    pathSegments.push(child.name);
  }

  return { value: { nodeId: currentId, path: pathSegments } };
};

export const resolveEntry = (
  state: FileSystemState,
  cwdId: string,
  targetPath: string
): FsResult<{ nodeId: string; path: string[] }> => {
  const normalized = targetPath.trim();
  if (!normalized) {
    return { error: true, message: "Path kosong." };
  }
  const isAbsolute = normalized.startsWith("/");
  const segments = normalized
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");

  let currentId = isAbsolute ? state.rootId : cwdId;
  const pathSegments: string[] = isAbsolute ? [] : getPathSegments(state, cwdId);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === "..") {
      const current = getNode(state, currentId);
      if (!current || current.parentId === null) {
        continue;
      }
      currentId = current.parentId;
      pathSegments.pop();
      continue;
    }
    const child = findChildByName(state, currentId, segment);
    if (!child) {
      return { error: true, message: `Path '${segment}' tidak ditemukan.` };
    }
    if (index < segments.length - 1 && child.type !== "directory") {
      return { error: true, message: `'${segment}' bukan folder.` };
    }
    currentId = child.id;
    if (child.name) pathSegments.push(child.name);
  }

  return { value: { nodeId: currentId, path: pathSegments } };
};

export const listDirectory = (state: FileSystemState, nodeId: string): FsResult<FsEntry[]> => {
  const node = getNode(state, nodeId);
  if (!node) return { error: true, message: "Folder tidak ditemukan." };
  if (node.type !== "directory") return { error: true, message: "Itu bukan folder." };
  if (!canAccess(node, "read")) return { error: true, message: "Tidak ada izin membaca folder." };
  const entries = node.children
    .map((childId) => state.nodes[childId])
    .filter(Boolean)
    .map((child) => ({ id: child.id, name: child.name, type: child.type }));
  return { value: entries };
};

const withUpdatedNode = (state: FileSystemState, node: FsNode): FileSystemState => {
  const next = cloneState(state);
  next.nodes[node.id] = node;
  return next;
};

const insertChild = (state: FileSystemState, parent: FsNode, childId: string): FileSystemState => {
  const next = cloneState(state);
  next.nodes[parent.id] = { ...parent, children: [...parent.children, childId], updatedAt: nowIso() };
  return next;
};

export const makeDirectory = (
  state: FileSystemState,
  parentId: string,
  name: string,
  owner: string
): FsResult<FileSystemState> => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return { error: true, message: "Folder tujuan tidak ada." };
  if (!canAccess(parent, "write")) return { error: true, message: "Tidak ada izin membuat folder di sini." };
  if (findChildByName(state, parentId, name)) return { error: true, message: "Nama itu sudah dipakai." };

  const createdAt = nowIso();
  const dirId = createId();
  const newDir: FsNode = {
    id: dirId,
    name,
    type: "directory",
    parentId,
    children: [],
    content: "",
    permissions: defaultPermissions(),
    owner,
    createdAt,
    updatedAt: createdAt,
  };

  let next = cloneState(state);
  next.nodes[dirId] = newDir;
  next = insertChild(next, parent, dirId);
  return { value: next };
};

export const makeFile = (
  state: FileSystemState,
  parentId: string,
  name: string,
  owner: string
): FsResult<FileSystemState> => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return { error: true, message: "Folder tujuan tidak ada." };
  if (!canAccess(parent, "write")) return { error: true, message: "Tidak ada izin menulis di folder ini." };
  const existing = findChildByName(state, parentId, name);
  if (existing && existing.type === "directory") return { error: true, message: "Nama itu sudah dipakai folder." };
  if (existing) {
    const touched = { ...existing, updatedAt: nowIso() };
    return { value: withUpdatedNode(state, touched) };
  }

  const createdAt = nowIso();
  const fileId = createId();
  const newFile: FsNode = {
    id: fileId,
    name,
    type: "file",
    parentId,
    children: [],
    content: "",
    permissions: defaultPermissions(),
    owner,
    createdAt,
    updatedAt: createdAt,
  };

  let next = cloneState(state);
  next.nodes[fileId] = newFile;
  next = insertChild(next, parent, fileId);
  return { value: next };
};

export const readFile = (state: FileSystemState, nodeId: string): FsResult<string> => {
  const node = getNode(state, nodeId);
  if (!node) return { error: true, message: "File tidak ditemukan." };
  if (node.type !== "file") return { error: true, message: "Itu bukan file." };
  if (!canAccess(node, "read")) return { error: true, message: "Tidak ada izin membaca file." };
  return { value: node.content };
};

export const writeFile = (
  state: FileSystemState,
  parentId: string,
  name: string,
  owner: string,
  content: string,
  append = false
): FsResult<FileSystemState> => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return { error: true, message: "Folder tujuan tidak ada." };
  if (!canAccess(parent, "write")) return { error: true, message: "Tidak ada izin menulis di folder ini." };
  const existing = findChildByName(state, parentId, name);
  if (existing && existing.type === "directory") return { error: true, message: "Tidak bisa tulis ke folder." };
  if (!existing) {
    const createdAt = nowIso();
    const fileId = createId();
    const newFile: FsNode = {
      id: fileId,
      name,
      type: "file",
      parentId,
      children: [],
      content,
      permissions: defaultPermissions(),
      owner,
      createdAt,
      updatedAt: createdAt,
    };
    let next = cloneState(state);
    next.nodes[fileId] = newFile;
    next = insertChild(next, parent, fileId);
    return { value: next };
  }

  const nextContent = append ? `${existing.content}${content}` : content;
  const updated: FsNode = { ...existing, content: nextContent, updatedAt: nowIso() };
  return { value: withUpdatedNode(state, updated) };
};

const removeChild = (state: FileSystemState, parentId: string, childId: string): FileSystemState => {
  const parent = getNode(state, parentId);
  if (!parent) return state;
  const next = cloneState(state);
  next.nodes[parentId] = {
    ...parent,
    children: parent.children.filter((id) => id !== childId),
    updatedAt: nowIso(),
  };
  return next;
};

const removeNodeRecursive = (state: FileSystemState, nodeId: string): FileSystemState => {
  const node = getNode(state, nodeId);
  if (!node) return state;
  let next = cloneState(state);
  if (node.type === "directory") {
    node.children.forEach((childId) => {
      next = removeNodeRecursive(next, childId);
    });
  }
  delete next.nodes[nodeId];
  return next;
};

export const removeEntry = (
  state: FileSystemState,
  parentId: string,
  name: string,
  recursive = false
): FsResult<FileSystemState> => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return { error: true, message: "Folder tujuan tidak ada." };
  const entry = findChildByName(state, parentId, name);
  if (!entry) return { error: true, message: "File atau folder tidak ditemukan." };
  if (entry.id === state.rootId) return { error: true, message: "Root tidak bisa dihapus." };
  if (!canAccess(parent, "write")) return { error: true, message: "Tidak ada izin menghapus di sini." };

  if (entry.type === "directory" && entry.children.length > 0 && !recursive) {
    return { error: true, message: "Folder tidak kosong. Gunakan -r." };
  }

  let next = cloneState(state);
  next = removeNodeRecursive(next, entry.id);
  next = removeChild(next, parentId, entry.id);
  return { value: next };
};

export const moveEntry = (
  state: FileSystemState,
  sourceId: string,
  targetParentId: string,
  newName?: string
): FsResult<FileSystemState> => {
  if (sourceId === state.rootId) return { error: true, message: "Root tidak bisa dipindah." };
  const source = getNode(state, sourceId);
  const targetParent = getNode(state, targetParentId);
  if (!source) return { error: true, message: "Source tidak ditemukan." };
  if (!targetParent || targetParent.type !== "directory") return { error: true, message: "Target bukan folder." };
  if (isDescendant(state, sourceId, targetParentId)) {
    return { error: true, message: "Tidak bisa memindahkan folder ke dalam dirinya sendiri." };
  }
  if (!canAccess(targetParent, "write")) return { error: true, message: "Tidak ada izin menulis di folder target." };
  const nextName = newName ?? source.name;
  if (findChildByName(state, targetParentId, nextName)) {
    return { error: true, message: "Nama target sudah ada." };
  }

  let next = cloneState(state);
  if (source.parentId) {
    next = removeChild(next, source.parentId, sourceId);
  }

  const updatedSource = { ...source, name: nextName, parentId: targetParentId, updatedAt: nowIso() };
  next.nodes[sourceId] = updatedSource;
  next = insertChild(next, targetParent, sourceId);
  return { value: next };
};

const cloneSubtree = (state: FileSystemState, nodeId: string, owner: string): { next: FileSystemState; newId: string } => {
  const node = getNode(state, nodeId);
  if (!node) return { next: state, newId: nodeId };
  const newId = createId();
  const cloned: FsNode = {
    ...node,
    id: newId,
    owner,
    parentId: null,
    children: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  let next = cloneState(state);
  next.nodes[newId] = cloned;
  if (node.type === "directory") {
    node.children.forEach((childId) => {
      const result = cloneSubtree(next, childId, owner);
      next = result.next;
      const childClone = getNode(next, result.newId);
      if (childClone) {
        next.nodes[newId] = {
          ...next.nodes[newId],
          children: [...next.nodes[newId].children, result.newId],
        };
        next.nodes[result.newId] = { ...childClone, parentId: newId };
      }
    });
  }
  return { next, newId };
};

const isDescendant = (state: FileSystemState, nodeId: string, targetParentId: string): boolean => {
  let current = getNode(state, targetParentId);
  while (current) {
    if (current.id === nodeId) return true;
    if (!current.parentId) break;
    current = getNode(state, current.parentId);
  }
  return false;
};

export const copyEntry = (
  state: FileSystemState,
  sourceId: string,
  targetParentId: string,
  newName: string | undefined,
  owner: string
): FsResult<FileSystemState> => {
  const source = getNode(state, sourceId);
  const targetParent = getNode(state, targetParentId);
  if (!source) return { error: true, message: "Source tidak ditemukan." };
  if (!targetParent || targetParent.type !== "directory") return { error: true, message: "Target bukan folder." };
  if (!canAccess(targetParent, "write")) return { error: true, message: "Tidak ada izin menulis di folder target." };
  const desiredName = newName ?? source.name;
  if (findChildByName(state, targetParentId, desiredName)) {
    return { error: true, message: "Nama target sudah ada." };
  }

  const result = cloneSubtree(state, sourceId, owner);
  let next = result.next;
  const cloned = getNode(next, result.newId);
  if (!cloned) return { error: true, message: "Gagal menyalin file." };
  next.nodes[result.newId] = { ...cloned, name: desiredName, parentId: targetParentId };
  next = insertChild(next, targetParent, result.newId);
  return { value: next };
};

export const treeLines = (state: FileSystemState, nodeId: string, depth = 0, maxDepth = 4): string[] => {
  if (depth > maxDepth) return [];
  const node = getNode(state, nodeId);
  if (!node || node.type !== "directory") return [];
  const lines: string[] = [];
  node.children.forEach((childId, index) => {
    const child = getNode(state, childId);
    if (!child) return;
    const isLast = index === node.children.length - 1;
    const prefix = `${"│   ".repeat(depth)}${isLast ? "└── " : "├── "}`;
    lines.push(`${prefix}${child.name}${child.type === "directory" ? "/" : ""}`);
    if (child.type === "directory") {
      lines.push(...treeLines(state, child.id, depth + 1, maxDepth));
    }
  });
  return lines;
};
