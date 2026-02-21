export type Redirect = {
  type: ">" | ">>";
  target: string;
};

export type ParsedCommand = {
  raw: string;
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  redirect?: Redirect;
  pipe?: string;
};

export type ParseResult =
  | { ok: true; value: ParsedCommand }
  | { ok: false; error: string };
