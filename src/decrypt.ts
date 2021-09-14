import { fileExists } from "./utils";
import execute from "./spawn";

export interface DecryptSettings {
  input: string;
  output?: string;
  password?: string;
}

export default async (payload: DecryptSettings): Promise<Buffer> => {
  if (!payload.input) throw new Error("Please specify input file");
  if (!fileExists(payload.input)) throw new Error("Input file doesn't exist");

  const callArguments = ["--decrypt"];

  // Password
  if (payload.password) {
    callArguments.push(`--password=${payload.password}`);
  } else {
    callArguments.push('--password=""');
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
