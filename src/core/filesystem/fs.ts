import { createId } from "../../utils/id";
import type { FileSystemState, FsEntry, FsNode, FsPermissions, FsResult, FsNodeType } from "./types";

const now = () => Date.now();

const defaultPermissions = (type: FsNodeType): FsPermissions =>
  type === "directory" ? { read: true, write: true, execute: true } : { read: true, write: true, execute: false };

const canAccess = (node: FsNode, _user: string, permission: keyof FsPermissions): boolean => {
  return Boolean(node.permissions[permission]);
};

const cloneState = (state: FileSystemState): FileSystemState => ({
  rootId: state.rootId,
  nodes: { ...state.nodes },
});

const makeNode = (partial: Omit<FsNode, "createdAt" | "updatedAt">): FsNode => ({
  ...partial,
  createdAt: now(),
  updatedAt: now(),
});

export const createFileSystem = (username: string): FileSystemState => {
  const rootId = createId();
  const homeId = createId();
  const userId = createId();
  const envId = createId();

  const root = makeNode({
    id: rootId,
    name: "",
    type: "directory",
    parentId: null,
    children: [homeId],
    isHidden: false,
    content: "",
    permissions: defaultPermissions("directory"),
    owner: "root",
  });

  const home = makeNode({
    id: homeId,
    name: "home",
    type: "directory",
    parentId: rootId,
    children: [userId],
    isHidden: false,
    content: "",
    permissions: defaultPermissions("directory"),
    owner: "root",
  });

  const user = makeNode({
    id: userId,
    name: username,
    type: "directory",
    parentId: homeId,
    children: [envId],
    isHidden: false,
    content: "",
    permissions: defaultPermissions("directory"),
    owner: username,
  });

  const env = makeNode({
    id: envId,
    name: ".env",
    type: "file",
    parentId: userId,
    children: [],
    isHidden: true,
    content: "SECRET_KEY=123",
    permissions: defaultPermissions("file"),
    owner: username,
  });

  return {
    rootId,
    nodes: {
      [rootId]: root,
      [homeId]: home,
      [userId]: user,
      [envId]: env,
    },
  };
};

export const getNode = (state: FileSystemState, nodeId: string): FsNode | null => state.nodes[nodeId] ?? null;

export const getPathSegments = (state: FileSystemState, nodeId: string): string[] => {
  const segments: string[] = [];
  let current = getNode(state, nodeId);
  while (current && current.parentId) {
    if (current.name) segments.push(current.name);
    current = current.parentId ? getNode(state, current.parentId) : null;
  }
  return segments.reverse();
};

export const findChild = (state: FileSystemState, parentId: string, name: string): FsNode | null => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return null;
  const childId = parent.children.find((id) => state.nodes[id]?.name === name);
  return childId ? state.nodes[childId] ?? null : null;
};

export const resolvePath = (
  state: FileSystemState,
  cwdId: string,
  target: string,
  allowFile = true
): FsResult<{ node: FsNode; path: string[] }> => {
  const raw = target.trim();
  if (!raw) return { ok: false, error: "Path kosong." };

  const isAbsolute = raw.startsWith("/");
  const segments = raw
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".");

  let current = isAbsolute ? state.rootId : cwdId;
  const pathSegments = isAbsolute ? [] : getPathSegments(state, cwdId);

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === "..") {
      const node = getNode(state, current);
      if (!node || !node.parentId) continue;
      current = node.parentId;
      pathSegments.pop();
      continue;
    }
    const child = findChild(state, current, segment);
    if (!child) return { ok: false, error: `Path '${segment}' tidak ditemukan.` };
    if (index < segments.length - 1 && child.type !== "directory") {
      return { ok: false, error: `Path '${segment}' bukan folder.` };
    }
    if (!allowFile && child.type !== "directory") {
      return { ok: false, error: "Target harus berupa folder." };
    }
    current = child.id;
    pathSegments.push(child.name);
  }

  const node = getNode(state, current);
  if (!node) return { ok: false, error: "Target tidak ditemukan." };
  return { ok: true, value: { node, path: pathSegments } };
};

export const listDirectory = (state: FileSystemState, nodeId: string, showHidden = false): FsResult<FsEntry[]> => {
  const node = getNode(state, nodeId);
  if (!node || node.type !== "directory") return { ok: false, error: "Folder tidak ditemukan." };
  const entries = node.children
    .map((id) => state.nodes[id])
    .filter(Boolean)
    .filter((child) => showHidden || !child.isHidden)
    .map((child) => ({ id: child.id, name: child.name, type: child.type, isHidden: child.isHidden }));
  return { ok: true, value: entries };
};

