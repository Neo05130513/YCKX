<template>
  <div class="approval-page">
    <aside class="approval-left">
      <div class="tree-panel">
        <el-input v-model="customerKeyword" clearable placeholder="搜索客户/申请人" />
        <div class="customer-tree">
          <button :class="{ active: selectedCustomer === 'all' }" @click="selectedCustomer = 'all'">
            全部对象
          </button>
          <button
            v-for="customer in filteredCustomers"
            :key="customer"
            :class="{ active: selectedCustomer === customer }"
            @click="selectedCustomer = customer"
          >
            {{ customer }}
          </button>
        </div>
      </div>

      <div class="left-line"></div>

      <div class="filter-block">
        <div class="filter-title">
          <span>审批状态</span>
          <div class="scope-tabs">
            <button :class="{ active: ownerScope === 'all' }" @click="ownerScope = 'all'">全部</button>
            <button :class="{ active: ownerScope === 'mine' }" @click="ownerScope = 'mine'">本人</button>
          </div>
        </div>

        <button class="status-group" @click="leftStatus = 'all'">
          <span>全部审批({{ countByStatus("all") }})</span>
          <el-icon><ArrowUp /></el-icon>
        </button>

        <button
          v-for="item in statusFilters"
          :key="item.key"
          class="side-item"
          :class="{ active: leftStatus === item.key }"
          @click="leftStatus = item.key"
        >
          <span class="side-left">
            <el-icon><component :is="item.icon" /></el-icon>
            {{ item.label }}({{ countByStatus(item.key) }})
          </span>
        </button>

        <button class="side-item" :class="{ active: leftStatus === 'overdue' }" @click="leftStatus = 'overdue'">
          <span class="side-left">
            <el-icon><Warning /></el-icon>
            即将超时({{ countByStatus("overdue") }})
          </span>
        </button>
      </div>
    </aside>

    <main class="approval-main">
      <div class="target-tabs">
        <button :class="{ active: activeListTab === 'all' }" @click="activeListTab = 'all'">审批台账</button>
        <button :class="{ active: activeListTab === 'todo' }" @click="activeListTab = 'todo'">待我处理</button>
        <button :class="{ active: activeListTab === 'mine' }" @click="activeListTab = 'mine'">我发起的</button>
        <button :class="{ active: activeListTab === 'draft' }" @click="activeListTab = 'draft'">草稿箱</button>
        <button :class="{ active: activeListTab === 'done' }" @click="activeListTab = 'done'">已办结</button>
      </div>

      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-select v-model="queryField" class="field-select">
            <el-option label="审批单号" value="approvalNo" />
            <el-option label="标题" value="title" />
            <el-option label="业务单号" value="businessNo" />
            <el-option label="申请人" value="applicant" />
          </el-select>
          <el-input v-model="keyword" clearable placeholder="请输入内容">
            <template #append>
              <el-button :icon="Search" @click="noopSearch" />
            </template>
          </el-input>
          <el-select v-model="typeScope" class="type-select">
            <el-option label="全部类型" value="all" />
            <el-option v-for="item in approvalTypes" :key="item.key" :label="item.label" :value="item.key" />
          </el-select>
          <el-button type="primary" @click="resetQuery">重置</el-button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新建审批
          </el-button>
          <el-button @click="exportCsv">导出</el-button>
          <el-dropdown trigger="click" @command="openReserved">
            <el-button>
              批量操作
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="批量催办">批量催办</el-dropdown-item>
                <el-dropdown-item command="批量转办">批量转办</el-dropdown-item>
                <el-dropdown-item command="流程模板配置">流程模板配置</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="approval-summary-line">
        <div>
          <span>审批总数</span>
          <strong>{{ summary.total }}</strong>
        </div>
        <div>
          <span>待处理</span>
          <strong>{{ summary.processing }}</strong>
        </div>
        <div>
          <span>草稿</span>
          <strong>{{ summary.draft }}</strong>
        </div>
        <div class="danger">
          <span>即将超时</span>
          <strong>{{ summary.overdue }}</strong>
        </div>
        <div>
          <span>已通过</span>
          <strong>{{ summary.approved }}</strong>
        </div>
        <div>
          <span>已驳回</span>
          <strong>{{ summary.rejected }}</strong>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredRows"
        border
        height="calc(100% - 136px)"
        class="target-table"
        :row-class-name="tableRowClassName"
        @row-dblclick="openDetail"
      >
        <el-table-column type="selection" width="46" fixed />
        <el-table-column type="index" label="序号" width="62" align="center" fixed />
        <el-table-column prop="approvalNo" label="审批单号" width="140" fixed show-overflow-tooltip />
        <el-table-column label="类型" width="98" align="center">
          <template #default="{ row }">
            <span class="type-tag">{{ row.typeLabel }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="92" align="center">
          <template #default="{ row }">
            <span class="approval-status" :class="statusClass(row.status)">{{ row.statusLabel }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">
            <span class="priority-tag" :class="{ urgent: row.priority === '紧急' }">{{ row.priority }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="审批标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="customerName" label="客户/对象" min-width="150" show-overflow-tooltip />
        <el-table-column prop="businessNo" label="业务单号" width="150" show-overflow-tooltip />
        <el-table-column label="金额" width="108" align="right">
          <template #default="{ row }">{{ money(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="当前节点" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.currentNode }}</span>
            <em class="operator-text">{{ row.currentOperator }}</em>
          </template>
        </el-table-column>
        <el-table-column prop="applicant" label="申请人" width="92" />
        <el-table-column prop="dueAt" label="截止时间" width="150" />
        <el-table-column label="进度" width="130">
          <template #default="{ row }">
            <div class="progress-cell">
              <span>{{ row.approvedNodeCount }}/{{ row.nodeCount }}</span>
              <i><em :style="{ width: `${row.progressPercent}%` }"></em></i>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
            <el-button v-if="row.canSubmit" text type="success" @click.stop="submitDraft(row)">提交</el-button>
            <el-button text type="primary" :disabled="!row.canApprove" @click.stop="quickApprove(row)">通过</el-button>
            <el-button v-if="row.canDelete" text type="danger" @click.stop="deleteApproval(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </main>

    <el-drawer v-model="detailVisible" size="760px" class="approval-drawer" append-to-body>
      <template #header>
        <div class="drawer-title">
          <strong>{{ detail?.approvalNo }}</strong>
          <span v-if="detail" class="approval-status" :class="statusClass(detail.status)">
            {{ detail.statusLabel }}
          </span>
        </div>
      </template>

      <div v-if="detail" class="approval-detail">
        <div class="detail-actions">
          <el-button v-if="detail.canSubmit" type="primary" @click="submitDraft(detail)">
            <el-icon><CircleCheck /></el-icon>
            提交
          </el-button>
          <el-button :disabled="!detail.canApprove" type="primary" @click="openAction('APPROVE')">
            <el-icon><CircleCheck /></el-icon>
            通过
          </el-button>
          <el-button :disabled="!detail.canReject" type="danger" plain @click="openAction('REJECT')">
            <el-icon><Close /></el-icon>
            驳回
          </el-button>
          <el-button :disabled="!detail.canTransfer" @click="openAction('TRANSFER')">
            <el-icon><Switch /></el-icon>
            转办
          </el-button>
          <el-button @click="openAction('COMMENT')">
            <el-icon><ChatLineSquare /></el-icon>
            备注
          </el-button>
          <el-button @click="openAttachmentDialog">
            <el-icon><Document /></el-icon>
            补充附件
          </el-button>
          <el-button :disabled="!detail.canCancel" plain @click="cancelApproval(detail)">
            撤销
          </el-button>
          <el-button :disabled="!detail.canDelete" type="danger" plain @click="deleteApproval(detail)">
            删除
          </el-button>
        </div>

        <section class="detail-panel headline">
          <div>
            <span>{{ detail.typeLabel }}</span>
            <h2>{{ detail.title }}</h2>
            <p>{{ detail.summary }}</p>
          </div>
          <div class="headline-metric">
            <span>涉及金额</span>
            <strong>{{ money(detail.amount) }}</strong>
          </div>
        </section>

        <section class="detail-panel">
          <div class="section-title">
            <strong>基础信息</strong>
          </div>
          <div class="info-grid">
            <div><span>申请人</span><strong>{{ detail.applicant }}</strong></div>
            <div><span>所属部门</span><strong>{{ detail.department }}</strong></div>
            <div><span>客户/对象</span><strong>{{ detail.customerName || "--" }}</strong></div>
            <div><span>业务单号</span><strong>{{ detail.businessNo || "--" }}</strong></div>
            <div><span>当前节点</span><strong>{{ detail.currentNode }}</strong></div>
            <div><span>当前处理人</span><strong>{{ detail.currentOperator || "--" }}</strong></div>
            <div><span>提交时间</span><strong>{{ detail.createdAt }}</strong></div>
            <div><span>截止时间</span><strong :class="{ 'danger-text': detail.overdue }">{{ detail.dueAt || "--" }}</strong></div>
          </div>
        </section>

        <section class="detail-panel">
          <div class="section-title">
            <strong>业务表单</strong>
            <span>{{ detail.attachmentCount }} 个附件</span>
          </div>
          <div class="form-grid">
            <div v-for="item in detail.formItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <div v-if="detail.riskItems?.length" class="risk-list">
            <div v-for="risk in detail.riskItems" :key="risk">
              <el-icon><Warning /></el-icon>
              <span>{{ risk }}</span>
            </div>
          </div>
        </section>

        <section class="detail-panel">
          <div class="section-title">
            <strong>流程节点</strong>
            <span>{{ detail.approvedNodeCount }}/{{ detail.nodeCount }} 已完成</span>
          </div>
          <div class="node-flow">
            <div v-for="(node, index) in detail.nodes" :key="`${node.name}-${index}`" class="node-card" :class="nodeClass(node.status)">
              <span>{{ index + 1 }}</span>
              <strong>{{ node.name }}</strong>
              <em>{{ node.operator }}</em>
              <small>{{ nodeStatusLabel(node.status) }}</small>
              <p>{{ node.remark || node.time || "等待前序节点" }}</p>
            </div>
          </div>
        </section>

        <section class="detail-panel">
          <div class="section-title">
            <strong>流转记录</strong>
          </div>
          <el-timeline class="approval-timeline">
            <el-timeline-item
              v-for="log in detail.logs"
              :key="`${log.time}-${log.operator}-${log.action}`"
              :timestamp="log.time"
              placement="top"
            >
              <div class="timeline-card">
                <div>
                  <strong>{{ log.action }}</strong>
                  <span>{{ log.nodeName }} / {{ log.result }}</span>
                </div>
                <p>{{ log.comment }}</p>
                <em>{{ log.operator }}</em>
              </div>
            </el-timeline-item>
          </el-timeline>
        </section>

        <section class="detail-panel">
          <div class="section-title">
            <strong>附件</strong>
            <el-button size="small" @click="openAttachmentDialog">补充附件</el-button>
          </div>
          <div class="attachment-list">
            <div v-for="file in detail.attachments" :key="file">
              <el-icon><Document /></el-icon>
              <span>{{ file }}</span>
            </div>
            <el-empty v-if="!detail.attachments?.length" description="暂无附件" :image-size="60" />
          </div>
        </section>
      </div>
    </el-drawer>

    <el-dialog v-model="createVisible" title="新建审批" width="960px" class="approval-dialog">
      <el-form label-position="top">
        <div class="dialog-grid">
          <el-form-item label="审批类型">
            <el-select v-model="createForm.type" style="width: 100%" @change="applySelectedTemplate">
              <el-option v-for="item in approvalTypes" :key="item.key" :label="item.label" :value="item.key" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="createForm.priority" style="width: 100%">
              <el-option label="普通" value="普通" />
              <el-option label="紧急" value="紧急" />
            </el-select>
          </el-form-item>
          <el-form-item label="申请人">
            <el-input v-model.trim="createForm.applicant" />
          </el-form-item>
          <el-form-item label="所属部门">
            <el-input v-model.trim="createForm.department" />
          </el-form-item>
          <el-form-item label="业务单号">
            <el-input v-model.trim="createForm.businessNo" />
          </el-form-item>
          <el-form-item label="截止时间">
            <el-input v-model.trim="createForm.dueAt" placeholder="例如 2026-05-20 18:00" />
          </el-form-item>
        </div>

        <section v-if="selectedTemplate" class="template-panel">
          <div class="template-head">
            <div>
              <strong>{{ selectedTemplate.label }}</strong>
              <p>{{ selectedTemplate.source }}</p>
            </div>
            <span>{{ selectedTemplate.nodes.length }} 个流转节点</span>
          </div>

          <div class="flow-preview">
            <span v-for="node in selectedTemplate.nodes" :key="`${selectedTemplate.key}-${node.name}`">
              {{ node.name }}
            </span>
          </div>

          <div class="business-form-grid">
            <el-form-item
              v-for="field in selectedTemplate.fields"
              :key="field.key"
              :label="field.label"
              :required="field.required"
              :class="{ wide: field.span === 2 || field.type === 'textarea' }"
            >
              <el-select
                v-if="field.type === 'select'"
                v-model="formValues[field.key]"
                filterable
                allow-create
                default-first-option
                clearable
                style="width: 100%"
                :placeholder="field.placeholder || '请选择'"
              >
                <el-option v-for="option in field.options || []" :key="option" :label="option" :value="option" />
              </el-select>
              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="formValues[field.key]"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
              <el-date-picker
                v-else-if="field.type === 'date'"
                v-model="formValues[field.key]"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                :placeholder="field.placeholder || '请选择日期'"
              />
              <el-date-picker
                v-else-if="field.type === 'datetime'"
                v-model="formValues[field.key]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 100%"
                :placeholder="field.placeholder || '请选择时间'"
              />
              <el-input
                v-else-if="field.type === 'textarea'"
                v-model.trim="formValues[field.key]"
                type="textarea"
                :rows="field.rows || 3"
                :placeholder="field.placeholder"
              />
              <el-input v-else v-model.trim="formValues[field.key]" :placeholder="field.placeholder" />
            </el-form-item>
          </div>

          <div v-if="selectedTemplate.requiredAttachments?.length" class="attachment-hints">
            <strong>建议附件</strong>
            <span v-for="file in selectedTemplate.requiredAttachments" :key="file">{{ file }}</span>
          </div>
        </section>

        <el-form-item label="审批标题">
          <el-input v-model.trim="createForm.title" />
        </el-form-item>
        <el-form-item label="审批说明">
          <el-input v-model.trim="createForm.summary" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="附件名称">
          <el-input v-model.trim="createForm.attachmentsText" placeholder="多个附件用逗号分隔，例如 合同草稿.docx, 对账单.pdf" />
        </el-form-item>
        <el-form-item label="本地附件">
          <el-upload v-model:file-list="createUploadFileList" multiple :auto-upload="false" :limit="12">
            <el-button>选择文件</el-button>
            <template #tip>
              <span class="upload-tip">本地文件仅记录名称，后续可接入真实对象存储。</span>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button @click="submitCreate(true)">保存草稿</el-button>
        <el-button type="primary" @click="submitCreate(false)">提交审批</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateVisible" title="审批流程模板库" width="980px" class="template-dialog">
      <el-table :data="approvalTemplates" border height="520">
        <el-table-column prop="label" label="流程名称" width="150" fixed />
        <el-table-column prop="source" label="表单来源" min-width="220" show-overflow-tooltip />
        <el-table-column label="表单字段" width="110" align="center">
          <template #default="{ row }">{{ requiredFieldCount(row) }}/{{ row.fields.length }} 必填</template>
        </el-table-column>
        <el-table-column label="节点数" width="86" align="center">
          <template #default="{ row }">{{ row.nodes.length }}</template>
        </el-table-column>
        <el-table-column label="流程节点" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">{{ templateNodeText(row) }}</template>
        </el-table-column>
        <el-table-column label="建议附件" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ templateAttachmentText(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="96" fixed="right" align="center">
          <template #default="{ row }">
            <el-button text type="primary" @click="openCreateWithTemplate(row.key)">发起</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="actionVisible" :title="actionTitle" width="520px">
      <el-form label-position="top">
        <el-form-item v-if="actionForm.action === 'TRANSFER'" label="转办给">
          <el-input v-model.trim="actionForm.nextOperator" placeholder="请输入处理人姓名" />
        </el-form-item>
        <el-form-item label="处理意见">
          <el-input v-model.trim="actionForm.comment" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="处理人">
          <el-input v-model.trim="actionForm.operator" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="attachmentVisible" title="补充附件" width="520px">
      <el-form label-position="top">
        <el-form-item label="附件名称">
          <el-input
            v-model.trim="attachmentForm.attachmentsText"
            type="textarea"
            :rows="3"
            placeholder="多个附件用逗号或换行分隔"
          />
        </el-form-item>
        <el-form-item label="本地附件">
          <el-upload v-model:file-list="appendUploadFileList" multiple :auto-upload="false" :limit="12">
            <el-button>选择文件</el-button>
            <template #tip>
              <span class="upload-tip">当前先保存附件名称，生产环境再替换为真实上传。</span>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model.trim="attachmentForm.operator" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="attachmentVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAppendAttachments">确认补充</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox, type UploadUserFile } from "element-plus";
import {
  ArrowDown,
  ArrowUp,
  ChatLineSquare,
  CircleCheck,
  Clock,
  Close,
  Document,
  Finished,
  Plus,
  Search,
  Switch,
  Warning,
} from "@element-plus/icons-vue";
import { deleteMock, getMock, patchMock, postMock } from "../api/http";
import { approvalTemplates, type ApprovalTemplate } from "./approvalTemplates";

type ApprovalStatus = "DRAFT" | "PROCESSING" | "APPROVED" | "REJECTED" | "CANCELLED";
type NodeStatus = "APPROVED" | "CURRENT" | "PENDING" | "REJECTED";
type ListTab = "all" | "todo" | "mine" | "draft" | "done";
type LeftStatus = "all" | ApprovalStatus | "overdue";
type ActionType = "APPROVE" | "REJECT" | "TRANSFER" | "COMMENT";

interface ApprovalNode {
  name: string;
  operator: string;
  status: NodeStatus;
  time: string;
  remark: string;
}

interface ApprovalLog {
  time: string;
  operator: string;
  action: string;
  nodeName: string;
  result: string;
  comment: string;
}

interface ApprovalRow {
  id: string;
  approvalNo: string;
  type: string;
  typeLabel: string;
  title: string;
  status: ApprovalStatus;
  statusLabel: string;
  applicant: string;
  department: string;
  priority: string;
  businessId?: string;
  businessNo: string;
  customerName: string;
  amount: number;
  currentNode: string;
  currentOperator: string;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  riskItems: string[];
  formItems: Array<{ label: string; value: string }>;
  nodes: ApprovalNode[];
  logs: ApprovalLog[];
  attachments: string[];
  nodeCount: number;
  approvedNodeCount: number;
  progressPercent: number;
  attachmentCount: number;
  overdue: boolean;
  canApprove: boolean;
  canReject: boolean;
  canTransfer: boolean;
  canCancel: boolean;
  canSubmit: boolean;
  canDelete: boolean;
  formValues?: Record<string, any>;
}

const currentUser = "赵财务";
const rows = ref<ApprovalRow[]>([]);
const detail = ref<ApprovalRow | null>(null);
const loading = ref(false);
const detailVisible = ref(false);
const createVisible = ref(false);
const templateVisible = ref(false);
const actionVisible = ref(false);
const attachmentVisible = ref(false);
const activeListTab = ref<ListTab>("all");
const selectedCustomer = ref("all");
const customerKeyword = ref("");
const ownerScope = ref<"all" | "mine">("all");
const leftStatus = ref<LeftStatus>("all");
const typeScope = ref("all");
const queryField = ref<keyof ApprovalRow>("approvalNo");
const keyword = ref("");
const createUploadFileList = ref<UploadUserFile[]>([]);
const appendUploadFileList = ref<UploadUserFile[]>([]);

const createForm = reactive({
  type: "SAMPLE_DELIVERY",
  title: "",
  applicant: "刘销售",
  department: "销售部",
  customerName: "",
  businessNo: "",
  amount: 0,
  priority: "普通",
  dueAt: "2026-05-20 18:00",
  summary: "",
  attachmentsText: "",
});

const actionForm = reactive({
  action: "APPROVE" as ActionType,
  operator: currentUser,
  nextOperator: "",
  comment: "",
});

const attachmentForm = reactive({
  attachmentsText: "",
  operator: currentUser,
});

const approvalTypes = approvalTemplates.map((template) => ({
  key: template.key,
  label: template.label,
}));

const formValues = reactive<Record<string, any>>({});

const selectedTemplate = computed(() => approvalTemplates.find((template) => template.key === createForm.type));

const statusFilters = [
  { key: "DRAFT" as LeftStatus, label: "草稿", icon: Document },
  { key: "PROCESSING" as LeftStatus, label: "审批中", icon: Clock },
  { key: "APPROVED" as LeftStatus, label: "已通过", icon: CircleCheck },
  { key: "REJECTED" as LeftStatus, label: "已驳回", icon: Close },
  { key: "CANCELLED" as LeftStatus, label: "已撤销", icon: Finished },
];

const customers = computed(() => {
  const names = rows.value.flatMap((row) => [row.customerName, row.applicant]).filter(Boolean);
  return Array.from(new Set(names));
});

const filteredCustomers = computed(() => {
  const key = customerKeyword.value.trim();
  if (!key) return customers.value;
  return customers.value.filter((item) => item.includes(key));
});

const filteredRows = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (selectedCustomer.value !== "all" && row.customerName !== selectedCustomer.value && row.applicant !== selectedCustomer.value) return false;
    if (ownerScope.value === "mine" && row.currentOperator !== currentUser && row.applicant !== currentUser) return false;
    if (typeScope.value !== "all" && row.type !== typeScope.value) return false;
    if (!matchesStatus(row, leftStatus.value)) return false;
    if (!matchesListTab(row, activeListTab.value)) return false;
    if (!key) return true;
    return String(row[queryField.value] ?? "").toLowerCase().includes(key);
  });
});

