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
  content: string;
  permissions: FsPermissions;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

export type FileSystemState = {
  nodes: Record<string, FsNode>;
  rootId: string;
};

export type FsEntry = {
  id: string;
  name: string;
  type: FsNodeType;
};

export type FsPathResult = {
  nodeId: string;
  path: string[];
};

export type FsError = {
  error: true;
  message: string;
};

export type FsOk<T> = {
  error?: false;
  value: T;
};

export type FsResult<T> = FsOk<T> | FsError;
