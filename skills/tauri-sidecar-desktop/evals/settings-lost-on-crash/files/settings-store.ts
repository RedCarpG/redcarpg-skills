import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Settings {
  theme: "light" | "dark";
  volume: number;
  shortcuts: Record<string, string>;
}

const DEFAULTS: Settings = { theme: "light", volume: 0.8, shortcuts: {} };
const FILE = join(process.env.APP_DATA_DIR ?? ".", "settings.json");

export function loadSettings(): Settings {
  if (!existsSync(FILE)) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(FILE, "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  writeFileSync(FILE, JSON.stringify(s, null, 2));
}
