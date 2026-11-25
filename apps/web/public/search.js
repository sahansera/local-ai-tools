// A small, deterministic inverted index. Runs in the browser and in benchmarks.
const STOP = new Set(
  "a an the my me i to for of and in with please can tool tools server servers mcp plugin plugins do want how".split(
    " ",
  ),
);
const GROUPS = [
  ["video", "videos", "ffmpeg", "trim", "trimming", "transcode", "conversion"],
  ["web", "internet", "browsing", "browse", "duckduckgo"],
  ["memory", "remember", "memories", "persistence"],
  ["files", "file", "filesystem", "documents", "document", "pdf"],
  ["coding", "code", "programming", "developer"],
  ["images", "image", "photo", "photos", "pictures"],
  ["audio", "speech", "transcribe", "transcription"],
  ["database", "databases", "sql", "postgresql", "sqlite"],
];
const SYNONYMS = new Map(
  GROUPS.flatMap((group) => group.map((word) => [word, group])),
);

export function tokenize(text) {
  return (
    String(text ?? "")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

// A single insertion, deletion, substitution, or adjacent transposition.
export function nearWord(left, right) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  while (i < left.length && left[i] === right[i]) i++;
  if (left.length === right.length) {
    return (
      left.slice(i + 1) === right.slice(i + 1) ||
      (left[i] === right[i + 1] &&
        left[i + 1] === right[i] &&
        left.slice(i + 2) === right.slice(i + 2))
    );
  }
  const [short, long] =
    left.length < right.length ? [left, right] : [right, left];
  return short.slice(i) === long.slice(i + 1);
}

export function createSearchIndex(tools) {
  const postings = new Map();
  const buckets = new Map();
  for (let id = 0; id < tools.length; id++) {
    const tool = tools[id];
    for (const [text, weight] of [
      [tool.name, 12],
      [tool.categories.join(" "), 10],
      [tool.tags.join(" "), 7],
      [tool.description.slice(0, 1000), 3],
      [tool.author, 2],
    ]) {
      for (const token of new Set(tokenize(text))) {
        if (STOP.has(token) || token.length > 64) continue;
        if (!postings.has(token)) {
          postings.set(token, new Map());
          const first = token[0];
          if (!buckets.has(first)) buckets.set(first, []);
          buckets.get(first).push(token);
        }
        const matches = postings.get(token);
        matches.set(id, Math.max(weight, matches.get(id) ?? 0));
      }
    }
  }
  return { tools, postings, buckets };
}

export function searchScores(index, query) {
  const normalized = String(query)
    .slice(0, 200)
    .replace(/\b(?:edit videos?|make videos?)\b/gi, "video")
    .replace(/\b(?:search the internet|search the web)\b/gi, "web")
    .replace(/\b(?:remember conversations?)\b/gi, "memory")
    .replace(/\b(?:read (?:my )?documents?)\b/gi, "documents");
  const terms = [
    ...new Set(tokenize(normalized).filter((term) => !STOP.has(term))),
  ].slice(0, 12);
  if (!terms.length) return null;
  let scores = null;
  for (const term of terms) {
    const variants = new Map(
      (SYNONYMS.get(term) ?? [term]).map((word) => [
        word,
        word === term ? 1 : 0.7,
      ]),
    );
    // Fuzzy/prefix expansion is bounded to the same first character. This keeps
    // typo assistance predictable without scanning every document per keypress.
    if (term.length >= 3) {
      for (const word of index.buckets.get(term[0]) ?? []) {
        if (!variants.has(word) && word.startsWith(term))
          variants.set(word, 0.6);
        else if (
          term.length >= 4 &&
          !variants.has(word) &&
          nearWord(term, word)
        )
          variants.set(word, 0.4);
      }
    }
    const matches = new Map();
    for (const [word, factor] of variants) {
      for (const [id, weight] of index.postings.get(word) ?? []) {
        matches.set(id, Math.max(matches.get(id) ?? 0, weight * factor));
      }
    }
    if (scores === null) scores = matches;
    else
      for (const [id, score] of scores) {
        if (!matches.has(id)) scores.delete(id);
        else scores.set(id, score + matches.get(id));
      }
    if (!scores.size) break;
  }
  return scores;
}
