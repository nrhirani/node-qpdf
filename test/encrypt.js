const test = require("ava");
const qpdf = require("../dist").default;

const input = "test/example.pdf";
const password = "1234";

test.serial(
  "Should encrypt a file with user and owner passwords",
  async (t) => {
    try {
      await qpdf.encrypt({
        input,
        output: "test/output/different-passwords.pdf",
        password: { owner: "admin", user: password },
      });
      t.pass();
    } catch (error) {
      // eslint-disable-next-line ava/assertion-arguments
      t.fail(error.message);
    }
  }
);

test.serial("should not overwrite existing files", async (t) => {
  const error = await t.throwsAsync(
    qpdf.encrypt({
      input,
      output: "test/output/different-passwords.pdf",
      overwrite: false,
    })
  );
  t.is(error.message, "Output file already exists");
});

test("should allow restrictions", async (t) => {
  try {
    await qpdf.encrypt({
      input,
      restrictions: {
        print: "none",
        useAes: "y",
      },
    });
    t.pass();
  } catch {
    t.fail();
  }
});

test("should not work if no input file is specified", async (t) => {
  const error = await t.throwsAsync(qpdf.encrypt());
  t.is(error.message, "Please specify input file");
});

test("should throw an error if the file doesn't exist", async (t) => {
  const error = await t.throwsAsync(
    qpdf.encrypt({
      input: "bad_file_name.pdf",
      password,
    })
  );
  t.is(error.message, "Input file doesn't exist");
});

test("should throw if only user or owner password is submitted", async (t) => {
  const error = await t.throwsAsync(
    qpdf.encrypt({
      input,
      password: { user: "test" },
    })
  );
  t.is(error.message, "Please specify both owner and user passwords");
});

test("should throw if restrictions are wrong", async (t) => {
  const error = await t.throwsAsync(
    qpdf.encrypt({
      input,
      restrictions: "test",
    })
  );
  t.is(error.message, "Invalid Restrictions");
});
