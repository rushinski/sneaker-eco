export function buildCustomerRouteId(userId: string) {
  return "acct_" + userId;
}

export function parseCustomerRouteId(routeId: string) {
  if (!routeId.startsWith("acct_")) {
    return null;
  }

  const userId = routeId.slice("acct_".length).trim();
  return userId || null;
}

export function buildCustomerDisplayId(userId: string) {
  return "ACC-" + userId.slice(0, 8).toUpperCase();
}
