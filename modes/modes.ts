export type TerminalMode = "learn" | "practice" | "real";

export type ModeConfig = {
  id: TerminalMode;
  label: string;
  showHints: boolean;
  verboseErrors: boolean;
  showSuggestions: boolean;
};

export const MODE_CONFIGS: Record<TerminalMode, ModeConfig> = {
  learn: {
    id: "learn",
    label: "Learn",
    showHints: true,
    verboseErrors: true,
    showSuggestions: true,
  },
  practice: {
    id: "practice",
    label: "Practice",
    showHints: false,
    verboseErrors: true,
    showSuggestions: false,
  },
  real: {
    id: "real",
    label: "Real",
    showHints: false,
    verboseErrors: false,
    showSuggestions: false,
  },
};
