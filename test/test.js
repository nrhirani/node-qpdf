/* eslint-disable node/no-unpublished-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable node/no-unpublished-import */
const test = require("ava");
const fs = require("fs");
const qpdf = require("../dist");

const sample = "./test/sample.pdf";
const encryptedFile = "./test/encrypted.pdf";
const decryptedFile = "./test/decrypted.pdf";
const password = "1234";
const options = {
  outputFile: encryptedFile,
  password,
};

test("should not work if no input file is specified", async (t) => {
  try {
    const results = await qpdf.encrypt("", options);
    if (results === "Please specify input file") {
      t.pass();
    }
  } catch (error) {
    t.fail();
  }
});

test("should throw an error if the file doesn't exist", async (t) => {
  try {
    const results = await qpdf.encrypt("bad_file_name.pdf", options);
    if (results === "Input file doesn't exist") {
      t.pass();
    }
  } catch (error) {
    t.fail();
  }
});

test("should throw if only user or owner password is submitted", async (t) => {
  try {
    const results = await qpdf.encrypt(sample, {
      ...options,
      password: { user: "test" },
    });
    if (results === "Please specify both owner and user passwords") {
      t.pass();
    }
  } catch (error) {
    t.fail();
  }
});

test("should throw if restrictions are wrong", async (t) => {
  try {
    const results = await qpdf.encrypt(sample, {
      ...options,
      restrictions: "test",
    });
    if (results === "Invalid Restrictions") {
      t.pass();
    }
  } catch (error) {
    t.fail();
  }
});

test("Should encrypt a file", async (t) => {
  try {
    await qpdf.encrypt(sample, options);
    t.pass();
  } catch (error) {
    console.log(error);
    t.fail();
  }
});

test("Should decrypt a file", async (t) => {
  try {
    await qpdf.decrypt(sample, password, decryptedFile);
    t.pass();
  } catch (error) {
    t.fail();
  }
});

test("should not work if no input file is specified for decrypt", async (t) => {
  try {
    const results = await qpdf.decrypt("", options);
    if (results === "Please specify input file") {
      t.pass();
    }
  } catch (error) {
    t.fail();
  }
});

test("should not work if no password entered for decrypt", async (t) => {
  try {
    const results = await qpdf.decrypt(sample, "");
    if (results === "Password missing") {
      t.pass();
    }
  } catch (error) {
    t.fail();
  }
});

test("encrypt file to file", async (t) => {
  try {
    await qpdf.encrypt(sample, options, "./test/file-to-file.pdf");
    t.pass();
  } catch (error) {
    t.fail();
  }
});

test("encrypt file to buffer", async (t) => {
  try {
    const data = await qpdf.encrypt(sample, options);
    fs.writeFile(
      "./test/file-to-buffer.pdf",
      Buffer.from(data),
      { encoding: "binary" },
      () => {
        t.pass();
      }
    );
    t.pass();
  } catch (error) {
    t.fail();
  }
});

test("should allow restrictions", async (t) => {
  try {
    const results = await qpdf.encrypt(sample, {
      ...options,
      restrictions: {
        print: "none",
        useAes: "y",
      },
    });
    t.pass();
  } catch (error) {
    console.log(error);
    t.fail();
  }
});

// Test file to buffer

// Test encrypt from Buffer to file

// Test encrypt from buffer to buffer

