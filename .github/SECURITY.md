# Security Policy

## Supported Versions

Only the latest `0.1.x` release line is supported with security fixes. Older commits, unreleased
tags, and historical branches are not supported.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| < 0.1.0 | No |

## Reporting a Vulnerability

Report a suspected vulnerability privately, through GitHub Security Advisories:

<https://github.com/ikhsanddy/snapme/security/advisories/new>

Please do not open a public issue, discussion, or pull request for a security problem. If you cannot
use advisories, open an issue that only asks for a private contact channel, without any detail of
the finding.

Include what you can of the following:

- What the problem is and what an attacker could do with it.
- Reproduction steps, or a minimal proof of concept.
- Which part is affected: a page, an API stub under `src/app/api`, or a module in `src/lib` or
  `src/features`.
- Any proposed fix.

## Response Expectations

This is a small project without a service level agreement. Reports are read and answered on a best
effort basis. A confirmed issue is fixed on the supported branch and noted in the release. Please
give the maintainer a reasonable window to ship a fix before publishing details.

## Scope

### In Scope

- The client app itself: anything that causes an image, clip, or identifier to leave the device,
  or that weakens the guarantee that capture, editing, and export run locally
- The security headers in `next.config.ts`: the CSP (which must stay free of external hosts),
  `Permissions-Policy`, and the `noindex` and `no-referrer` rules on `/s/*` and `/r/*`
- The API stubs under `src/app/api`: they must keep answering the constant 503 contract and must
  never start accepting or storing data without a new security review
- Secrets that reach the repository or a shipped bundle

### Out of Scope

- Vulnerabilities in third-party dependencies: report those upstream. If a dependency issue affects
  snapme's behavior, a private report is still welcome.
- Forks, modified deployments, and self-hosted instances.
- Denial of service, load testing, and brute force. There is no hosted instance to attack.
- Attacks that require physical access to an unlocked device, or social engineering.
- The camera, gesture model, and export paths, which never leave the device: anything an attacker
  can already read on the device itself is not a vulnerability here.

## Secrets

No credential, token, or private key is stored in this repository, and the app needs none: there
are no environment variables for the build or at runtime.

- The former runtime secrets and their `.example` templates were removed together with the backend.
  If a change reintroduces a credential, it must be read from the environment and documented in
  this section; it must never be committed.
- Session and delete tokens are generated on the user's device and stay there; nothing about them
  reaches a server, because there is no server.

If you find a credential in the repository or in its history, treat it as compromised: report it
privately, rotate it with its provider, then open a pull request that removes it and records the
rotation in `docs/DECISIONS.md`.
