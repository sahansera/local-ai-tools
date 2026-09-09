# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability.

If GitHub's **Report a vulnerability** option is available for this repository, please use it so the report is handled privately. Otherwise, contact the maintainer (`@sahansera`) privately through GitHub and avoid sharing exploit details in a public issue or discussion.

When reporting, include:

- affected component and version/commit
- reproduction steps or proof of concept
- expected security impact
- any suggested mitigation

Please allow the maintainer a reasonable opportunity to investigate and coordinate a fix before public disclosure.

## Scope

Security-sensitive areas include catalogue ingestion, generated install information, GitHub Actions, future MCP execution paths, and any future code that evaluates or launches third-party tools.

The V1 marketplace is intentionally discovery-oriented and does not automatically install or execute arbitrary third-party software.
