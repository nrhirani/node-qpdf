import { existsSync } from "node:fs";

/**
 * hyphenate will take any value that is dromedary case (camelCase with a initial lowercase letter)
 * and convert it to kebab case (kebab-case). For example `camelCase` becomes camel-case
 * @param variable the value to be "kebab'd"
 * @returns the value with in kebab case
 */
export const hyphenate = (variable: string): string =>
  variable.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * Determines if the file exists
 * @param file the path of the file to be tested.
 */
export const fileExists = (file: string): boolean => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return !!existsSync(file);
};
