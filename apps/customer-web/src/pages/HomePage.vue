<template>
  <div>
    <div class="page-header">
      <h1>{{ home?.customerName }}</h1>
      <p>{{ canViewAmount ? "订单、电池、账单与报修服务" : "订单、电池与报修服务" }}</p>
    </div>

    <div class="card quick-grid" :class="{ staff: !canViewAmount }">
      <RouterLink class="quick" to="/repair">扫码报修</RouterLink>
      <RouterLink class="quick" to="/receipts">确认收货</RouterLink>
      <RouterLink v-if="canViewAmount" class="quick" to="/bills">查看账单</RouterLink>
      <RouterLink v-else class="quick" to="/orders">查看订单</RouterLink>
    </div>

    <div class="card todo-board">
      <RouterLink v-for="item in todoCards" :key="item.label" class="todo-card" :class="item.tone" :to="item.to">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.hint }}</em>
      </RouterLink>
    </div>

    <div v-if="canViewAmount" class="card amount-card">
      <div>
        <span class="muted">当前欠款</span>
        <strong>{{ money(home?.debtAmount ?? 0) }}</strong>
      </div>
      <em v-if="home?.overdueAmount">逾期 {{ money(home.overdueAmount) }}</em>
      <em v-else>暂无逾期</em>
    </div>
    <div v-else class="card permission-card">
      <strong>当前账号不展示金额</strong>
      <p>客户员工账号仅开放订单、电池、收货和报修信息。</p>
    </div>

    <div class="card recent-card">
      <div class="card-head">
        <strong>最近订单</strong>
        <RouterLink to="/orders">全部</RouterLink>
      </div>
      <div v-if="!recentOrders.length" class="empty-line">暂无订单</div>
      <RouterLink v-for="item in recentOrders" :key="item.id" class="recent-order" to="/orders">
        <div>
          <strong>{{ item.orderNo }}</strong>
          <span>{{ item.contractName || item.customerName }}</span>
        </div>
        <em>{{ statusLabel(item.status) }}</em>
      </RouterLink>
    </div>

    <div class="card">
      <van-cell title="租赁订单" :value="home?.orderCount" />
      <van-cell title="绑定电池" :value="home?.batteryCount" />
      <van-cell title="待确认收货" :value="home?.pendingReceiptCount" />
      <van-cell title="报修中" :value="home?.repairingCount" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";

interface CustomerHome {
  customerName: string;
  canViewAmount: boolean;
  debtAmount: number;
  overdueAmount: number;
  orderCount: number;
  batteryCount: number;
  pendingReceiptCount: number;
  repairingCount: number;
  orders?: Array<{
    id: string;
    orderNo: string;
    contractName?: string;
    customerName: string;
    status: string;
    debtAmount?: number;
    pendingReceiptCount?: number;
    updatedAt?: string;
  }>;
  outbounds?: Array<{ id: string; status: string }>;
  bills?: Array<{ id: string; status: string; debtAmount: number }>;
  repairs?: Array<{ id: string; status: string }>;
}

const home = ref<CustomerHome>();
const canViewAmount = computed(() => home.value?.canViewAmount !== false);
const pendingOutbounds = computed(() =>
  (home.value?.outbounds ?? []).filter((item) => item.status === "PENDING_RECEIPT"),
);
const unpaidBills = computed(() =>
  (home.value?.bills ?? []).filter((item) => ["PENDING_PAYMENT", "PARTIALLY_PAID", "OVERDUE"].includes(item.status)),
);
const activeRepairs = computed(() =>
  (home.value?.repairs ?? []).filter((item) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(item.status)),
);
const recentOrders = computed(() => (home.value?.orders ?? []).slice(0, 3));
const todoCards = computed(() => [
  {
    label: "待收货",
    value: pendingOutbounds.value.length,
    hint: "核对 BT 码后确认",
    to: "/receipts",
    tone: pendingOutbounds.value.length ? "warning" : "success",
  },
  {
    label: "进行中报修",
    value: activeRepairs.value.length || home.value?.repairingCount || 0,
    hint: "查看处理进度",
    to: "/repair",
    tone: activeRepairs.value.length ? "warning" : "success",
  },
  {
    label: canViewAmount.value ? "待付款账单" : "租赁订单",
    value: canViewAmount.value ? unpaidBills.value.length : home.value?.orderCount || 0,
    hint: canViewAmount.value ? "可提交付款凭证" : "查看履约状态",
    to: canViewAmount.value ? "/bills" : "/orders",
    tone: canViewAmount.value && unpaidBills.value.length ? "danger" : "primary",
  },
]);

function money(value: number) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function statusLabel(status: string) {
  return (
    {
      DRAFT: "草稿",
      APPROVING: "会签中",
      PENDING_OUTBOUND: "待出库",
      PARTIALLY_OUTBOUND: "部分出库",
      PENDING_RECEIPT: "待收货",
      LEASING: "租赁中",
      RETURNING: "退租结算",
      COMPLETED: "已完成",
      CANCELLED: "已取消",
    }[status] || status
  );
}

onMounted(async () => {
  home.value = await getMock<CustomerHome>(getCustomerHomePath());
});
</script>

<style scoped>
.quick-grid.staff {
  grid-template-columns: repeat(3, 1fr);
}

.todo-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.todo-card {
  min-width: 0;
  display: grid;
  gap: 4px;
  border-radius: 12px;
  padding: 10px;
  color: #1f2937;
  background: #f8fafc;
}

.todo-card span,
.todo-card em {
  overflow: hidden;
  color: #6b7280;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-card strong {
  font-size: 22px;
  line-height: 26px;
}

.todo-card.warning strong {
  color: var(--warning);
}

.todo-card.danger strong {
  color: var(--danger);
}

.todo-card.success strong {
  color: var(--success);
}

.todo-card.primary strong {
  color: var(--primary);
}

.amount-card {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.amount-card strong {
  display: block;
  margin-top: 4px;
  color: var(--danger);
  font-size: 28px;
  line-height: 34px;
}

.amount-card em {
  padding: 5px 9px;
  border-radius: 999px;
  color: #b91c1c;
  background: #fef2f2;
  font-style: normal;
  font-size: 12px;
}

.permission-card strong {
  display: block;
  margin-bottom: 6px;
}

.permission-card p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card-head a {
  color: var(--primary);
  font-size: 13px;
}

.empty-line {
  color: #6b7280;
  font-size: 13px;
}

.recent-order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid #eef2f7;
  color: inherit;
}

.recent-order div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.recent-order span {
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-order em {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--primary);
  background: #eff6ff;
  font-size: 12px;
  font-style: normal;
}
</style>
