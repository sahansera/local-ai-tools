export type LmStudioCompatibilityStatus =
  "ready" | "setup-required" | "unknown";

export interface RegistryInput {
  name?: string;
  value?: string;
  default?: string;
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
  format?: string;
  valueHint?: string;
  placeholder?: string;
  choices?: string[];
}

export interface RegistryArgument extends RegistryInput {
  type?: "named" | "positional" | string;
}

export interface RegistryPackage {
  registryType?: string;
  identifier?: string;
  version?: string;
  runtimeHint?: string;
  runtimeArguments?: RegistryArgument[];
  packageArguments?: RegistryArgument[];
  environmentVariables?: RegistryInput[];
  transport?: {
    type?: string;
  };
}

export interface RegistryRemote {
  type?: string;
  url?: string;
  headers?: RegistryInput[];
  variables?: Record<string, RegistryInput>;
}

export interface RegistryServerForLmStudio {
  name: string;
  packages?: RegistryPackage[];
  remotes?: RegistryRemote[];
}

export interface LmStudioServerConfig {
  url?: string;
  headers?: Record<string, string>;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface LmStudioCompatibility {
  status: LmStudioCompatibilityStatus;
  mode?: "remote" | "stdio";
  installName: string;
  reason: string;
  config?: LmStudioServerConfig;
  deeplink?: string;
  requirements: string[];
  requiredInputs: string[];
}

interface ResolvedValues {
  values: Record<string, string>;
  requiredInputs: string[];
}

interface ResolvedArguments {
  args: string[];
  requiredInputs: string[];
}

interface ResolvedTemplate {
  value: string;
  requiredInputs: string[];
}

const PACKAGE_PRIORITY = ["npm", "pypi", "nuget"] as const;
const COMMAND_BY_REGISTRY: Record<string, string> = {
  npm: "npx",
  pypi: "uvx",
  nuget: "dnx",
};

function installName(serverName: string): string {
  const raw = serverName.split("/").at(-1) || "mcp-server";
  const normalized = raw.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
  return normalized || "mcp-server";
}

function inputLabel(input: RegistryInput, fallback: string): string {
  return (
    input.valueHint?.trim() ||
    input.placeholder?.trim() ||
    input.name?.trim() ||
    fallback
  );
}

function placeholder(label: string): string {
  return `<${label.replaceAll(/[^a-zA-Z0-9_-]/g, "_").toUpperCase()}>`;
}

function resolveInput(
  input: RegistryInput,
  fallback: string,
): {
  value?: string;
  requiredInput?: string;
} {
  if (typeof input.value === "string") return { value: input.value };
  if (typeof input.default === "string") return { value: input.default };

  if (input.isRequired) {
    const label = inputLabel(input, fallback);
    return { value: placeholder(label), requiredInput: label };
  }

  return {};
}

function resolveValues(
  inputs: RegistryInput[] | undefined,
  fallbackPrefix: string,
): ResolvedValues {
  const values: Record<string, string> = {};
  const requiredInputs: string[] = [];

  for (const [index, input] of (inputs ?? []).entries()) {
    const name = input.name?.trim();
    if (!name) continue;

    const resolved = resolveInput(input, `${fallbackPrefix}_${index + 1}`);
    if (resolved.value !== undefined) values[name] = resolved.value;
    if (resolved.requiredInput) requiredInputs.push(resolved.requiredInput);
  }

  return { values, requiredInputs };
}

function argumentNeedsValue(argument: RegistryArgument): boolean {
  return Boolean(
    argument.valueHint ||
    argument.placeholder ||
    argument.format ||
    argument.choices?.length ||
    argument.description,
  );
}

function resolveArguments(
  argumentsList: RegistryArgument[] | undefined,
  fallbackPrefix: string,
): ResolvedArguments {
  const args: string[] = [];
  const requiredInputs: string[] = [];

  for (const [index, argument] of (argumentsList ?? []).entries()) {
    const fixedValue =
      typeof argument.value === "string"
        ? argument.value
        : typeof argument.default === "string"
          ? argument.default
          : undefined;

    if (argument.type === "named") {
      const name = argument.name?.trim();
      if (!name) continue;

      if (fixedValue !== undefined) {
        args.push(name, fixedValue);
        continue;
      }

      if (!argument.isRequired) continue;

      args.push(name);
      if (argumentNeedsValue(argument)) {
        const label = inputLabel(argument, `${fallbackPrefix}_${index + 1}`);
        args.push(placeholder(label));
        requiredInputs.push(label);
      }
      continue;
    }

    if (fixedValue !== undefined) {
      args.push(fixedValue);
      continue;
    }

    if (argument.isRequired) {
      const label = inputLabel(argument, `${fallbackPrefix}_${index + 1}`);
      args.push(placeholder(label));
      requiredInputs.push(label);
    }
  }

  return { args, requiredInputs };
}

function resolveTemplate(
  value: string,
  variables: Record<string, RegistryInput> | undefined,
): ResolvedTemplate {
  const requiredInputs: string[] = [];
  const resolvedValue = value.replaceAll(
    /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
    (_match, variableName: string) => {
      const definition = variables?.[variableName];
      if (definition) {
        const resolved = resolveInput(definition, variableName);
        if (resolved.requiredInput) requiredInputs.push(resolved.requiredInput);
        if (resolved.value !== undefined) return resolved.value;
      }

      requiredInputs.push(variableName);
      return placeholder(variableName);
    },
  );

  return {
    value: resolvedValue,
    requiredInputs: [...new Set(requiredInputs)],
  };
}

function packageSpec(pkg: RegistryPackage): string | null {
  if (!pkg.identifier) return null;

  if (pkg.registryType === "npm") {
    return pkg.version ? `${pkg.identifier}@${pkg.version}` : pkg.identifier;
  }

  if (pkg.registryType === "pypi") {
    return pkg.version ? `${pkg.identifier}==${pkg.version}` : pkg.identifier;
  }

  if (pkg.registryType === "nuget") {
    return pkg.version ? `${pkg.identifier}@${pkg.version}` : pkg.identifier;
  }

  return null;
}

function packageCommand(pkg: RegistryPackage): string | null {
  const defaultCommand = pkg.registryType
    ? COMMAND_BY_REGISTRY[pkg.registryType]
    : undefined;
  if (!defaultCommand) return null;

  if (!pkg.runtimeHint) return defaultCommand;
  return pkg.runtimeHint === defaultCommand ? pkg.runtimeHint : null;
}

function packageRequirement(pkg: RegistryPackage): string {
  switch (pkg.registryType) {
    case "npm":
      return "Node.js with npx available on PATH";
    case "pypi":
      return "uv with uvx available on PATH";
    case "nuget":
      return ".NET 10+ with dnx available on PATH";
    default:
      return `${pkg.registryType ?? "Package runtime"} available on PATH`;
  }
}

function buildDeeplink(name: string, config: LmStudioServerConfig): string {
  const encodedConfig = Buffer.from(JSON.stringify(config), "utf8").toString(
    "base64",
  );
  return `lmstudio://add_mcp?name=${encodeURIComponent(name)}&config=${encodeURIComponent(encodedConfig)}`;
}

function fromRemote(
  server: RegistryServerForLmStudio,
): LmStudioCompatibility | null {
  const supported = (server.remotes ?? []).filter(
    (remote) => remote.type === "streamable-http" && Boolean(remote.url),
  );

  const uniqueByUrl = new Map(
    supported.map((remote) => [remote.url as string, remote]),
  );
  const remotes = [...uniqueByUrl.values()];
  if (remotes.length === 0) return null;

  const name = installName(server.name);
  if (remotes.length > 1) {
    return {
      status: "unknown",
      installName: name,
      reason:
        "The Registry declares multiple standard-HTTP endpoints, so Local AI Tools will not choose one automatically.",
      requirements: [],
      requiredInputs: [],
    };
  }

  const remote = remotes[0];
  const url = resolveTemplate(remote.url as string, remote.variables);
  const headers = resolveValues(remote.headers, "HEADER");
  const requiredInputs = [...url.requiredInputs, ...headers.requiredInputs];
  const config: LmStudioServerConfig = { url: url.value };
  if (Object.keys(headers.values).length > 0) config.headers = headers.values;

  if (requiredInputs.length > 0) {
    const hasUnresolvedUrl = url.requiredInputs.length > 0;
    return {
      status: "setup-required",
      mode: "remote",
      installName: name,
      reason: hasUnresolvedUrl
        ? "LM Studio supports this standard-HTTP MCP, but the Registry URL contains required template values that must be resolved before installation."
        : "LM Studio supports this standard-HTTP MCP. It can be added now, but required header values must be filled in before the server will work.",
      config,
      deeplink: hasUnresolvedUrl ? undefined : buildDeeplink(name, config),
      requirements: [],
      requiredInputs: [...new Set(requiredInputs)],
    };
  }

  return {
    status: "ready",
    mode: "remote",
    installName: name,
    reason:
      "The Registry provides one standard-HTTP endpoint that maps directly to LM Studio's MCP configuration.",
    config,
    deeplink: buildDeeplink(name, config),
    requirements: [],
    requiredInputs: [],
  };
}

function preferredPackage(
  packages: RegistryPackage[] | undefined,
): RegistryPackage | null {
  const supported = (packages ?? []).filter(
    (pkg) =>
      pkg.transport?.type === "stdio" &&
      PACKAGE_PRIORITY.includes(
        pkg.registryType as (typeof PACKAGE_PRIORITY)[number],
      ) &&
      Boolean(pkg.identifier) &&
      Boolean(packageCommand(pkg)),
  );

  for (const registryType of PACKAGE_PRIORITY) {
    const matches = supported.filter(
      (pkg) => pkg.registryType === registryType,
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return null;
  }

  return null;
}

function fromPackage(
  server: RegistryServerForLmStudio,
): LmStudioCompatibility | null {
  const pkg = preferredPackage(server.packages);
  if (!pkg) return null;

  const command = packageCommand(pkg);
  const spec = packageSpec(pkg);
  if (!command || !spec) return null;

  const runtimeArgs = resolveArguments(pkg.runtimeArguments, "RUNTIME_ARG");
  const packageArgs = resolveArguments(pkg.packageArguments, "PACKAGE_ARG");
  const environment = resolveValues(pkg.environmentVariables, "ENV");
  const requiredInputs = [
    ...runtimeArgs.requiredInputs,
    ...packageArgs.requiredInputs,
    ...environment.requiredInputs,
  ];

  const args = [...runtimeArgs.args];
  if (
    pkg.registryType === "npm" &&
    !args.includes("-y") &&
    !args.includes("--yes")
  ) {
    args.unshift("-y");
  }
  args.push(spec);
  if (pkg.registryType === "nuget") {
    if (!args.includes("--yes")) args.push("--yes");
    if (packageArgs.args.length > 0) args.push("--");
  }
  args.push(...packageArgs.args);

  const config: LmStudioServerConfig = {
    command,
    args,
  };
  if (Object.keys(environment.values).length > 0) {
    config.env = environment.values;
  }

  const name = installName(server.name);
  const requirements = [packageRequirement(pkg)];
  if (requiredInputs.length > 0) {
    return {
      status: "setup-required",
      mode: "stdio",
      installName: name,
      reason:
        "The Registry provides a deterministic stdio package definition. It can be added to LM Studio now, but required values must be filled in before the server will work.",
      config,
      deeplink: buildDeeplink(name, config),
      requirements,
      requiredInputs: [...new Set(requiredInputs)],
    };
  }

  return {
    status: "ready",
    mode: "stdio",
    installName: name,
    reason:
      "The Registry provides a deterministic stdio package definition that can be converted to LM Studio's MCP configuration.",
    config,
    deeplink: buildDeeplink(name, config),
    requirements,
    requiredInputs: [],
  };
}

export function evaluateLmStudioCompatibility(
  server: RegistryServerForLmStudio,
): LmStudioCompatibility {
  const remote = fromRemote(server);
  if (remote) return remote;

  const localPackage = fromPackage(server);
  if (localPackage) return localPackage;

  const packageTypes = (server.packages ?? [])
    .map((pkg) => pkg.registryType)
    .filter(Boolean)
    .join(", ");
  const remoteTypes = (server.remotes ?? [])
    .map((item) => item.type)
    .filter(Boolean)
    .join(", ");
  const available = [
    packageTypes ? `packages: ${packageTypes}` : "",
    remoteTypes ? `remotes: ${remoteTypes}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  return {
    status: "unknown",
    installName: installName(server.name),
    reason: available
      ? `The Registry entry does not currently map to a supported deterministic LM Studio adapter (${available}).`
      : "The Registry entry does not contain enough installation metadata to generate an LM Studio configuration.",
    requirements: [],
    requiredInputs: [],
  };
}
