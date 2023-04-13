import test from "ava";
import { info } from "../src/info.js";

test("Should not work if no input file is specified", async (t) => {
  // @ts-expect-error This is what I'm testing
  const error = await t.throwsAsync(info({}));
  t.is(error?.message, "Please specify input file");
});

test("Should not work if the input file doesn't exist", async (t) => {
  const error = await t.throwsAsync(info({ input: "bad_file_name.pdf" }));
  t.is(error?.message, "Input file doesn't exist");
});

test("Should return the info for an encrypted file", async (t) => {
  await t.notThrowsAsync(async () => {
    await info({
      input: "test/encrypted.pdf",
      password: "1234",
    });
  });
});

test("Should return the info for a non-encrypted file", async (t) => {
  const result = await info({
    input: "test/example.pdf",
  });
  t.is(result, "File is not encrypted");
});
