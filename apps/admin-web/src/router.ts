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
        { path: "devices", component: DevicesPage },
        { path: "alarms", component: AlarmsPage },
        { path: "orders", component: OrdersPage },
        { path: "assets", component: AssetsPage },
        { path: "repairs", component: RepairsPage },
        { path: "bills", component: BillsPage },
        { path: "approvals", component: ApprovalsPage },
        { path: "settings", component: SettingsPage },
        { path: "help", component: HelpDocsPage },
      ],
    },
  ],
});
