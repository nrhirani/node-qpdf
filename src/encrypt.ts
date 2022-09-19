import execute from "./spawn";
import { fileExists, hyphenate } from "./utils";

const EncryptDefaults = {
  keyLength: 256,
  overwrite: true,
};

export interface EncryptOptions {
  input: string;
  keyLength?: number;
  output?: string;
  overwrite?: boolean | undefined;
  password?:
    | string
    | {
        owner: string;
        user: string;
      };
  restrictions?: {
    accessibility?: "y" | "n";
    annotate?: "y" | "n";
    assemble?: "y" | "n";
    extract?: "y" | "n";
    form?: "y" | "n";
    modify?: "y" | "n" | "all" | "annotate" | "form" | "assembly" | "none";
    modifyOther?: "y" | "n";
    print?: "y" | "n" | "full" | "low" | "none";
    useAes?: "y" | "n";
  };
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export const encrypt = async (userPayload: EncryptOptions): Promise<Buffer> => {
  // Set Defaults
  const payload = { ...EncryptDefaults, ...userPayload };

  // check if the file exists
  if (!payload.input) throw new Error("Please specify input file");
  if (!fileExists(payload.input)) throw new Error("Input file doesn't exist");
  if (payload.output && !payload.overwrite && fileExists(payload.output))
    throw new Error("Output file already exists");

  const callArguments = [];

  // TODO: If the keyLength is 40, `--allow-weak-crypto` needs to be specified before `--encrypt`.
  // This is required for qpdf 11+.
  // if (payload.keyLength === 40) callArguments.push("--allow-weak-crypto");

  callArguments.push("--encrypt");

  // Set user-password and owner-password
  if (typeof payload.password === "object") {
    if (
      payload.password.user === undefined ||
      payload.password.owner === undefined
    ) {
      // TODO: If the keyLength is 256 AND there is no owner password, `--allow-insecure` can be used
      throw new Error("Please specify both owner and user passwords");
    }
    callArguments.push(payload.password.user, payload.password.owner);
  } else if (typeof payload.password === "string") {
    // Push twice for user-password and owner-password
    callArguments.push(payload.password, payload.password);
  } else {
    // no password specified, push two empty strings (https://stackoverflow.com/a/43736897/455124)
    callArguments.push("", "");
  }

  // Specifying the key length
  callArguments.push(payload.keyLength.toString());

  // Add Restrictions for encryption
  if (payload.restrictions) {
    if (typeof payload.restrictions !== "object")
      throw new Error("Invalid Restrictions");
    for (const [restriction, value] of Object.entries(payload.restrictions)) {
      if (restriction === "useAes" && payload.keyLength === 256) {
        // use-aes is always on with 256 bit keyLength
      } else {
        callArguments.push(`--${hyphenate(restriction)}=${value as string}`);
      }
    }
  }

  // Marks end of --encrypt options, Input file path
  callArguments.push("--", payload.input);

  if (payload.output) {
    callArguments.push(payload.output);
  } else {
    // Print PDF on stdout
    callArguments.push("-");
  }
  // Execute command and return stdout for pipe
  return execute(callArguments);
};
