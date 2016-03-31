var spawn  = require('child_process').spawn;
var stream = require('stream');

var Qpdf = {};

Qpdf.encrypt = function(input, options, callback) {
  if (!input) handleError(new Error('Specify input file'));
  if (!options || !options.password) handleError(new Error('Password missing'));

  // Defaults encryption to AES 256
  options.keyLength = options.keyLength || '256';

  var args = ['qpdf', '--encrypt'];

  // Push twice for user-password and owner-password
  args.push(options.password);
  args.push(options.password);

  // Specifying the key length
  args.push(options.keyLength);

  // Add Resctrictions for encryption
  if (options.restrictions) {
    if (typeof options.restrictions != 'object') return callback(new Error('Invalid Restrictions'));

    var restrictions = options.restrictions;

    for(var restriction in restrictions) {
      var value = (restrictions.restriction !== '') ? '=' + restrictions.restriction : '';
      args.push('--' + hypenate(restriction) + value);
    }
  }

  // Marks end of --encrtpy options
  args.push('--');

  // Input File
  args.push(input);

  // Print PDf on stdin
  args.push('-');

  var child;

  if (process.platform === 'win32') {
    child = spawn(args[0], args.slice(1));
  } else {
    // this nasty business prevents piping problems on linux
    child = spawn('/bin/sh', ['-c', args.join(' ') + ' | cat']);
  }

  // call the callback with null error when the process exits successfully
  if (callback) {
    child.on('exit', function() { callback(null); });
  }

  var outputStream = child.stdout;

  function handleError(err) {
    if (child) {
      child.removeAllListeners('exit');
      child.kill();
    }

    // call the callback if there is one
    if (callback) {
      callback(err);
    }

    outputStream = outputStream || new stream.Readable();

    // if not, or there are listeners for errors, emit the error event
    if (!callback || outputStream.listeners('error').length > 0) {
      outputStream.emit('error', err);
    }
  }

  child.once('error', handleError);
  child.stderr.once('data', function(err) {
    handleError(new Error(err || ''));
  });

  // return stdout stream so we can pipe
  if (callback) {
    return callback(null, outputStream);
  } else {
    return outputStream;
  }
};

// Qpdf.dcrypt = function(input, options, callback) {
//   if (!options || !options.password) return callback(new Error('Password missing'));

//   var args = ['qpdf', '--dcrypt'];
// };

function hypenate(variable) {
  return variable.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

module.exports = Qpdf;
