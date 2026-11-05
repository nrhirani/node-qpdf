'use strict';

// End-to-end tests against a real qpdf. Uses $QPDF_BIN, or "qpdf" from PATH,
// and is skipped when qpdf is not available.

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pipeline, Writable } = require('stream');
const { spawnSync } = require('child_process');

const qpdf = require('..');
const { QPDF_BIN, qpdfVersion, tmpDir, removeDir, makePdf, collect, callbackResult, showEncryption } = require('./support/helpers');

const version = qpdfVersion();
const skip = version ? false : 'qpdf not found (install qpdf or set QPDF_BIN)';

let dir;
let plain;
let damaged;
const file = (name) => path.join(dir, name);

test.before(() => {
  if (version) console.log('# real qpdf version ' + version + ' (' + QPDF_BIN + ')');
  dir = tmpDir();
  plain = makePdf(file('plain.pdf'));
  damaged = makePdf(file('damaged.pdf'), { damaged: true });
});

test.after(() => removeDir(dir));

test.beforeEach(() => {
  qpdf.command = QPDF_BIN;
});

test('encrypt and decrypt round trip', { skip }, async (t) => {
  const password = 'S3cret pw $(whoami); "quoted" ';

  await t.test('encrypt to a file with AES-256 by default', async () => {
    assert.strictEqual(await qpdf.encrypt(plain, { password, outputFile: file('enc.pdf') }), file('enc.pdf'));
    const info = showEncryption(file('enc.pdf'), password);
    assert.match(info, /R = 6/);
    assert.match(info, /Supplied password is user password/);
  });

  await t.test('decrypt to a file', async () => {
    assert.strictEqual(await qpdf.decrypt(file('enc.pdf'), { password, outputFile: file('dec.pdf') }), file('dec.pdf'));
    assert.match(showEncryption(file('dec.pdf')), /File is not encrypted/);
  });

  await t.test('encrypt and decrypt as streams', async () => {
    const encrypted = await collect(qpdf.encrypt(plain, { password }));
    fs.writeFileSync(file('enc-stream.pdf'), encrypted);
    assert.match(showEncryption(file('enc-stream.pdf'), password), /R = 6/);

    const decrypted = await collect(qpdf.decrypt(file('enc-stream.pdf'), password));
    fs.writeFileSync(file('dec-stream.pdf'), decrypted);
    assert.match(showEncryption(file('dec-stream.pdf')), /File is not encrypted/);
  });

  await t.test('stream mode with a callback', async () => {
    const stream = await new Promise((resolve, reject) => {
      qpdf.decrypt(file('enc.pdf'), password, (err, s) => (err ? reject(err) : resolve(s)));
    });
    assert.strictEqual((await collect(stream)).slice(0, 5).toString(), '%PDF-');
  });
});

test('passwords and permissions', { skip }, async (t) => {
  await t.test('a single password does not grant owner rights, so restrictions hold', async () => {
    await qpdf.encrypt(plain, { password: 'userpw', outputFile: file('single.pdf'), restrictions: { print: 'none' } });
    const info = showEncryption(file('single.pdf'), 'userpw');
    assert.match(info, /Supplied password is user password/);
    assert.match(info, /print high resolution: not allowed/);
  });

  await t.test('an explicit owner password grants owner rights', async () => {
    await qpdf.encrypt(plain, { password: { user: 'u', owner: 'owner pw' }, outputFile: file('owner.pdf') });
    assert.match(showEncryption(file('owner.pdf'), 'owner pw'), /Supplied password is owner password/);
  });

  await t.test('owner-only protection opens without a password and decrypts with ""', async () => {
    await qpdf.encrypt(plain, { password: { user: '', owner: 'owner pw' }, outputFile: file('owner-only.pdf') });
    assert.match(showEncryption(file('owner-only.pdf')), /Supplied password is user password/);
    await qpdf.decrypt(file('owner-only.pdf'), { password: '', outputFile: file('owner-only-dec.pdf') });
    assert.match(showEncryption(file('owner-only-dec.pdf')), /File is not encrypted/);
  });

  await t.test('restrictions are applied', async () => {
    await qpdf.encrypt(plain, {
      password: 'p',
      outputFile: file('restricted.pdf'),
      restrictions: { print: 'low', extract: false, modify: 'none', modifyOther: false }
    });
    const info = showEncryption(file('restricted.pdf'), 'p');
    assert.match(info, /print low resolution: allowed/);
    assert.match(info, /print high resolution: not allowed/);
    assert.match(info, /extract for any purpose: not allowed/);
    assert.match(info, /modify other: not allowed/);
  });
});

