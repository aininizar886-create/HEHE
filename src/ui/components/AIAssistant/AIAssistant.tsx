"use client";

import { useEffect, useRef } from "react";
import type { MentorMessage } from "../../../store/terminalStore";

type AIAssistantProps = {
  messages: MentorMessage[];
};

export const AIAssistant = ({ messages }: AIAssistantProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="rounded-2xl border border-hot/20 bg-ink-2/60 p-3">
      <div ref={containerRef} className="max-h-[220px] space-y-3 overflow-y-auto pr-1 sm:max-h-[260px] lg:max-h-[320px]">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-hot/20 bg-ink-2/60 px-3 py-2 text-xs text-slate">
            Halo! Aku mentor kamu. Ketik command dan aku bakal jelasin ya.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-full rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-[0_0_12px_rgba(0,0,0,0.2)] ${
              message.role === "assistant" ? "bg-ink-2/70 text-soft" : "bg-hot/20 text-white"
            }`}
          >
            {message.streaming ? (
              <span className="animate-pulse">{message.text}</span>
            ) : (
              <span>{message.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
