import execute from "./spawn";
import { fileExists, hyphenate } from "./utils";

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
  password:
    | string
    | {
        owner: string;
        user: string;
      };
  restrictions?: Restrictions;
}

export default async (
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
  // eslint-disable-next-line no-param-reassign
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
