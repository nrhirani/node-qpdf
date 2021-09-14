import { spawn } from "child_process";

export default (callArguments: string[]): Promise<Buffer> => {
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
    process.on("error", (error) => {
      reject(error);
    });
    process.on("close", (code) => {
      if (code !== 0) {
        reject(Buffer.from(stderr.join("")));
      } else {
        resolve(Buffer.from(stdout.join("")));
      }
    });
  });
};
