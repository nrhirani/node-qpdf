import { fileExists } from "./utils";
import execute from "./spawn";

export default async (
  input: string,
  password: string,
  output?: string
): Promise<string> => {
  if (!input) return "Please specify input file";
  if (!password) return "Password missing";
  if (!fileExists(input)) return "Input file doesn't exist";

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
