/// <reference types="typescript" />

declare module "node-qpdf2" {
  export interface QPdfOptions {
    outputFile ?: string;
    keyLength : string;
    password : {
      user : string;
      owner : string;
    } | string;
    restrictions: {
      print ?: "y" | "n" | "full" | "low" | "none";
      modify ?: "y" | "n" | "all" | "annotate" | "form" | "assembly" | "none";
      extract ?: "y" | "n";
      annotate ?: "y" | "n";
      useAes ?: "y" | "n";
      accessibility ?: "y" | "n";
    }
  }
}
