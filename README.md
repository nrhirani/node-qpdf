# node-qpdf2

![Node.js CI](https://github.com/Sparticuz/node-qpdf2/workflows/Node.js%20CI/badge.svg)
![CodeQL](https://github.com/Sparticuz/node-qpdf2/workflows/Code%20scanning%20-%20action/badge.svg)
![npm](https://img.shields.io/npm/v/node-qpdf2)
![npm](https://img.shields.io/npm/dt/node-qpdf2)

A very simple wrapper for [qpdf](https://github.com/qpdf/qpdf) which is a content-preserving transformations on PDF files. It includes encrypting and decrypting PDF with AES 256, AES 128, RC4 (128 & 40) encryption algorithms. This is a fork of [nrhirani/node-qpdf](https://github.com/nrhirani/node-qpdf), adding Promises and Types.

## Dependencies
* [qpdf](https://github.com/qpdf/qpdf)

## Installation
1. Install qpdf:
    * Download [qpdf](https://github.com/qpdf/qpdf/releases)
2. Install node-qpdf:
    ```
    npm install node-qpdf2
    ```

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

## Coverage
------------|---------|----------|---------|---------|-------------------
File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------|---------|----------|---------|---------|-------------------
All files   |   97.56 |     97.5 |     100 |   97.56 |
 decrypt.ts |     100 |      100 |     100 |     100 |
 encrypt.ts |     100 |      100 |     100 |     100 |
 index.ts   |     100 |      100 |     100 |     100 |
 spawn.ts   |   85.18 |       80 |     100 |   85.18 | 13-14,17,21
 utils.ts   |     100 |      100 |     100 |     100 |
------------|---------|----------|---------|---------|-------------------

## Meta

Maintained by [Kyle McNally](http://www.github.com/Sparticuz)


## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/Sparticuz/node-qpdf2.


## License

The npm package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
