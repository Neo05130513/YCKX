export interface AdminProfile {
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

export interface AdminLoginResult {
  token: string;
  tokenType: "Bearer";
  expiresAt: number;
  profile: AdminProfile;
}

const tokenKey = "yckx_admin_token";
const profileKey = "yckx_admin_profile";

export function getAdminToken() {
  return localStorage.getItem(tokenKey) || "";
}

export function getAdminProfile(): AdminProfile | null {
  const raw = localStorage.getItem(profileKey);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as AdminProfile;
    if (!profile.expiresAt || profile.expiresAt <= Date.now()) {
      clearAdminSession();
      return null;
    }
    return profile;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function saveAdminSession(result: AdminLoginResult) {
  localStorage.setItem(tokenKey, result.token);
  localStorage.setItem(profileKey, JSON.stringify(result.profile));
}

export function clearAdminSession() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(profileKey);
}

export function hasAdminPermission(permission: string) {
  const profile = getAdminProfile();
  if (!profile) return false;
  if (profile.isSystemAdmin) return true;
  return profile.permissions.includes(permission);
}

export function hasAnyAdminPermission(permissions: string[] = []) {
  if (!permissions.length) return Boolean(getAdminProfile());
  return permissions.some((permission) => hasAdminPermission(permission));
}
