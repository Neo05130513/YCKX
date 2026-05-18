<template>
  <div>
    <div class="page-header">
      <h1>待确认收货</h1>
      <p>7天内未操作将自动确认收货</p>
    </div>
    <div v-for="item in pendingOutbounds" :key="item.id" class="card">
      <strong>{{ item.outboundNo }}</strong>
      <p>出库时间：{{ item.outboundAt }}</p>
      <p class="muted">BT码：{{ item.btCodes.join("、") }}</p>
      <van-button block type="primary" @click="confirm(item.id)"
        >确认整张出库单收货</van-button
      >
    </div>
    <div v-if="!pendingOutbounds.length" class="card muted">暂无待确认收货的出库单</div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { showSuccessToast } from "vant";
import { getMock, patchMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";
const home = ref<any>();
const pendingOutbounds = computed(() =>
  (home.value?.outbounds ?? []).filter((item: any) => item.status === "PENDING_RECEIPT"),
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
