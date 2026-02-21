type MentorPayload = {
  lesson: string;
  focusCommand: string;
  lastCommand: string;
  result: string;
  mastery: string;
  supportedCommands: string[];
};

type StreamOptions = {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError?: (message: string) => void;
};

export const streamMentorMessage = (payload: MentorPayload, options: StreamOptions) => {
  const controller = new AbortController();

  const start = async () => {
    try {
      const response = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        options.onError?.(text || "AI mentor gagal merespons.");
        options.onDone();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        options.onChunk(buffer);
      }
      options.onDone();
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        options.onError?.("AI mentor lagi offline, coba ulangi ya.");
        options.onDone();
      }
    }
  };

  start();

  return () => controller.abort();
};
