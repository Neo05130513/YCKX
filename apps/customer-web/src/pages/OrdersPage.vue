<template>
  <div>
    <div class="page-header">
      <h1>租赁订单</h1>
      <p>查看订单进度、确认收货和账单状态</p>
    </div>

    <div v-if="!orders.length" class="card empty-card">暂无租赁订单</div>

    <article v-for="item in orders" :key="item.id" class="card order-card">
      <header class="order-title">
        <div>
          <strong>{{ item.orderNo }}</strong>
          <p>{{ item.contractName || item.customerName }}</p>
        </div>
        <span class="status" :class="statusClass(item)">{{ statusLabel(item.status) }}</span>
      </header>

      <div class="progress-row">
        <span>出库进度</span>
        <strong>{{ item.outboundCount }}/{{ item.orderedBatteryCount }}</strong>
      </div>
      <div class="progress-track">
        <i :style="{ width: `${progressPercent(item)}%` }"></i>
      </div>

      <div class="order-grid">
        <div>
          <span>租期</span>
          <strong>{{ item.leaseStart }} 至 {{ item.leaseEnd }}</strong>
        </div>
        <div>
          <span>月租</span>
          <strong>{{ money(item.monthlyRent) }}</strong>
        </div>
        <div>
          <span>待收货</span>
          <strong>{{ item.pendingReceiptCount }}</strong>
        </div>
        <div>
          <span>欠款</span>
          <strong :class="{ danger: item.debtAmount > 0 }">{{ money(item.debtAmount) }}</strong>
        </div>
      </div>

      <div v-if="lifecycleNotice(item)" class="order-notice" :class="{ danger: item.status === 'RETURNING' }">
        {{ lifecycleNotice(item) }}
      </div>

      <div v-if="outboundsByOrder(item.id).length" class="section-block">
        <h3>出库单</h3>
        <div v-for="outbound in outboundsByOrder(item.id)" :key="outbound.id" class="sub-row">
          <div>
            <strong>{{ outbound.outboundNo }}</strong>
            <p>{{ outbound.btCodes?.join("、") }}</p>
          </div>
          <button v-if="outbound.status === 'PENDING_RECEIPT'" @click="confirmReceipt(outbound.id)">确认收货</button>
          <em v-else>{{ outboundStatusLabel(outbound.status) }}</em>
        </div>
      </div>

      <div v-if="billsByOrder(item.orderNo).length" class="section-block">
        <h3>账单</h3>
        <div v-for="bill in billsByOrder(item.orderNo)" :key="bill.id" class="sub-row">
          <div>
            <strong>{{ bill.period }} {{ bill.statusLabel || billStatusLabel(bill.status) }}</strong>
            <p>到期日 {{ bill.dueDate || "--" }}</p>
          </div>
          <em :class="{ danger: bill.debtAmount > 0 }">{{ money(bill.debtAmount) }}</em>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { showSuccessToast } from "vant";
import { getMock, patchMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";

type OrderRow = {
  id: string;
  orderNo: string;
  customerName: string;
  contractName?: string;
  status: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  orderedBatteryCount: number;
  outboundCount: number;
  pendingReceiptCount: number;
  debtAmount: number;
  contractStatus?: string;
  renewalCount?: number;
  renewalDesc?: string;
  returnedAt?: string;
  returnWarehouse?: string;
  returnSettlementAt?: string;
  returnSettlementAmount?: number;
};

type OutboundRow = {
  id: string;
  orderId: string;
  outboundNo: string;
  status: string;
  btCodes?: string[];
};

type BillRow = {
  id: string;
  orderNo: string;
  period: string;
  status: string;
  statusLabel?: string;
  debtAmount: number;
  dueDate?: string;
};

type CustomerHome = {
  orders: OrderRow[];
  outbounds: OutboundRow[];
  bills: BillRow[];
};

const home = ref<CustomerHome>();
const orders = computed(() => home.value?.orders ?? []);

function outboundsByOrder(orderId: string) {
  return (home.value?.outbounds ?? []).filter((item) => item.orderId === orderId);
}

function billsByOrder(orderNo: string) {
  return (home.value?.bills ?? []).filter((item) => item.orderNo === orderNo);
}

function progressPercent(row: OrderRow) {
  if (!row.orderedBatteryCount) return 0;
  return Math.min(100, Math.round((row.outboundCount / row.orderedBatteryCount) * 100));
}

function money(value?: number) {
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

function statusClass(row: OrderRow) {
  if (row.debtAmount > 0) return "danger";
  if (row.status === "CANCELLED") return "danger";
  if (row.status === "RETURNING") return "warning";
  if (["LEASING", "COMPLETED"].includes(row.status)) return "success";
  return "";
}

function lifecycleNotice(row: OrderRow) {
  if (row.status === "RETURNING") {
    return `资产已退回${row.returnWarehouse ? `至${row.returnWarehouse}` : ""}，当前待结清欠款 ${money(row.debtAmount)}。`;
  }
  if (row.renewalDesc) return row.renewalDesc;
  if (row.contractStatus === "续租待归档") return "续租已生效，签署版补充合同待归档。";
  if (row.status === "COMPLETED" && row.returnSettlementAt) {
    return `退租结算已完成，结清金额 ${money(row.returnSettlementAmount)}。`;
  }
  if (row.status === "COMPLETED" && row.returnedAt) return "退租资产已退回，订单已完成。";
  return "";
}

function outboundStatusLabel(status: string) {
  return (
    {
      PENDING_RECEIPT: "待收货",
      RECEIVED: "已收货",
      AUTO_RECEIVED: "自动收货",
    }[status] || status
  );
}

function billStatusLabel(status: string) {
  return (
    {
      PENDING_PAYMENT: "待付款",
      PARTIALLY_PAID: "部分回款",
      SETTLED: "已结清",
      OVERDUE: "已逾期",
    }[status] || status
  );
}

async function load() {
  home.value = await getMock<CustomerHome>(getCustomerHomePath());
}

async function confirmReceipt(id: string) {
  await patchMock(`/customer/outbounds/${id}/receipt`);
  showSuccessToast("已确认收货");
  await load();
}

onMounted(load);
</script>

<style scoped>
.order-card {
  padding-bottom: 10px;
}

.order-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.order-title strong {
  font-size: 16px;
}

.order-title p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  margin: 14px 0 8px;
  color: #6b7280;
  font-size: 13px;
}

.progress-row strong {
  color: #111827;
}

.progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}

.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.order-grid span {
  display: block;
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
}

.order-grid strong {
  font-size: 13px;
}

.section-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
}

.order-notice {
  margin-top: 12px;
  padding: 9px 10px;
  border-radius: 8px;
  color: #1d4ed8;
  background: #eff6ff;
  font-size: 12px;
  line-height: 1.5;
}

.order-notice.danger {
  color: #c2410c;
  background: #fff7ed;
}

.status.warning {
  color: var(--warning);
  background: #fff7ed;
}

.section-block h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
}

.sub-row p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.sub-row button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  color: #fff;
  background: var(--primary);
}

.sub-row em {
  flex: 0 0 auto;
  color: #6b7280;
  font-style: normal;
  font-size: 13px;
}

.empty-card {
  color: #6b7280;
  text-align: center;
}

.danger {
  color: var(--danger);
}
</style>
