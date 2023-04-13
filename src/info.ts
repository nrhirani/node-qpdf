import { fileExists } from "./utils.js";
import execute from "./spawn.js";

export interface InfoSettings {
  /** The path for the encrypted pdf */
  input: string;
  /** The password for the encrypted pdf */
  password?: string;
}

/**
 * Gets the encryption info for a PDF
 * @param payload The settings for info
 * @returns The output of QPDF
 */
export const info = async (payload: InfoSettings): Promise<string> => {
  if (!payload.input) throw new Error("Please specify input file");
  if (!fileExists(payload.input)) throw new Error("Input file doesn't exist");

  const callArguments = ["--show-encryption"];

  // Password
  if (payload.password) {
    callArguments.push(`--password=${payload.password}`);
  }

  // Input file path
  callArguments.push(payload.input);

  const result = await execute(callArguments);

  return result.toLocaleString().trim();
};
