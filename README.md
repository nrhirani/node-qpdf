# node-qpdf
[![npm version](https://badge.fury.io/js/node-qpdf.svg)](https://badge.fury.io/js/node-qpdf) [![NPM Downloads](https://img.shields.io/npm/dt/node-qpdf.svg)](https://www.npmjs.com/package/node-qpdf) [![NPM Downloads](https://img.shields.io/npm/dm/node-qpdf.svg)](https://www.npmjs.com/package/node-qpdf)

A small Node.js wrapper around [qpdf](https://github.com/qpdf/qpdf) for encrypting and decrypting PDF files with AES-256 (default), AES-128 and, if you explicitly allow it, the legacy RC4 algorithms.

> **Upgrading from 1.x?** Version 2.0.0 has breaking changes. See [CHANGELOG.md](CHANGELOG.md#200) for what changed and how to migrate.

## Requirements
* [Node.js](https://nodejs.org/) 8 or newer (running the test suite needs Node.js 18 or newer)
* [qpdf](https://github.com/qpdf/qpdf) **7.0 or newer**. node-qpdf passes passwords to qpdf through standard input, which older versions do not support.
  * `allowWeakCrypto` (see [Weak encryption](#weak-encryption)) needs qpdf 10.4 or newer.

## Installation
1. Install qpdf:
    * With a package manager, e.g. `apt install qpdf`, `brew install qpdf` or `choco install qpdf`
    * Or download a release from [GitHub](https://github.com/qpdf/qpdf/releases); see the [qpdf manual](https://qpdf.readthedocs.io/) for details.
    * Check the version with `qpdf --version`.
2. Install node-qpdf:
    ```
    npm install node-qpdf
    ```

If qpdf is not on your `PATH`, point node-qpdf at it:
```js
qpdf.command = '/opt/qpdf/bin/qpdf';
```

## Quick start
```js
const qpdf = require('node-qpdf');

// Encrypt to a file (AES-256)
await qpdf.encrypt('report.pdf', {
  password: 'secret',
  outputFile: 'report-protected.pdf'
});

// Decrypt to a file
await qpdf.decrypt('report-protected.pdf', {
  password: 'secret',
  outputFile: 'report-unlocked.pdf'
});
```

## How results are delivered
`encrypt()` and `decrypt()` work the same way:

| | With `outputFile` | Without `outputFile` |
|:---|:---|:---|
| **No callback** | Returns a Promise that resolves with the output path | Returns a readable stream of the PDF |
| **With callback** | Calls `callback(err, outputFile)` when qpdf finishes | Returns the stream **and** calls `callback(null, stream)` right away |

In stream mode, errors from qpdf (wrong password, damaged file, ...) are emitted as `'error'` on the stream, and the stream ends normally only if qpdf succeeds. **Always handle `'error'` on the stream**, for example with `stream.pipeline()`, or an error will crash your process.

Invalid arguments are reported the same way: through the callback, as a rejected Promise, or as an `'error'` on the returned stream.

## Encryption
```js
qpdf.encrypt(input, options, [callback])
```

| Option | Type | Description |
|:---|:---|:---|
| `password` | string or `{ user, owner }` | **Required.** See [Passwords](#passwords). |
| `keyLength` | `256` (default), `128` or `40` | Encryption strength. 128-bit uses AES unless `restrictions.useAes` is `false`. |
| `restrictions` | object | Permissions to restrict. See [Restrictions](#restrictions). |
| `outputFile` | string | Where to write the encrypted PDF. Leave it out to get a stream. Must differ from `input`. |
| `allowWeakCrypto` | boolean | Allow 40-bit or 128-bit RC4 encryption. See [Weak encryption](#weak-encryption). |
| `onWarning` | function | Called with qpdf's warning text when qpdf succeeds with warnings. See [Warnings](#warnings). |

### Passwords
* **A single string**, e.g. `password: 'secret'`, sets the *user* password, which is needed to open the file. The *owner* password, which allows changing permissions, is set to a strong random value that is never revealed. This makes the restrictions actually enforceable: someone who only knows the user password cannot remove them.
* **`{ user, owner }`** sets both passwords yourself. `user` may be `''`, so anyone can open the file but only the owner can change its permissions. `owner` must not be empty.

Passwords (and file paths) must not contain line breaks, and encryption passwords must not start with `-`.

### Restrictions
Values are strings as listed below; options that take `'y'`/`'n'` also accept `true`/`false`. Options listed without values are switches: set them to `true` to turn them on.

**256-bit and 128-bit**

| Option | Values | Description |
|:---|:---|:---|
| `print` | `'full'`, `'low'`, `'none'` | Allow full printing, low-resolution printing only, or no printing. |
| `modify` | `'all'`, `'annotate'`, `'form'`, `'assembly'`, `'none'` | Modification level. `annotate`: comments and forms; `form`: filling in forms and signing; `assembly`: document assembly only. |
| `extract` | `'y'`, `'n'` | Allow text and graphics extraction. |
| `accessibility` | `'y'`, `'n'` | Allow extraction for accessibility (usually ignored by readers). |
| `annotate` | `'y'`, `'n'` | Allow commenting and filling in form fields. |
| `assemble` | `'y'`, `'n'` | Allow document assembly. |
| `form` | `'y'`, `'n'` | Allow filling in form fields. |
| `modifyOther` | `'y'`, `'n'` | Allow other modifications. |
| `cleartextMetadata` | switch | Leave the document metadata unencrypted. |

**128-bit only:** `useAes` (`'y'`, `'n'`; defaults to `'y'`) and `forceV4` (switch).
**256-bit only:** `forceR5` (switch; uses a deprecated encryption variant).

**40-bit:** `print`, `modify`, `extract` and `annotate`, each `'y'` or `'n'`.

Unknown options, and options that do not apply to the chosen `keyLength`, are rejected. Not all PDF readers respect all restrictions.

### Weak encryption
40-bit encryption and 128-bit RC4 (`keyLength: 128` with `useAes: false`) are insecure, and qpdf 11 and newer refuse to create them by default. node-qpdf rejects them unless you set `allowWeakCrypto: true`, which needs qpdf 10.4 or newer:

```js
qpdf.encrypt('in.pdf', {
  password: 'secret',
  keyLength: 40,
  allowWeakCrypto: true,   // only if you really need compatibility with very old readers
  outputFile: 'out.pdf'
});
```

### Examples
Encrypt to a file with restrictions, using a callback:
```js
qpdf.encrypt('in.pdf', {
  password: { user: 'reader-password', owner: 'owner-password' },
  restrictions: { print: 'low', modify: 'none', extract: false },
  outputFile: 'out.pdf'
}, (err, outputFile) => {
  if (err) return console.error(err);
  console.log('Written to', outputFile);
});
```

Encrypt and send the result as an HTTP response (Express):
```js
const { pipeline } = require('stream');

app.get('/report.pdf', (req, res) => {
  res.type('application/pdf');
  pipeline(qpdf.encrypt('report.pdf', { password: 'secret' }), res, (err) => {
    if (err) console.error('Encryption failed:', err.message);
  });
});
```

## Decryption
```js
qpdf.decrypt(input, password, [callback])
qpdf.decrypt(input, options, [callback])
```

`password` is a string. Use `''` for files protected only by an owner password. Or pass an options object:

| Option | Type | Description |
|:---|:---|:---|
| `password` | string | **Required.** May be `''`. |
| `outputFile` | string | Where to write the decrypted PDF. Leave it out to get a stream. Must differ from `input`. |
| `onWarning` | function | Called with qpdf's warning text when qpdf succeeds with warnings. |

Results are delivered as described in [How results are delivered](#how-results-are-delivered).

### Examples
Decrypt to a file:
```js
await qpdf.decrypt('protected.pdf', { password: 'secret', outputFile: 'unlocked.pdf' });
```

Decrypt to a stream:
```js
const fs = require('fs');
const { pipeline } = require('stream');

pipeline(qpdf.decrypt('protected.pdf', 'secret'), fs.createWriteStream('unlocked.pdf'), (err) => {
  if (err) console.error('Decryption failed:', err.message);
});
```

## Warnings
qpdf can succeed with warnings, for example after repairing a damaged file. The result is still delivered normally; to see the warnings, pass `onWarning`:

```js
await qpdf.decrypt('scanned.pdf', {
  password: 'secret',
  outputFile: 'unlocked.pdf',
  onWarning: (message) => console.warn(message)
});
```

## Errors
Errors from qpdf have these properties:

| Property | Description |
|:---|:---|
| `message` | qpdf's error output, e.g. `qpdf: in.pdf: invalid password` |
| `code` | qpdf's exit code (usually `2`), or `'ENOENT'` if qpdf could not be found |
| `signal` | The signal that stopped qpdf, if any |
| `stderr` | Everything qpdf wrote to its error output |

## Security notes
* Passwords are never put on qpdf's command line, where other users of the machine could see them (for example with `ps`). They are passed to qpdf through a pipe on standard input and are never written to disk.
* qpdf is started directly, without a shell, so passwords and file names are never interpreted as shell commands.

## Running the tests
```
npm test
```
The tests use Node.js's built-in test runner (Node.js 18 or newer). Tests that need a real qpdf use `qpdf` from your `PATH`, or the binary named in `QPDF_BIN`, and are skipped if it is not found:
```
QPDF_BIN=/path/to/qpdf npm test
```

## Meta

Maintained by [Nishit Hirani](http://www.twitter.com/nrhirani)


## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/nrhirani/node-qpdf.


## License

The npm package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
