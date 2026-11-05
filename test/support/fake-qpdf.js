#!/usr/bin/env node
'use strict';

// Stand-in for qpdf used by test/process.test.js.
// Records what it received (argv and stdin) to $FAKE_QPDF_LOG, then behaves
// according to $FAKE_QPDF_MODE.

const fs = require('fs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  if (process.env.FAKE_QPDF_LOG) {
    fs.writeFileSync(process.env.FAKE_QPDF_LOG, JSON.stringify({
      argv: process.argv.slice(2),
      stdin: input
    }));
  }

  switch (process.env.FAKE_QPDF_MODE || 'ok') {
    case 'ok':
      process.stdout.write('%PDF-fake');
      break;
    case 'warn':
      process.stderr.write('WARNING: fake warning\n');
      process.stdout.write('%PDF-fake');
      process.exitCode = 3;
      break;
    case 'fail':
      process.stderr.write('qpdf: fake failure\n');
      process.exitCode = 2;
      break;
    case 'silent-fail':
      process.exitCode = 2;
      break;
    case 'chunked-fail':
      process.stderr.write('line1\n');
      setTimeout(() => {
        process.stderr.write('line2\n');
        process.exitCode = 2;
      }, 50);
      break;
    case 'killed':
      process.kill(process.pid, 'SIGTERM');
      break;
    case 'old-qpdf':
      // qpdf < 7.0 treats "@-" as an input file name
      process.stderr.write('qpdf: open @-: No such file or directory\n');
      process.exitCode = 2;
      break;
    case 'old-weak-crypto':
      // qpdf < 10.4 does not know --allow-weak-crypto
      process.stderr.write('qpdf: unrecognized argument --allow-weak-crypto\n');
      process.exitCode = 2;
      break;
    default:
      process.stderr.write('fake-qpdf: unknown FAKE_QPDF_MODE\n');
      process.exitCode = 99;
  }
});
