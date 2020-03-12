"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const access = util_1.promisify(require('fs').access);
const execFile = util_1.promisify(require("child_process").execFile);
const hyphenate = (variable) => variable.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const execute = async (args) => {
    const child = await execFile('qpdf', args);
    if (child.stderr) {
        throw child.stderr;
    }
    return child.stdout;
};
const fileExists = (input) => {
    try {
        access(input, (error) => {
            if (error)
                return false;
            return true;
        });
    }
    catch (e) {
        return false;
    }
};
exports.encrypt = async (input, options, output) => {
    if (!input)
        return 'Please specify input file';
    if (!fileExists(input))
        return "Input file doesn't exist";
    if (output)
        if (fileExists(output))
            return "Output file already exists";
    const args = ['--encrypt'];
    if (typeof options.password === 'object') {
        if (options.password.user === undefined || options.password.owner === undefined) {
            return 'Please specify both owner and user passwords';
        }
        args.push(options.password.user);
        args.push(options.password.owner);
    }
    else {
        args.push(options.password);
        args.push(options.password);
    }
    options.keyLength = options.keyLength || '256';
    args.push(options.keyLength);
    if (options.restrictions) {
        if (typeof options.restrictions !== 'object')
            return 'Invalid Restrictions';
        const restrictions = options.restrictions;
        for (const restriction in options.restrictions) {
            const value = (restrictions[restriction] !== '') ? '=' + restrictions[restriction] : '';
            args.push('--' + hyphenate(restriction) + value);
        }
    }
    args.push('--');
    args.push(input.replace(/(["\s'$`\\])/g, '\\$1'));
    if (output) {
        args.push(output);
    }
    else {
        args.push('-');
    }
    return execute(args);
};
exports.decrypt = async (input, password, output) => {
    if (!input)
        return 'Please specify input file';
    if (!password)
        return 'Password missing';
    const args = ['--decrypt'];
    args.push('--password=' + password.replace(/(["\s'$`\\])/g, '\\$1'));
    args.push(input.replace(/(["\s'$`\\])/g, '\\$1'));
    if (output) {
        args.push(output);
    }
    else {
        args.push('-');
    }
    return execute(args);
};
