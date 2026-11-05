'use strict';

// How node-qpdf runs qpdf and reports results, using a fake qpdf
// (test/support/fake-qpdf.js) that records exactly what it received.

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');

const qpdf = require('..');
const { tmpDir, removeDir, makePdf, collect, callbackResult } = require('./support/helpers');

const FAKE_QPDF = path.join(__dirname, 'support', 'fake-qpdf.js');
const skip = process.platform === 'win32' ? 'the fake qpdf is a Node script with a shebang (not runnable on Windows)' : false;

let dir;
let input;
let log;

test.before(() => {
  dir = tmpDir();
  input = makePdf(path.join(dir, 'in.pdf'));
  log = path.join(dir, 'fake-qpdf-log.json');
  fs.chmodSync(FAKE_QPDF, 0o755);
});

test.after(() => removeDir(dir));

test.beforeEach(() => {
  qpdf.command = FAKE_QPDF;
  process.env.FAKE_QPDF_LOG = log;
  process.env.FAKE_QPDF_MODE = 'ok';
  if (fs.existsSync(log)) fs.unlinkSync(log);
});

// What the fake qpdf received: its command-line arguments and the argument
// lines read from stdin
function received() {
  const data = JSON.parse(fs.readFileSync(log, 'utf8'));
  return { argv: data.argv, lines: data.stdin.replace(/\n$/, '').split('\n') };
}

test('arguments are passed on stdin, never on the command line', { skip }, async (t) => {
  await t.test('encrypt', async () => {
    const password = 'S3cret pw $(whoami); "quoted"';
    await qpdf.encrypt(input, { password, outputFile: path.join(dir, 'out.pdf') });
    const { argv, lines } = received();

    assert.deepStrictEqual(argv, ['@-']);
    assert.strictEqual(lines[0], '--encrypt');
    assert.strictEqual(lines[1], password);
    assert.match(lines[2], /^[0-9a-f]{32}$/, 'random owner password');
    assert.deepStrictEqual(lines.slice(3), ['256', '--', input, path.join(dir, 'out.pdf')]);
  });

  await t.test('decrypt', async () => {
    await collect(qpdf.decrypt(input, 'pw with spaces'));
    const { argv, lines } = received();
    assert.deepStrictEqual(argv, ['@-']);
    assert.deepStrictEqual(lines, ['--decrypt', '--password=pw with spaces', input, '-']);
  });
});

