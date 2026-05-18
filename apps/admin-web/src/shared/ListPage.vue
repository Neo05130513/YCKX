<template>
  <div>
    <div class="page-title">
      <div>
        <h1>{{ title }}</h1>
        <p>统一查询、筛选和查看业务数据</p>
      </div>
      <div class="page-actions">
        <el-button>刷新</el-button>
        <el-button type="primary">新增</el-button>
      </div>
    </div>
    <div class="card">
      <div class="toolbar">
        <el-input placeholder="搜索关键字" clearable /><el-select
          placeholder="状态筛选"
          clearable
        /><el-button>查询</el-button>
      </div>
      <el-table :data="rows" stripe
        ><el-table-column
          v-for="key in keys"
          :key="key"
          :prop="key"
          :label="labelOf(key)"
      /></el-table>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getMock } from "../api/http";
const props = defineProps<{ title: string; api: string }>();
const rows = ref<Record<string, unknown>[]>([]);
const keys = computed(() => Object.keys(rows.value[0] ?? {}).slice(0, 7));
const labelMap: Record<string, string> = {
  id: "ID",
  btCode: "BT码",
  model: "型号",
  sourcePlatform: "来源平台",
  runningStatus: "运行状态",
  assetStatus: "资产状态",
  powerPercent: "电量",
  location: "位置",
  updatedAt: "更新时间",
  billNo: "账单号",
  customerName: "客户",
  orderNo: "订单号",
  period: "账期",
  receivableAmount: "应收金额",
  paidAmount: "已收金额",
  debtAmount: "欠款金额",
  status: "状态",
  generatedAt: "生成时间",
  repairNo: "报修单号",
  source: "来源",
  description: "故障描述",
  address: "地址",
  createdAt: "创建时间",
  level: "等级",
  type: "类型",
};
function labelOf(key: string) {
  return labelMap[key] ?? key;
}
onMounted(async () => {
  rows.value = await getMock<Record<string, unknown>[]>(props.api);
});
</script>
