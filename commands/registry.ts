import { cat } from "./builtins/cat";
import { cd } from "./builtins/cd";
import { clear } from "./builtins/clear";
import { cp } from "./builtins/cp";
import { date } from "./builtins/date";
import { echo } from "./builtins/echo";
import { help } from "./builtins/help";
import { history } from "./builtins/history";
import { hostname } from "./builtins/hostname";
import { ls } from "./builtins/ls";
import { mkdir } from "./builtins/mkdir";
import { mv } from "./builtins/mv";
import { pwd } from "./builtins/pwd";
import { rm } from "./builtins/rm";
import { rmdir } from "./builtins/rmdir";
import { touch } from "./builtins/touch";
import { tree } from "./builtins/tree";
import { uname } from "./builtins/uname";
import { uptime } from "./builtins/uptime";
import { whoami } from "./builtins/whoami";
import type { CommandDefinition } from "./types";

export const commandList: CommandDefinition[] = [
  pwd,
  ls,
  cd,
  mkdir,
  touch,
  cat,
  rm,
  rmdir,
  mv,
  cp,
  tree,
  echo,
  whoami,
  hostname,
  date,
  uname,
  uptime,
  help,
  history,
  clear,
];

export const commandRegistry = commandList.reduce<Record<string, CommandDefinition>>((acc, command) => {
  acc[command.name] = command;
  return acc;
}, {});

export const commandNames = commandList.map((command) => command.name);
