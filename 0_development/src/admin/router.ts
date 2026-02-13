import { navigateTo } from "../shared/navigation";

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
  if (typeof window === "undefined") {
    return { route: DEFAULT_ADMIN_ROUTE, search: "" };
  }
  return {
    route: parseAdminRoute(window.location.pathname),
    search: window.location.search,
  };
}

export { navigateTo };
