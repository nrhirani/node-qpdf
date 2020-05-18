/* eslint-disable no-param-reassign */
import { promisify } from "util";
import { existsSync } from "fs";
import { execFile } from "child_process";

interface Restrictions {
  print?: "y" | "n" | "full" | "low" | "none";
  modify?: "y" | "n" | "all" | "annotate" | "form" | "assembly" | "none";
  extract?: "y" | "n";
  annotate?: "y" | "n";
  useAes?: "y" | "n";
  accessibility?: "y" | "n";
}
export interface QPdfOptions {
  outputFile?: string;
  keyLength?: number;
  password:
    | string
    | {
        user: string;
        owner: string;
      };
  restrictions?: Restrictions;
}

const execFilePromise = promisify(execFile);

const hyphenate = (variable: string): string =>
  variable.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const execute = async (callArguments: string[]): Promise<string> => {
  const { stderr, stdout } = await execFilePromise("qpdf", callArguments);
  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
};

const fileExists = (file: string): boolean => {
  if (existsSync(file)) {
    return true;
  }
  return false;
};

export const encrypt = async (
  input: string,
  options: QPdfOptions,
  output?: string
): Promise<string> => {
  if (!input) return "Please specify input file";
  if (!fileExists(input)) return "Input file doesn't exist";
  // if (output) if (fileExists(output)) return "Output file already exists";

  const callArguments = ["--encrypt"];

  // Set user-password and owner-password
  if (typeof options.password === "object") {
    if (
      options.password.user === undefined ||
      options.password.user === null ||
      options.password.owner === undefined ||
      options.password.owner === null
    ) {
      return "Please specify both owner and user passwords";
    }
    callArguments.push(options.password.user);
    callArguments.push(options.password.owner);
  } else {
    // Push twice for user-password and owner-password
    callArguments.push(options.password);
    callArguments.push(options.password);
  }

  // Defaults encryption to AES 256
  options.keyLength = options.keyLength || 256;

  // Specifying the key length
  callArguments.push(options.keyLength.toString());

  // Add Resctrictions for encryption
  if (options.restrictions) {
    if (typeof options.restrictions !== "object") return "Invalid Restrictions";

    const { restrictions } = options;

    for (const restriction of options.restrictions) {
      const value =
        restrictions[restriction] !== "" ? `=${restrictions[restriction]}` : "";
      callArguments.push(`--${hyphenate(restriction)}${value}`);
    }
  }

  // Marks end of --encrypt options
  callArguments.push("--");

  // Input file path
  callArguments.push(input.replace(/([\s"$'\\`])/g, "\\$1"));

  if (output) {
    callArguments.push(output);
  } else {
    // Print PDF on stdout
    callArguments.push("-");
  }
  // Execute command and return stdout for pipe
  return execute(callArguments);
};

export const decrypt = async (
  input: string,
  password: string,
  output?: string
): Promise<string> => {
  if (!input) return "Please specify input file";
  if (!password) return "Password missing";

  const callArguments = ["--decrypt"];

  // Password
  callArguments.push(`--password=${password.replace(/([\s"$'\\`])/g, "\\$1")}`);

  // Input file path
  callArguments.push(input.replace(/([\s"$'\\`])/g, "\\$1"));

  // Print PDF on stdout
  if (output) {
    callArguments.push(output);
  } else {
    callArguments.push("-");
  }

  return execute(callArguments);
};
