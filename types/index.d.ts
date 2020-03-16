/// <reference types="typescript" />

declare module "node-qpdf2" {
  export interface QPdfOptions {
    outputFile ?: string;
    keyLength : number;
    password : {
      user : string;
      owner : string;
    } | string;
    restrictions ?: {
      print ?: "y" | "n" | "full" | "low" | "none";
      modify ?: "y" | "n" | "all" | "annotate" | "form" | "assembly" | "none";
      extract ?: "y" | "n";
      annotate ?: "y" | "n";
      useAes ?: "y" | "n";
      accessibility ?: "y" | "n";
    }
  }
  export function encrypt(inputFile: string, options: QPdfOptions, outputFile: string): Promise<string>

  export function decrypt(inputFile: string, password: string, outputFile : string): Promise<string>;

}