const summary = computed(() => ({
  total: filteredRows.value.length,
  processing: filteredRows.value.filter((row) => row.status === "PROCESSING").length,
  draft: filteredRows.value.filter((row) => row.status === "DRAFT").length,
  overdue: filteredRows.value.filter((row) => row.overdue).length,
  approved: filteredRows.value.filter((row) => row.status === "APPROVED").length,
  rejected: filteredRows.value.filter((row) => row.status === "REJECTED").length,
}));

const actionTitle = computed(() => {
  return (
    {
      APPROVE: "审批通过",
      REJECT: "驳回审批",
      TRANSFER: "转办审批",
      COMMENT: "新增备注",
    }[actionForm.action] ?? "处理审批"
  );
});

function matchesStatus(row: ApprovalRow, filter: LeftStatus) {
  if (filter === "all") return true;
  if (filter === "overdue") return row.overdue;
  return row.status === filter;
}

function matchesListTab(row: ApprovalRow, tab: ListTab) {
  if (tab === "all") return true;
  if (tab === "todo") return row.status === "PROCESSING" && row.currentOperator === currentUser;
  if (tab === "mine") return row.applicant === currentUser;
  if (tab === "draft") return row.status === "DRAFT";
  return ["APPROVED", "REJECTED", "CANCELLED"].includes(row.status);
}

