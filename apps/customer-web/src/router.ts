import { createRouter, createWebHistory } from "vue-router";
import CustomerLayout from "./layouts/CustomerLayout.vue";
import LoginPage from "./pages/LoginPage.vue";
import HomePage from "./pages/HomePage.vue";
import OrdersPage from "./pages/OrdersPage.vue";
import BatteriesPage from "./pages/BatteriesPage.vue";
import RepairPage from "./pages/RepairPage.vue";
import BillsPage from "./pages/BillsPage.vue";
import ReceiptsPage from "./pages/ReceiptsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage },
    {
      path: "/",
      component: CustomerLayout,
      children: [
        { path: "", redirect: "/home" },
        { path: "home", component: HomePage },
        { path: "orders", component: OrdersPage },
        { path: "batteries", component: BatteriesPage },
        { path: "repair", component: RepairPage },
        { path: "bills", component: BillsPage },
        { path: "receipts", component: ReceiptsPage },
      ],
    },
  ],
});