export const makeDirectory = (
  state: FileSystemState,
  parentId: string,
  name: string,
  owner: string
): FsResult<FileSystemState> => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return { ok: false, error: "Folder tujuan tidak ditemukan." };
  if (findChild(state, parentId, name)) return { ok: false, error: "Nama sudah dipakai." };

  const dirId = createId();
  const dirNode = makeNode({
    id: dirId,
    name,
    type: "directory",
    parentId,
    children: [],
    isHidden: name.startsWith("."),
    content: "",
    permissions: defaultPermissions("directory"),
    owner,
  });

  const next = cloneState(state);
  next.nodes[dirId] = dirNode;
  next.nodes[parentId] = { ...parent, children: [...parent.children, dirId], updatedAt: now() };
  return { ok: true, value: next };
};

export const makeFile = (
  state: FileSystemState,
  parentId: string,
  name: string,
  owner: string
): FsResult<FileSystemState> => {
  const parent = getNode(state, parentId);
  if (!parent || parent.type !== "directory") return { ok: false, error: "Folder tujuan tidak ditemukan." };
  const existing = findChild(state, parentId, name);
  if (existing && existing.type === "directory") return { ok: false, error: "Nama itu folder." };
  if (existing) {
    const next = cloneState(state);
    next.nodes[existing.id] = { ...existing, updatedAt: now() };
    return { ok: true, value: next };
  }

  const fileId = createId();
  const fileNode = makeNode({
    id: fileId,
    name,
    type: "file",
    parentId,
    children: [],
    isHidden: name.startsWith("."),
    content: "",
    permissions: defaultPermissions("file"),
    owner,
  });

  const next = cloneState(state);
  next.nodes[fileId] = fileNode;
  next.nodes[parentId] = { ...parent, children: [...parent.children, fileId], updatedAt: now() };
  return { ok: true, value: next };
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
  if (!parent || parent.type !== "directory") return { ok: false, error: "Folder tujuan tidak ditemukan." };
  if (!canAccess(parent, owner, "write")) return { ok: false, error: "Tidak punya izin menulis di folder ini." };
  const existing = findChild(state, parentId, name);
  if (existing && existing.type === "directory") return { ok: false, error: "Tidak bisa menulis ke folder." };

  if (!existing) {
    const fileId = createId();
    const fileNode = makeNode({
      id: fileId,
      name,
      type: "file",
      parentId,
      children: [],
      isHidden: name.startsWith("."),
      content,
      permissions: defaultPermissions("file"),
      owner,
    });
    const next = cloneState(state);
    next.nodes[fileId] = fileNode;
    next.nodes[parentId] = { ...parent, children: [...parent.children, fileId], updatedAt: now() };
    return { ok: true, value: next };
  }

  if (!canAccess(existing, owner, "write")) return { ok: false, error: "Tidak punya izin menulis file ini." };

  const next = cloneState(state);
  next.nodes[existing.id] = {
    ...existing,
    content: append ? `${existing.content}${content}` : content,
    updatedAt: now(),
  };
  return { ok: true, value: next };
};

