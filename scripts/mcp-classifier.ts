import {
  classifyPlugin,
  type Evidence,
  type TriState,
} from "./lmstudio-classifier.ts";

export interface McpEvidence extends Evidence {
  field: "title" | "description";
}

const EXTRA_RULES: Record<string, RegExp> = {
  databases: /\b(?:database|sql|postgres(?:ql)?|sqlite|mysql|mongodb)\b/i,
  productivity:
    /\b(?:calendar|email|spreadsheet|task management|notes|notion)\b/i,
  automation: /\b(?:automation|automate|workflow|scheduled tasks)\b/i,
  files: /\b(?:pdf|documents?|file parsing)\b/i,
};

export function classifyMcp(server: {
  title?: string;
  description?: string;
  packages?: unknown[];
  remotes?: unknown[];
}) {
  const capabilities: Record<string, McpEvidence[]> = {};
  const risks: Record<string, McpEvidence[]> = {};
  // Namespaces, package identifiers and repository URLs are not capability evidence.
  for (const field of ["title", "description"] as const) {
    const text = (server[field] ?? "").slice(0, 20_000);
    const classification = classifyPlugin(text);
    for (const [target, source] of [
      [capabilities, classification.capabilities],
      [risks, classification.risks],
    ] as const) {
      for (const [name, evidence] of Object.entries(source)) {
        const supported = evidence.filter(
          (item) =>
            !/\b(?:not|no|never|without|cannot|unsupported)\b.{0,40}$/i.test(
              item.excerpt.split(new RegExp(item.rule, "i"))[0] ?? "",
            ),
        );
        if (supported.length)
          (target[name] ??= []).push(
            ...supported.map((item) => ({ ...item, field })),
          );
      }
    }
    for (const [name, pattern] of Object.entries(EXTRA_RULES)) {
      const match = pattern.exec(text);
      if (
        !match ||
        /\b(?:not|no|never|without|cannot|unsupported)\b.{0,40}$/i.test(
          text.slice(Math.max(0, match.index - 60), match.index),
        )
      )
        continue;
      (capabilities[name] ??= []).push({
        field,
        rule: pattern.source,
        confidence: "medium",
        excerpt: text.slice(
          Math.max(0, match.index - 60),
          match.index + match[0].length + 90,
        ),
      });
    }
  }
  const hasPackages = Boolean(server.packages?.length);
  const hasRemotes = Boolean(server.remotes?.length);
  const local: TriState =
    hasPackages && !hasRemotes
      ? true
      : hasRemotes && !hasPackages
        ? false
        : "unknown";
  // Installation metadata only establishes available execution modes. A local
  // package may still send all processing to a cloud API. No offline guarantee
  // or API-key exemption is inferred from package availability or silence.
  const runtime = {
    local,
    networkRequired:
      hasRemotes && !hasPackages ? (true as const) : ("unknown" as const),
    apiKeyRequired: "unknown" as const,
    offlineCapable: "unknown" as const,
  };
  return { capabilities, risks, runtime };
}
