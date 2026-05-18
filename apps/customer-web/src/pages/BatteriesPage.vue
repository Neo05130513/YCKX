<template>
  <div>
    <div class="page-header">
      <h1>我的电池</h1>
      <p>仅展示本客户订单下的电池</p>
    </div>
    <div v-for="item in home?.batteries" :key="item.id" class="card">
      <strong>{{ item.btCode }}</strong>
      <p>{{ item.model }} · {{ item.sourcePlatform }}</p>
      <van-cell title="电量" :value="`${item.powerPercent}%`" /><van-cell
        title="位置"
        :value="item.location"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";
const home = ref<any>();
onMounted(async () => {
  home.value = await getMock(getCustomerHomePath());
});
</script>
