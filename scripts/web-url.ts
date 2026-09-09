export function safeWebUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

// URL serialization escapes path braces. Keep Registry placeholders visible
// until compatibility evaluation has resolved or reported every required input.
export function safeWebUrlTemplate(
  value: string | undefined,
): string | undefined {
  return safeWebUrl(value)?.replaceAll(
    /%7B([a-zA-Z_][a-zA-Z0-9_]*)%7D/gi,
    "{$1}",
  );
}
