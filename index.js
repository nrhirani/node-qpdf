var spawn  = require('child_process').spawn;
var stream = require('stream');
var crypto = require('crypto');
var fs     = require('fs');
var path   = require('path');

var Qpdf = {};

// First qpdf release that reads arguments from standard input via "@-"
var MIN_QPDF_VERSION = '7.0';

// First qpdf release with --allow-weak-crypto (qpdf 11.0+ refuses weak crypto without it)
var MIN_QPDF_VERSION_WEAK_CRYPTO = '10.4';

// Supported restrictions per key length, as documented by `qpdf --help=encryption`.
// Each maps the option name used in `restrictions` to the qpdf flag and its
// allowed values; entries without `values` are flags that take no value.
var YES_NO = ['y', 'n'];

function yesNo(flag) {
  return { flag: flag, values: YES_NO };
}

var COMMON_RESTRICTIONS = {
  accessibility:     yesNo('--accessibility'),
  annotate:          yesNo('--annotate'),
  assemble:          yesNo('--assemble'),
  extract:           yesNo('--extract'),
  form:              yesNo('--form'),
  modifyOther:       yesNo('--modify-other'),
  modify:            { flag: '--modify', values: ['none', 'assembly', 'form', 'annotate', 'all'] },
  print:             { flag: '--print', values: ['none', 'low', 'full'] },
  cleartextMetadata: { flag: '--cleartext-metadata' }
};

var RESTRICTIONS = {
  '40': {
    annotate: yesNo('--annotate'),
    extract:  yesNo('--extract'),
    modify:   yesNo('--modify'),
    print:    yesNo('--print')
  },
  '128': Object.assign({}, COMMON_RESTRICTIONS, {
    useAes:  yesNo('--use-aes'),
    forceV4: { flag: '--force-V4' }
  }),
  '256': Object.assign({}, COMMON_RESTRICTIONS, {
    forceR5: { flag: '--force-R5' }
  })
};

/**
 * encrypt(input, options, [callback])
 *
 * Without options.outputFile the encrypted PDF is streamed: the stream is
 * returned and, if a callback is given, also passed to callback(null, stream)
 * right away. qpdf failures are emitted as 'error' on the stream.
 *
 * With options.outputFile the file is written; callback(err, outputFile) is
 * called when done, or a Promise is returned when there is no callback.
 *
 * options.onWarning(message), if given, receives qpdf's warnings when qpdf
 * succeeds with warnings (exit code 3).
 *
 * 128-bit encryption uses AES unless restrictions.useAes is false. Insecure
 * algorithms (40-bit, or 128-bit RC4) are refused unless
 * options.allowWeakCrypto is true, which requires qpdf 10.4 or newer.
 */
Qpdf.encrypt = function(input, options, callback) {
  // Allow encrypt(input, callback) and encrypt(input) without options
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  options = options || {};

  // Report validation errors the same way results would be delivered:
  // callback if given, rejected Promise when writing to a file, else an erroring stream
  var fail = function(err) {
    return validationError(err, callback, options.outputFile ? 'promise' : 'stream');
  };

  var fileError = checkFiles(input, options.outputFile) || checkOnWarning(options.onWarning);
  if (fileError) return fail(fileError);

  // Defaults encryption to AES 256 (without modifying the caller's options object)
  var keyLength = String(options.keyLength || '256');
  if (!RESTRICTIONS.hasOwnProperty(keyLength)) {
    return fail(new Error('Invalid key length: use 40, 128 or 256'));
  }

  // Set user-password and owner-password
  var userPassword, ownerPassword;
  if (options.password && typeof options.password === 'object') {
    // An empty user password is allowed (owner-only protection), but both must be strings
    if (typeof options.password.user !== 'string' || typeof options.password.owner !== 'string') {
      return fail(new Error('Specify owner and user password'));
    }
    if (options.password.owner === '') {
      return fail(new Error('An empty owner password is insecure and not allowed'));
    }
    userPassword = options.password.user;
    ownerPassword = options.password.owner;
  } else {
    if (typeof options.password !== 'string' || options.password === '') {
      return fail(new Error('Password missing'));
    }
    userPassword = options.password;
    // Use a random owner password: if it matched the user password, anyone who
    // can open the file could also remove its restrictions. Pass { user, owner }
    // to choose the owner password yourself.
    ownerPassword = crypto.randomBytes(16).toString('hex');
  }

  // qpdf reads encryption passwords as positional arguments, so a leading "-"
  // would be taken as an option
  if (userPassword.charAt(0) === '-' || ownerPassword.charAt(0) === '-') {
    return fail(new Error('Passwords must not start with "-"'));
  }

  // Add restrictions for encryption
  var restrictionArgs = buildRestrictions(options.restrictions, keyLength);
  if (restrictionArgs instanceof Error) return fail(restrictionArgs);

  if (options.allowWeakCrypto !== undefined && typeof options.allowWeakCrypto !== 'boolean') {
    return fail(new Error('allowWeakCrypto must be true or false'));
  }

  // 128-bit defaults to AES; RC4 is used only when useAes is explicitly turned off
  var useAes = options.restrictions && options.restrictions.hasOwnProperty('useAes')
    ? (options.restrictions.useAes === true || options.restrictions.useAes === 'y')
    : null;
  if (keyLength === '128' && useAes === null) {
    restrictionArgs.push('--use-aes=y');
  }

  // 40-bit and 128-bit RC4 are insecure; qpdf 11+ refuses them without --allow-weak-crypto
  var weakCrypto = keyLength === '40' || (keyLength === '128' && useAes === false);
  if (weakCrypto && !options.allowWeakCrypto) {
    return fail(new Error('40-bit and 128-bit RC4 encryption are insecure; use 256-bit or 128-bit AES, ' +
      'or set allowWeakCrypto: true'));
  }

  // --allow-weak-crypto must appear outside "--encrypt ... --". Only pass it when
  // needed, since qpdf older than 10.4 does not recognize it.
  var args = [Qpdf.command]
    .concat(weakCrypto ? ['--allow-weak-crypto'] : [])
    .concat(['--encrypt', userPassword, ownerPassword, keyLength])
    .concat(restrictionArgs)
    .concat([
      '--',                       // Marks end of --encrypt options
      input,
      options.outputFile || '-'   // "-" prints the PDF on stdout
    ]);

  // Arguments are sent to qpdf one per line on stdin, so none may contain a line break
  if (hasLineBreak(args)) {
    return fail(new Error('Passwords, file paths and restriction values must not contain line breaks'));
  }

  return run(args, options.outputFile, options.onWarning, callback);
};

