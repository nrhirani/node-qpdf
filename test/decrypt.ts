import test from "ava";
import { decrypt } from "../src/decrypt.js";

test("Should not work if no input file is specified", async (t) => {
  // @ts-expect-error This is what I'm testing
  const error = await t.throwsAsync(decrypt({ password: "1234" }));
  t.is(error?.message, "Please specify input file");
});

test("Should not work if the input file doesn't exist", async (t) => {
  const error = await t.throwsAsync(decrypt({ input: "bad_file_name.pdf" }));
  t.is(error?.message, "Input file doesn't exist");
});

test("Should decrypt the file with a password", async (t) => {
  await t.notThrowsAsync(async () => {
    await decrypt({
      input: "test/encrypted.pdf",
      output: "test/output/decrypted.pdf",
      password: "1234",
    });
  });
});

test("Should throw with a bad password", async (t) => {
  try {
    await decrypt({
      input: "test/encrypted.pdf",
      output: "test/output/decrypted.pdf",
      password: "4321",
    });
    t.fail("This method should fail!");
  } catch (error) {
    t.is(error, "qpdf: test/encrypted.pdf: invalid password\n");
  }
});

test("Should decrypt a file without a password", async (t) => {
  await t.notThrowsAsync(async () => {
    await decrypt({
      input: "test/encrypted-no-password.pdf",
      output: "test/output/decrypted-no-password.pdf",
    });
  });
});
