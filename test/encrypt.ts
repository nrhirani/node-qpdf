import test from "ava";
import { copyFile } from "node:fs/promises";
import { encrypt } from "../src/encrypt.js";

const input = "test/example.pdf";
const password = "1234";

test.serial(
  "Should encrypt a file with user and owner passwords",
  async (t) => {
    await t.notThrowsAsync(async () => {
      await encrypt({
        input,
        output: "test/output/encrypted-with-different-passwords.pdf",
        password: { owner: "admin", user: password },
      });
    });
  }
);

test.serial("should not overwrite existing files", async (t) => {
  const error = await t.throwsAsync(
    encrypt({
      input,
      output: "test/output/encrypted-with-different-passwords.pdf",
      overwrite: false,
    })
  );
  t.is(error?.message, "Output file already exists");
});

test("should allow restrictions", async (t) => {
  await t.notThrowsAsync(async () => {
    await encrypt({
      input,
      output: "test/output/encrypted-with-restrictions.pdf",
      password,
      restrictions: {
        print: "none",
        useAes: "y",
      },
    });
  });
});

test("should encrypt without passwords", async (t) => {
  await t.notThrowsAsync(async () => {
    await encrypt({
      input,
      output: "test/output/encrypted-with-no-password.pdf",
    });
  });
});

test("should encrypt where keyLength is 40", async (t) => {
  await t.notThrowsAsync(async () => {
    await encrypt({
      input,
      keyLength: 40,
      output: "test/output/encrypted-with-keyLength-40.pdf",
      password,
    });
  });
});

test("should encrypt where cleartextMetadata is set as a restriction", async (t) => {
  await t.notThrowsAsync(async () => {
    await encrypt({
      input,
      output: "test/output/encrypted-with-cleartext-metadata.pdf",
      password,
      restrictions: {
        cleartextMetadata: true,
      },
    });
  });
});

test("should not work if no input file is specified", async (t) => {
  // @ts-expect-error This is what I'm testing
  const error = await t.throwsAsync(encrypt());
  t.is(error?.message, "Please specify input file");
});

test("should throw an error if the file doesn't exist", async (t) => {
  const error = await t.throwsAsync(
    encrypt({
      input: "bad_file_name.pdf",
      password,
    })
  );
  t.is(error?.message, "Input file doesn't exist");
});

test("should throw if only user or owner password is submitted", async (t) => {
  const error = await t.throwsAsync(
    encrypt({
      input,
      // @ts-expect-error This is what I'm testing
      password: { user: "test" },
    })
  );
  t.is(error?.message, "Please specify both owner and user passwords");
});

test("should throw if restrictions are wrong", async (t) => {
  const error = await t.throwsAsync(
    encrypt({
      input,
      // @ts-expect-error This is what I'm testing
      restrictions: "test",
    })
  );
  t.is(error?.message, "Invalid Restrictions");
});

test("Should encrypt and overwrite the file", async (t) => {
  await t.notThrowsAsync(async () => {
    // First, copy example.pdf to output/overwrite.pdf
    // eslint-disable-next-line sonarjs/no-duplicate-string
    await copyFile("test/example.pdf", "test/output/overwrite.pdf");
    await encrypt({
      input: "test/output/overwrite.pdf",
      output: "test/output/overwrite.pdf",
      overwrite: true,
      password: "1234",
    });
  });
});
