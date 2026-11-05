# Contributing to node-qpdf

Thanks for taking the time to contribute! Bug reports, fixes, documentation improvements and new features are all welcome.

Everyone participating in this project is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

**Do not open a public issue for security vulnerabilities.** Follow the [Security Policy](SECURITY.md) instead.

## Reporting bugs and requesting features

Open an issue using one of the [issue templates](https://github.com/nrhirani/node-qpdf/issues/new/choose). For bugs, please include:

* a minimal code sample that reproduces the problem
* the full error (`err.message`, `err.code` and `err.stderr`)
* your node-qpdf version, qpdf version (`qpdf --version`), Node.js version and operating system

If the problem also happens when you run qpdf directly on the command line, it is probably a qpdf issue; please report it to [qpdf](https://github.com/qpdf/qpdf/issues) instead.

## Development setup

1. Install [qpdf](https://github.com/qpdf/qpdf) 7.0 or newer, and Node.js 18 or newer (needed for the test runner).
2. Fork and clone the repository, then create a branch for your change:
   ```
   git checkout -b my-change
   ```
3. There are no dependencies to install.

## Running the tests

```
npm test
```

* `test/validation.test.js` checks argument validation and needs no qpdf.
* `test/process.test.js` checks how qpdf is run, using a fake qpdf (`test/support/fake-qpdf.js`). It is skipped on Windows.
* `test/qpdf.test.js` runs end-to-end against a real qpdf, using `qpdf` from your `PATH` or the binary named in `QPDF_BIN`. It is skipped if qpdf is not found:
  ```
  QPDF_BIN=/path/to/qpdf npm test
  ```

To see test coverage (Node.js 20 or newer):
```
node --test --experimental-test-coverage --test-coverage-exclude='test/**' test/validation.test.js test/process.test.js test/qpdf.test.js
```

## Guidelines for code changes

* **Keep `index.js` compatible with Node.js 8.** Use `var` and ES5-style functions, as the existing code does, and do not use newer APIs such as `stream.pipeline()` in the library. (The tests may use modern JavaScript.)
* **No runtime dependencies.** node-qpdf only uses Node.js built-in modules.
* **Never pass user input through a shell or on qpdf's command line.** Arguments are sent to qpdf on standard input (`qpdf @-`); keep it that way.
* **Validate inputs** and report problems through the callback, Promise or stream, never by throwing.
* **Add or update tests** for every bug fix and feature. A bug fix should come with a test that fails without the fix.
* **Update the docs**: the README for user-facing changes, and `CHANGELOG.md` for anything users should know about. Mark breaking changes clearly.

## Commit messages

* Use a short summary line in the imperative mood (for example "Fix stream errors on Node.js 8"), under about 72 characters.
* Add a body explaining what changed and why, when it is not obvious.
* Reference related issues, for example `Fixes #23`.

## Pull requests

1. Make sure `npm test` passes, ideally against a real qpdf.
2. Keep each pull request focused on one change.
3. Fill in the pull request template, including how you tested the change.
4. Be ready to answer review comments; maintainers may ask for changes before merging.
