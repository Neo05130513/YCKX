<template>
  <div class="mobile-shell">
    <main class="mobile-content"><RouterView /></main>
    <van-tabbar route>
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/orders" icon="orders-o">订单</van-tabbar-item>
      <van-tabbar-item to="/batteries" icon="cluster-o">电池</van-tabbar-item>
      <van-tabbar-item v-if="canConfirmReceipt" to="/receipts" icon="todo-list-o">收货</van-tabbar-item>
      <van-tabbar-item to="/repair" icon="scan">报修</van-tabbar-item>
      <van-tabbar-item v-if="canViewAmount" to="/bills" icon="balance-o">账单</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { hasCustomerPermission } from "../api/customerSession";

const canViewAmount = computed(() => hasCustomerPermission("customer.bill.read"));
const canConfirmReceipt = computed(() => hasCustomerPermission("customer.receipt.confirm"));
</script>
