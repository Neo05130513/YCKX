export type CustomerRole = "admin" | "staff";

export interface CustomerProfile {
  accountId: string;
  type: "INTERNAL" | "CUSTOMER";
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  customerName: string;
  permissions: string[];
  isSystemAdmin: boolean;
  expiresAt: number;
}

export interface CustomerLoginResult {
  token: string;
  tokenType: "Bearer";
  expiresAt: number;
  profile: CustomerProfile;
}

const tokenKey = "yckx_customer_token";
const profileKey = "yckx_customer_profile";

export function getCustomerToken() {
  return localStorage.getItem(tokenKey) || "";
}

export function getCustomerProfile(): CustomerProfile | null {
  const raw = localStorage.getItem(profileKey);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as CustomerProfile;
    if (!profile.expiresAt || profile.expiresAt <= Date.now()) {
      clearCustomerSession();
      return null;
    }
    return profile;
  } catch {
    clearCustomerSession();
    return null;
  }
}

export function saveCustomerSession(result: CustomerLoginResult) {
  localStorage.setItem(tokenKey, result.token);
  localStorage.setItem(profileKey, JSON.stringify(result.profile));
}

export function clearCustomerSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(profileKey);
}

export function hasCustomerPermission(permission: string) {
  const profile = getCustomerProfile();
  return Boolean(profile?.permissions.includes(permission));
}

export function hasAnyCustomerPermission(permissions: string[] = []) {
  if (!permissions.length) return Boolean(getCustomerProfile());
  return permissions.some((permission) => hasCustomerPermission(permission));
}

export function getCustomerRole(): CustomerRole {
  return hasCustomerPermission("customer.bill.read") ? "admin" : "staff";
}

export function getCustomerHomePath() {
  return "/customer/home";
}
