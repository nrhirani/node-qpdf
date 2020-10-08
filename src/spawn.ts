import { spawn } from "child_process";

export default (callArguments: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const process = spawn("qpdf", callArguments);
    const stdout: string[] = [];
    const stderr: string[] = [];
    process.stdout.on("data", (data) => {
      stdout.push(data);
    });
    process.stderr.on("data", (data) => {
      stderr.push(data);
    });
    process.addListener("error", reject);
    process.on("close", (code) => {
      if (code !== 0) {
        reject(stderr.join());
      } else {
        resolve(stdout.join());
      }
    });
  });
};
