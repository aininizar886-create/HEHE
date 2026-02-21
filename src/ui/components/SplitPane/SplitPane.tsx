"use client";

import { useRef } from "react";

type SplitPaneProps = {
  ratio: number;
  onChange: (value: number) => void;
  left: React.ReactNode;
  right: React.ReactNode;
};

export const SplitPane = ({ ratio, onChange, left, right }: SplitPaneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const startX = event.clientX;
    const { width } = container.getBoundingClientRect();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextRatio = Math.min(0.75, Math.max(0.35, (ratio * width + delta) / width));
      onChange(nextRatio);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div ref={containerRef} className="flex h-full w-full gap-0">
      <div style={{ width: `${ratio * 100}%` }} className="min-w-0">
        {left}
      </div>
      <div
        role="presentation"
        onPointerDown={handlePointerDown}
        className="hidden w-2 cursor-col-resize bg-hot/20 transition-all hover:bg-hot/40 lg:block"
      />
      <div style={{ width: `${(1 - ratio) * 100}%` }} className="min-w-0">
        {right}
      </div>
    </div>
  );
};
