import { promisify } from 'util';
import { QPdfOptions } from 'node-qpdf2';
import { existsSync } from 'fs';

const execFile = promisify(require("child_process").execFile);

const hyphenate = (variable: string): string => variable.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

const execute = async (args: string[]): Promise<string> => {
  const child = await execFile('qpdf', args);
  if(child.stderr) {
    throw child.stderr;
  }
  return child.stdout;
}

const fileExists = async (file: string): Promise<boolean> => {
  if(existsSync(file)){
    return true;
  } else {
    return false;
  }
}

export const encrypt = async (input: string, options: QPdfOptions, output ?: string): Promise<string> => {
  if (!input) return 'Please specify input file';
  if (!fileExists(input)) return "Input file doesn't exist";
  //if (output) if (fileExists(output)) return "Output file already exists";

  const args = ['--encrypt'];

  // Set user-password and owner-password
  if(typeof options.password === 'object') {
    if(options.password.user === undefined || options.password.user === null || options.password.owner === undefined || options.password.owner === null) {
      return 'Please specify both owner and user passwords';
    }
    args.push(options.password.user);
    args.push(options.password.owner);
  } else {
    // Push twice for user-password and owner-password
    args.push(options.password);
    args.push(options.password);
  }

  // Defaults encryption to AES 256
  options.keyLength = options.keyLength || 256;

  // Specifying the key length
  args.push(options.keyLength.toString());

  // Add Resctrictions for encryption
  if (options.restrictions) {
    if (typeof options.restrictions !== 'object') return 'Invalid Restrictions';

    const restrictions = options.restrictions;

    for(const restriction in options.restrictions) {
      const value = (restrictions[restriction] !== '') ? '=' + restrictions[restriction] : '';
      args.push('--' + hyphenate(restriction) + value);
    }
  }

  // Marks end of --encrypt options
  args.push('--');

  // Input file path
  args.push(input.replace(/(["\s'$`\\])/g,'\\$1'));

  if (output) {
    args.push(output);
  } else {
  // Print PDF on stdout
    args.push('-');
  }
  // Execute command and return stdout for pipe
  return execute(args);
};

export const decrypt = async (input: string, password: string, output ?: string): Promise<string> => {
  if (!input) return 'Please specify input file';
  if (!password) return 'Password missing';

  const args = ['--decrypt'];

  // Password
  args.push('--password=' + password.replace(/(["\s'$`\\])/g,'\\$1'));

  // Input file path
  args.push(input.replace(/(["\s'$`\\])/g,'\\$1'));

  // Print PDF on stdout
  if (output) {
    args.push(output);
  } else {
    args.push('-');
  }

  return execute(args);
};
