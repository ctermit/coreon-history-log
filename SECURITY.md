# Security policy

Coreon History Log is an early public Figma widget prototype. It is **not** a production-grade audit ledger.

## Scope
The current build stores entries in Figma's per-widget synchronized state. No external endpoint, analytics, remote storage or secret is required.

## Reporting a vulnerability
Please avoid publishing exploits, Figma file links, private client content or credentials in a public issue. Use GitHub's **private vulnerability reporting** if enabled for this repository, or contact the repository owner through a private channel.

## Public contribution rules
- No client screenshots, actual records, personnel data, proprietary DS tokens, internal work-item numbers or private file links.
- Never commit tokens, API keys, secrets or credential-bearing logs, even to later-deleted commits.
- Any new network domain, storage provider, telemetry or AI API needs explicit privacy/security review.
- Treat contributed GitHub Actions code as untrusted. No `pull_request_target` that runs contributor-controlled code with elevated privileges.
- Breaking synced-state migrations require backup/recovery consideration and manual upgrade QA.

## Supported versions
Only the current development prototype is maintained. There is no published production release yet.
