export type FsNodeType = "file" | "directory";

export type FsPermissions = {
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type FsNode = {
  id: string;
  name: string;
  type: FsNodeType;
  parentId: string | null;
  children: string[];
  isHidden: boolean;
  content: string;
  permissions: FsPermissions;
  owner: string;
  createdAt: number;
  updatedAt: number;
};

export type FileSystemState = {
  nodes: Record<string, FsNode>;
  rootId: string;
};

export type FsEntry = {
  id: string;
  name: string;
  type: FsNodeType;
  isHidden: boolean;
};

export type FsResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
