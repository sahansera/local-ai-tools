# Search visibility and community feedback

Production builds configured with SITE_URL and SITE_BASE emit base-aware canonical URLs, Open Graph and Twitter metadata using the existing app icon, and escaped JSON-LD. Software listings describe published identity/category/version information without ratings, endorsement or verified compatibility claims. Metadata descriptions are limited to 200 characters.

The sitemap index splits canonical listing/category URLs into chunks of 10,000, below the sitemap protocol's 50,000-URL limit. Legacy redirects are excluded. Robots metadata points to that sitemap; on a GitHub project site, a robots.txt under the project base cannot control the host root, which is outside this repository. Local builds without SITE_URL do not emit public canonical/social URLs and their sitemap uses localhost.

Capability landing pages live under `/categories/<category>/`, avoiding collisions with existing tool routes. They show at most 24 cards and link to the full category filter. That filter link depends on the search/URL-state PR (#55); richer MCP categories arrive in #54. The pages describe inferred categories and avoid claiming that every listing is tested. Capping cards also prevents duplicating the full registry in category HTML.

Listing feedback links open GitHub's existing bug form for metadata/installation reports or a new reproducibility-focused compatibility form. They prefill listing identity and source. No issues or reports are submitted automatically, and a report does not create a verification badge. The compatibility form asks for LM Studio version, OS/runtime, package/endpoint and reproduction steps with secrets removed.

The repeated detail styles are explicitly scoped beneath `.detail-wrap` in a shared global stylesheet, and layout styles use their existing unique class names. This removes per-element Astro scope markers while preserving selector containment, reducing the cost of adding metadata across tens of thousands of static pages. The reliability PR's external-styles setting and output-size budget remain required for production scale.

Validation: frozen install, format/lint/typecheck, 28 unit tests, authored-catalogue build and routes with the project base. Checks include canonical path composition, XML escaping and safe JSON-LD serialization. Full combined registry and browser integration checks are recorded separately. No search-engine indexing outcome, community runtime verification or live deployment is claimed.
