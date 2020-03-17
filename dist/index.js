"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fs_1 = require("fs");
const execFile = util_1.promisify(require("child_process").execFile);
const hyphenate = (variable) => variable.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const execute = async (args) => {
    if (process.env.LAMBDA_TASK_ROOT) {
        args.push('--appimage-extract-and-run');
    }
    const child = await execFile('qpdf', args);
    if (child.stderr) {
        throw child.stderr;
    }
    return child.stdout;
};
const fileExists = async (file) => {
    if (fs_1.existsSync(file)) {
        return true;
    }
    else {
        return false;
    }
};
exports.encrypt = async (input, options, output) => {
    if (!input)
        return 'Please specify input file';
    if (!fileExists(input))
        return "Input file doesn't exist";
    const args = ['--encrypt'];
    if (typeof options.password === 'object') {
        if (options.password.user === undefined || options.password.user === null || options.password.owner === undefined || options.password.owner === null) {
            return 'Please specify both owner and user passwords';
        }
        args.push(options.password.user);
        args.push(options.password.owner);
    }
    else {
        args.push(options.password);
        args.push(options.password);
    }
    options.keyLength = options.keyLength || 256;
    args.push(options.keyLength.toString());
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
