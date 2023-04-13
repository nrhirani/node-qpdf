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

