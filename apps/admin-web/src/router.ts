import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "./layouts/AdminLayout.vue";
import DashboardPage from "./pages/DashboardPage.vue";
import DevicesPage from "./pages/DevicesPage.vue";
import OrdersPage from "./pages/OrdersPage.vue";
import AssetsPage from "./pages/AssetsPage.vue";
import RepairsPage from "./pages/RepairsPage.vue";
import BillsPage from "./pages/BillsPage.vue";
import AlarmsPage from "./pages/AlarmsPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";
import ApprovalsPage from "./pages/ApprovalsPage.vue";
import HelpDocsPage from "./pages/HelpDocsPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import {
  clearAdminSession,
  getAdminProfile,
  getAdminToken,
  hasAnyAdminPermission,
} from "./api/session";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage },
    {
      path: "/",
      component: AdminLayout,
      children: [
        { path: "", redirect: "/dashboard" },
        { path: "dashboard", component: DashboardPage },
        {
          path: "devices",
          component: DevicesPage,
          meta: { permissions: ["asset.write", "alarm.write"] },
        },
        { path: "alarms", component: AlarmsPage, meta: { permissions: ["alarm.write"] } },
        {
          path: "orders",
          component: OrdersPage,
          meta: { permissions: ["order.write", "contract.read"] },
        },
        {
          path: "assets",
          component: AssetsPage,
          meta: {
            permissions: [
              "asset.write",
              "asset.outbound",
              "asset.repair_inbound",
              "asset.dispose",
            ],
          },
        },
        { path: "repairs", component: RepairsPage, meta: { permissions: ["repair.write"] } },
        {
          path: "bills",
          component: BillsPage,
          meta: {
            permissions: ["bill.confirm", "bill.payment", "bill.adjust", "bill.read"],
          },
        },
        {
          path: "approvals",
          component: ApprovalsPage,
          meta: {
            permissions: [
              "order.write",
              "asset.write",
              "repair.write",
              "bill.confirm",
              "system.role.write",
            ],
          },
        },
        {
          path: "settings",
          component: SettingsPage,
          meta: {
            permissions: [
              "system.account.write",
              "system.role.write",
              "system.interface.write",
              "audit.read",
            ],
          },
        },
        { path: "help", component: HelpDocsPage },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = getAdminToken();
  const profile = getAdminProfile();

  if (to.path === "/login") {
    return token && profile ? "/dashboard" : true;
  }

  if (!token || !profile) {
    clearAdminSession();
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
  }
  if (profile.type !== "INTERNAL") {
    clearAdminSession();
    return "/login";
  }

  const permissions = (to.meta.permissions as string[] | undefined) ?? [];
  if (!hasAnyAdminPermission(permissions)) return "/dashboard";
  return true;
});
