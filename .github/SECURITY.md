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
- Which part is affected: a page, an API route, the Worker, or a module in `src/lib` or `src/server`.
- Any proposed fix.

## Response Expectations

This is a small project without a service level agreement. Reports are read and answered on a best
effort basis. A confirmed issue is fixed on the supported branch and noted in the release. Please
give the maintainer a reasonable window to ship a fix before publishing details.

## Scope

### In Scope

- The hosted instance at <https://snapme.ikhsandyy-dev.workers.dev>, including its API routes under
  `/api` (strips, relays, events, purge)
- Access control on stored strips and clips: presigned URL handling, delete tokens, relay claim,
  and expiry enforcement
- Privacy of user images: anything that causes an image to leave the device without the consent
  dialog, or to remain readable after its expiry
- Server-side validation in `src/app/api` and the server modules in `src/server` (`db`, `r2`,
  `cloudflare`, `purge`, `tokens`, `rateLimit`, `expiry`)

### Out of Scope

- Vulnerabilities in third-party dependencies: report those upstream. If a dependency issue affects
  snapme's behavior, a private report is still welcome.
- Forks, modified deployments, and self-hosted instances without the official configuration.
- Denial of service, load testing, and brute force against the public instance.
- Attacks that require physical access to an unlocked device, or social engineering.
- The camera, gesture model, and export paths, which never leave the device: anything an attacker
  can already read on the device itself is not a vulnerability here.

## Secrets

No credential, token, or private key is stored in this repository.

- Runtime secrets, meaning `CRON_SECRET`, `RATE_LIMIT_SALT`, `R2_ACCESS_KEY_ID`, and
  `R2_SECRET_ACCESS_KEY`, live in the ignored `.dev.vars` locally (template in
  `.dev.vars.example`), and in `wrangler secret put` or the Cloudflare dashboard in production.
- `R2_ACCOUNT_ID` is not a secret. It appears in `.env.example` and `wrangler.jsonc`, because it is
  needed to build the CSP and to presign requests.
- The Cloudflare resource IDs in `wrangler.jsonc` (account ID, D1 database ID, KV namespace ID) are
  identifiers, not credentials: on their own they grant no access to the account or its data. Real
  access needs an API token, which is never committed.
- Delete tokens, relay tokens, and rate-limit keys are generated per session on the user's device;
  only their hashes reach the database.

If you find a credential in the repository or in its history, treat it as compromised: report it
privately and rotate it immediately in the Cloudflare dashboard, then open a pull request that
removes it and records the rotation in `docs/DECISIONS.md`.
