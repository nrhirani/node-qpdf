/* eslint-disable no-param-reassign */
import { existsSync } from "fs";
import { spawn } from "child_process";

interface Restrictions {
  accessibility?: "y" | "n";
  annotate?: "y" | "n";
  extract?: "y" | "n";
  modify?: "y" | "n" | "all" | "annotate" | "form" | "assembly" | "none";
  print?: "y" | "n" | "full" | "low" | "none";
  useAes?: "y" | "n";
}
export interface QPdfOptions {
  keyLength?: number;
  outputFile?: string;
  password:
    | string
    | {
        owner: string;
        user: string;
      };
  restrictions?: Restrictions;
}

const hyphenate = (variable: string): string =>
  variable.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const execute = (callArguments: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const process = spawn("qpdf", callArguments);
    let output = "";
    process.stdout.on("data", (data) => {
      output += data;
    });
    process.on("close", () => {
      resolve(output);
    });
    process.stderr.on("data", (data) => {
      reject(data);
    });
    process.on("error", (error) => {
      reject(error);
    });
  });
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

  // Add Restrictions for encryption
  if (options.restrictions) {
    if (typeof options.restrictions !== "object") return "Invalid Restrictions";
    for (const [restriction, value] of Object.entries(options.restrictions)) {
      if (restriction === "useAes" && options.keyLength === 256) {
        // use-aes is always on with 256 bit keyLength
      } else {
        callArguments.push(`--${hyphenate(restriction)}=${value as string}`);
      }
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
