# Generated MCP configuration and trust

A configuration-ready label means published metadata can be mapped to a configuration. It does not mean an installation was tested with LM Studio, a package was reviewed, or a registry entry is safe. The UI now states this explicitly; native Hub plugin labels remain distinct.

Automatic configuration accepts conservative npm, PyPI and NuGet package identifier/version grammars. URLs, git/tarball selectors, leading flags, control characters and custom runner arguments are not automatically mapped. Unsupported definitions remain unknown for manual review. Environment names must be valid and cannot override common executable/runtime controls such as PATH or NODE_OPTIONS; duplicate environment names are rejected. Package arguments stay individual JSON array elements; no shell command is constructed.

Remote endpoints require HTTPS except for loopback HTTP. Embedded credentials, fragments, sensitive query-parameter names, invalid/duplicate header names and control characters are rejected. URL templates retain setup-required status until every required value is resolved. Multiple endpoints are not arbitrarily chosen.

Secret input defaults are replaced by placeholders, including sensitive header/environment names even when upstream omits isSecret. Missing values and placeholder defaults withhold install links while keeping a reviewable configuration preview. Install names include a stable hash of the complete server identity so unrelated namespaces do not overwrite a shared leaf name. Existing installations are not renamed or migrated automatically.

No registry package is installed or executed by these checks. Package versions may still be unpinned, upstream descriptions can be false, and generated configurations cannot establish runtime compatibility or fully local processing. A future verified badge must be backed by a reproducible report with the LM Studio version, platform, package/version and procedure; this PR creates no verified claims.

Local validation: frozen install, format/lint/typecheck, 33 unit tests (including the search branch) including unsafe selectors/runner flags, secret defaults, remote/header injection and install-name collisions, plus authored build/routes. Existing PR #52 owns the dependency audit fix. All eight Chromium desktop/mobile browser cases passed when stacked on the search PR, including required credentials disabling installation.
