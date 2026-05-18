<template>
  <div class="bill-page">
    <div class="page-header">
      <h1>账单明细</h1>
      <p>{{ home?.customerName }} · 已确认账单</p>
    </div>

    <div v-if="!canViewAmount" class="card permission-card">
      <strong>当前账号无金额权限</strong>
      <p>客户员工账号不展示账单金额、欠款、已付和逾期信息。</p>
    </div>

    <template v-else>
      <section class="summary-card">
        <div>
          <span>当前欠款</span>
          <strong>{{ money(home?.debtAmount ?? 0) }}</strong>
        </div>
        <em v-if="home?.overdueAmount">逾期 {{ money(home.overdueAmount) }}</em>
        <em v-else>暂无逾期</em>
      </section>

      <div class="summary-grid">
        <div>
          <span>待付款</span>
          <strong>{{ unpaidBills.length }}</strong>
        </div>
        <div>
          <span>已结清</span>
          <strong>{{ settledBills.length }}</strong>
        </div>
        <div>
          <span>账单数</span>
          <strong>{{ bills.length }}</strong>
        </div>
      </div>

      <div v-if="!bills.length" class="card empty-card">
        <strong>暂无已确认账单</strong>
        <p class="muted">财务确认后会在这里展示。</p>
      </div>

      <article v-for="item in bills" :key="item.id" class="bill-card" :class="statusClass(item.status)">
        <header>
          <div>
            <strong>{{ item.period }} 账期</strong>
            <span>{{ item.billNo }}</span>
          </div>
          <span class="status" :class="statusClass(item.status)">{{ item.statusLabel || statusLabel(item.status) }}</span>
        </header>

        <div class="amount-grid">
          <div>
            <span>应收</span>
            <strong>{{ money(item.receivableAmount) }}</strong>
          </div>
          <div>
            <span>已付</span>
            <strong>{{ money(item.paidAmount) }}</strong>
          </div>
          <div>
            <span>欠款</span>
            <strong>{{ money(item.debtAmount) }}</strong>
          </div>
        </div>

        <van-cell title="订单号" :value="item.orderNo" />
        <van-cell title="最晚付款日" :value="item.dueDate" />
        <van-cell v-if="item.daysOverdue" title="逾期天数" :value="`${item.daysOverdue} 天`" />
        <van-cell v-if="item.collectionAction" title="跟进建议" :value="item.collectionAction" />
        <van-cell v-if="item.adjustReason" title="调整说明" :value="item.adjustReason" />

        <div v-if="item.paymentVouchers?.length" class="voucher-list">
          <div v-for="voucher in item.paymentVouchers" :key="voucher.id" class="voucher-line">
            <div>
              <strong>{{ money(voucher.amount) }}</strong>
              <span>{{ voucher.voucherNo || "付款凭证" }} · {{ voucher.paidAt || voucher.uploadedAt }}</span>
            </div>
            <em :class="voucher.status.toLowerCase()">{{ voucherStatusLabel(voucher.status) }}</em>
          </div>
        </div>

        <div v-if="item.payments?.length" class="payment-list">
          <div v-for="payment in item.payments" :key="payment.paymentNo" class="payment-line">
            <div>
              <strong>{{ money(payment.amount) }}</strong>
              <span>{{ payment.method }} · {{ payment.paidAt }}</span>
            </div>
            <em>{{ payment.remark || "已登记回款" }}</em>
          </div>
        </div>

        <button v-if="item.debtAmount > 0" class="voucher-btn" @click="openVoucherDialog(item)">提交付款凭证</button>
      </article>

      <div v-if="voucherVisible" class="voucher-mask">
        <section class="voucher-dialog">
          <header>
            <strong>提交付款凭证</strong>
            <button @click="voucherVisible = false">×</button>
          </header>
          <label>
            凭证金额
            <input v-model.number="voucherForm.amount" type="number" min="1" />
          </label>
          <label>
            付款时间
            <input v-model="voucherForm.paidAt" type="datetime-local" />
          </label>
          <label>
            付款凭证号
            <input v-model.trim="voucherForm.voucherNo" placeholder="银行流水号或交易号" />
          </label>
          <label>
            凭证文件
            <input v-model.trim="voucherForm.attachmentName" placeholder="付款截图或银行回单文件名" />
          </label>
          <label>
            备注
            <textarea v-model.trim="voucherForm.remark" rows="3" placeholder="补充说明"></textarea>
          </label>
          <div class="voucher-actions">
            <button @click="voucherVisible = false">取消</button>
            <button class="primary" :disabled="submittingVoucher" @click="submitVoucher">
              {{ submittingVoucher ? "提交中..." : "提交对账" }}
            </button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { showToast } from "vant";
