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

const options = {
    keyLength: 256,
    password: 'YOUR_PASSWORD_TO_ENCRYPT'
}

await encrypt(localFilePath, options, outputFilePath);
```

### Options for Encryption
The following are **required options**
* `keyLength:` - a number which defines the encryption algorithm to be used. Values can be **40, 128 and 256** only.
* `password:` - a string containing the secret password which will be further used to unlock the PDF or an object containing `user` and `owner` for setting password for different roles.

You might want to set other options for each encryption algorithm inside `restrictions:` according to the `keyLength` you choose :-

*Key Length:* **40**

| Option | Value | Description |
|:---|:---|:---|
`print:` | `'y'`, `'n'` | Determines whether or not to allow printing.
`modify:` | `'y'`, `'n'` | Determines whether or not to allow document modification.
`extract:` | `'y'`, `'n'` | Determines whether or not to allow text/image extraction.
`annotate:` | `'y'`, `'n'` | Determines whether or not to allow comments and form fill-in and signing.

*Key Length:* **128**

| Option | Value | Description |
|:---|:---|:---|
`print:` | `'full'`, `'low'`, `'none'` | **full**: allow full printing. **low**: allow low-resolution printing only. **none**: disallow printing.
`modify:` | `'all'`, `'annotate'`, `'form'`, `'assembly'`, `'none'` | **all:** allow full document modification. **annotate:** allow comment authoring and form operations. **form:** allow form field fill-in and signing. **assembly:** allow document assembly only. **none:** allow no modifications.
`extract:` | `'y'`, `'n'` | Determines whether or not to allow text/image extraction.
`useAes:` | `'y'`, `'n'` | AES encryption will be used instead of RC4 encryption.
`accessibility:` | `'y'`, `'n'` | Determines whether or not to allow accessibility to visually impaired.

*Key Length:* **256**

| Option | Value | Description |
|:---|:---|:---|
`print:` | `'full'`, `'low'`, `'none'` | **full**: allow full printing. **low**: allow low-resolution printing only. **none**: disallow printing.
`modify:` | `'all'`, `'annotate'`, `'form'`, `'assembly'`, `'none'` | **all:** allow full document modification. **annotate:** allow comment authoring and form operations. **form:** allow form field fill-in and signing. **assembly:** allow document assembly only. **none:** allow no modifications.
`extract:` | `'y'`, `'n'` | Determines whether or not to allow text/image extraction.
`accessibility:` | `'y'`, `'n'` | Determines whether or not to allow accessibility to visually impaired.

### Examples
#### Render and Save:
```
import { encrypt } from "node-qpdf2";

const options = {
    keyLength: 128,
    password: 'YOUR_PASSWORD_TO_ENCRYPT',
    restrictions: {
        print: 'low',
        useAes: 'y'
    }
}

await encrypt(inputFilePath, options, outputFilePath);
```
or
```
import { encrypt } from "node-qpdf2";

const options = {
  keyLength: 40,
  password: {
    user: 'YOUR_PASSWORD_TO_ENCRYPT_FOR_USER',
    owner: 'YOUR_PASSWORD_TO_ENCRYPT_FOR_OWNER'
  },
  restrictions: {
    print: 'low',
    useAes: 'y'
  }
};

await encrypt(inputFilePath, options, outputFilePath);
```

## Decryption
You can decrypt your PDF by following:
```
import { decrypt } from "node-qpdf2";

await decrypt(inputFilePath, 'YOUR_PASSWORD_TO_DECRYPT_PDF', outputFilePath);
```

## Meta

Maintained by [Kyle McNally](http://www.github.com/Sparticuz)


## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/Sparticuz/node-qpdf2.


## License

The npm package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
