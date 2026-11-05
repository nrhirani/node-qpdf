'use strict';

// Argument validation. These errors are raised before qpdf is started, so no
// qpdf installation is needed.

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const qpdf = require('..');
const { tmpDir, removeDir, makePdf, callbackResult } = require('./support/helpers');

// If validation wrongly passed, qpdf would be started; a missing binary makes
// that fail loudly with ENOENT instead of a validation message
qpdf.command = 'node-qpdf-test-missing-binary';

let dir;
let input;

test.before(() => {
  dir = tmpDir();
  input = makePdf(path.join(dir, 'in.pdf'));
});

test.after(() => removeDir(dir));

async function encryptError(options) {
  const { err } = await callbackResult((cb) => qpdf.encrypt(input, options, cb));
  assert.ok(err, 'expected a validation error');
  return err.message;
}

async function decryptError(options, file) {
  const { err } = await callbackResult((cb) => qpdf.decrypt(file === undefined ? input : file, options, cb));
  assert.ok(err, 'expected a validation error');
  return err.message;
}

test('error delivery', async (t) => {
  await t.test('callback receives the error and nothing is returned', async () => {
    let returned = 'not set';
    const { err } = await callbackResult((cb) => { returned = qpdf.encrypt('', { password: 'p' }, cb); });
    assert.strictEqual(err.message, 'Specify input file');
    assert.strictEqual(returned, undefined);
  });

  await t.test('file mode without callback returns a rejected Promise', async () => {
    await assert.rejects(qpdf.encrypt('', { password: 'p', outputFile: 'out.pdf' }), /Specify input file/);
    await assert.rejects(qpdf.decrypt('', { password: 'p', outputFile: 'out.pdf' }), /Specify input file/);
  });

  await t.test('stream mode without callback returns a stream that emits the error', async () => {
    for (const run of [() => qpdf.encrypt('', { password: 'p' }), () => qpdf.decrypt('', 'p')]) {
      const result = run();
      assert.ok(result instanceof Readable);
      const err = await new Promise((resolve) => result.on('error', resolve));
      assert.strictEqual(err.message, 'Specify input file');
    }
  });
});

test('input and output files', async (t) => {
  await t.test('input must be a non-empty string', async () => {
    for (const bad of [undefined, null, '', 123, ['in.pdf']]) {
      const { err } = await callbackResult((cb) => qpdf.encrypt(bad, { password: 'p' }, cb));
      assert.strictEqual(err.message, 'Specify input file');
      const { err: err2 } = await callbackResult((cb) => qpdf.decrypt(bad, 'p', cb));
      assert.strictEqual(err2.message, 'Specify input file');
    }
  });

  await t.test('outputFile must be a string other than "-"', async () => {
    for (const bad of ['-', 42, {}]) {
      assert.strictEqual(await encryptError({ password: 'p', outputFile: bad }), 'Invalid output file');
      assert.strictEqual(await decryptError({ password: 'p', outputFile: bad }), 'Invalid output file');
    }
  });

  await t.test('outputFile must not be the input file, however it is written', async () => {
    const message = 'Output file must be different from the input file';
    const link = path.join(dir, 'link.pdf');
    try { fs.symlinkSync(input, link); } catch (e) { /* symlinks may be unavailable on Windows */ }

    const variants = [
      input,
      path.join(dir, '.', 'in.pdf'),
      path.join(dir, 'sub', '..', 'in.pdf'),
      path.relative(process.cwd(), input)
    ];
    if (fs.existsSync(link)) variants.push(link);

    for (const outputFile of variants) {
      assert.strictEqual(await encryptError({ password: 'p', outputFile }), message, outputFile);
      assert.strictEqual(await decryptError({ password: 'p', outputFile }), message, outputFile);
    }
  });
});

test('encrypt passwords', async (t) => {
  await t.test('a password is required', async () => {
    for (const password of [undefined, null, '', 1234]) {
      assert.strictEqual(await encryptError({ password }), 'Password missing');
    }
  });

  await t.test('encrypt works without options and with (input, callback)', async () => {
    assert.strictEqual(await encryptError(undefined), 'Password missing');
    const { err } = await callbackResult((cb) => qpdf.encrypt(input, cb));
    assert.strictEqual(err.message, 'Password missing');
  });

  await t.test('{ user, owner } must both be strings', async () => {
    for (const password of [{ user: 'u' }, { owner: 'o' }, { user: 'u', owner: null }, { user: 1, owner: 'o' }]) {
      assert.strictEqual(await encryptError({ password }), 'Specify owner and user password');
    }
  });

  await t.test('an empty owner password is rejected', async () => {
    assert.strictEqual(await encryptError({ password: { user: 'u', owner: '' } }),
      'An empty owner password is insecure and not allowed');
  });

  await t.test('passwords must not start with "-"', async () => {
    assert.strictEqual(await encryptError({ password: '-abc' }), 'Passwords must not start with "-"');
    assert.strictEqual(await encryptError({ password: { user: '-u', owner: 'o' } }), 'Passwords must not start with "-"');
    assert.strictEqual(await encryptError({ password: { user: 'u', owner: '-o' } }), 'Passwords must not start with "-"');
  });

  await t.test('passwords and paths must not contain line breaks', async () => {
    const message = 'Passwords, file paths and restriction values must not contain line breaks';
    assert.strictEqual(await encryptError({ password: 'a\nb' }), message);
    assert.strictEqual(await encryptError({ password: { user: 'u', owner: 'a\r\nb' } }), message);
    assert.strictEqual(await encryptError({ password: 'p', outputFile: path.join(dir, 'a\nb.pdf') }), message);
  });
});

