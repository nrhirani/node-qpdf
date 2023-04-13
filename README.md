# node-qpdf2

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Sparticuz/node-qpdf2/commits/master)
[![Node.js CI](https://github.com/Sparticuz/node-qpdf2/actions/workflows/node.js.yml/badge.svg)](https://github.com/Sparticuz/node-qpdf2/actions/workflows/node.js.yml)
[![CodeQL](https://github.com/Sparticuz/node-qpdf2/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Sparticuz/node-qpdf2/actions/workflows/codeql-analysis.yml)
[![npm](https://img.shields.io/npm/v/node-qpdf2)](https://www.npmjs.com/package/node-qpdf2)
[![npm](https://img.shields.io/npm/dm/node-qpdf)](https://www.npmjs.com/package/node-qpdf2)
[![qpdf 11+](https://img.shields.io/badge/dependencies-qpdf-green)](https://github.com/qpdf/qpdf)

A very simple wrapper for [qpdf](https://github.com/qpdf/qpdf) which is performs content-preserving transformations on PDF files. It includes encrypting and decrypting PDF files with AES 256, AES 128, RC4 (128 & 40) encryption algorithms. This is a fork of [nrhirani/node-qpdf](https://github.com/nrhirani/node-qpdf), adding Promises and Types, and is kept mostly up to date with `qpdf`.

## Dependencies

- [qpdf](https://github.com/qpdf/qpdf)
  - Version 11 is the minimum version for node-qpdf2 4.0+

## Installation

1. Install qpdf:
   - Download [qpdf](https://github.com/qpdf/qpdf/releases)
2. Install node-qpdf:
   ```
   npm install node-qpdf2
   ```

## Serverless?

This package can be uses on serverless platforms by using your vendor's layers functionality. Use the zip release from `qpdf` as the layer. For example, `qpdf-11.1.0-bin-linux-x86_64.zip` can be directly uploaded as a layer, and has been tested using Amazon Lambda.

## Encryption

You can encrypt your PDF by following:

```
import { encrypt } from "node-qpdf2";

const pdf = {
  input: "./test/example.pdf",
  output: "/tmp/encrypted.pdf",
  password: "1234",
}

await encrypt(pdf);
```

### Options for Encryption

Please see [src/encrypt.ts](https://github.com/Sparticuz/node-qpdf2/blob/master/src/encrypt.ts#L9) for the latest options, as well as [QPDF's documentation](https://qpdf.readthedocs.io/en/stable/cli.html#encryption) for information on what each restriction does.

### Examples

#### Render and Save:

```
import { encrypt } from "node-qpdf2";

const options = {
    input: "./test/example.pdf",
    keyLength: 128,
    output: "/tmp/encrypted.pdf",
    password: 'YOUR_PASSWORD_TO_ENCRYPT',
    restrictions: {
        print: 'low',
        useAes: 'y'
    }
}

await encrypt(options);
```

## Decryption

You can decrypt your PDF by following:

```
import { decrypt } from "node-qpdf2";

const options = {
  input: "/tmp/encrypted.pdf",
  output: "/tmp/decrypted.pdf",
  password: "YOUR_PASSWORD_TO_DECRYPT_PDF",
}

await decrypt(options);
```

## PDF Encryption info

You can retrieve encryption information using the info function. This function will return a Promise<string>. See [here](https://qpdf.readthedocs.io/en/stable/cli.html#option-show-encryption) for more information.

```
import { info } from "node-qpdf2";

const options = {
  input: "/tmp/encrypted.pdf",
  password: "FILE_PASSWORD",
}

console.log(await info(options));
```

If the file is not encrypted, the result will be "File is not encrypted".

## Coverage

| File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
| ---------- | ------- | -------- | ------- | ------- | ----------------- |
| All files  | 100     | 100      | 100     | 100     |
| decrypt.ts | 100     | 100      | 100     | 100     |
| encrypt.ts | 100     | 100      | 100     | 100     |
| index.ts   | 100     | 100      | 100     | 100     |
| info.ts    | 100     | 100      | 100     | 100     |
| spawn.ts   | 100     | 100      | 100     | 100     |
| utils.ts   | 100     | 100      | 100     | 100     |

## Contributing

Maintained by [Kyle McNally](http://www.github.com/Sparticuz).

Bug reports and pull requests are welcome on GitHub at https://github.com/Sparticuz/node-qpdf2.

[Sponsorship](https://github.com/sponsors/Sparticuz) is also welcome

## License

The npm package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
