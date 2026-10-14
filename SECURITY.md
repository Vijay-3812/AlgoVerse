# Security policy

AlgoVerse is a static, client-side app: it has no backend, no accounts and no
server-side data. The realistic risks are therefore supply-chain (a malicious
dependency) and XSS through user input that is rendered back to the page.

## Reporting

Please open a **private** security advisory (Security → Report a vulnerability
in the GitHub UI) rather than a public issue. Include:

- the version or commit,
- a minimal reproduction,
- impact, and whether it needs a crafted input or a modified dependency.

You can expect an acknowledgement within a few days and a fix or a reasoned
"won't fix" within a reasonable window. Credit is given in the advisory unless
you prefer otherwise.

## Hardening already in place

- All user input is treated as data: it is parsed into numbers / node ids and
  re-rendered through React (no `dangerouslySetInnerHTML` anywhere in the app).
- Shareable URLs carry the input, not code: a link can only ever set an
  algorithm id, a dataset preset and a list of values.
- No third-party runtime scripts, no analytics, no CDN code — the bundle is
  self-contained.
- Dependencies are updated weekly by Dependabot and reviewed by hand.
