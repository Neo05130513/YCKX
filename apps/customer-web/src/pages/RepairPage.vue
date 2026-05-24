<template>
  <div>
    <div class="page-header">
      <h1>售后报修</h1>
      <p>扫描二维码或输入 BT 码提交报修，并跟踪维修进度</p>
    </div>

    <div class="card">
      <div class="scan-row">
        <van-field v-model="form.btCode" label="BT码" placeholder="扫描或输入BT码" />
        <van-button size="small" type="primary" plain @click="scanMock">扫码</van-button>
      </div>
      <van-field
        v-model="form.description"
        label="故障描述"
        type="textarea"
        rows="3"
        placeholder="请描述故障现象"
      />
      <van-field v-model="form.address" label="地址" placeholder="填写电池所在地址" />
      <div class="upload-title">故障图片</div>
      <van-uploader v-model="files" :max-count="3" />
      <van-button block type="primary" class="submit-btn" @click="submit">提交报修</van-button>
    </div>

    <div class="section-title">
      <span>报修进度</span>
      <em>{{ repairs.length }} 单</em>
    </div>
    <van-empty v-if="!repairs.length" description="暂无报修记录" />
    <div v-for="item in repairs" :key="item.id" class="card repair-card">
      <div class="repair-head">
        <strong>{{ item.repairNo }}</strong>
        <span class="status" :class="statusTone(item)">
          {{ repairStatusLabel(item.status, item.customerConfirmed) }}
        </span>
      </div>
      <p>{{ item.description }}</p>
      <div class="repair-meta">
        <span>{{ item.btCode }}</span>
        <span>{{ item.handler || "待分配" }}</span>
        <span>{{ item.latestLogAt || item.createdAt }}</span>
      </div>
      <div class="progress-bar">
        <span
          v-for="node in progressNodes(item.status, item.customerConfirmed)"
          :key="node.label"
          :class="{ done: node.done }"
        >
          {{ node.label }}
        </span>
      </div>
      <van-cell title="最新进展" :value="item.latestLog || '已提交报修'" />
      <van-cell v-if="item.servicePromise" title="服务承诺" :value="item.slaRemainingText || item.servicePromise" />
      <van-cell title="图片数量" :value="`${item.imageCount ?? item.images?.length ?? 0} 张`" />
      <div class="repair-actions">
        <van-button size="small" plain type="primary" @click="openRepairDetail(item)">详情</van-button>
        <van-button
          size="small"
          plain
          type="primary"
          :disabled="item.status === 'CLOSED'"
          @click="openSupplementDialog(item)"
        >
          补充资料
        </van-button>
        <van-button
          v-if="item.canCustomerConfirm"
          size="small"
          type="success"
          @click="confirmRepair(item)"
        >
          确认完成
        </van-button>
      </div>
    </div>

    <van-popup v-model:show="detailVisible" position="bottom" round :style="{ height: '82%' }">
      <div v-if="selectedRepair" class="repair-detail">
        <div class="popup-head">
          <div>
            <strong>{{ selectedRepair.repairNo }}</strong>
            <span>{{ selectedRepair.btCode }}</span>
          </div>
          <van-button size="small" plain @click="detailVisible = false">关闭</van-button>
        </div>
        <div class="detail-status">
          <span class="status" :class="statusTone(selectedRepair)">
            {{ repairStatusLabel(selectedRepair.status, selectedRepair.customerConfirmed) }}
          </span>
          <em>{{ selectedRepair.faultType }}</em>
        </div>
        <p class="detail-desc">{{ selectedRepair.description }}</p>

        <div class="detail-grid">
          <div>
            <span>处理组</span>
            <strong>{{ selectedRepair.handler || "待分配" }}</strong>
          </div>
          <div>
            <span>技术人员</span>
            <strong>{{ selectedRepair.technician || "待分配" }}</strong>
          </div>
          <div>
            <span>预计完成</span>
            <strong>{{ selectedRepair.expectedFinishAt || "--" }}</strong>
          </div>
          <div>
            <span>SLA状态</span>
            <strong>{{ selectedRepair.slaStatusLabel || "--" }}</strong>
          </div>
          <div>
            <span>服务承诺</span>
            <strong>{{ selectedRepair.slaRemainingText || selectedRepair.servicePromise || "--" }}</strong>
          </div>
          <div>
            <span>客户确认</span>
            <strong>{{ selectedRepair.customerConfirmed ? "已确认" : "待确认" }}</strong>
          </div>
        </div>

        <van-divider>处理记录</van-divider>
        <div class="log-list">
          <div v-for="log in selectedRepair.logs || []" :key="`${log.time}-${log.action}`" class="log-item">
            <div>
              <strong>{{ log.action }}</strong>
              <span>{{ log.time }}</span>
            </div>
            <p>{{ log.result }}</p>
            <em>{{ log.operator }}：{{ log.remark || "无备注" }}</em>
          </div>
        </div>

        <van-divider>图片资料</van-divider>
        <div class="image-chips">
          <span v-for="(image, index) in selectedRepair.images || []" :key="fileKey(image, index)">
            <a v-if="fileHref(image)" :href="fileHref(image)" target="_blank" rel="noreferrer">
              {{ fileLabel(image) }}
            </a>
            <template v-else>{{ fileLabel(image) }}</template>
          </span>
          <span v-if="!selectedRepair.images?.length">暂无图片</span>
        </div>

        <div class="detail-footer">
          <van-button block plain type="primary" @click="openSupplementDialog(selectedRepair)">补充资料</van-button>
          <van-button
            v-if="selectedRepair.canCustomerConfirm"
            block
            type="success"
            @click="confirmRepair(selectedRepair)"
          >
            确认完成
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="supplementVisible" position="bottom" round :style="{ height: '54%' }">
      <div class="supplement-panel">
        <div class="popup-head">
          <div>
            <strong>补充资料</strong>
            <span>{{ selectedRepair?.repairNo }}</span>
          </div>
          <van-button size="small" plain @click="supplementVisible = false">关闭</van-button>
        </div>
        <van-field
          v-model="supplementForm.message"
          label="说明"
          type="textarea"
          rows="4"
          placeholder="补充故障现象、联系方式、现场处理情况等"
        />
        <div class="upload-title">补充图片</div>
        <van-uploader v-model="supplementFiles" :max-count="3" />
        <van-button block type="primary" class="submit-btn" @click="submitSupplement">提交补充</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { showConfirmDialog, showFailToast, showSuccessToast } from "vant";
