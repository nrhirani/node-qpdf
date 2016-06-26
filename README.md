# node-qpdf
[![npm version](https://badge.fury.io/js/node-qpdf.svg)](https://badge.fury.io/js/node-qpdf) [![NPM Downloads](https://img.shields.io/npm/dt/node-qpdf.svg)](https://www.npmjs.com/package/node-qpdf) [![NPM Downloads](https://img.shields.io/npm/dm/node-qpdf.svg)](https://www.npmjs.com/package/node-qpdf) [![bitHound Code](https://www.bithound.io/github/nrhirani/node-qpdf/badges/code.svg)](https://www.bithound.io/github/nrhirani/node-qpdf) [![bitHound Overall Score](https://www.bithound.io/github/nrhirani/node-qpdf/badges/score.svg)](https://www.bithound.io/github/nrhirani/node-qpdf)

A very simple wrapper for [qpdf](http://qpdf.sourceforge.net/) which is a content-preserving transformations on PDF files. It includes encrypting and decrypting PDF with AES 256, AES 128, RC4 (128 & 40) encryption algorithms.

## Dependencies
* [Node.js](http://nodejs.org/)
* [qpdf](http://qpdf.sourceforge.net/)

## Installation
1. Install qpdf:
    * Download [qpdf](https://sourceforge.net/projects/qpdf/files/qpdf/6.0.0/)
    * Read [qpdf manual](http://qpdf.sourceforge.net/files/qpdf-manual.html#ref.building) for installation instructions.
2. Install node-qpdf:
    ```
    npm install node-qpdf
    ```

## Encryption
You can encrypt your PDF by following:
```
var qpdf = require('node-qpdf');

var options = {
    keyLength: 128,
    password: 'YOUR_PASSWORD_TO_ENCRYPT'
}

qpdf.encrypt(localFilePath, options);
```

### Options for Encryption
The following are **required options**
* `keyLength:` - a number which defines the encryption algorithm to be used. Values can be **40, 128 and 256** only.
* `password:` - a string containing the secret password which will be further used to unlock the PDF.

You might want to set other options for each encryption algorithm inside `restrictions:` JSON according to the `keyLength` you choose :-

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
var qpdf = require('node-qpdf');

var options = {
    keyLength: 128,
    password: 'YOUR_PASSWORD_TO_ENCRYPT',
    restrictions: {
        print: 'low',
        useAes: 'y'
    }
}

qpdf.encrypt(localFilePath, options, outputFilePath);
```
#### Render and Stream:
```
var qpdf = require('node-qpdf');

var options = {
    keyLength: 256,
    password: 'YOUR_PASSWORD_TO_ENCRYPT',
    restrictions: {
        modify: 'none',
        extract: 'n'
    }
}

var doc = qpdf.encrypt(localFilePath, options, outputFilePath);

doc.stdout.pipe(res);

res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Access-Control-Allow-Origin': '*',
    'Content-Disposition': 'inline; filename=order.pdf'
});
```

## Decryption
You can decrypt your PDF by following:
```
var qpdf = require('node-qpdf');

qpdf.decrypt(localFilePath, 'YOUR_PASSWORD_TO_DECRYPT_PDF');
```

### Examples
#### Render and Save:
```
var qpdf = require('node-qpdf');

qpdf.decrypt(localFilePath, 'YOUR_PASSWORD_TO_DECRYPT_PDF', outputFilePath);
```
#### Render and Stream:
```
var qpdf = require('node-qpdf');

var doc = qpdf.decrypt(localFilePath, 'YOUR_PASSWORD_TO_DECRYPT_PDF', outputFilePath);

doc.stdout.pipe(res);

res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Access-Control-Allow-Origin': '*',
    'Content-Disposition': 'inline; filename=order.pdf'
});
```

## Meta

Maintained by [Nishit Hirani](http://www.twitter.com/nrhirani)


## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/nrhirani/node-qpdf.


## License

The npm package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
