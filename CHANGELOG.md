# Changelog

## 2.0.0

### Breaking changes
* **qpdf 7.0 or newer is required.** Arguments are passed to qpdf through standard input (`qpdf @-`).
* **`decrypt()` with a callback in stream mode** now calls `callback(null, stream)` right away, exactly like `encrypt()`. Before, the callback ran when qpdf finished and received the string `'-'`. qpdf errors are now emitted as `'error'` on the stream, so **you must handle `'error'` on the stream** (for example with `stream.pipeline()`), or an error will crash your process. To be told when decryption has finished, write to a file with `outputFile` instead.
* **A single password string no longer doubles as the owner password.** A random owner password is used instead, so anyone who knows the password can open the file but cannot remove its restrictions. Pass `password: { user, owner }` to choose the owner password yourself.
* **128-bit encryption uses AES by default.** Before, it used RC4 unless `useAes: 'y'` was set.
* **40-bit and 128-bit RC4 encryption are refused** unless `allowWeakCrypto: true` is set (qpdf 10.4 or newer). qpdf 11 and newer refuse them anyway.
* **Stricter validation.** These are now rejected with a clear error:
  * missing or non-string passwords
  * an empty owner password
  * encryption passwords starting with `-`
  * passwords or file paths containing line breaks
  * unknown restrictions, or restrictions that do not apply to the chosen key length
  * invalid restriction values
  * a `keyLength` other than 40, 128 or 256
  * an `outputFile` that is the same file as the input (also when written differently)
  * an `outputFile` of `'-'`

### Security
* Fixed shell command injection: on Linux and macOS, passwords and file paths were passed to `/bin/sh` unescaped.
* Passwords are no longer visible to other users in the process list (`ps`). They are passed to qpdf through a pipe on standard input and are never written to disk.
* Restrictions can no longer be used to pass arbitrary qpdf options.

### Fixed
* Invalid arguments crashed with a `TypeError` or an unhandled `'error'` event instead of being reported to the caller.
* `encrypt()` crashed when called without `options`, and it modified the caller's `options` object.
* qpdf's exit code was ignored, so failures could be reported as success.
* qpdf warnings were treated as fatal errors and qpdf was stopped partway through. Exit code 3 (success with warnings) is now treated as success.
* The callback could be called more than once.
* Only the first chunk of qpdf's error output was reported.
* In stream mode, a failure looked like a normal (empty) end of the stream.
* `decrypt()` rejected the empty password needed for files protected only by an owner password.
* The `forceV4` restriction was passed to qpdf in the wrong case and did not work.

### Added
* `decrypt()` accepts an options object `{ password, outputFile, onWarning }` and supports writing to a file, with a callback or a Promise.
* `onWarning` option for both functions, to receive qpdf's warnings.
* `allowWeakCrypto` option.
* Restrictions accept `true`/`false` for `'y'`/`'n'` values. Added the `annotate`, `assemble`, `form`, `modifyOther`, `cleartextMetadata`, `forceV4` and `forceR5` restrictions.
* Errors from qpdf carry `code`, `signal` and `stderr` properties, and give a clear hint when qpdf is too old.
* Test suite (`npm test`).

### Migrating from 1.x
```js
// 1.x: callback ran when decryption finished
qpdf.decrypt('in.pdf', 'pw', (err) => { /* done */ });

// 2.0: write to a file to know when it is done ...
await qpdf.decrypt('in.pdf', { password: 'pw', outputFile: 'out.pdf' });

// ... or consume the stream and handle its errors
pipeline(qpdf.decrypt('in.pdf', 'pw'), destination, (err) => { /* done */ });
```

```js
// 1.x: RC4 by default for 128-bit, owner password = user password
qpdf.encrypt('in.pdf', { keyLength: 128, password: 'pw' });

// 2.0: AES-128 and a random owner password; to keep the old behaviour exactly:
qpdf.encrypt('in.pdf', {
  keyLength: 128,
  password: { user: 'pw', owner: 'pw' },
  restrictions: { useAes: false },
  allowWeakCrypto: true
});
```

The 1.x README examples that passed the output path as the third argument
(`qpdf.encrypt(file, options, outputFilePath)`) never worked: the third
argument is the callback. Use `options.outputFile`.