import {
  getMock,
  mockFileUrl,
  patchMock,
  postMock,
  uploadMockFiles,
  type MockUploadedFile,
  type MockUploadResult,
} from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";

type RepairStatus =
  | "PENDING_ACCEPT"
  | "PROCESSING"
  | "REPAIRING"
  | "PENDING_INBOUND"
  | "COMPLETED"
  | "CLOSED";
type FileRef = string | MockUploadedFile | Record<string, any>;

interface RepairLog {
  time: string;
  operator: string;
  action: string;
  status: string;
  result: string;
  remark: string;
}

interface RepairRow {
  id: string;
  repairNo: string;
  btCode: string;
  status: RepairStatus;
  priority?: string;
  description: string;
  faultType?: string;
  createdAt: string;
  latestLog?: string;
  latestLogAt?: string;
  handler?: string;
  technician?: string;
  expectedFinishAt?: string;
  slaDueAt?: string;
  slaStatus?: string;
  slaStatusLabel?: string;
  slaRemainingText?: string;
  servicePromise?: string;
  customerConfirmed?: boolean;
  customerConfirmedAt?: string;
  canCustomerConfirm?: boolean;
  images?: FileRef[];
  imageCount?: number;
  logs?: RepairLog[];
}

const home = ref<{ repairs?: RepairRow[]; batteries?: Array<{ btCode: string }> }>();
const route = useRoute();
const files = ref<any[]>([]);
const supplementFiles = ref<any[]>([]);
const selectedRepair = ref<RepairRow | null>(null);
const detailVisible = ref(false);
const supplementVisible = ref(false);
const form = reactive({ btCode: "", description: "", address: "" });
const supplementForm = reactive({ message: "" });

