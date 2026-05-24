<template>
  <div>
    <div class="page-header">
      <h1>我的电池</h1>
      <p>仅展示本客户订单下的电池</p>
    </div>

    <div class="card battery-summary">
      <div>
        <span>绑定电池</span>
        <strong>{{ batteries.length }}</strong>
      </div>
      <div>
        <span>运行异常</span>
        <strong>{{ abnormalCount }}</strong>
      </div>
      <div>
        <span>维修中</span>
        <strong>{{ repairingCount }}</strong>
      </div>
    </div>

    <div class="card filter-row">
      <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
      <button :class="{ active: filter === 'online' }" @click="filter = 'online'">在线</button>
      <button :class="{ active: filter === 'warning' }" @click="filter = 'warning'">异常</button>
      <button :class="{ active: filter === 'repair' }" @click="filter = 'repair'">维修</button>
    </div>

    <div v-if="!filteredBatteries.length" class="card muted">暂无匹配电池</div>

    <article v-for="item in filteredBatteries" :key="item.id" class="card battery-card">
      <header>
        <div>
          <strong>{{ item.btCode }}</strong>
          <p>{{ item.model || "未填写型号" }} · {{ item.sourcePlatform || "平台数据待同步" }}</p>
        </div>
        <span class="status" :class="statusClass(item)">{{ runningLabel(item.runningStatus) }}</span>
      </header>
      <van-cell title="电量" :value="powerText(item.powerPercent)" />
      <van-cell title="位置" :value="item.location || item.warehouse || '待同步'" />
      <van-cell title="资产状态" :value="assetLabel(item.assetStatus)" />
      <van-cell title="订单" :value="item.orderNo || '未绑定订单'" />
      <RouterLink class="repair-link" :to="`/repair?btCode=${encodeURIComponent(item.btCode)}`">
        提交报修
      </RouterLink>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";

type BatteryRow = {
  id: string;
  btCode: string;
  model?: string;
  sourcePlatform?: string;
  runningStatus?: string;
  assetStatus?: string;
  powerPercent?: number;
  location?: string;
  warehouse?: string;
  orderNo?: string;
};

const home = ref<{ batteries?: BatteryRow[] }>();
const filter = ref<"all" | "online" | "warning" | "repair">("all");

const batteries = computed(() => home.value?.batteries ?? []);
const abnormalCount = computed(
  () => batteries.value.filter((item) => ["ABNORMAL", "OFFLINE"].includes(item.runningStatus || "")).length,
);
const repairingCount = computed(
  () => batteries.value.filter((item) => item.assetStatus === "REPAIRING").length,
);
const filteredBatteries = computed(() =>
  batteries.value.filter((item) => {
    if (filter.value === "online") return item.runningStatus === "ONLINE";
    if (filter.value === "warning") return ["ABNORMAL", "OFFLINE"].includes(item.runningStatus || "");
    if (filter.value === "repair") return item.assetStatus === "REPAIRING";
    return true;
  }),
);

function runningLabel(status?: string) {
  return (
    {
      ONLINE: "在线",
      OFFLINE: "离线",
      ABNORMAL: "异常",
      UNKNOWN: "未知",
    }[status || ""] || "未知"
  );
}

function assetLabel(status?: string) {
  return (
    {
      IN_STOCK: "在库",
      LEASING: "租赁中",
      REPAIRING: "维修中",
      SCRAPPED: "已报废",
      BOUGHT_OUT: "已买断",
    }[status || ""] || "未同步"
  );
}

function statusClass(item: BatteryRow) {
  return {
    success: item.runningStatus === "ONLINE",
    danger: ["ABNORMAL", "OFFLINE"].includes(item.runningStatus || ""),
  };
}

function powerText(value?: number) {
  return Number.isFinite(Number(value)) ? `${Number(value)}%` : "待同步";
}

onMounted(async () => {
  home.value = await getMock(getCustomerHomePath());
});
</script>

<style scoped>
.battery-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.battery-summary span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.battery-summary strong {
  display: block;
  margin-top: 4px;
  font-size: 20px;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.filter-row button,
.repair-link {
  border: 0;
  border-radius: 8px;
  padding: 9px 8px;
  color: #374151;
  background: #eef2f7;
  text-align: center;
  text-decoration: none;
}

.filter-row button.active,
.repair-link {
  color: #fff;
  background: var(--primary);
}

.battery-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.battery-card header p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.repair-link {
  display: block;
  margin-top: 10px;
}
</style>
