<template>
  <div class="admin-shell">
    <header class="lna-navbar">
      <div class="leftPanel">
        <RouterLink class="logo_wrap" to="/dashboard" aria-label="延成科讯首页">
          <span class="logo_img">延</span>
          <span class="logo_line"></span>
          <span class="logo_title">延成科讯大数据平台</span>
        </RouterLink>
        <nav class="topNav_wrap" aria-label="后台主导航">
          <RouterLink
            v-for="item in menu"
            :key="item.path"
            class="topNav_parent"
            :to="item.path"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>
      <div class="rightPanel">
        <RouterLink class="help_panel" to="/help" aria-label="打开帮助文档">
          <el-icon><QuestionFilled /></el-icon>
          <span>帮助文档</span>
        </RouterLink>
        <div class="avatar-wrapper">
          <span class="user-avatar">{{ profile?.name?.slice(0, 1) || "管" }}</span>
          <span class="user-name">{{ profile?.name || "系统管理员" }}</span>
          <span class="user-role">{{ profile?.roleName || "系统管理员" }}</span>
          <el-icon><CaretBottom /></el-icon>
        </div>
        <button class="logout-btn" type="button" @click="logout">退出</button>
      </div>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  Bell,
  CaretBottom,
  Coin,
  DataAnalysis,
  House,
  Monitor,
  Operation,
  QuestionFilled,
  Setting,
  Tickets,
  Tools,
} from "@element-plus/icons-vue";
import { computed } from "vue";
import { useRouter } from "vue-router";
import {
  clearAdminSession,
  getAdminProfile,
  hasAnyAdminPermission,
} from "../api/session";

const router = useRouter();
const profile = computed(() => getAdminProfile());

const allMenu = [
  { label: "首页", path: "/dashboard", icon: House },
  { label: "设备管理", path: "/devices", icon: Monitor, permissions: ["asset.write", "alarm.write"] },
  { label: "告警管理", path: "/alarms", icon: Bell, permissions: ["alarm.write"] },
  { label: "租赁订单", path: "/orders", icon: Tickets, permissions: ["order.write", "contract.read"] },
  {
    label: "固定资产",
    path: "/assets",
    icon: Coin,
    permissions: ["asset.write", "asset.outbound", "asset.repair_inbound", "asset.dispose"],
  },
  { label: "售后报修", path: "/repairs", icon: Tools, permissions: ["repair.write"] },
  {
    label: "财务管理",
    path: "/bills",
    icon: DataAnalysis,
    permissions: ["bill.confirm", "bill.payment", "bill.adjust", "bill.read"],
  },
  {
    label: "OA审批",
    path: "/approvals",
    icon: Operation,
    permissions: ["order.write", "asset.write", "repair.write", "bill.confirm", "system.role.write"],
  },
  {
    label: "系统管理",
    path: "/settings",
    icon: Setting,
    permissions: ["system.account.write", "system.role.write", "system.interface.write", "audit.read"],
  },
];

const menu = computed(() =>
  allMenu.filter((item) => hasAnyAdminPermission(item.permissions ?? [])),
);

async function logout() {
  clearAdminSession();
  await router.replace("/login");
}
</script>
