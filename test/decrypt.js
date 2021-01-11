const test = require("ava");
const qpdf = require("../dist").default;

const decryptedFile = "test/decrypted.pdf";
const password = "1234";

test("Should decrypt a File -> File", async (t) => {
  try {
    // First, encrypt a file
    await qpdf.encrypt("test/dummy.pdf", { password }, "test/encrypted.pdf");
    // Then, decrypt it
    await qpdf.decrypt("test/encrypted.pdf", password, decryptedFile);
    t.pass();
  } catch (error) {
    console.log(error.toString());
    t.fail();
  }
});

test("Should decrypt a File without a password", async (t) => {
  try {
    await qpdf.encrypt(
      "test/dummy.pdf",
      { password: "" },
      "test/file-to-file-no-pw.pdf"
    );
    await qpdf.decrypt("test/file-to-file-no-pw.pdf", "", decryptedFile);
    t.pass();
  } catch {
    t.fail();
  }
});

test("Should encrypt a file with a space", async (t) => {
  try {
    await qpdf.encrypt(
      "test/dummy copy.pdf",
      { password },
      "test/file to file.pdf"
    );
    await qpdf.decrypt("test/file to file.pdf", password, decryptedFile);
    t.pass();
  } catch {
    t.fail();
  }
});



test("should not work if no input file is specified for decrypt", async (t) => {
  try {
    const results = await qpdf.decrypt("", password);
    if (results === "Please specify input file") {
      t.pass();
    }
  } catch {
    t.fail();
  }
});

test("should not work if no password entered for decrypt", async (t) => {
  try {
    const results = await qpdf.decrypt("test/file-to-file.pdf", "");
    if (results === "Password missing") {
      t.pass();
    }
  } catch {
    t.fail();
  }
});

test.todo("Should decrypt a File -> Buffer");

test.todo("Should decrypt a Buffer -> File");

test.todo("Should decrypt a Buffer -> Buffer");
