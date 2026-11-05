# Security Policy

## Supported versions

| Version | Supported |
|:---|:---|
| 2.x | ✅ |
| 1.x and earlier | ❌ |

Versions before 2.0.0 are affected by a shell command injection vulnerability (passwords and file paths were passed to `/bin/sh` unescaped) and expose passwords in the process list. Please upgrade to 2.x; see [CHANGELOG.md](CHANGELOG.md) for migration notes.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions or pull requests.**

Instead, report them privately:

* Use GitHub's [private vulnerability reporting](https://github.com/nrhirani/node-qpdf/security/advisories/new), or
* Email **nrhirani@gmail.com** with "node-qpdf security" in the subject.

Please include:

* a description of the vulnerability and its impact
* steps or a minimal code sample to reproduce it
* the affected node-qpdf version, qpdf version, Node.js version and operating system
* any suggested fix, if you have one

You will receive an acknowledgement of your report, and we will keep you informed while the issue is investigated and fixed. Please give us a reasonable amount of time to release a fix before disclosing the vulnerability publicly. We are happy to credit you in the release notes unless you prefer to stay anonymous.

## Scope

This policy covers the node-qpdf package itself. Vulnerabilities in qpdf should be reported to the [qpdf project](https://github.com/qpdf/qpdf/security).

## Security design

For context on how node-qpdf handles passwords and processes, see the "Security notes" section of the [README](README.md#security-notes).
