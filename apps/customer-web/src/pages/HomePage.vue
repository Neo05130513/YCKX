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
}

const home = ref<CustomerHome>();
const canViewAmount = computed(() => home.value?.canViewAmount !== false);

function money(value: number) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

onMounted(async () => {
  home.value = await getMock<CustomerHome>(getCustomerHomePath());
});
</script>

<style scoped>
.quick-grid.staff {
  grid-template-columns: repeat(3, 1fr);
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
</style>