/**
 * decrypt(input, password | options, [callback])
 *
 * `password` may be a string, or an options object { password, outputFile }.
 * An empty string is a valid password (PDFs protected only by an owner
 * password). Results are delivered exactly as for encrypt(), including
 * options.onWarning.
 */
Qpdf.decrypt = function(input, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  if (typeof options === 'string') {
    options = { password: options };
  }
  options = options || {};

  var fail = function(err) {
    return validationError(err, callback, options.outputFile ? 'promise' : 'stream');
  };

  var fileError = checkFiles(input, options.outputFile) || checkOnWarning(options.onWarning);
  if (fileError) return fail(fileError);

  if (typeof options.password !== 'string') {
    return fail(new Error('Password missing'));
  }

  var args = [
    Qpdf.command,
    '--decrypt',
    '--password=' + options.password,
    input,
    options.outputFile || '-'     // "-" prints the PDF on stdout
  ];

  // Arguments are sent to qpdf one per line on stdin, so none may contain a line break
  if (hasLineBreak(args)) {
    return fail(new Error('Passwords and file paths must not contain line breaks'));
  }

  return run(args, options.outputFile, options.onWarning, callback);
};

// Runs qpdf and delivers the result the same way for encrypt and decrypt
function run(args, outputFile, onWarning, callback) {
  // Stream mode: return the stream, and hand it to the callback right away
  if (!outputFile) {
    var outputStream = executeCommand(args, onWarning);
    if (callback) {
      callback(null, outputStream);
    }
    return outputStream;
  }

  // File mode: callback when done, or a Promise
  if (callback) {
    executeCommand(args, onWarning, callback);
    return;
  }
  return new Promise(function(resolve, reject) {
    executeCommand(args, onWarning, function(err, filePath) {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    });
  });
}

function executeCommand(args, onWarning, callback) {
  var child;

  var output = args[args.length - 1];

  // Spawn qpdf directly (never through a shell) and hand it the real arguments
  // on stdin via "@-", one per line. This keeps passwords out of the process
  // list (ps, /proc/<pid>/cmdline) without ever writing them to disk.
  child = spawn(args[0], ['@-']);

  // If qpdf exits before reading stdin (or never starts), writing fails with
  // EPIPE; the real error is reported by the 'error' / 'close' handlers below
  child.stdin.on('error', function() {});
  child.stdin.end(args.slice(1).join('\n') + '\n');

  // Return a stream that only ends once qpdf's exit code is known, so stream
  // consumers see 'error' (not a normal 'end') when qpdf fails
  // (Forwarded by hand rather than with pipe(), because pipe() adds its own
  // 'error' listener to the destination, which would hide whether the caller
  // is actually listening for errors.)
  // (The custom destroy stops Node.js 8, whose default destroy ends the
  // stream, from emitting 'end' before 'error'.)
  var outputStream = new stream.PassThrough({
    destroy: function(err, cb) {
      cb(err);
    }
  });
  child.stdout.on('data', function(chunk) {
    if (!outputStream.write(chunk)) {
      child.stdout.pause();
    }
  });
  outputStream.on('drain', function() {
    child.stdout.resume();
  });

  var stderr = '';
  var finished = false;

  // Settle exactly once, whichever of 'error' / 'close' happens first
  function finish(err) {
    if (finished) return;
    finished = true;

    if (err) {
      handleError(err, outputStream, callback);
    } else {
      outputStream.end();
      if (callback) {
        callback(null, output);
      }
    }
  }

  // Collect stderr instead of failing on the first chunk: qpdf also prints
  // warnings there, so success or failure is decided by the exit code
  child.stderr.on('data', function(chunk) {
    stderr += chunk;
  });

  // Process could not be started (e.g. qpdf not installed)
  child.once('error', function(err) {
    finish(err);
  });

  // 'close' fires after the process exited and its stdio streams have closed.
  // qpdf exit codes: 0 = success, 3 = success with warnings, 2 = error
  child.once('close', function(code, signal) {
    if (code === 0 || code === 3) {
      if (code === 3 && onWarning) {
        onWarning(stderr.trim());
      }
      finish(null);
    } else {
      var reason = signal ? 'was killed with ' + signal : 'exited with code ' + code;
      var message = stderr.trim() || ('qpdf ' + reason);
      // qpdf older than 7.0 does not understand "@-" and treats it as a file name
      if (/(^|\s)@-(:|\s|$)/m.test(stderr)) {
        message += ' (node-qpdf requires qpdf ' + MIN_QPDF_VERSION + ' or newer; check with "qpdf --version")';
      } else if (/allow-weak-crypto/.test(stderr) && args.indexOf('--allow-weak-crypto') !== -1) {
        message += ' (allowWeakCrypto requires qpdf ' + MIN_QPDF_VERSION_WEAK_CRYPTO + ' or newer; check with "qpdf --version")';
      }
      var err = new Error(message);
      err.code = code;
      err.signal = signal;
      err.stderr = stderr;
      finish(err);
    }
  });

  // return stdout stream so we can pipe
  return outputStream;
}

