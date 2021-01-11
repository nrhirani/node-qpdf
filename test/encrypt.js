const fs = require("fs");
const test = require("ava");
const qpdf = require("../dist").default;

const sample = "test/dummy.pdf";
const password = "1234";
const options = {
  password,
};

// Run this test first, as I need file-to-file.pdf later on.
test("Should encrypt File -> File", async (t) => {
  try {
    await qpdf.encrypt(sample, options, "test/file-to-file.pdf");
    t.pass();
  } catch {
    t.fail();
  }
});

test("Should encrypt a file with a space", async (t) => {
  try {
    await qpdf.encrypt("test/dummy copy.pdf", options, "test/file to file.pdf");
    t.pass();
  } catch {
    t.fail();
  }
});

test("Should encrypt a file with user and owner passwords", async (t) => {
  try {
    await qpdf.encrypt(
      sample,
      {
        ...options,
        password: { owner: "admin", user: "test" },
      },
      "test/different-passwords.pdf"
    );
    t.pass();
  } catch {
    t.fail();
  }
});

test("should allow restrictions", async (t) => {
  try {
    await qpdf.encrypt(sample, {
      ...options,
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
  try {
    const results = await qpdf.encrypt("", options);
    if (results === "Please specify input file") {
      t.pass();
    }
  } catch {
    t.fail();
  }
});

test("should throw an error if the file doesn't exist", async (t) => {
  try {
    const results = await qpdf.encrypt("bad_file_name.pdf", options);
    if (results === "Input file doesn't exist") {
      t.pass();
    }
  } catch {
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
  } catch {
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
  } catch {
    t.fail();
  }
});

test.todo("Should encrypt File -> Buffer");

test.todo("Should encrypt a Buffer -> File");

test.todo("Should encrypt a Buffer -> Buffer");
