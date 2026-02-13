function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed || trimmed === "/" || trimmed === "./") {
    return "/";
  }

  const withoutDotPrefix = trimmed.replace(/^\.\//, "");
  const withLeadingSlash = withoutDotPrefix.startsWith("/")
    ? withoutDotPrefix
    : `/${withoutDotPrefix}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export function resolveBasePath(relativePath: string): string {
  // Ensure runtime assets always follow Vite BASE_URL in sub-path deployments (e.g. GitHub Pages).
  const normalizedBase = normalizeBaseUrl(import.meta.env.BASE_URL ?? "/");
  const normalizedPath = relativePath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
}
