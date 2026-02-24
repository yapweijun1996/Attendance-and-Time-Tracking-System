import { navigateTo, readLocationState } from "../shared/navigation";

export const ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/logs",
  "/admin/staff",
  "/admin/settings",
  "/admin/exports",
  "/admin/audit",
] as const;

export type AdminRoute = (typeof ADMIN_ROUTES)[number];

export const DEFAULT_ADMIN_ROUTE: AdminRoute = "/admin/logs";

export interface AdminRouteState {
  route: AdminRoute;
  search: string;
}

const routeSet = new Set<string>(ADMIN_ROUTES);

export function parseAdminRoute(pathname: string): AdminRoute {
  if (routeSet.has(pathname)) {
    return pathname as AdminRoute;
  }
  return DEFAULT_ADMIN_ROUTE;
}

export function readAdminRoute(): AdminRouteState {
  const location = readLocationState();
  return {
    route: parseAdminRoute(location.pathname),
    search: location.search,
  };
}

export { navigateTo };
