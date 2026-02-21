"use client";

import type { TreeNode } from "../../../store/terminalStore";

type VisualTreeProps = {
  tree: TreeNode[];
  activePath: string[];
};

export const VisualTree = ({ tree, activePath }: VisualTreeProps) => {
  if (!tree.length) {
    return <p className="text-[11px] text-slate">Belum ada file.</p>;
  }
  return (
    <div className="space-y-1 text-[11px] text-soft">
      {tree.map((node) => (
        <div
          key={node.id}
          className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
            activePath.includes(node.name) ? "bg-hot/10 text-white" : "bg-ink-2/40"
          }`}
          style={{ marginLeft: `${node.depth * 12}px` }}
        >
          <span>{node.type === "directory" ? "📁" : "📄"}</span>
          <span className="truncate">{node.name}</span>
        </div>
      ))}
    </div>
  );
};