test('key lengths', { skip }, async (t) => {
  await t.test('128-bit uses AES by default', async () => {
    await qpdf.encrypt(plain, { password: 'p', keyLength: 128, outputFile: file('128.pdf') });
    const info = showEncryption(file('128.pdf'), 'p');
    assert.match(info, /R = 4/);
    assert.match(info, /AESv2/);
  });

  await t.test('weak encryption works with allowWeakCrypto', async () => {
    await qpdf.encrypt(plain, { password: 'p', keyLength: 40, allowWeakCrypto: true, outputFile: file('40.pdf') });
    assert.match(showEncryption(file('40.pdf'), 'p'), /R = 2/);
    await qpdf.encrypt(plain, { password: 'p', keyLength: 128, allowWeakCrypto: true, restrictions: { useAes: false }, outputFile: file('rc4.pdf') });
    assert.match(showEncryption(file('rc4.pdf'), 'p'), /R = 3/);
  });
});

test('errors from qpdf', { skip }, async (t) => {
  await t.test('wrong password: callback, Promise and stream', async () => {
    await qpdf.encrypt(plain, { password: 'right', outputFile: file('pw.pdf') });

    const { err } = await callbackResult((cb) => qpdf.decrypt(file('pw.pdf'), { password: 'wrong', outputFile: file('x.pdf') }, cb));
    assert.match(err.message, /invalid password/);
    assert.strictEqual(err.code, 2);

    await assert.rejects(qpdf.decrypt(file('pw.pdf'), { password: 'wrong', outputFile: file('x.pdf') }), /invalid password/);
    await assert.rejects(collect(qpdf.decrypt(file('pw.pdf'), 'wrong')), /invalid password/);
  });

  await t.test('wrong password makes stream.pipeline fail', async () => {
    const err = await new Promise((resolve) => {
      pipeline(qpdf.decrypt(file('pw.pdf'), 'wrong'), fs.createWriteStream(file('piped.pdf')), resolve);
    });
    assert.match(err.message, /invalid password/);
  });

  await t.test('missing input file', async () => {
    await assert.rejects(qpdf.encrypt(file('missing.pdf'), { password: 'p', outputFile: file('x.pdf') }), /missing\.pdf/);
  });
});

test('warnings', { skip }, async (t) => {
  await t.test('a damaged but recoverable file succeeds and reports warnings', async () => {
    const warnings = [];
    const onWarning = (message) => warnings.push(message);

    assert.strictEqual(await qpdf.encrypt(damaged, { password: 'p', outputFile: file('w-enc.pdf'), onWarning }), file('w-enc.pdf'));
    const decrypted = await collect(qpdf.decrypt(damaged, { password: '', onWarning }));
    assert.strictEqual(decrypted.slice(0, 5).toString(), '%PDF-');

    assert.strictEqual(warnings.length, 2);
    warnings.forEach((w) => assert.match(w, /damaged/));
  });
});

test('large files stream with backpressure', { skip }, async () => {
  const big = makePdf(file('big.pdf'), { contentBytes: 8 * 1024 * 1024 });
  await qpdf.encrypt(big, { password: 'p', outputFile: file('big-enc.pdf') });

  const stream = qpdf.decrypt(file('big-enc.pdf'), 'p');
  let received = 0;
  let maxBuffered = 0;
  const slow = new Writable({
    highWaterMark: 16 * 1024,
    write(chunk, encoding, done) {
      received += chunk.length;
      maxBuffered = Math.max(maxBuffered, stream.readableLength);
      setImmediate(done);
    }
  });
  await new Promise((resolve, reject) => pipeline(stream, slow, (err) => (err ? reject(err) : resolve())));

  const direct = spawnSync(QPDF_BIN, ['--decrypt', '--password=p', file('big-enc.pdf'), '-'], { maxBuffer: 1024 * 1024 * 1024 });
  assert.strictEqual(received, direct.stdout.length);
  assert.ok(maxBuffered < 1024 * 1024, 'buffered ' + maxBuffered + ' bytes; backpressure not applied');
});