test('encryption arguments', { skip }, async (t) => {
  await t.test('a single password gets a different random owner password each time', async () => {
    await collect(qpdf.encrypt(input, { password: 'p' }));
    const first = received().lines[2];
    await collect(qpdf.encrypt(input, { password: 'p' }));
    const second = received().lines[2];
    assert.notStrictEqual(first, 'p');
    assert.notStrictEqual(first, second);
  });

  await t.test('{ user, owner } passwords are used as given', async () => {
    await collect(qpdf.encrypt(input, { password: { user: '', owner: 'owner pw' } }));
    assert.deepStrictEqual(received().lines.slice(1, 3), ['', 'owner pw']);
  });

  await t.test('restrictions are mapped to qpdf flags', async () => {
    await collect(qpdf.encrypt(input, {
      password: 'p',
      keyLength: 128,
      restrictions: { print: 'low', extract: false, modifyOther: true, forceV4: true, cleartextMetadata: '', accessibility: 'n', useAes: 'y' }
    }));
    const lines = received().lines;
    assert.deepStrictEqual(lines.slice(4, lines.indexOf('--')), [
      '--print=low', '--extract=n', '--modify-other=y', '--force-V4', '--cleartext-metadata', '--accessibility=n', '--use-aes=y'
    ]);
  });

  await t.test('inherited restriction properties are ignored', async () => {
    const restrictions = Object.create({ inherited: 'x' });
    restrictions.print = 'none';
    await collect(qpdf.encrypt(input, { password: 'p', restrictions }));
    const lines = received().lines;
    assert.deepStrictEqual(lines.slice(4, lines.indexOf('--')), ['--print=none']);
  });

  await t.test('false omits a flag-style restriction', async () => {
    await collect(qpdf.encrypt(input, { password: 'p', restrictions: { cleartextMetadata: false } }));
    const lines = received().lines;
    assert.deepStrictEqual(lines.slice(4, lines.indexOf('--')), []);
  });

  await t.test('128-bit uses AES unless useAes is turned off', async () => {
    await collect(qpdf.encrypt(input, { password: 'p', keyLength: 128 }));
    assert.ok(received().lines.includes('--use-aes=y'));
  });

  await t.test('--allow-weak-crypto is passed only for weak encryption', async () => {
    await collect(qpdf.encrypt(input, { password: 'p', keyLength: 40, allowWeakCrypto: true }));
    assert.strictEqual(received().lines[0], '--allow-weak-crypto');
    assert.strictEqual(received().lines[1], '--encrypt');

    await collect(qpdf.encrypt(input, { password: 'p', keyLength: 128, allowWeakCrypto: true, restrictions: { useAes: false } }));
    assert.strictEqual(received().lines[0], '--allow-weak-crypto');

    await collect(qpdf.encrypt(input, { password: 'p', allowWeakCrypto: true }));
    assert.ok(!received().lines.includes('--allow-weak-crypto'), 'not needed for 256-bit');
  });

  await t.test('the caller\'s options object is not modified', async () => {
    const options = { password: 'p', keyLength: 128, restrictions: { print: 'low' } };
    const copy = JSON.parse(JSON.stringify(options));
    await collect(qpdf.encrypt(input, options));
    assert.deepStrictEqual(options, copy);
  });
});

test('result delivery', { skip }, async (t) => {
  await t.test('stream mode: the callback receives the returned stream right away', async () => {
    for (const run of [(cb) => qpdf.encrypt(input, { password: 'p' }, cb), (cb) => qpdf.decrypt(input, 'p', cb)]) {
      let fromCallback;
      const returned = run((err, s) => { assert.ifError(err); fromCallback = s; });
      assert.strictEqual(fromCallback, returned);
      assert.strictEqual((await collect(returned)).toString(), '%PDF-fake');
    }
  });

  await t.test('file mode: callback and Promise receive the output path', async () => {
    const outputFile = path.join(dir, 'out.pdf');
    assert.strictEqual(await qpdf.encrypt(input, { password: 'p', outputFile }), outputFile);
    assert.strictEqual(await qpdf.decrypt(input, { password: 'p', outputFile }), outputFile);
    const { err, value } = await callbackResult((cb) => qpdf.decrypt(input, { password: 'p', outputFile }, cb));
    assert.ifError(err);
    assert.strictEqual(value, outputFile);
  });
});

