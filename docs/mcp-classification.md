# MCP capability evidence and execution claims

MCP capability categories are heuristic matches in the registry's published title and description. The classifier reuses the native-plugin capability rules and adds database, productivity, document and automation terms. It does not use namespace names, package identifiers or repository URLs as capability evidence. Obvious nearby negation is excluded conservatively; this is not a natural-language understanding system.

Each capability retains the source field, matched rule, confidence and excerpt. Detail pages expose these excerpts and describe the classification as inferred. No matching evidence leaves the listing uncategorized; platforms and API-key requirements remain unknown rather than being guessed.

Package-only listings are labelled **Runs locally**. This describes an available execution mode, not where data is processed. Remote-only listings require a network and cannot be offline-capable. Mixed local/remote listings preserve unknown execution mode. Package availability never establishes offline capability, a no-network guarantee, or an API-key exemption. Offline processing remains unknown for local packages until stronger evidence is available. Native-plugin and dynamic-card labels also use Runs locally to avoid conflating execution with processing.

The classifier never downloads or executes upstream packages and never marks functionality or LM Studio compatibility as verified. A high confidence term match is confidence in the heuristic, not a verification badge.

Validation: frozen install; format, lint, typecheck, 28 unit tests, authored-only build and routes passed on macOS/Node 26.8.1. Typecheck also passed with the live 73,337-entry MCP snapshot plus Hub snapshots from the P0 refresh. The dependency audit remains blocked by the two advisories already addressed in PR #52. Real installations inside LM Studio were not tested.
