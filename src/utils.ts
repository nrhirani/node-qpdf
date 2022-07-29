import { existsSync } from "fs";

export const hyphenate = (variable: string): string =>
  variable.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

export const fileExists = (file: string): boolean => {
  return !!existsSync(file);
};
