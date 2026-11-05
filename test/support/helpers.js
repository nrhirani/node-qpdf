'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// qpdf binary for the real-qpdf tests: QPDF_BIN, or "qpdf" from PATH
const QPDF_BIN = process.env.QPDF_BIN || 'qpdf';

function qpdfVersion() {
  const result = spawnSync(QPDF_BIN, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout) return null;
  const match = result.stdout.match(/qpdf version (\S+)/);
  return match ? match[1] : null;
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'node-qpdf-test-'));
}

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Writes a minimal one-page PDF.
 * - contentBytes: size of random page content (to make large files)
 * - damaged: write a wrong xref offset so qpdf must recover (exit code 3)
 */
function makePdf(file, options = {}) {
  const content = options.contentBytes
    ? crypto.randomBytes(options.contentBytes)
    : Buffer.from('BT /F1 12 Tf 10 50 Td (node-qpdf) Tj ET');

  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Contents 4 0 R >>'),
    Buffer.concat([Buffer.from('<< /Length ' + content.length + ' >>\nstream\n'), content, Buffer.from('\nendstream')])
  ];

  const parts = [Buffer.from('%PDF-1.4\n')];
  let length = parts[0].length;
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(length);
    const obj = Buffer.concat([Buffer.from((i + 1) + ' 0 obj\n'), body, Buffer.from('\nendobj\n')]);
    parts.push(obj);
    length += obj.length;
  });

  const xrefOffset = length;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  offsets.forEach((offset) => {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  const trailer = 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\n';
  const startxref = 'startxref\n' + (options.damaged ? 999 : xrefOffset) + '\n%%EOF\n';
  parts.push(Buffer.from((options.damaged ? '' : xref) + trailer + startxref));

  fs.writeFileSync(file, Buffer.concat(parts));
  return file;
}

// Reads a stream to the end; rejects on 'error'
function collect(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('error', reject);
    readable.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Calls fn(callback) and resolves with { err, value } from the callback
function callbackResult(fn) {
  return new Promise((resolve) => {
    fn((err, value) => resolve({ err, value }));
  });
}

// Output of `qpdf --show-encryption`, using QPDF_BIN
function showEncryption(file, password) {
  const args = ['--show-encryption'];
  if (password !== undefined) args.push('--password=' + password);
  args.push(file);
  const result = spawnSync(QPDF_BIN, args, { encoding: 'utf8' });
  return result.stdout + result.stderr;
}

module.exports = {
  QPDF_BIN,
  qpdfVersion,
  tmpDir,
  removeDir,
  makePdf,
  collect,
  callbackResult,
  showEncryption
};