function countByStatus(filter: LeftStatus) {
  return rows.value.filter((row) => {
    if (selectedCustomer.value !== "all" && row.customerName !== selectedCustomer.value && row.applicant !== selectedCustomer.value) return false;
    return matchesStatus(row, filter);
  }).length;
}

function statusClass(status: ApprovalStatus) {
  return {
    draft: status === "DRAFT",
    processing: status === "PROCESSING",
    approved: status === "APPROVED",
    rejected: status === "REJECTED",
    cancelled: status === "CANCELLED",
  };
}

function nodeClass(status: NodeStatus) {
  return {
    approved: status === "APPROVED",
    current: status === "CURRENT",
    rejected: status === "REJECTED",
    pending: status === "PENDING",
  };
}

function nodeStatusLabel(status: NodeStatus) {
  return (
    {
      APPROVED: "已通过",
      CURRENT: "处理中",
      PENDING: "待处理",
      REJECTED: "已驳回",
    }[status] ?? status
  );
}

function tableRowClassName({ row }: { row: ApprovalRow }) {
  if (row.overdue) return "overdue-row";
  if (row.priority === "紧急") return "urgent-row";
  return "";
}

async function loadApprovals() {
  loading.value = true;
  try {
    rows.value = await getMock<ApprovalRow[]>("/approvals");
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: ApprovalRow) {
  detail.value = await getMock<ApprovalRow>(`/approvals/${row.id}`);
  detailVisible.value = true;
}

function replaceRow(updated: ApprovalRow) {
  const index = rows.value.findIndex((row) => row.id === updated.id);
  if (index >= 0) rows.value.splice(index, 1, updated);
  else rows.value.unshift(updated);
}

function resetQuery() {
  keyword.value = "";
  queryField.value = "approvalNo";
  typeScope.value = "all";
  leftStatus.value = "all";
  activeListTab.value = "all";
  selectedCustomer.value = "all";
}

function noopSearch() {
  ElMessage.success("已按当前条件查询");
}

function openReserved(name: string) {
  if (name === "流程模板配置") {
    templateVisible.value = true;
    return;
  }
  ElMessage.info(`${name}已预留入口，后续可接真实流程引擎`);
}

function templateNodeText(template: ApprovalTemplate) {
  return template.nodes.map((node) => node.name).join(" / ");
}

function requiredFieldCount(template: ApprovalTemplate) {
  return template.fields.filter((field) => field.required).length;
}

function templateAttachmentText(template: ApprovalTemplate) {
  return template.requiredAttachments?.length ? template.requiredAttachments.join("、") : "无固定附件要求";
}

function applySelectedTemplate() {
  Object.keys(formValues).forEach((key) => {
    delete formValues[key];
  });
  const template = selectedTemplate.value;
  if (!template) return;
  template.fields.forEach((field) => {
    formValues[field.key] = field.defaultValue ?? "";
  });
  createForm.title = `${template.defaultTitle}-${String(Date.now()).slice(-6)}`;
  createForm.applicant = template.defaultApplicant;
  createForm.department = template.defaultDepartment;
  createForm.customerName = "";
  createForm.businessNo = "";
  createForm.amount = 0;
  createForm.summary = template.defaultSummary;
}

function prepareCreateForm(type = "SAMPLE_DELIVERY") {
  createForm.type = type;
  createForm.priority = "普通";
  createForm.dueAt = "2026-05-20 18:00";
  createForm.attachmentsText = "";
  createUploadFileList.value = [];
  applySelectedTemplate();
}

function openCreate() {
  prepareCreateForm();
  createVisible.value = true;
}

function openCreateWithTemplate(type: string) {
  templateVisible.value = false;
  prepareCreateForm(type);
  createVisible.value = true;
}

function collectAttachmentNames(text: string, files: UploadUserFile[]) {
  const typed = text
    .split(/[,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const uploaded = files.map((file) => file.name).filter(Boolean);
  return Array.from(new Set([...typed, ...uploaded]));
}

async function submitCreate(asDraft = false) {
  const template = selectedTemplate.value;
  if (!template) {
    ElMessage.warning("请选择审批类型");
    return;
  }
  if (!createForm.title.trim() || !createForm.applicant.trim()) {
    ElMessage.warning("请填写审批标题和申请人");
    return;
  }
  const missing = template.fields.filter((field) => field.required && !String(formValues[field.key] ?? "").trim());
  if (!asDraft && missing.length) {
    ElMessage.warning(`请填写：${missing.map((field) => field.label).join("、")}`);
    return;
  }
  const attachments = collectAttachmentNames(createForm.attachmentsText, createUploadFileList.value);
  const getTemplateValue = (key?: string) => (key ? formValues[key] : "");
  const customerName = String(createForm.customerName || getTemplateValue(template.customerField) || "");
  const businessNo = String(createForm.businessNo || getTemplateValue(template.businessNoField) || "");
  const amount = Number(createForm.amount || getTemplateValue(template.amountField) || 0);
  const formItems = template.fields.map((field) => ({
    label: field.label,
    value: String(formValues[field.key] ?? "") || "--",
  }));
  const flowNodes = template.nodes.map((node) => ({
    name: node.name,
    operator: node.operator,
  }));
  const payload = {
    ...createForm,
    typeLabel: template.label,
    customerName,
    businessNo,
    amount,
    summary: createForm.summary || template.defaultSummary,
    formItems,
    flowNodes,
    riskItems: template.riskItems,
    attachments,
    formValues: { ...formValues },
    draft: asDraft,
    status: asDraft ? "DRAFT" : "PROCESSING",
  };
  const created = await postMock<ApprovalRow>("/approvals", payload);
  replaceRow(created);
  createVisible.value = false;
  createUploadFileList.value = [];
  ElMessage.success(asDraft ? "审批草稿已保存" : "审批已提交");
  await openDetail(created);
}

function openAction(action: ActionType) {
  if (!detail.value) return;
  actionForm.action = action;
  actionForm.operator = detail.value.currentOperator || currentUser;
  actionForm.nextOperator = "";
  actionForm.comment =
    action === "APPROVE"
      ? "同意。"
      : action === "REJECT"
        ? "资料不完整，请补充后重新提交。"
        : "";
  actionVisible.value = true;
}

async function submitAction() {
  if (!detail.value) return;
  if (actionForm.action === "TRANSFER" && !actionForm.nextOperator.trim()) {
    ElMessage.warning("请填写转办处理人");
    return;
  }
  const updated = await patchMock<ApprovalRow>(`/approvals/${detail.value.id}/action`, actionForm);
  replaceRow(updated);
  detail.value = updated;
  actionVisible.value = false;
  ElMessage.success("审批处理已保存");
}

async function quickApprove(row: ApprovalRow) {
  const updated = await patchMock<ApprovalRow>(`/approvals/${row.id}/action`, {
    action: "APPROVE",
    operator: row.currentOperator || currentUser,
    comment: "同意。",
  });
  replaceRow(updated);
  ElMessage.success("审批已通过");
}

async function submitDraft(row: ApprovalRow) {
  const updated = await patchMock<ApprovalRow>(`/approvals/${row.id}/action`, {
    action: "SUBMIT",
    operator: row.applicant || currentUser,
    comment: "草稿确认无误，提交进入审批。",
  });
  replaceRow(updated);
  if (detail.value?.id === updated.id) detail.value = updated;
  ElMessage.success("草稿已提交审批");
}

async function cancelApproval(row: ApprovalRow) {
  try {
    await ElMessageBox.confirm(`确认撤销“${row.title}”？撤销后流程将停止流转。`, "撤销审批", {
      type: "warning",
      confirmButtonText: "撤销",
      cancelButtonText: "取消",
    });
  } catch (error) {
    return;
  }
  const updated = await patchMock<ApprovalRow>(`/approvals/${row.id}/action`, {
    action: "CANCEL",
    operator: row.applicant || currentUser,
    comment: "申请人撤销审批。",
  });
  replaceRow(updated);
  if (detail.value?.id === updated.id) detail.value = updated;
  ElMessage.success("审批已撤销");
}

async function deleteApproval(row: ApprovalRow) {
  try {
    await ElMessageBox.confirm(`确认删除“${row.title}”？该操作只用于草稿、撤销或驳回单据清理。`, "删除审批", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch (error) {
    return;
  }
  await deleteMock<{ id: string; approvalNo: string; deleted: boolean }>(`/approvals/${row.id}`);
  rows.value = rows.value.filter((item) => item.id !== row.id);
  if (detail.value?.id === row.id) {
    detailVisible.value = false;
    detail.value = null;
  }
  ElMessage.success("审批已删除");
}

function openAttachmentDialog() {
  if (!detail.value) return;
  attachmentForm.attachmentsText = "";
  attachmentForm.operator = detail.value.currentOperator || currentUser;
  appendUploadFileList.value = [];
  attachmentVisible.value = true;
}

async function submitAppendAttachments() {
  if (!detail.value) return;
  const attachments = collectAttachmentNames(attachmentForm.attachmentsText, appendUploadFileList.value);
  if (!attachments.length) {
    ElMessage.warning("请填写或选择附件");
    return;
  }
  const updated = await patchMock<ApprovalRow>(`/approvals/${detail.value.id}/attachments`, {
    attachments,
    operator: attachmentForm.operator || currentUser,
  });
  replaceRow(updated);
  detail.value = updated;
  attachmentVisible.value = false;
  ElMessage.success("附件已补充");
}

function money(value: number) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function exportCsv() {
  const headers = ["审批单号", "类型", "状态", "标题", "客户/对象", "业务单号", "金额", "当前节点", "当前处理人", "申请人"];
  const body = filteredRows.value.map((row) => [
    row.approvalNo,
    row.typeLabel,
    row.statusLabel,
    row.title,
    row.customerName,
    row.businessNo,
    row.amount,
    row.currentNode,
    row.currentOperator,
    row.applicant,
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map((item) => `"${String(item ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `OA审批_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(loadApprovals);
</script>

<style scoped>
.approval-page {
  display: flex;
  height: calc(100vh - 56px);
  min-height: 720px;
  overflow: hidden;
  color: #20243d;
  background: #f4f5f7;
}

.approval-left {
  width: 206px;
  flex: 0 0 206px;
  padding: 10px 10px 16px;
  border-right: 1px solid #e7eaf2;
  background: #fff;
}

.tree-panel {
  height: 218px;
  padding: 10px;
  border: 1px solid #e1e5ee;
  border-radius: 8px;
}

.customer-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 156px;
  margin-top: 8px;
  overflow-y: auto;
}

.customer-tree button,
.side-item,
.status-group,
.target-tabs button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.customer-tree button {
  min-height: 25px;
  padding: 0 10px;
  overflow: hidden;
  border-radius: 5px;
  color: #3b4059;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-tree button.active,
.customer-tree button:hover {
  color: #fff;
  background: #4d5cff;
}

.left-line {
  height: 1px;
  margin: 22px 0;
  background: #e8ebf2;
}

.filter-title,
.status-group,
.side-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-title {
  margin-bottom: 10px;
  color: #263047;
  font-size: 13px;
}

.scope-tabs {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid #c5eed2;
  border-radius: 4px;
}

.scope-tabs button {
  height: 22px;
  padding: 0 9px;
  color: #49b56b;
  border: 0;
  background: #fff;
  font-size: 12px;
}

.scope-tabs button.active {
  color: #fff;
  background: #58c878;
}

.status-group {
  width: 100%;
  height: 31px;
  padding: 0 12px;
  color: #fff;
  border-radius: 6px;
  background: #4d5cff;
}

.side-item {
  width: 100%;
  height: 32px;
  margin-top: 4px;
  padding: 0 12px;
  color: #2f3650;
  border-radius: 6px;
}

.side-item:hover,
.side-item.active {
  color: #4d5cff;
  background: #eef1ff;
}

.side-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.approval-main {
  flex: 1;
  min-width: 0;
  padding: 0 12px 12px;
  background: #fff;
}

.target-tabs {
  height: 41px;
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #e6e9f2;
}

.target-tabs button {
  height: 40px;
  color: #20243d;
  border-bottom: 2px solid transparent;
  font-size: 14px;
}

.target-tabs button.active {
  color: #3455ff;
  border-color: #3455ff;
  font-weight: 600;
}

.list-toolbar {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbar-left {
  flex: 1;
}

.field-select {
  width: 112px;
  flex: 0 0 112px;
}

.type-select {
  width: 136px;
  flex: 0 0 136px;
}

.toolbar-left :deep(.el-input) {
  max-width: 280px;
}

.approval-summary-line {
  display: grid;
  grid-template-columns: repeat(6, minmax(108px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.approval-summary-line div {
  height: 50px;
  padding: 8px 12px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.approval-summary-line span {
  display: block;
  color: #7c8398;
  font-size: 12px;
}

.approval-summary-line strong {
  display: block;
  margin-top: 2px;
  color: #3455ff;
  font-size: 20px;
}

.approval-summary-line .danger strong,
.danger-text {
  color: #ff4d6d;
}

.target-table {
  width: 100%;
}

.target-table :deep(th.el-table__cell) {
  color: #687086;
  background: #f8f9fc;
  font-weight: 500;
}

.target-table :deep(.overdue-row td) {
  background: #fff8f8;
}

.target-table :deep(.urgent-row td) {
  background: #fffbf3;
}

.approval-status,
.type-tag,
.priority-tag {
  min-width: 54px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.approval-status.processing {
  color: #3554ff;
  background: #eef1ff;
}

.approval-status.approved {
  color: #25a45a;
  background: #e9f8ef;
}

.approval-status.rejected {
  color: #ff385c;
  background: #fff1f3;
}

.approval-status.cancelled,
.approval-status.draft {
  color: #7d8493;
  background: #f1f2f5;
}

.type-tag {
  color: #2671c9;
  background: #eef7ff;
}

.priority-tag {
  color: #2fa760;
  background: #edf8f2;
}

.priority-tag.urgent {
  color: #d88418;
  background: #fff7e8;
}

.operator-text {
  display: block;
  margin-top: 2px;
  color: #7c8398;
  font-size: 12px;
  font-style: normal;
}

.progress-cell span {
  display: inline-block;
  width: 36px;
  color: #23253c;
  font-size: 12px;
}

.progress-cell i {
  position: relative;
  width: 72px;
  height: 6px;
  display: inline-block;
  overflow: hidden;
  border-radius: 6px;
  background: #edf0f4;
  vertical-align: middle;
}

.progress-cell em {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 6px;
  background: #4d5cff;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title strong {
  color: #20243d;
  font-size: 18px;
}

.approval-detail {
  display: grid;
  gap: 14px;
}

.detail-actions {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  gap: 8px;
  padding-bottom: 10px;
  background: #fff;
}

.detail-panel {
  padding: 16px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fff;
}

.headline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: 16px;
  background: #fbfcff;
}

.headline span,
.headline-metric span,
.info-grid span,
.form-grid span,
.section-title span {
  color: #7c8398;
  font-size: 12px;
}

.headline h2 {
  margin: 6px 0;
  color: #20243d;
  font-size: 20px;
}

.headline p {
  margin: 0;
  color: #3d455c;
  line-height: 1.7;
}

.headline-metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px;
  border-radius: 8px;
  background: #eef1ff;
}

.headline-metric strong {
  margin-top: 8px;
  color: #3455ff;
  font-size: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title strong {
  font-size: 16px;
}

.info-grid,
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.info-grid div,
.form-grid div {
  min-height: 58px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8f9fc;
}

.info-grid strong,
.form-grid strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #222842;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.risk-list div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 8px 10px;
  color: #8a5a00;
  border: 1px solid #ffe5aa;
  border-radius: 8px;
  background: #fffaf0;
}

.node-flow {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.node-card {
  min-height: 132px;
  padding: 12px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.node-card span {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #858ca0;
  border-radius: 50%;
  background: #edf0f6;
}

.node-card strong,
.node-card em,
.node-card small,
.node-card p {
  display: block;
}

.node-card strong {
  margin-top: 10px;
  color: #20243d;
}

.node-card em {
  margin-top: 4px;
  color: #4d556f;
  font-style: normal;
}

.node-card small {
  margin-top: 6px;
  color: #7c8398;
}

.node-card p {
  min-height: 34px;
  margin: 8px 0 0;
  overflow: hidden;
  color: #6b7287;
  font-size: 12px;
  line-height: 1.5;
}

.node-card.approved span {
  color: #fff;
  background: #25a45a;
}

.node-card.current {
  border-color: #9dabff;
  background: #f5f7ff;
}

.node-card.current span {
  color: #fff;
  background: #4d5cff;
}

.node-card.rejected {
  border-color: #ffbcc8;
  background: #fff7f8;
}

.node-card.rejected span {
  color: #fff;
  background: #ff4d6d;
}

.approval-timeline {
  padding: 6px 8px 0;
}

.timeline-card {
  padding: 12px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.timeline-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-card span {
  color: #3455ff;
}

.timeline-card p {
  margin: 8px 0;
  color: #30364d;
}

.timeline-card em {
  color: #778096;
  font-style: normal;
}

.attachment-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.attachment-list div {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  overflow: hidden;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.attachment-list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.template-panel {
  margin: 2px 0 18px;
  padding: 14px;
  border: 1px solid #e2e6f0;
  border-radius: 8px;
  background: #fbfcff;
}

.template-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.template-head strong {
  color: #20243d;
  font-size: 16px;
}

.template-head p {
  margin: 5px 0 0;
  color: #687087;
  line-height: 1.6;
}

.template-head > span {
  flex: 0 0 auto;
  padding: 4px 10px;
  color: #3455ff;
  border: 1px solid #d7ddff;
  border-radius: 999px;
  background: #f4f6ff;
}

.flow-preview {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  overflow-x: auto;
}

.flow-preview span {
  position: relative;
  flex: 0 0 auto;
  padding: 6px 10px;
  color: #3d455c;
  border: 1px solid #dde3ee;
  border-radius: 999px;
  background: #fff;
}

.flow-preview span + span::before {
  content: "";
  position: absolute;
  left: -9px;
  top: 50%;
  width: 8px;
  height: 1px;
  background: #b9c1d2;
}

.business-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.business-form-grid .wide {
  grid-column: 1 / -1;
}

.attachment-hints {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px dashed #dce2ee;
}

.attachment-hints strong {
  color: #3d455c;
}

.attachment-hints span {
  padding: 4px 8px;
  color: #687087;
  border: 1px solid #e3e8f2;
  border-radius: 999px;
  background: #fff;
}

.upload-tip {
  display: inline-block;
  margin-top: 6px;
  color: #7c8398;
  font-size: 12px;
}

.template-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

@media (max-width: 1180px) {
  .approval-page {
    height: auto;
    min-height: calc(100vh - 70px);
    flex-direction: column;
    overflow: visible;
  }

  .approval-left {
    width: 100%;
    flex-basis: auto;
  }

  .approval-main {
    min-height: 720px;
  }

  .approval-summary-line {
    grid-template-columns: repeat(3, minmax(118px, 1fr));
  }
}
</style>
