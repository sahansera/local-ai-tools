import type { Tool } from "./catalog";

export type ToolLmStudioStatus = "ready" | "setup-required" | "unknown";

export function lmStudioStatus(tool: Tool): ToolLmStudioStatus {
  if (tool.type === "lmstudio-plugin") return "ready";
  return tool.lmStudio?.status ?? "unknown";
}

export function lmStudioInstallUrl(tool: Tool): string | undefined {
  if (tool.type === "lmstudio-plugin") {
    const [owner, name, ...rest] = tool.id.split("/");
    if (!owner || !name || rest.length > 0) return undefined;
    return `lmstudio://plugin?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`;
  }

  if (tool.lmStudio?.status === "ready") return tool.lmStudio.deeplink;
  return undefined;
}

export function lmStudioStatusLabel(tool: Tool): string {
  if (tool.type === "lmstudio-plugin") return "LM Studio Ready";

  switch (tool.lmStudio?.status) {
    case "ready":
      return "LM Studio Ready";
    case "setup-required":
      return "Setup required";
    default:
      return "Compatibility unknown";
  }
}

export function lmStudioStatusReason(tool: Tool): string {
  if (tool.type === "lmstudio-plugin") {
    return "Native LM Studio Hub plugin with a direct LM Studio install action.";
  }

  return (
    tool.lmStudio?.reason ??
    "This MCP does not yet have enough Registry metadata for Local AI Tools to generate a deterministic LM Studio configuration."
  );
}
