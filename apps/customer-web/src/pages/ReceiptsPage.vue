<template>
  <div>
    <div class="page-header">
      <h1>待确认收货</h1>
      <p>出库 7 天内未确认将按规则自动收货</p>
    </div>

    <div class="card receipt-summary">
      <div>
        <span>待确认</span>
        <strong>{{ pendingOutbounds.length }}</strong>
      </div>
      <div>
        <span>已确认</span>
        <strong>{{ receivedCount }}</strong>
      </div>
    </div>

    <div class="card receipt-guide">
      <strong>收货确认规则</strong>
      <p>核对出库单、BT 码、收货地址无误后确认；超出自动收货日仍未处理的出库单会按系统参数自动完成。</p>
    </div>

    <div v-if="!pendingOutbounds.length" class="card muted">暂无待确认收货的出库单</div>

    <article v-for="item in pendingOutbounds" :key="item.id" class="card receipt-card">
      <header>
        <div>
          <strong>{{ item.outboundNo }}</strong>
          <p>{{ item.customerName || home?.customerName }}</p>
        </div>
        <span class="status warning">待收货</span>
      </header>
      <van-cell title="出库时间" :value="item.outboundAt" />
      <van-cell title="自动收货日" :value="item.autoReceiveAt || '出库后 7 天'" />
      <van-cell title="收货人" :value="item.receiver || '客户联系人'" />
      <van-cell title="收货地址" :value="item.address || '客户现场'" />
      <div class="bt-list">
        <span v-for="code in item.btCodes" :key="code">{{ code }}</span>
      </div>
      <van-button block type="primary" @click="confirm(item.id)">确认整张出库单收货</van-button>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { showSuccessToast } from "vant";
import { getMock, patchMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";

type OutboundRow = {
  id: string;
  outboundNo: string;
  status: string;
  outboundAt: string;
  autoReceiveAt?: string;
  receiver?: string;
  address?: string;
  customerName?: string;
  btCodes: string[];
};

const home = ref<{ customerName?: string; outbounds?: OutboundRow[] }>();
const pendingOutbounds = computed(() =>
  (home.value?.outbounds ?? []).filter((item) => item.status === "PENDING_RECEIPT"),
);
const receivedCount = computed(() =>
  (home.value?.outbounds ?? []).filter((item) => item.status !== "PENDING_RECEIPT").length,
);

async function load() {
  home.value = await getMock(getCustomerHomePath());
}

async function confirm(id: string) {
  await patchMock(`/customer/outbounds/${id}/receipt`);
  showSuccessToast("已确认收货");
  await load();
}

onMounted(load);
</script>

<style scoped>
.receipt-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.receipt-summary span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.receipt-summary strong {
  display: block;
  margin-top: 4px;
  font-size: 22px;
}

.receipt-guide strong {
  display: block;
  margin-bottom: 6px;
}

.receipt-guide p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.receipt-card header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.receipt-card p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.bt-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 12px;
}

.bt-list span {
  border-radius: 999px;
  padding: 5px 8px;
  color: #1f2937;
  background: #eef2f7;
  font-size: 12px;
}
</style>