test('key length and restrictions', async (t) => {
  await t.test('keyLength must be 40, 128 or 256', async () => {
    for (const keyLength of [64, '512', 'abc']) {
      assert.strictEqual(await encryptError({ password: 'p', keyLength }), 'Invalid key length: use 40, 128 or 256');
    }
  });

  await t.test('restrictions must be an object', async () => {
    for (const restrictions of ['print', 5, ['print']]) {
      assert.strictEqual(await encryptError({ password: 'p', restrictions }), 'Invalid restrictions');
    }
  });

  await t.test('unknown restrictions are rejected (no arbitrary qpdf flags)', async () => {
    assert.strictEqual(await encryptError({ password: 'p', restrictions: { allowInsecure: true } }),
      'Restriction "allowInsecure" is not supported with 256-bit encryption');
  });

  await t.test('restrictions are checked against the key length', async () => {
    assert.strictEqual(await encryptError({ password: 'p', restrictions: { useAes: 'y' } }),
      'Restriction "useAes" is not supported with 256-bit encryption');
    assert.strictEqual(await encryptError({ password: 'p', keyLength: 40, allowWeakCrypto: true, restrictions: { accessibility: 'y' } }),
      'Restriction "accessibility" is not supported with 40-bit encryption');
  });

  await t.test('restriction values are validated', async () => {
    assert.strictEqual(await encryptError({ password: 'p', restrictions: { print: 'maybe' } }),
      'Invalid value for restriction "print": use none, low, full');
    assert.strictEqual(await encryptError({ password: 'p', keyLength: 40, allowWeakCrypto: true, restrictions: { print: 'low' } }),
      'Invalid value for restriction "print": use y, n');
    assert.strictEqual(await encryptError({ password: 'p', restrictions: { extract: 'yes' } }),
      'Invalid value for restriction "extract": use y, n');
    assert.strictEqual(await encryptError({ password: 'p', restrictions: { cleartextMetadata: 'y' } }),
      'Restriction "cleartextMetadata" takes no value; use true or false');
  });
});

test('weak encryption', async (t) => {
  const message = /^40-bit and 128-bit RC4 encryption are insecure/;

  await t.test('40-bit and 128-bit RC4 are refused by default', async () => {
    assert.match(await encryptError({ password: 'p', keyLength: 40 }), message);
    assert.match(await encryptError({ password: 'p', keyLength: 128, restrictions: { useAes: false } }), message);
    assert.match(await encryptError({ password: 'p', keyLength: 128, restrictions: { useAes: 'n' } }), message);
  });

  await t.test('allowWeakCrypto must be a boolean', async () => {
    assert.strictEqual(await encryptError({ password: 'p', allowWeakCrypto: 'yes' }), 'allowWeakCrypto must be true or false');
  });
});

test('decrypt passwords and options', async (t) => {
  await t.test('a password string is required, but may be empty', async () => {
    assert.strictEqual(await decryptError(undefined), 'Password missing');
    assert.strictEqual(await decryptError({}), 'Password missing');
    assert.strictEqual(await decryptError({ password: 1234 }), 'Password missing');
    // '' passes validation and reaches qpdf (here: the missing test binary)
    const { err } = await callbackResult((cb) => qpdf.decrypt(input, { password: '', outputFile: path.join(dir, 'o.pdf') }, cb));
    assert.strictEqual(err.code, 'ENOENT');
  });

  await t.test('passwords and paths must not contain line breaks', async () => {
    assert.strictEqual(await decryptError('a\nb'), 'Passwords and file paths must not contain line breaks');
  });

  await t.test('onWarning must be a function', async () => {
    assert.strictEqual(await decryptError({ password: 'p', onWarning: true }), 'onWarning must be a function');
    assert.strictEqual(await encryptError({ password: 'p', onWarning: 'x' }), 'onWarning must be a function');
  });
});
