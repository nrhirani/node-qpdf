var spawn  = require('child_process').spawn;
var stream = require('stream');

var Qpdf = {};

Qpdf.encrypt = function(input, options, callback) {
  if (!input) return handleError(new Error('Specify input file'));
  if (!options || !options.password) return handleError(new Error('Password missing'));
  if(options && options.outputFile) {
    if(typeof options.outputFile != 'string' || options.outputFile === input) {
      return handleError(new Error('Invlaid output file'));
    }
  }

  // Defaults encryption to AES 256
  options.keyLength = options.keyLength || '256';

  var args = [Qpdf.command, '--encrypt'];

  // Push twice for user-password and owner-password
  args.push(options.password);
  args.push(options.password);

  // Specifying the key length
  args.push(options.keyLength);

  // Add Resctrictions for encryption
  if (options.restrictions) {
    if (typeof options.restrictions !== 'object') return handleError(new Error('Invalid Restrictions'));

    var restrictions = options.restrictions;

    for(var restriction in restrictions) {
      var value = (restrictions[restriction] !== '') ? '=' + restrictions[restriction] : '';
      args.push('--' + hyphenate(restriction) + value);
    }
  }

  // Marks end of --encrypt options
  args.push('--');

  // Input file path
  args.push(input);

  if (options.outputFile) {
    args.push(options.outputFile);
  } else {
  // Print PDF on stdout
    args.push('-');
  }
  // Execute command and return stdout for pipe
  if (!options.outputFile) {
    var outputStream = executeCommand(args);
    if (outputStream) {
      if (callback) {
        return callback(null, outputStream);
      } else {
        return outputStream;
      }
    }
  } else {
    if (callback) {
      executeCommand(args, callback);
    } else {
      return new Promise(function(resolve, reject) {
        executeCommand(args, function(err, filePath) {
          if (err) {
            reject(err);
          } else {
            resolve(filePath);
          }
        });
      });
    }
  }
};

Qpdf.decrypt = function(input, password, callback) {
  if (!input) return handleError(new Error('Specify input file'), callback);
  if (!password) return handleError(new Error('Password missing'), callback);

  var args = [Qpdf.command, '--decrypt'];

  // Password
  args.push('--password=' + password);

  // Input file path
  args.push(input);

  // Print PDf on stdout
  args.push('-');

  // Execute command and return stdout for pipe
  var outputStream = executeCommand(args, callback);
  if (outputStream) {
    return outputStream;
  }
};

function executeCommand(args, callback) {
  var child;

  var output = args[args.length - 1];

  // if on windows or not piping to stdout
  if (process.platform === 'win32' || output !== '-') {
    child = spawn(args[0], args.slice(1));
  } else {
    // this nasty business prevents piping problems on linux
    child = spawn('/bin/sh', ['-c', args.join(' ') + ' | cat']);
  }

  // call the callback with null error when the process exits successfully
  if (callback) {
    child.on('exit', function() { callback(null, output); });
  }

  var outputStream = child.stdout;

  child.once('error', function (err) {
    handleError(err, child, outputStream, callback);
  });
  child.stderr.once('data', function(err) {
    handleError(new Error(err || ''), child, outputStream, callback);
  });

  // return stdout stream so we can pipe
  return outputStream;
}

function handleError(err, child, outputStream, callback) {
  if (child) {
    child.removeAllListeners('exit');
    child.kill();
  } else if (typeof child === 'function') {
    callback = child;
  }

  // call the callback if there is one
  if (callback) {
    callback(err);
  }

  // set a default output stream if not present
  if (typeof outputStream === 'function') {
    callback = outputStream;
    outputStream = new stream.Readable();
  } else if (typeof outputStream === 'undefined') {
    outputStream = new stream.Readable();
  }

  // if not, or there are listeners for errors, emit the error event
  if (!callback || outputStream.listeners('error').length > 0) {
    outputStream.emit('error', err);
  }
}

function hyphenate(variable) {
  return variable.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

Qpdf.command = 'qpdf';
module.exports = Qpdf;
