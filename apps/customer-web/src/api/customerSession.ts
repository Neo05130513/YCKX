export type CustomerRole = "admin" | "staff";

const roleKey = "yckx_customer_role";

export function getCustomerRole(): CustomerRole {
  return localStorage.getItem(roleKey) === "staff" ? "staff" : "admin";
}

export function setCustomerRole(role: CustomerRole) {
  localStorage.setItem(roleKey, role);
}

export function getCustomerHomePath() {
  return `/customer/home?role=${getCustomerRole()}`;
}
