import execute from "./spawn.js";
import { fileExists } from "./utils.js";

export interface DecryptSettings {
  /** The path for the encrypted pdf */
  input: string;
  /** The path for the decrypted pdf */
  output?: string;
  /** The password required for decrypting the pdf */
  password?: string;
}

/**
 * Decrypts a PDF
 * @param payload The settings for decryption
 * @returns The output of QPDF
 */
export const decrypt = async (payload: DecryptSettings): Promise<Buffer> => {
  if (!payload.input) throw new Error("Please specify input file");
  if (!fileExists(payload.input)) throw new Error("Input file doesn't exist");

  const callArguments = ["--decrypt"];

  // Password
  if (payload.password) {
    callArguments.push(`--password=${payload.password}`);
  }

  // Input file path
  callArguments.push(payload.input);

  // Print PDF on stdout
  if (payload.output) {
    callArguments.push(payload.output);
  } else {
    callArguments.push("-");
  }

  return execute(callArguments);
};
