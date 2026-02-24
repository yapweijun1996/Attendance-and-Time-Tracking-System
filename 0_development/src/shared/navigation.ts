export interface AppLocationState {
  pathname: string;
  search: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed || trimmed === "/" || trimmed === "./") {
    return "/";
  }
  const withoutDotPrefix = trimmed.replace(/^\.\//, "");
  const withLeadingSlash = withoutDotPrefix.startsWith("/")
    ? withoutDotPrefix
    : `/${withoutDotPrefix}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function getBaseUrl(): string {
  return normalizeBaseUrl(import.meta.env.BASE_URL ?? "/");
}

function stripBaseFromPathname(pathname: string): string {
  const baseUrl = getBaseUrl();
  if (baseUrl === "/") {
    return pathname || "/";
  }

  const basePath = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  if (pathname === basePath) {
    return "/";
  }
  if (!pathname.startsWith(baseUrl)) {
    return pathname || "/";
  }

  const rest = pathname.slice(baseUrl.length);
  return rest ? `/${rest.replace(/^\/+/, "")}` : "/";
}

function withBasePath(pathname: string): string {
  const baseUrl = getBaseUrl();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (baseUrl === "/") {
    return normalizedPath;
  }
  if (normalizedPath.startsWith(baseUrl)) {
    return normalizedPath;
  }
  if (normalizedPath === "/") {
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }
  return `${baseUrl}${normalizedPath.replace(/^\/+/, "")}`;
}

export function readLocationState(): AppLocationState {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "" };
  }
  return {
    pathname: stripBaseFromPathname(window.location.pathname),
    search: window.location.search,
  };
}

export function navigateTo(path: string, replace = false): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(path, window.location.origin);
  const targetPathname = withBasePath(url.pathname);
  const method = replace ? window.history.replaceState : window.history.pushState;
  method.call(window.history, null, "", `${targetPathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
