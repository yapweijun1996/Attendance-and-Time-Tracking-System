export interface AppLocationState {
  pathname: string;
  search: string;
}

export function readLocationState(): AppLocationState {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "" };
  }
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export function navigateTo(path: string, replace = false): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(path, window.location.origin);
  const method = replace ? window.history.replaceState : window.history.pushState;
  method.call(window.history, null, "", `${url.pathname}${url.search}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