import { getMock, postMock } from "../api/http";
import { getCustomerHomePath } from "../api/customerSession";

type BillStatus =
  | "PENDING_CONFIRM"
  | "PENDING_PAYMENT"
  | "PARTIALLY_PAID"
  | "SETTLED"
  | "OVERDUE"
  | "ADJUSTED"
  | "VOIDED";

interface BillPayment {
  paymentNo: string;
  amount: number;
  paidAt: string;
  method: string;
  remark?: string;
}

interface PaymentVoucher {
  id: string;
  amount: number;
  paidAt?: string;
  uploadedAt?: string;
  voucherNo?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
}

interface CustomerBill {
  id: string;
  billNo: string;
  orderNo: string;
  period: string;
  receivableAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: BillStatus;
  statusLabel?: string;
  dueDate: string;
  adjustReason?: string;
  daysOverdue?: number;
  collectionAction?: string;
  payments?: BillPayment[];
  paymentVouchers?: PaymentVoucher[];
}

interface CustomerHome {
  customerName: string;
  canViewAmount: boolean;
  debtAmount: number;
  overdueAmount: number;
  bills: CustomerBill[];
}

const home = ref<CustomerHome>();
const canViewAmount = computed(() => home.value?.canViewAmount !== false);
const bills = computed(() => home.value?.bills ?? []);
const unpaidBills = computed(() => bills.value.filter((item) => item.debtAmount > 0));
const settledBills = computed(() => bills.value.filter((item) => item.status === "SETTLED"));
const voucherVisible = ref(false);
const submittingVoucher = ref(false);
const activeBill = ref<CustomerBill | null>(null);
const voucherForm = ref({
  amount: 0,
  paidAt: "",
  voucherNo: "",
  attachmentName: "",
  remark: "",
});