// Handles errors raised while running the qpdf process
function handleError(err, outputStream, callback) {
  // call the callback if there is one
  if (callback) {
    callback(err);
  }

  // if there is no callback, or there are listeners for errors, fail the stream
  // with the error; otherwise just close it so no unhandled 'error' is thrown
  if (!callback || outputStream.listenerCount('error') > 0) {
    outputStream.destroy(err);
  } else {
    outputStream.destroy();
  }
}

// Handles errors found before qpdf is started (invalid arguments).
// mode 'promise' returns a rejected Promise, mode 'stream' returns a
// Readable that emits the error asynchronously, so callers can attach
// an 'error' listener to the returned value first.
function validationError(err, callback, mode) {
  if (callback) {
    callback(err);
    return;
  }
  if (mode === 'promise') {
    return Promise.reject(err);
  }
  var errorStream = new stream.Readable({ read: function() {} });
  errorStream.destroy(err);
  return errorStream;
}

// Validates the input path and optional output path; returns an Error or null
function checkFiles(input, outputFile) {
  if (typeof input !== 'string' || input === '') {
    return new Error('Specify input file');
  }
  if (outputFile) {
    // "-" would make qpdf write to stdout; leave outputFile out for a stream instead
    if (typeof outputFile !== 'string' || outputFile === '-') {
      return new Error('Invalid output file');
    }
    if (isSameFile(input, outputFile)) {
      return new Error('Output file must be different from the input file');
    }
  }
  return null;
}

function checkOnWarning(onWarning) {
  if (onWarning !== undefined && typeof onWarning !== 'function') {
    return new Error('onWarning must be a function');
  }
  return null;
}

// True if both paths point to the same file, even when written differently
// (relative vs absolute, "./", "..", symlinks)
function isSameFile(a, b) {
  return canonicalPath(a) === canonicalPath(b);
}

function canonicalPath(p) {
  try {
    return (fs.realpathSync.native || fs.realpathSync)(p);
  } catch (e) {
    // File does not exist (yet): compare the normalized absolute path
    return path.resolve(p);
  }
}

// Converts the restrictions object into qpdf flags; returns an array or an Error
function buildRestrictions(restrictions, keyLength) {
  if (restrictions === undefined || restrictions === null) return [];
  if (typeof restrictions !== 'object' || Array.isArray(restrictions)) {
    return new Error('Invalid restrictions');
  }

  var allowed = RESTRICTIONS[keyLength];
  var args = [];
  var names = Object.keys(restrictions);

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var value = restrictions[name];
    var spec = allowed.hasOwnProperty(name) ? allowed[name] : null;

    if (!spec) {
      return new Error('Restriction "' + name + '" is not supported with ' + keyLength + '-bit encryption');
    }

    // Flags without a value: true (or '' for backwards compatibility) enables, false omits
    if (!spec.values) {
      if (value === true || value === '') {
        args.push(spec.flag);
      } else if (value !== false) {
        return new Error('Restriction "' + name + '" takes no value; use true or false');
      }
      continue;
    }

    // y/n restrictions also accept booleans
    if (spec.values === YES_NO && typeof value === 'boolean') {
      value = value ? 'y' : 'n';
    }

    if (spec.values.indexOf(value) === -1) {
      return new Error('Invalid value for restriction "' + name + '": use ' + spec.values.join(', '));
    }
    args.push(spec.flag + '=' + value);
  }

  return args;
}

function hasLineBreak(args) {
  return args.some(function(arg) {
    return /[\r\n]/.test(String(arg));
  });
}

Qpdf.command = 'qpdf';
module.exports = Qpdf;