const repairs = computed(() => home.value?.repairs ?? []);

async function loadHome() {
  home.value = await getMock(getCustomerHomePath());
  const btCode = String(route.query.btCode || "").trim();
  if (btCode && !form.btCode) form.btCode = btCode;
}

function scanMock() {
  const firstBattery = home.value?.batteries?.[0];
  if (!firstBattery) {
    showFailToast("暂无可报修电池");
    return;
  }
  form.btCode = firstBattery.btCode;
  showSuccessToast("已识别BT码");
}

function rawFiles(list: any[]) {
  return list.map((item) => item.file).filter((file): file is File => Boolean(file));
}

async function uploadRepairFiles(list: any[], businessId: string) {
  const uploadFiles = rawFiles(list);
  if (!uploadFiles.length) return [];
  const result = await uploadMockFiles<MockUploadResult>("/files", uploadFiles, {
    category: "repair",
    businessType: "CUSTOMER_REPAIR",
    businessId,
    operator: "客户移动端",
  });
  return result.files;
}

function fileEntry(file: FileRef) {
  return file && typeof file === "object" ? (file as Record<string, any>) : null;
}

function fileLabel(file: FileRef) {
  const entry = fileEntry(file);
  return String(entry?.name || entry?.fileName || file || "附件");
}

function fileHref(file: FileRef) {
  const entry = fileEntry(file);
  return mockFileUrl(String(entry?.fileUrl || entry?.url || ""));
}

function fileKey(file: FileRef, index: number) {
  const entry = fileEntry(file);
  return String(entry?.id || entry?.fileUrl || entry?.name || file || index);
}

function syncRepair(updated: RepairRow) {
  if (!home.value) return;
  const current = home.value.repairs ?? [];
  const index = current.findIndex((item) => item.id === updated.id);
  if (index >= 0) {
    current[index] = { ...current[index], ...updated };
    home.value.repairs = [...current];
  } else {
    home.value.repairs = [updated, ...current];
  }
  if (selectedRepair.value?.id === updated.id) {
    selectedRepair.value = updated;
  }
}

async function submit() {
  if (!form.btCode || !form.description || !form.address) {
    showFailToast("请填写BT码、故障描述和地址");
    return;
  }
  if (files.value.length === 0) {
    showFailToast("请上传故障图片");
    return;
  }
  try {
    const uploadedFiles = await uploadRepairFiles(files.value, form.btCode);
    const created = await postMock<RepairRow>("/customer/repair", {
      ...form,
      images: uploadedFiles,
    });
    showSuccessToast("报修已提交");
    syncRepair(created);
    form.btCode = "";
    form.description = "";
    form.address = "";
    files.value = [];
  } catch (e: any) {
    showFailToast(e?.response?.data?.message ?? "提交失败");
  }
}

async function openRepairDetail(item: RepairRow) {
  selectedRepair.value = await getMock<RepairRow>(`/customer/repairs/${item.id}`);
  detailVisible.value = true;
}

async function openSupplementDialog(item: RepairRow) {
  selectedRepair.value = await getMock<RepairRow>(`/customer/repairs/${item.id}`);
  supplementForm.message = "";
  supplementFiles.value = [];
  supplementVisible.value = true;
}

async function submitSupplement() {
  if (!selectedRepair.value) return;
  if (!supplementForm.message.trim() && supplementFiles.value.length === 0) {
    showFailToast("请填写说明或上传图片");
    return;
  }
  try {
    const uploadedFiles = await uploadRepairFiles(
      supplementFiles.value,
      selectedRepair.value.id,
    );
    const updated = await postMock<RepairRow>(`/customer/repairs/${selectedRepair.value.id}/supplements`, {
      message: supplementForm.message,
      images: uploadedFiles,
    });
    syncRepair(updated);
    supplementVisible.value = false;
    showSuccessToast("补充资料已提交");
  } catch (e: any) {
    showFailToast(e?.response?.data?.message ?? "提交失败");
  }
}

