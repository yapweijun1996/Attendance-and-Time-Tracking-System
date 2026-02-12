import { navigateTo } from "../shared/navigation";

export const MOBILE_ROUTES = [
  "/m/home",
  "/m/verify",
  "/m/result",
  "/m/enroll/consent",
  "/m/enroll/capture",
  "/m/enroll/liveness",
  "/m/history",
  "/m/profile",
] as const;

export type MobileRoute = (typeof MOBILE_ROUTES)[number];

export const DEFAULT_MOBILE_ROUTE: MobileRoute = "/m/home";

export interface MobileRouteState {
  route: MobileRoute;
  search: string;
}

const routeSet = new Set<string>(MOBILE_ROUTES);

export function parseMobileRoute(pathname: string): MobileRoute {
  if (routeSet.has(pathname)) {
    return pathname as MobileRoute;
  }
  return DEFAULT_MOBILE_ROUTE;
}

export function readMobileRoute(): MobileRouteState {
  if (typeof window === "undefined") {
    return { route: DEFAULT_MOBILE_ROUTE, search: "" };
  }
  return {
    route: parseMobileRoute(window.location.pathname),
    search: window.location.search,
  };
}
export { navigateTo };
