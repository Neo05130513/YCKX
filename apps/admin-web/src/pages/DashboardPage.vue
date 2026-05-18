<template>
  <div class="lna-dashboard">
    <section class="dash-body">
      <div class="d-l">
        <div class="card overview-card">
          <div class="c-title">
            <span class="c-icon"></span>
            设备总览
            <span class="c-right">今日</span>
          </div>
          <div class="overview-grid">
            <div class="overview-item">
              <span>设备总数</span>
              <strong>{{ data.batteryTotal ?? 0 }}</strong>
            </div>
            <div class="overview-item green">
              <span>在线设备</span>
              <strong>{{ data.leasingCount ?? 0 }}</strong>
            </div>
            <div class="overview-item orange">
              <span>离线设备</span>
              <strong>{{ data.inStockCount ?? 0 }}</strong>
            </div>
            <div class="overview-item red">
              <span>重要告警</span>
              <strong>{{ data.severeAlarmCount ?? 0 }}</strong>
            </div>
          </div>
        </div>

        <div class="card statistic-card">
          <div class="c-title">
            <span class="c-icon"></span>
            设备统计
          </div>
          <div class="stat-body">
            <div class="gauge">
              <span>{{ onlineRate }}%</span>
              <em>在线率</em>
            </div>
            <div class="row-flex">
              <div class="dev-line">
                电池 <span>{{ data.batteryTotal ?? 0 }}</span>
              </div>
              <div class="dev-line">
                租赁中 <span>{{ data.leasingCount ?? 0 }}</span>
              </div>
              <div class="dev-line">
                维修中 <span>{{ data.repairingCount ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="d-c">
        <div class="map card">
          <div class="c-title">
            <span class="c-icon"></span>
            设备分布
            <span class="c-right">返回根节点</span>
          </div>
          <div class="map-panel">
            <span class="map-dot dot-a"></span>
            <span class="map-dot dot-b"></span>
            <span class="map-dot dot-c"></span>
            <div class="map-label">河南区域</div>
          </div>
        </div>

        <div class="d-c-b">
          <div class="card left">
            <div class="c-title">
              <span class="c-icon"></span>
              客户设备TOP5
            </div>
            <div class="line-container">
              <div v-for="item in topCustomers" :key="item.name" class="cus-item">
                <div class="cus-t">
                  <span>{{ item.name }}</span>
                  <em>{{ item.count }}</em>
                </div>
                <div class="cus-line">
                  <span class="line-item" :style="{ width: `${item.rate}%` }"></span>
                </div>
              </div>
            </div>
          </div>
          <div class="card right">
            <div class="c-title">
              <span class="c-icon"></span>
              运营统计
            </div>
            <div class="operation-stats">
              <div>
                <strong>{{ data.pendingOutboundCount ?? 0 }}</strong>
                <span>待出库</span>
              </div>
              <div>
                <strong>{{ data.pendingRepairCount ?? 0 }}</strong>
                <span>待报修</span>
              </div>
              <div>
                <strong>{{ data.pendingApprovalCount ?? 0 }}</strong>
                <span>待审批</span>
              </div>
              <div>
                <strong>{{ data.overdueAmount ?? 0 }}</strong>
                <span>逾期金额</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="d-r">
        <div class="treeCard">全部机构</div>
        <div class="card d-r-i">
          <div class="c-title">
            <span class="c-icon"></span>
            最新重要告警
          </div>
          <div class="alarm-scroll">
            <div v-for="item in alarmRows" :key="item.code" class="scroll-top">
              <span class="cursor">{{ item.code }}</span>
              <span>{{ item.customer }}</span>
              <span>{{ item.type }}</span>
              <span>{{ item.time }}</span>
            </div>
          </div>
        </div>
        <div class="card notice-card">
          <div class="c-title">
            <span class="c-icon"></span>
            通知公告
          </div>
          <div class="note-line" v-for="item in notices" :key="item.title">
            <div :class="item.type === '通知' ? 'tag-g' : 'tag-r'">
              {{ item.type }}
            </div>
            <div class="note-body">{{ item.title }}</div>
            <div class="note-time">{{ item.time }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getMock } from "../api/http";

const data = ref<Record<string, number>>({});

const onlineRate = computed(() => {
  const total = data.value.batteryTotal || 0;
  if (!total) return 0;
  return Math.round(((data.value.leasingCount || 0) / total) * 100);
});

const topCustomers = [
  { name: "河南示例物流有限公司", count: 312, rate: 96 },
  { name: "郑州测试配送有限公司", count: 188, rate: 72 },
  { name: "高新区城配车队", count: 146, rate: 58 },
  { name: "经开区换电站", count: 96, rate: 42 },
  { name: "总仓备用资产", count: 64, rate: 28 },
];

const alarmRows = [
  {
    code: "BT202605170002",
    customer: "河南示例物流",
    type: "低电量",
    time: "2026-05-17 09:30",
  },
  {
    code: "BT202605170008",
    customer: "郑州测试配送",
    type: "离线",
    time: "2026-05-17 09:12",
  },
  {
    code: "BT202605170021",
    customer: "高新区城配",
    type: "温度异常",
    time: "2026-05-17 08:45",
  },
];

const notices = [
  { type: "通知", title: "设备续费与停用规则已更新", time: "2026-05-17" },
  { type: "公告", title: "第三方平台数据同步维护窗口", time: "2026-05-16" },
  { type: "通知", title: "新增批量导入设备字段校验", time: "2026-05-15" },
];

onMounted(async () => {
  data.value = await getMock<Record<string, number>>("/dashboard");
});
</script>