async function confirmRepair(item: RepairRow) {
  try {
    await showConfirmDialog({
      title: "确认维修完成",
      message: "确认后后台会记录客户确认时间，工单进入完整闭环。",
    });
  } catch {
    return;
  }
  try {
    const updated = await patchMock<RepairRow>(`/customer/repairs/${item.id}/confirm`, {
      remark: "客户确认维修结果正常。",
    });
    syncRepair(updated);
    showSuccessToast("已确认完成");
  } catch (e: any) {
    showFailToast(e?.response?.data?.message ?? "确认失败");
  }
}

function repairStatusLabel(status: RepairStatus, confirmed?: boolean) {
  if (status === "COMPLETED" && !confirmed) return "待确认";
  return (
    {
      PENDING_ACCEPT: "待受理",
      PROCESSING: "处理中",
      REPAIRING: "维修中",
      PENDING_INBOUND: "待入库",
      COMPLETED: "已完成",
      CLOSED: "已关闭",
    }[status] ?? status
  );
}

function statusTone(item: RepairRow) {
  return {
    danger: item.slaStatus === "OVERDUE" || item.status === "PENDING_ACCEPT" || item.canCustomerConfirm,
    success: item.status === "COMPLETED" && item.customerConfirmed,
  };
}

function progressNodes(status: RepairStatus, confirmed?: boolean) {
  return [
    { label: "提交", done: true },
    { label: "受理", done: status !== "PENDING_ACCEPT" },
    {
      label: "维修",
      done: ["REPAIRING", "PENDING_INBOUND", "COMPLETED", "CLOSED"].includes(status),
    },
    { label: "入库", done: ["COMPLETED", "CLOSED"].includes(status) },
    { label: "确认", done: status === "CLOSED" || Boolean(confirmed) },
  ];
}

onMounted(loadHome);
</script>

<style scoped>
.scan-row {
  display: grid;
  grid-template-columns: 1fr 72px;
  align-items: center;
  gap: 8px;
}

.upload-title,
.section-title {
  margin: 12px 0 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 700;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title em {
  color: #6b7280;
  font-style: normal;
  font-weight: 500;
}

.submit-btn {
  margin-top: 14px;
}

.repair-card p,
.detail-desc {
  margin: 8px 0 10px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

.repair-head,
.popup-head,
.detail-status,
.log-item div,
.repair-actions,
.detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.repair-head strong,
.popup-head strong {
  font-size: 15px;
}

.popup-head span,
.detail-status em,
.log-item span,
.log-item em {
  display: block;
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}

.repair-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.repair-meta span {
  padding: 3px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 12px;
}

.progress-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  margin: 10px 0;
}

.progress-bar span {
  height: 24px;
  border-radius: 4px;
  background: #eef2f7;
  color: #6b7280;
  font-size: 12px;
  line-height: 24px;
  text-align: center;
}

.progress-bar span.done {
  background: #e8f3ff;
  color: #1677ff;
  font-weight: 600;
}

.repair-actions {
  justify-content: flex-end;
  margin-top: 10px;
}

.repair-detail,
.supplement-panel {
  height: 100%;
  padding: 16px;
  overflow: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.detail-grid div {
  min-height: 62px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}

.detail-grid span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.detail-grid strong {
  display: block;
  margin-top: 4px;
  color: #111827;
  font-size: 14px;
}

.log-list {
  display: grid;
  gap: 8px;
}

.log-item {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.log-item p {
  margin: 6px 0;
  color: #374151;
  font-size: 13px;
  line-height: 1.5;
}

.image-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-chips span {
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3346a3;
  font-size: 12px;
}

.image-chips a {
  color: inherit;
  text-decoration: none;
}

.detail-footer {
  flex-direction: column;
  margin: 16px 0 8px;
}
</style>
