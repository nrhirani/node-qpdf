// All error.messages ARE strings //
/* eslint-disable ava/assertion-arguments */
const test = require("ava");
const qpdf = require("../dist").default;

const input = "test/example.pdf";

test.serial("Should encrypt a file with a space", async (t) => {
  try {
    await qpdf.encrypt({
      input: "test/example copy.pdf",
      output: "test/output/file to file.pdf",
      password: "1234",
    });
    t.pass();
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should decrypt a file with a space", async (t) => {
  try {
    await qpdf.decrypt({
      input: "test/output/file to file.pdf",
      password: "1234",
    });
    t.pass();
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should encrypt a File without a password", async (t) => {
  try {
    await qpdf.encrypt({
      input,
      output: "test/output/file-to-file-no-pw.pdf",
    });
    t.pass();
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should decrypt a File without a password", async (t) => {
  try {
    await qpdf.decrypt({
      input: "test/output/file-to-file-no-pw.pdf",
      output: "test/output/file-to-file-no-pw-decrypted.pdf",
    });
    t.pass();
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should encrypt to a file", async (t) => {
  try {
    // First, encrypt a file
    await qpdf.encrypt({
      input,
      // eslint-disable-next-line sonarjs/no-duplicate-string
      output: "test/output/encrypted.pdf",
      password: "1234",
    });
    t.pass();
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should decrypt from a file", async (t) => {
  try {
    // Then, decrypt it
    await qpdf.decrypt({
      input: "test/output/encrypted.pdf",
      output: "test/output/decrypted.pdf",
      password: "1234",
    });
    t.pass();
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should encrypt File -> Buffer", async (t) => {
  try {
    const BufferFromFile = await qpdf.encrypt({
      input,
      password: "1234",
    });
    t.true(Buffer.isBuffer(BufferFromFile));
  } catch (error) {
    t.fail(error.message);
  }
});

test.serial("Should decrypt a File -> Buffer", async (t) => {
  try {
    const BufferFromFile = await qpdf.decrypt({
      input: "test/output/encrypted.pdf",
      password: "1234",
    });
    t.true(Buffer.isBuffer(BufferFromFile));
  } catch (error) {
    t.fail(error.message);
  }
});

// Not sure this can happen: https://github.com/qpdf/qpdf/issues/54
test.todo("Should encrypt a Buffer -> File");
test.todo("Should decrypt a Buffer -> File");
test.todo("Should encrypt a Buffer -> Buffer");
test.todo("Should decrypt a Buffer -> Buffer");
