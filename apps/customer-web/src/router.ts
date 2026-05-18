import { createRouter, createWebHistory } from "vue-router";
import CustomerLayout from "./layouts/CustomerLayout.vue";
import LoginPage from "./pages/LoginPage.vue";
import HomePage from "./pages/HomePage.vue";
import OrdersPage from "./pages/OrdersPage.vue";
import BatteriesPage from "./pages/BatteriesPage.vue";
import RepairPage from "./pages/RepairPage.vue";
import BillsPage from "./pages/BillsPage.vue";
import ReceiptsPage from "./pages/ReceiptsPage.vue";
import {
  clearCustomerSession,
  getCustomerProfile,
  getCustomerToken,
  hasAnyCustomerPermission,
} from "./api/customerSession";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage },
    {
      path: "/",
      component: CustomerLayout,
      children: [
        { path: "", redirect: "/home" },
        { path: "home", component: HomePage, meta: { permissions: ["customer.order.read"] } },
        { path: "orders", component: OrdersPage, meta: { permissions: ["customer.order.read"] } },
        { path: "batteries", component: BatteriesPage, meta: { permissions: ["customer.order.read"] } },
        { path: "repair", component: RepairPage, meta: { permissions: ["customer.repair.write"] } },
        { path: "bills", component: BillsPage, meta: { permissions: ["customer.bill.read"] } },
        { path: "receipts", component: ReceiptsPage, meta: { permissions: ["customer.receipt.confirm"] } },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = getCustomerToken();
  const profile = getCustomerProfile();

  if (to.path === "/login") {
    return token && profile ? "/home" : true;
  }
  if (!token || !profile) {
    clearCustomerSession();
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
  }
  if (profile.type !== "CUSTOMER") {
    clearCustomerSession();
    return "/login";
  }

  const permissions = (to.meta.permissions as string[] | undefined) ?? [];
  if (!hasAnyCustomerPermission(permissions)) return "/home";
  return true;
});
