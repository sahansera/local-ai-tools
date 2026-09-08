export type Confidence = "low" | "medium" | "high";
export type TriState = true | false | "unknown";

export interface Evidence {
  rule: string;
  excerpt: string;
  confidence: Confidence;
}

export interface Classification {
  capabilities: Record<string, Evidence[]>;
  risks: Record<string, Evidence[]>;
  runtime: {
    local: TriState;
    networkRequired: TriState;
    apiKeyRequired: TriState;
  };
}

interface Rule {
  name: string;
  patterns: RegExp[];
  confidence: Confidence;
}

const CAPABILITY_RULES: Rule[] = [
  {
    name: "memory",
    patterns: [/\bmemory\b/i, /\bmemories\b/i, /\bremember\b/i, /long[- ]term memory/i],
    confidence: "high",
  },
  {
    name: "context-management",
    patterns: [/context (?:compact|compress|compression|window)/i, /\bcompactor\b/i, /\bcompressor\b/i, /token (?:saving|reduction|budget)/i],
    confidence: "high",
  },
  {
    name: "video",
    patterns: [/\bvideo\b/i, /ffmpeg/i, /ffprobe/i, /\btranscod/i, /\btrim(?:ming)?\b/i, /\bhevc\b/i, /\bh\.?(?:264|265)\b/i],
    confidence: "high",
  },
  {
    name: "web-search",
    patterns: [/web search/i, /search engine/i, /duckduckgo/i, /\bserp\b/i, /google search/i, /bing search/i],
    confidence: "high",
  },
  {
    name: "research",
    patterns: [/deep research/i, /multi[- ]search/i, /research agent/i, /research assistant/i],
    confidence: "medium",
  },
  {
    name: "files",
    patterns: [/\bfilesystem\b/i, /file system/i, /read files?/i, /write files?/i, /edit files?/i, /directories/i, /folders?/i],
    confidence: "high",
  },
  {
    name: "coding",
    patterns: [/\bcoding\b/i, /\bcode assistant\b/i, /\bdeveloper\b/i, /\bgit(?:hub)?\b/i, /source code/i, /code edit/i],
    confidence: "medium",
  },
  {
    name: "shell",
    patterns: [/shell command/i, /terminal command/i, /execute commands?/i, /command execution/i, /\bsubprocess\b/i],
    confidence: "high",
  },
  {
    name: "images",
    patterns: [/\bimage\b/i, /\bimages\b/i, /\bvision\b/i, /\bphoto\b/i, /\bpicture\b/i],
    confidence: "medium",
  },
  {
    name: "audio",
    patterns: [/\baudio\b/i, /speech[- ]to[- ]text/i, /text[- ]to[- ]speech/i, /\btts\b/i, /\bstt\b/i, /transcri/i],
    confidence: "medium",
  },
  {
    name: "time",
    patterns: [/current time/i, /time zone/i, /timezone/i, /inject(?:s|ing)? (?:the )?(?:current )?time/i],
    confidence: "high",
  },
  {
    name: "agents",
    patterns: [/agent toolkit/i, /agent tools?/i, /agentic/i, /multi[- ]agent/i, /swarm/i],
    confidence: "medium",
  },
];

const RISK_RULES: Rule[] = [
  {
    name: "filesystem-read",
    patterns: [/read files?/i, /browse files?/i, /list director/i, /filesystem access/i, /file system access/i],
    confidence: "high",
  },
  {
    name: "filesystem-write",
    patterns: [/write files?/i, /edit files?/i, /delete files?/i, /move files?/i, /rename files?/i, /modify files?/i],
    confidence: "high",
  },
  {
    name: "shell-execution",
    patterns: [/shell command/i, /terminal command/i, /execute commands?/i, /command execution/i, /\bsubprocess\b/i],
    confidence: "high",
  },
  {
    name: "network-access",
    patterns: [/web search/i, /search engine/i, /remote api/i, /external api/i, /http requests?/i, /fetch(?:es|ing)? urls?/i, /internet access/i],
    confidence: "high",
  },
  {
    name: "credentials",
    patterns: [/api[- ]?key/i, /oauth/i, /credentials?/i, /access token/i, /bearer token/i],
    confidence: "high",
  },
  {
    name: "telemetry",
    patterns: [/telemetry/i, /analytics/i, /sentry/i, /usage tracking/i],
    confidence: "medium",
  },
];

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function excerpt(text: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + match[0].length + 90);
  return normalize(text.slice(start, end));
}

function collectEvidence(text: string, rules: Rule[]): Record<string, Evidence[]> {
  const result: Record<string, Evidence[]> = {};

  for (const rule of rules) {
    const evidence: Evidence[] = [];
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      evidence.push({ rule: pattern.source, excerpt: excerpt(text, match), confidence: rule.confidence });
      if (evidence.length >= 3) break;
    }
    if (evidence.length) result[rule.name] = evidence;
  }

  return result;
}

function explicitBoolean(text: string, yes: RegExp[], no: RegExp[]): TriState {
  if (no.some((pattern) => pattern.test(text))) return false;
  if (yes.some((pattern) => pattern.test(text))) return true;
  return "unknown";
}

export function classifyPlugin(text: string): Classification {
  const normalizedText = normalize(text);
  const capabilities = collectEvidence(normalizedText, CAPABILITY_RULES);
  const risks = collectEvidence(normalizedText, RISK_RULES);

  const local = explicitBoolean(
    normalizedText,
    [/fully local/i, /runs? locally/i, /local[- ]only/i, /all processing (?:is )?local/i],
    [/runs? remotely/i, /cloud[- ]only/i],
  );

  const explicitNetwork = explicitBoolean(
    normalizedText,
    [/requires? (?:an )?(?:internet|network) connection/i, /requires? network/i],
    [/no network/i, /no internet/i, /offline/i, /without (?:an )?internet connection/i],
  );
  const networkRequired =
    explicitNetwork !== "unknown" ? explicitNetwork : risks["network-access"]?.length ? true : "unknown";

  const explicitApiKey = explicitBoolean(
    normalizedText,
    [/requires? (?:an )?api[- ]?key/i, /api[- ]?key required/i],
    [/no api[- ]?key/i, /without (?:an )?api[- ]?key/i, /does not require (?:an )?api[- ]?key/i],
  );
  const apiKeyRequired =
    explicitApiKey !== "unknown" ? explicitApiKey : risks.credentials?.length ? true : "unknown";

  return {
    capabilities,
    risks,
    runtime: { local, networkRequired, apiKeyRequired },
  };
}

export function searchableTerms(classification: Classification): string[] {
  return [...Object.keys(classification.capabilities), ...Object.keys(classification.risks)];
}
