import { navigateTo, readLocationState } from "../shared/navigation";

export const MOBILE_ROUTES = [
  "/m/login",
  "/m/change-password",
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
  const location = readLocationState();
  return {
    route: parseMobileRoute(location.pathname),
    search: location.search,
  };
}
export { navigateTo };
