import type { ParseResult, ParsedCommand } from "./types";

const tokenize = (input: string): { tokens: string[]; pipe?: string } => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let pipe: string | undefined;

  const flush = () => {
    if (current.length) {
      tokens.push(current);
      current = "";
    }
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (pipe) {
      pipe += char;
      continue;
    }
    if (char === "|" && !quote) {
      flush();
      pipe = input.slice(i + 1).trim();
      break;
    }
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }
    if (quote && char === quote) {
      quote = null;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      flush();
      continue;
    }
    current += char;
  }
  flush();
  return { tokens, pipe };
};

const extractFlags = (tokens: string[]): { args: string[]; flags: Record<string, string | boolean> } => {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};
  tokens.forEach((token) => {
    if (token.startsWith("--")) {
      const [key, value] = token.slice(2).split("=");
      if (key) {
        flags[key] = value ?? true;
      }
      return;
    }
    if (token.startsWith("-") && token.length > 1 && !/\d/.test(token[1])) {
      token
        .slice(1)
        .split("")
        .forEach((flag) => {
          flags[flag] = true;
        });
      return;
    }
    args.push(token);
  });
  return { args, flags };
};

export const parseCommandLine = (input: string): ParseResult => {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Input kosong." };
  const { tokens, pipe } = tokenize(trimmed);
  if (tokens.length === 0) return { ok: false, error: "Input kosong." };

  const rawCommand = tokens[0];
  const rest = tokens.slice(1);

  let redirect: ParsedCommand["redirect"];
  const redirectIndex = rest.findIndex((token) => token === ">" || token === ">>");
  if (redirectIndex >= 0) {
    const type = rest[redirectIndex] as ">" | ">>";
    const target = rest[redirectIndex + 1];
    if (!target) {
      return { ok: false, error: "Redirect butuh nama file." };
    }
    redirect = { type, target };
    rest.splice(redirectIndex, 2);
  }

  const { args, flags } = extractFlags(rest);
  const value: ParsedCommand = {
    raw: trimmed,
    command: rawCommand.toLowerCase(),
    args,
    flags,
    redirect,
    pipe,
  };

  return { ok: true, value };
};