export const readFile = (state: FileSystemState, nodeId: string): FsResult<string> => {
  const node = getNode(state, nodeId);
  if (!node || node.type !== "file") return { ok: false, error: "File tidak ditemukan." };
  return { ok: true, value: node.content };
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
  if (!parent || parent.type !== "directory") return { ok: false, error: "Folder tujuan tidak ditemukan." };
  const entry = findChild(state, parentId, name);
  if (!entry) return { ok: false, error: "Target tidak ditemukan." };
  if (entry.id === state.rootId) return { ok: false, error: "Root tidak bisa dihapus." };

  if (entry.type === "directory" && entry.children.length > 0 && !recursive) {
    return { ok: false, error: "Folder tidak kosong. Gunakan -r." };
  }

  let next = cloneState(state);
  next = removeNodeRecursive(next, entry.id);
  next.nodes[parentId] = {
    ...parent,
    children: parent.children.filter((id) => id !== entry.id),
    updatedAt: now(),
  };
  return { ok: true, value: next };
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

export const moveEntry = (
  state: FileSystemState,
  sourceId: string,
  targetParentId: string,
  newName?: string
): FsResult<FileSystemState> => {
  const source = getNode(state, sourceId);
  const targetParent = getNode(state, targetParentId);
  if (!source) return { ok: false, error: "Source tidak ditemukan." };
  if (!targetParent || targetParent.type !== "directory") return { ok: false, error: "Target bukan folder." };
  if (source.id === state.rootId) return { ok: false, error: "Root tidak bisa dipindah." };
  if (isDescendant(state, sourceId, targetParentId)) {
    return { ok: false, error: "Tidak bisa memindahkan folder ke dalam dirinya sendiri." };
  }

  const desiredName = newName ?? source.name;
  if (findChild(state, targetParentId, desiredName)) {
    return { ok: false, error: "Nama target sudah ada." };
  }

  const next = cloneState(state);
  if (source.parentId) {
    const parent = getNode(state, source.parentId);
    if (parent) {
      next.nodes[parent.id] = {
        ...parent,
        children: parent.children.filter((id) => id !== sourceId),
        updatedAt: now(),
      };
    }
  }

  next.nodes[sourceId] = { ...source, name: desiredName, parentId: targetParentId, updatedAt: now() };
  next.nodes[targetParentId] = {
    ...targetParent,
    children: [...targetParent.children, sourceId],
    updatedAt: now(),
  };
  return { ok: true, value: next };
};

const cloneSubtree = (state: FileSystemState, nodeId: string, owner: string): { next: FileSystemState; newId: string } => {
  const node = getNode(state, nodeId);
  if (!node) return { next: state, newId: nodeId };
  const newId = createId();
  const cloned: FsNode = {
    ...node,
    id: newId,
    parentId: null,
    owner,
    children: [],
    createdAt: now(),
    updatedAt: now(),
  };
  let next = cloneState(state);
  next.nodes[newId] = cloned;
  if (node.type === "directory") {
    node.children.forEach((childId) => {
      const result = cloneSubtree(next, childId, owner);
      next = result.next;
      next.nodes[newId] = {
        ...next.nodes[newId],
        children: [...next.nodes[newId].children, result.newId],
      };
      const childClone = getNode(next, result.newId);
      if (childClone) {
        next.nodes[result.newId] = { ...childClone, parentId: newId };
      }
    });
  }
  return { next, newId };
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
  if (!source) return { ok: false, error: "Source tidak ditemukan." };
  if (!targetParent || targetParent.type !== "directory") return { ok: false, error: "Target bukan folder." };
  const desiredName = newName ?? source.name;
  if (findChild(state, targetParentId, desiredName)) {
    return { ok: false, error: "Nama target sudah ada." };
  }

  const cloneResult = cloneSubtree(state, sourceId, owner);
  const next = cloneResult.next;
  const cloned = getNode(next, cloneResult.newId);
  if (!cloned) return { ok: false, error: "Gagal menyalin." };
  next.nodes[cloneResult.newId] = { ...cloned, name: desiredName, parentId: targetParentId };
  next.nodes[targetParentId] = {
    ...targetParent,
    children: [...targetParent.children, cloneResult.newId],
    updatedAt: now(),
  };
  return { ok: true, value: next };
};

export const buildTree = (state: FileSystemState, nodeId: string, depth = 0, maxDepth = 4): string[] => {
  const node = getNode(state, nodeId);
  if (!node || node.type !== "directory") return [];
  const lines: string[] = [];
  node.children.forEach((childId, index) => {
    const child = getNode(state, childId);
    if (!child) return;
    const isLast = index === node.children.length - 1;
    const prefix = `${"│   ".repeat(depth)}${isLast ? "└── " : "├── "}`;
    lines.push(`${prefix}${child.name}${child.type === "directory" ? "/" : ""}`);
    if (child.type === "directory" && depth < maxDepth) {
      lines.push(...buildTree(state, child.id, depth + 1, maxDepth));
    }
  });
  return lines;
};

export const buildTreeNodes = (
  state: FileSystemState,
  nodeId: string,
  depth = 0,
  maxDepth = 6
): Array<{ id: string; name: string; type: "file" | "directory"; depth: number }> => {
  const node = getNode(state, nodeId);
  if (!node || node.type !== "directory") return [];
  const nodes: Array<{ id: string; name: string; type: "file" | "directory"; depth: number }> = [];
  node.children.forEach((childId) => {
    const child = getNode(state, childId);
    if (!child) return;
    nodes.push({ id: child.id, name: child.name, type: child.type, depth });
    if (child.type === "directory" && depth < maxDepth) {
      nodes.push(...buildTreeNodes(state, child.id, depth + 1, maxDepth));
    }
  });
  return nodes;
};
