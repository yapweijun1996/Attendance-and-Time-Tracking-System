function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl || baseUrl === "/") {
    return "./";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function resolveBasePath(relativePath: string): string {
  // Ensure runtime assets always follow Vite BASE_URL in sub-path deployments (e.g. GitHub Pages).
  const normalizedBase = normalizeBaseUrl(import.meta.env.BASE_URL ?? "/");
  const normalizedPath = relativePath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
}