function money(value: number) {
  return `¥${Number(value || 0).toLocaleString("zh-CN", {
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(status: BillStatus) {
  return (
    {
      PENDING_CONFIRM: "待确认",
      PENDING_PAYMENT: "待付款",
      PARTIALLY_PAID: "部分回款",
      SETTLED: "已结清",
      OVERDUE: "已逾期",
      ADJUSTED: "已调整",
      VOIDED: "已作废",
    }[status] ?? status
  );
}

function statusClass(status: BillStatus) {
  if (status === "OVERDUE") return "danger";
  if (status === "SETTLED") return "success";
  if (status === "PARTIALLY_PAID") return "primary";
  return "warning";
}

function voucherStatusLabel(status: PaymentVoucher["status"]) {
  return (
    {
      PENDING: "待对账",
      VERIFIED: "已入账",
      REJECTED: "已驳回",
    }[status] ?? status
  );
}

function dateTimeLocalText() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function openVoucherDialog(item: CustomerBill) {
  activeBill.value = item;
  voucherForm.value = {
    amount: Number(item.debtAmount || 0),
    paidAt: dateTimeLocalText(),
    voucherNo: "",
    attachmentName: "",
    remark: "",
  };
  voucherVisible.value = true;
}

async function submitVoucher() {
  if (!activeBill.value) return;
  if (voucherForm.value.amount <= 0) {
    showToast("请填写有效金额");
    return;
  }
  if (!voucherForm.value.voucherNo && !voucherForm.value.attachmentName) {
    showToast("请填写凭证号或凭证文件");
    return;
  }
  submittingVoucher.value = true;
  try {
    await postMock(`/customer/bills/${activeBill.value.id}/payment-vouchers`, {
      amount: voucherForm.value.amount,
      paidAt: voucherForm.value.paidAt.replace("T", " "),
      method: "银行转账",
      voucherNo: voucherForm.value.voucherNo,
      attachmentName: voucherForm.value.attachmentName,
      remark: voucherForm.value.remark,
    });
    showToast("凭证已提交，等待财务对账");
    voucherVisible.value = false;
    home.value = await getMock<CustomerHome>(getCustomerHomePath());
  } finally {
    submittingVoucher.value = false;
  }
}

onMounted(async () => {
  home.value = await getMock<CustomerHome>(getCustomerHomePath());
});
</script>

<style scoped>
.bill-page {
  padding-bottom: 4px;
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

.summary-card {
  min-height: 116px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  margin-bottom: 12px;
  color: #fff;
  border-radius: 14px;
  background: linear-gradient(135deg, #155eef, #0f766e);
}

.summary-card span,
.summary-card em {
  display: block;
  font-size: 13px;
  font-style: normal;
  opacity: 0.82;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  font-size: 32px;
  line-height: 36px;
}

.summary-card em {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.summary-grid div {
  padding: 12px;
  text-align: center;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.summary-grid span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.summary-grid strong {
  display: block;
  margin-top: 6px;
  color: #111827;
  font-size: 22px;
}

.empty-card strong {
  display: block;
  margin-bottom: 6px;
}

.bill-card {
  overflow: hidden;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.bill-card.danger {
  border-color: #fecaca;
}

.bill-card.success {
  border-color: #bbf7d0;
}

.bill-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.bill-card header strong,
.bill-card header span {
  display: block;
}

.bill-card header strong {
  font-size: 17px;
}

.bill-card header span:not(.status) {
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.amount-grid div {
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
}

.amount-grid span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.amount-grid strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #111827;
  font-size: 16px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.payment-list {
  margin-top: 10px;
  border-top: 1px solid #eef2f7;
}

.voucher-list {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eef2f7;
}

.voucher-line,
.payment-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0 0;
}

.voucher-line strong,
.voucher-line span,
.voucher-line em,
.payment-line strong,
.payment-line span,
.payment-line em {
  display: block;
}

.voucher-line span,
.voucher-line em,
.payment-line span,
.payment-line em {
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}

.voucher-line em {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #f97316;
}

.voucher-line em.verified {
  background: #dcfce7;
  color: #16a34a;
}

.voucher-line em.rejected {
  background: #fee2e2;
  color: #dc2626;
}

.payment-line em {
  max-width: 120px;
  text-align: right;
}

.voucher-btn {
  width: 100%;
  height: 38px;
  margin-top: 12px;
  border: 0;
  border-radius: 10px;
  background: #155eef;
  color: #fff;
  font: inherit;
  font-weight: 700;
}

.voucher-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  background: rgba(15, 23, 42, 0.45);
}

.voucher-dialog {
  width: 100%;
  padding: 16px;
  border-radius: 18px 18px 0 0;
  background: #fff;
}

.voucher-dialog header,
.voucher-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.voucher-dialog header button,
.voucher-actions button {
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
}

.voucher-dialog label {
  display: block;
  margin-top: 12px;
  color: #334155;
  font-size: 13px;
}

.voucher-dialog input,
.voucher-dialog textarea {
  width: 100%;
  box-sizing: border-box;
  margin-top: 6px;
  padding: 10px;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  font: inherit;
}

.voucher-actions {
  margin-top: 16px;
}

.voucher-actions .primary {
  padding: 10px 16px;
  border-radius: 10px;
  background: #155eef;
  color: #fff;
  font-weight: 700;
}

.status.primary {
  background: #eff6ff;
  color: #155eef;
}

.status.warning {
  background: #fff7ed;
  color: #f97316;
}
</style>
