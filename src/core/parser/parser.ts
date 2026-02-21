export type ParsedCommand = {
  raw: string;
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  redirect?: { type: ">" | ">>"; target: string };
  pipeline?: ParsedCommand;
};

export type ParseResult =
  | { ok: true; value: ParsedCommand }
  | { ok: false; error: string };

const tokenize = (input: string): { tokens: string[]; pipeline?: string } => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let pipeline: string | undefined;

  const flush = () => {
    if (current.length) {
      tokens.push(current);
      current = "";
    }
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (pipeline) {
      pipeline += char;
      continue;
    }
    if (char === "|" && !quote) {
      flush();
      pipeline = input.slice(i + 1).trim();
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
  return { tokens, pipeline };
};

const parseFlags = (tokens: string[]): { args: string[]; flags: Record<string, string | boolean> } => {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};
  tokens.forEach((token) => {
    if (token.startsWith("--")) {
      const [key, value] = token.slice(2).split("=");
      if (key) flags[key] = value ?? true;
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
  const { tokens, pipeline } = tokenize(trimmed);
  if (tokens.length === 0) return { ok: false, error: "Input kosong." };

  const command = tokens[0].toLowerCase();
  const rest = tokens.slice(1);

  const redirectIndex = rest.findIndex((token) => token === ">" || token === ">>");
  let redirect: ParsedCommand["redirect"];
  if (redirectIndex >= 0) {
    const type = rest[redirectIndex] as ">" | ">>";
    const target = rest[redirectIndex + 1];
    if (!target) return { ok: false, error: "Redirect butuh target file." };
    redirect = { type, target };
    rest.splice(redirectIndex, 2);
  }

  const { args, flags } = parseFlags(rest);
  let parsedPipeline: ParsedCommand | undefined;
  if (pipeline) {
    const parsed = parseCommandLine(pipeline);
    if (!parsed.ok) return { ok: false, error: `Pipe error: ${parsed.error}` };
    if (parsed.value.pipeline) return { ok: false, error: "Pipe ganda belum didukung." };
    parsedPipeline = parsed.value;
  }

  return {
    ok: true,
    value: {
      raw: trimmed,
      command,
      args,
      flags,
      redirect,
      pipeline: parsedPipeline,
    },
  };
};
