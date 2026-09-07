# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability.

While the repository is private during initial development, contact the maintainer directly through the GitHub account associated with this repository. Before the public OSS launch, a dedicated private vulnerability-reporting path will be configured and this policy updated.

When reporting, include:

- affected component and version/commit
- reproduction steps or proof of concept
- expected security impact
- any suggested mitigation

## Scope

Security-sensitive areas include catalogue ingestion, generated install information, GitHub Actions, future MCP execution paths, and any future code that evaluates or launches third-party tools.

The V1 marketplace is intentionally discovery-oriented and does not automatically install or execute arbitrary third-party software.
