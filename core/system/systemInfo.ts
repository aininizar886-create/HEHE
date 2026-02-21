export type SystemInfo = {
  hostname: string;
  username: string;
  bootedAt: number;
  osVersion: string;
};

export const createSystemInfo = (hostname: string, username: string): SystemInfo => ({
  hostname,
  username,
  bootedAt: Date.now(),
  osVersion: "6.1.0 x86_64",
});

export const formatUptime = (info: SystemInfo): string => {
  const diff = Math.max(0, Date.now() - info.bootedAt);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
};