test('exit codes and errors', { skip }, async (t) => {
  const outputFile = () => path.join(dir, 'out.pdf');

  await t.test('exit code 3 (warnings) is success, and onWarning receives the warnings', async () => {
    process.env.FAKE_QPDF_MODE = 'warn';
    const warnings = [];
    const onWarning = (message) => warnings.push(message);

    assert.strictEqual(await qpdf.encrypt(input, { password: 'p', outputFile: outputFile(), onWarning }), outputFile());
    assert.strictEqual((await collect(qpdf.decrypt(input, { password: 'p', onWarning }))).toString(), '%PDF-fake');
    assert.deepStrictEqual(warnings, ['WARNING: fake warning', 'WARNING: fake warning']);

    // Without onWarning, warnings are simply ignored
    assert.strictEqual(await qpdf.encrypt(input, { password: 'p', outputFile: outputFile() }), outputFile());
  });

  await t.test('onWarning is not called when there are no warnings', async () => {
    let called = false;
    await qpdf.encrypt(input, { password: 'p', outputFile: outputFile(), onWarning: () => { called = true; } });
    assert.strictEqual(called, false);
  });

  await t.test('a failure reports qpdf\'s message, exit code and stderr', async () => {
    process.env.FAKE_QPDF_MODE = 'fail';
    const err = await qpdf.encrypt(input, { password: 'p', outputFile: outputFile() }).catch((e) => e);
    assert.strictEqual(err.message, 'qpdf: fake failure');
    assert.strictEqual(err.code, 2);
    assert.strictEqual(err.stderr, 'qpdf: fake failure\n');
  });

  await t.test('a failure without any stderr output is still an error', async () => {
    process.env.FAKE_QPDF_MODE = 'silent-fail';
    await assert.rejects(qpdf.decrypt(input, { password: 'p', outputFile: outputFile() }), /^Error: qpdf exited with code 2$/);
  });

  await t.test('a killed qpdf is an error', async () => {
    process.env.FAKE_QPDF_MODE = 'killed';
    const err = await qpdf.decrypt(input, { password: 'p', outputFile: outputFile() }).catch((e) => e);
    assert.strictEqual(err.message, 'qpdf was killed with SIGTERM');
    assert.strictEqual(err.signal, 'SIGTERM');
  });

  await t.test('all stderr output is collected and the callback runs once', async () => {
    process.env.FAKE_QPDF_MODE = 'chunked-fail';
    const errors = [];
    qpdf.decrypt(input, { password: 'p', outputFile: outputFile() }, (err) => errors.push(err));
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'line1\nline2');
  });

  await t.test('stream mode: a failure is an error event, not a normal end', async () => {
    process.env.FAKE_QPDF_MODE = 'fail';
    const stream = qpdf.decrypt(input, 'p');
    let ended = false;
    stream.on('end', () => { ended = true; });
    await assert.rejects(collect(stream), /fake failure/);
    assert.strictEqual(ended, false);

    const err = await new Promise((resolve) => {
      pipeline(qpdf.decrypt(input, 'p'), fs.createWriteStream(path.join(dir, 'piped.pdf')), resolve);
    });
    assert.match(err.message, /fake failure/);
  });

  await t.test('file mode with a callback does not also throw from the stream', async () => {
    process.env.FAKE_QPDF_MODE = 'fail';
    const { err } = await callbackResult((cb) => qpdf.encrypt(input, { password: 'p', outputFile: outputFile() }, cb));
    assert.match(err.message, /fake failure/);
    await new Promise((resolve) => setImmediate(resolve)); // an unhandled 'error' would crash here
  });

  await t.test('qpdf older than 7.0 gets a version hint', async () => {
    process.env.FAKE_QPDF_MODE = 'old-qpdf';
    await assert.rejects(qpdf.decrypt(input, { password: 'p', outputFile: outputFile() }), /requires qpdf 7\.0 or newer/);
  });

  await t.test('allowWeakCrypto on qpdf older than 10.4 gets a version hint', async () => {
    process.env.FAKE_QPDF_MODE = 'old-weak-crypto';
    await assert.rejects(
      qpdf.encrypt(input, { password: 'p', keyLength: 40, allowWeakCrypto: true, outputFile: outputFile() }),
      /allowWeakCrypto requires qpdf 10\.4 or newer/
    );
  });
});

test('qpdf not installed', async (t) => {
  await t.test('callback and Promise receive ENOENT', async () => {
    qpdf.command = 'node-qpdf-test-missing-binary';
    const { err } = await callbackResult((cb) => qpdf.decrypt(input, { password: 'p', outputFile: path.join(dir, 'o.pdf') }, cb));
    assert.strictEqual(err.code, 'ENOENT');
    await assert.rejects(qpdf.encrypt(input, { password: 'p', outputFile: path.join(dir, 'o.pdf') }), { code: 'ENOENT' });
  });

  await t.test('the stream emits ENOENT', async () => {
    qpdf.command = 'node-qpdf-test-missing-binary';
    await assert.rejects(collect(qpdf.decrypt(input, 'p')), { code: 'ENOENT' });
  });
});
