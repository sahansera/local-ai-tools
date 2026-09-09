# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability.

Use [GitHub's private vulnerability reporting form](https://github.com/sahansera/local-ai-tools/security/advisories/new) to send a report to the maintainer. Do not put vulnerability details in public issues or discussions.

If the private form is unavailable, [request a private reporting channel](https://github.com/sahansera/local-ai-tools/issues/new?title=Request%20a%20private%20security%20contact) with only that request. Do not include the affected component, reproduction steps, exploit details, or personal information. Wait for the maintainer to arrange a private channel before sending the report.

When reporting, include:

- affected component and version/commit
- reproduction steps or proof of concept
- expected security impact
- any suggested mitigation

Please allow the maintainer a reasonable opportunity to investigate and coordinate a fix before public disclosure.

## Scope

Security-sensitive areas include catalogue ingestion, generated install information, GitHub Actions, future MCP execution paths, and any future code that evaluates or launches third-party tools.

The V1 marketplace is intentionally discovery-oriented and does not automatically install or execute arbitrary third-party software.
