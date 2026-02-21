"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VisualTree } from "../VisualTree/VisualTree";
import { AIAssistant } from "../AIAssistant/AIAssistant";
import { useTerminalStore } from "../../../store/terminalStore";

const QUICK_SNIPPETS = ["TAB", "ls", "cd", "-", "/", "*", ">", ">>", "|"];

const formatPrompt = (username: string, path: string[]) => {
  const location = path.length ? `/${path.join("/")}` : "/";
  const safeUser = username?.trim().toLowerCase() || "user";
  return `${safeUser}@melpin:${location}$`;
};

const renderInputLine = (text: string) => {
  const clean = text.replace(/^\$\s*/, "");
  const [command, ...rest] = clean.split(" ");
  return (
    <span>
      <span className="text-hot">{command}</span>
      {rest.length > 0 && <span className="text-soft"> {rest.join(" ")}</span>}
    </span>
  );
};

export const TerminalExperience = ({ username }: { username: string }) => {
  const {
    workerReady,
    lines,
    input,
    cwdPath,
    tree,
    lesson,
    xp,
    level,
    badges,
    notebook,
    commandInfo,
    supportedCommands,
    mode,
    mentorMessages,
    isGlitching,
    commandHistory,
    srsDue,
    initWorker,
    runCommand,
    resetEnvironment,
    setMode,
    setInput,
    appendSnippet,
    reviewSrs,
  } = useTerminalStore();
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [deepExplain, setDeepExplain] = useState(false);
  const [mobileTab, setMobileTab] = useState<"notebook" | "tree" | "mentor">("notebook");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!workerReady) {
      initWorker(username || "user", mode);
    }
  }, [initWorker, mode, username, workerReady]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const parts = input.trim().split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    const isCommandFocus = parts.length <= 1 && !input.endsWith(" ");
    if (isCommandFocus) {
      return supportedCommands.filter((cmd) => cmd.startsWith(last)).slice(0, 5);
    }
    if (input.endsWith(" ")) return [];
    return tree.map((node) => node.name).filter((name) => name.startsWith(last)).slice(0, 5);
  }, [input, supportedCommands, tree]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;
    runCommand(input);
    setHistoryIndex(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!commandHistory.length) return;
      const nextIndex = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!commandHistory.length) return;
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (!suggestions.length) return;
      const suggestion = suggestions[0];
      if (input.endsWith(" ")) {
        setInput(`${input}${suggestion}`);
        return;
      }
      const parts = input.trim().split(/\s+/);
      parts[parts.length - 1] = suggestion;
      setInput(parts.join(" "));
    }
  };

  const handleSnippetClick = (snippet: string) => {
    if (snippet === "TAB") {
      if (suggestions.length) {
        const suggestion = suggestions[0];
        if (input.endsWith(" ")) {
          setInput(`${input}${suggestion}`);
        } else {
          const parts = input.trim().split(/\s+/);
          parts[parts.length - 1] = suggestion;
          setInput(parts.join(" "));
        }
      }
      return;
    }
    appendSnippet(snippet);
  };

  const progressValue = lesson ? Number(lesson.progress.split("/")[0]) : 0;
  const progressTotal = lesson ? Number(lesson.progress.split("/")[1]) : 1;
  const progressPercent = Math.min(100, Math.round((progressValue / progressTotal) * 100));

  const lessonCard = (
    <div className="glass rounded-[24px] p-3 sm:rounded-[28px] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate">Lesson</p>
          <p className="text-base font-semibold text-white sm:text-lg">{lesson?.lessonTitle ?? "Loading"}</p>
          <p className="hidden text-xs text-slate sm:block">{lesson?.lessonDescription}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate">
          <span className="rounded-full border border-hot/30 px-3 py-1 text-soft">
            XP {xp} • Lv {level}
          </span>
          {badges.slice(0, 3).map((badge) => (
            <span
              key={badge}
              className="hidden rounded-full border border-amber-300/40 px-3 py-1 text-amber-200 sm:inline-flex"
            >
              {badge}
            </span>
          ))}
          <button
            type="button"
            onClick={resetEnvironment}
            className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft transition-all hover:bg-ink-3"
          >
            Reset Environment
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-2/60">
        <div className="h-full rounded-full bg-hot" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate">
        <span>{lesson?.stepTitle}</span>
        <span>{lesson?.progress}</span>
      </div>
    </div>
  );

  const terminalCard = (
    <div className="glass relative flex min-h-0 flex-1 flex-col rounded-[24px] p-3 sm:rounded-[28px] sm:p-4">
        {isGlitching && <div className="absolute inset-0 animate-glitch rounded-[28px] bg-black/80" />}
        {mode === "learn" && srsDue.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-200/10 p-3 text-xs text-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/80">SRS Quiz</p>
                <p className="text-sm text-amber-100">
                  Kamu masih ingat command <span className="font-semibold">{srsDue[0]}</span>?
                </p>
                <p className="text-[11px] text-amber-200/70">Jawab jujur, biar progress makin pas.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reviewSrs(srsDue[0], true)}
                  className="rounded-full bg-amber-300 px-3 py-1 text-[11px] font-semibold text-black transition-all hover:scale-105"
                >
                  Ingat
                </button>
                <button
                  type="button"
                  onClick={() => reviewSrs(srsDue[0], false)}
                  className="rounded-full border border-amber-300/60 px-3 py-1 text-[11px] text-amber-100 transition-all hover:bg-amber-200/20"
                >
                  Lupa
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate">Terminal</p>
            <p className="text-sm text-soft">{formatPrompt(username, cwdPath)}</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate sm:text-[11px]">
            {(["learn", "practice", "real"] as const).map((modeOption) => (
              <button
                key={modeOption}
                type="button"
                onClick={() => setMode(modeOption)}
                className={`rounded-full px-3 py-1 transition-all ${
                  mode === modeOption
                    ? "bg-hot text-black"
                    : "border border-hot/30 text-soft hover:bg-ink-3"
                }`}
              >
                {modeOption}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={terminalRef}
          className="mt-4 flex-1 min-h-0 overflow-x-auto overflow-y-auto whitespace-pre rounded-2xl border border-hot/20 bg-black/70 p-3 font-mono text-[12px] text-soft sm:p-4 sm:text-[13px]"
        >
          {!workerReady && <p className="text-xs text-slate">Menyiapkan sandbox...</p>}
          {lines.map((line, index) => (
            <div
              key={`${line.type}-${index}`}
              className={
                line.type === "input"
                  ? "text-green-300"
                  : line.type === "error"
                  ? "text-amber-400"
                  : "text-soft"
              }
            >
              {line.type === "input" ? renderInputLine(line.text) : line.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
          <span className="max-w-full break-all font-mono text-[11px] text-green-400">
            {formatPrompt(username, cwdPath)}
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lesson?.stepInstruction || "ketik command"}
            className="min-w-[120px] flex-1 bg-transparent font-mono text-base text-green-300 outline-none placeholder:text-green-500/60"
          />
          <button
            type="submit"
            className="rounded-full border border-hot/40 px-3 py-1 text-[11px] text-hot transition-all hover:scale-105"
          >
            Run
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-full border border-hot/30 bg-ink-2/70 px-3 py-1 text-soft hover:bg-ink-2"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:hidden">
          {QUICK_SNIPPETS.map((snippet) => (
            <button
              key={snippet}
              type="button"
              onClick={() => handleSnippetClick(snippet)}
              className="shrink-0 rounded-full border border-hot/30 bg-ink-2/70 px-3 py-1 text-[11px] text-soft"
            >
              {snippet}
            </button>
          ))}
        </div>
      </div>
  );

  const notebookPanel = (
    <div className="glass rounded-[24px] p-3 sm:rounded-[28px] sm:p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate">Command Notebook</p>
      <div className="mt-3 rounded-2xl border border-hot/20 bg-ink-2/60 p-3">
        <p className="text-sm font-semibold text-white">{commandInfo?.name ?? lesson?.focusCommand}</p>
        <p className="mt-1 text-xs text-slate">{commandInfo?.description ?? lesson?.stepExplanation}</p>
        {commandInfo && (
          <>
            <p className="mt-2 text-[11px] text-slate">Example: {commandInfo.example}</p>
            <p className="mt-1 text-[11px] text-slate">Real world: {commandInfo.realWorld}</p>
          </>
        )}
        <button
          type="button"
          onClick={() => setDeepExplain((prev) => !prev)}
          className="mt-3 rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft hover:bg-ink-3"
        >
          Explain deeper
        </button>
        {deepExplain && commandInfo && (
          <div className="mt-3 rounded-xl border border-hot/20 bg-ink-2/40 px-3 py-2 text-[11px] text-slate">
            <p>Usage: {commandInfo.usage}</p>
            <p>Flags: {commandInfo.supportedFlags.length ? commandInfo.supportedFlags.join(", ") : "-"}</p>
            <p>Tips: {commandInfo.realWorld}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {notebook.length === 0 && <p className="text-[11px] text-slate">Belum ada command yang disimpan.</p>}
        {notebook.map((command) => (
          <div key={command.name} className="rounded-xl border border-hot/20 bg-ink-2/60 px-3 py-2">
            <p className="text-sm text-white">{command.name}</p>
            <p className="text-[11px] text-slate">{command.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const treePanel = (
    <div className="glass rounded-[24px] p-3 sm:rounded-[28px] sm:p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate">Visual Tree</p>
        <span className="text-[11px] text-slate">XP {xp} • Lv {level}</span>
      </div>
      <div className="mt-3">
        <VisualTree tree={tree} activePath={cwdPath} />
      </div>
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate">
          {badges.map((badge) => (
            <span key={badge} className="rounded-full border border-hot/30 px-2 py-1">
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const mentorPanel = (
    <div className="glass rounded-[24px] p-3 sm:rounded-[28px] sm:p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate">AI Mentor</p>
      <div className="mt-3">
        <AIAssistant messages={mentorMessages} />
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden pb-[calc(env(safe-area-inset-bottom)+6.25rem)] sm:gap-4 sm:pb-[calc(env(safe-area-inset-bottom)+4.75rem)]">
      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
          {lessonCard}
          {terminalCard}
        </div>
        <div className="hidden lg:flex min-h-0 flex-col gap-3 sm:gap-4 lg:h-full lg:overflow-y-auto lg:pr-1">
          {notebookPanel}
          {treePanel}
          {mentorPanel}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="glass rounded-[24px] p-2 sm:rounded-[28px] sm:p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "notebook", label: "Notebook" },
              { id: "tree", label: "Tree" },
              { id: "mentor", label: "Mentor" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileTab(item.id as "notebook" | "tree" | "mentor");
                  setMobilePanelOpen(true);
                }}
                className={`rounded-full px-3 py-2 text-[11px] transition-all ${
                  mobileTab === item.id && mobilePanelOpen
                    ? "bg-hot text-black"
                    : "border border-hot/30 text-soft hover:bg-ink-3"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mobilePanelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePanelOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] w-[min(92vw,420px)]">
            <div className="glass flex h-full flex-col rounded-[28px] p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-slate">
                  {mobileTab === "notebook" ? "Command Notebook" : mobileTab === "tree" ? "Visual Tree" : "AI Mentor"}
                </p>
                <button
                  type="button"
                  onClick={() => setMobilePanelOpen(false)}
                  className="rounded-full border border-hot/30 px-3 py-1 text-[11px] text-soft"
                >
                  Tutup
                </button>
              </div>
              <div className="mt-3 flex-1 overflow-y-auto">
                {mobileTab === "notebook" && notebookPanel}
                {mobileTab === "tree" && treePanel}
                {mobileTab === "mentor" && mentorPanel}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
