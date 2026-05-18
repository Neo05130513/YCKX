import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { dirname, extname, join } from "node:path";
const customerId = "customer-yancheng";

const BatteryAssetStatus = {
  InStock: "IN_STOCK",
  Repairing: "REPAIRING",
  Leasing: "LEASING",
  Scrapped: "SCRAPPED",
  BoughtOut: "BOUGHT_OUT",
} as const;

const DeviceRunningStatus = {
  Online: "ONLINE",
  Offline: "OFFLINE",
  Abnormal: "ABNORMAL",
} as const;

const OrderStatus = {
  Draft: "DRAFT",
  Approving: "APPROVING",
  Leasing: "LEASING",
  PendingOutbound: "PENDING_OUTBOUND",
  PartiallyOutbound: "PARTIALLY_OUTBOUND",
  PendingReceipt: "PENDING_RECEIPT",
  Returning: "RETURNING",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",
} as const;

const OutboundStatus = {
  PendingReceipt: "PENDING_RECEIPT",
  Received: "RECEIVED",
  AutoReceived: "AUTO_RECEIVED",
} as const;

const BillStatus = {
  PendingConfirm: "PENDING_CONFIRM",
  PendingPayment: "PENDING_PAYMENT",
  PartiallyPaid: "PARTIALLY_PAID",
  Settled: "SETTLED",
  Overdue: "OVERDUE",
  Adjusted: "ADJUSTED",
  Voided: "VOIDED",
} as const;

const RepairSource = {
  Customer: "CUSTOMER",
  Internal: "INTERNAL",
} as const;

const RepairStatus = {
  PendingAccept: "PENDING_ACCEPT",
  Processing: "PROCESSING",
  Repairing: "REPAIRING",
  PendingInbound: "PENDING_INBOUND",
  Completed: "COMPLETED",
  Closed: "CLOSED",
} as const;

const ApprovalStatus = {
  Draft: "DRAFT",
  Processing: "PROCESSING",
  Approved: "APPROVED",
  Rejected: "REJECTED",
  Cancelled: "CANCELLED",
} as const;

const AlarmLevel = {
  Severe: "SEVERE",
  Warning: "WARNING",
  Info: "INFO",
} as const;

const AlarmStatus = {
  Pending: "PENDING",
  Processing: "PROCESSING",
  Resolved: "RESOLVED",
  FalseAlarm: "FALSE_ALARM",
} as const;

type SystemAccountType = "INTERNAL" | "CUSTOMER";
type SystemAccountStatus = "ENABLED" | "DISABLED";
type SystemInterfaceStatus = "ONLINE" | "ERROR" | "DISABLED";
type SystemInterfaceMethod = "GET" | "POST";

export type MockAuthContext = {
  accountId: string;
  accountType: SystemAccountType;
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  customerName: string;
  permissions: string[];
  issuedAt: number;
  expiresAt: number;
};

type SystemAccount = {
  id: string;
  type: SystemAccountType;
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  department: string;
  customerName: string;
  phone: string;
  status: SystemAccountStatus;
  lastLoginAt: string;
  createdAt: string;
};

type SystemRole = {
  id: string;
  name: string;
  scope: "内部后台" | "客户移动端";
  userCount: number;
  dataScope: string;
  description: string;
  permissionSummary: string[];
  permissions: {
    code: string;
    name: string;
    module: string;
    enabled: boolean;
    sensitive: boolean;
  }[];
  riskNotes: string[];
};

type DictionaryItem = {
  code: string;
  label: string;
  businessRule: string;
  usedBy: string;
  enabled: boolean;
};

type DictionaryGroup = {
  code: string;
  name: string;
  owner: string;
  updatedAt: string;
  items: DictionaryItem[];
};

type PlatformInterface = {
  id: string;
  name: string;
  platform: string;
  endpoint: string;
  requestMethod: SystemInterfaceMethod;
  syncInterval: string;
  owner: string;
  authMode: string;
  credential: string;
  credentialConfigured?: boolean;
  credentialHint?: string;
  timeoutMs: number;
  enabled: boolean;
  status: SystemInterfaceStatus;
  lastSyncAt: string;
  lastResult: string;
  lastLatencyMs?: number;
};

type ApprovalFlowConfig = {
  id: string;
  name: string;
  businessType: string;
  enabled: boolean;
  nodeCount: number;
  approvers: string[];
  slaHours: number;
  updatedAt: string;
};

type ApprovalConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "includes"
  | "in"
  | "exists"
  | "not_exists"
  | "truthy"
  | "falsy";

type ApprovalCondition = {
  field?: string;
  operator?: ApprovalConditionOperator;
  value?: string | number | boolean | Array<string | number | boolean>;
  logic?: "all" | "any";
  conditions?: ApprovalCondition[];
};

type ApprovalFlowNodeInput = {
  name: string;
  operator: string;
  condition?: ApprovalCondition | ApprovalCondition[];
  conditionLabel?: string;
};

type SystemOperationLog = {
  id: string;
  module: string;
  action: string;
  operator: string;
  target: string;
  result: "成功" | "失败";
  ip: string;
  createdAt: string;
  detail: string;
};

type SystemParameter = {
  code: string;
  name: string;
  module: string;
  value: number | string | boolean;
  unit: string;
  description: string;
  riskLevel: "低" | "中" | "高";
  updatedAt: string;
};

type SystemConfigState = {
  accounts: SystemAccount[];
  roles: SystemRole[];
  dictionaries: DictionaryGroup[];
  interfaces: PlatformInterface[];
  approvalFlows: ApprovalFlowConfig[];
  parameters: SystemParameter[];
  operationLogs: SystemOperationLog[];
};

function resolveMockStateFile() {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "pnpm-workspace.yaml"))) {
    return join(cwd, "data", "mock-state.json");
  }
  if (existsSync(join(cwd, "..", "..", "pnpm-workspace.yaml"))) {
    return join(cwd, "..", "..", "data", "mock-state.json");
  }
  return join(cwd, "data", "mock-state.json");
}

function resolveMockUploadDir() {
  return join(dirname(resolveMockStateFile()), "uploads");
}

type UploadedFileMeta = {
  id: string;
  name: string;
  fileName: string;
  storedName: string;
  storageKey: string;
  category: string;
  businessId: string;
  businessType: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  fileUrl: string;
};

@Injectable()
export class MockService {
  private readonly stateFilePath =
    process.env.MOCK_STATE_FILE || resolveMockStateFile();
  private readonly uploadDirPath =
    process.env.MOCK_UPLOAD_DIR || resolveMockUploadDir();
  private readonly authSecret =
    process.env.MOCK_AUTH_SECRET || "yckx-local-mock-auth-secret";
  private readonly internalDefaultPassword =
    process.env.MOCK_INTERNAL_DEFAULT_PASSWORD || "admin123";
  private readonly customerDefaultCode =
    process.env.MOCK_CUSTOMER_DEFAULT_CODE || "123456";
  private readonly defaultSystemConfigState: SystemConfigState;
  private readonly uploadedFiles: UploadedFileMeta[] = [];
  private automationTimer?: ReturnType<typeof setInterval>;
  private readonly automationIntervalMs = Math.max(
    Number(process.env.MOCK_AUTOMATION_INTERVAL_MS || 300000),
    30000,
  );
  private readonly automationState: Record<string, any> = {
    enabled: process.env.MOCK_AUTOMATION_DISABLED !== "true",
    intervalMs: 0,
    lastRunAt: "",
    nextRunAt: "",
    lastResult: null,
    runCount: 0,
  };
  private readonly temporaryAccountPasswords = new Map<
    string,
    { password: string; expiresAt: number }
  >();

  constructor() {
    this.defaultSystemConfigState = this.cloneValue(
      this.getSystemConfigState(),
    );
    this.restoreMockState();
    this.hydrateSystemInterfaceConfig();
    this.migrateFinanceState();
    this.ensureHistoricalAssetFinanceRecords();
    this.scheduleAutomationTasks();
  }

  private migrateFinanceState() {
    const ensureRolePermission = (
      roleId: string,
      permission: {
        code: string;
        name: string;
        module: string;
        sensitive?: boolean;
      },
      enabled: boolean,
    ) => {
      const role = this.systemRoles.find((item) => item.id === roleId);
      if (!role) return;
      const existing = role.permissions.find(
        (item) => item.code === permission.code,
      );
      if (existing) {
        existing.name = permission.name;
        existing.module = permission.module;
        existing.sensitive = Boolean(permission.sensitive);
        existing.enabled = enabled;
      } else {
        role.permissions.push({
          code: permission.code,
          name: permission.name,
          module: permission.module,
          enabled,
          sensitive: Boolean(permission.sensitive),
        });
      }
      this.refreshRolePermissionSummary(role);
    };

    const financePermissions = [
      { code: "bill.read", name: "查看财务数据", module: "财务管理" },
      {
        code: "bill.generate",
        name: "生成月度账单",
        module: "财务管理",
        sensitive: true,
      },
      {
        code: "bill.confirm",
        name: "确认账单",
        module: "财务管理",
        sensitive: true,
      },
      {
        code: "bill.payment",
        name: "登记回款",
        module: "财务管理",
        sensitive: true,
      },
      {
        code: "bill.voucher",
        name: "维护付款凭证",
        module: "财务管理",
        sensitive: true,
      },
      {
        code: "bill.reconcile",
        name: "付款凭证对账",
        module: "财务管理",
        sensitive: true,
      },
      {
        code: "bill.adjust",
        name: "调整账单",
        module: "财务管理",
        sensitive: true,
      },
      {
        code: "bill.follow",
        name: "催收跟进",
        module: "财务管理",
        sensitive: false,
      },
    ];

    financePermissions.forEach((permission) => {
      ensureRolePermission("role-admin", permission, true);
      ensureRolePermission("role-finance", permission, true);
    });
    ensureRolePermission(
      "role-sales",
      { code: "bill.read", name: "查看财务数据", module: "财务管理" },
      true,
    );
    ensureRolePermission(
      "role-sales",
      { code: "bill.follow", name: "催收跟进", module: "财务管理" },
      false,
    );
    ensureRolePermission(
      "role-customer-admin",
      {
        code: "customer.bill.voucher",
        name: "提交付款凭证",
        module: "客户移动端",
        sensitive: true,
      },
      true,
    );
    ensureRolePermission(
      "role-customer-staff",
      {
        code: "customer.bill.voucher",
        name: "提交付款凭证",
        module: "客户移动端",
        sensitive: true,
      },
      false,
    );

    this.bills.forEach((bill) => {
      bill.paymentVouchers = Array.isArray(bill.paymentVouchers)
        ? bill.paymentVouchers
        : [];
      (bill.payments ?? []).forEach((payment: Record<string, any>) => {
        if (payment.voucherId) return;
        const voucherId = `voucher-${payment.paymentNo || randomUUID()}`;
        payment.voucherId = voucherId;
        payment.reconciliationStatus =
          payment.reconciliationStatus || "VERIFIED";
        payment.reconciledAt =
          payment.reconciledAt || payment.paidAt || this.nowText();
        payment.reconciledBy = payment.reconciledBy || payment.operator || "财务";
        bill.paymentVouchers.push({
          id: voucherId,
          voucherNo: payment.voucherNo || payment.paymentNo,
          amount: Number(payment.amount || 0),
          paidAt: payment.paidAt || "",
          method: payment.method || "银行转账",
          payerName: payment.payerName || bill.customerName,
          payerAccount: payment.payerAccount || "",
          bankName: payment.bankName || "",
          attachmentName:
            payment.attachmentName || payment.fileName || "历史回款凭证",
          attachmentUrl: payment.attachmentUrl || payment.fileUrl || "",
          attachmentSize: Number(payment.attachmentSize || 0),
          remark: payment.remark || "",
          uploadedAt: payment.paidAt || this.nowText(),
          uploadedBy: payment.operator || "财务",
          uploadedByType: "FINANCE",
          status: "VERIFIED",
          reconciliationStatus: "VERIFIED",
          reconciledAt: payment.reconciledAt,
          reconciledBy: payment.reconciledBy,
          reconciliationRemark: "历史回款自动补齐凭证记录",
          paymentNo: payment.paymentNo,
        });
      });
    });
  }

  private replaceArray<T>(target: T[], source: unknown) {
    if (Array.isArray(source)) {
      target.splice(0, target.length, ...(source as T[]));
    }
  }

  private replaceRecord(target: Record<string, any>, source: unknown) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return;
    Object.keys(target).forEach((key) => delete target[key]);
    Object.assign(target, source);
  }

  private hasCorruptedMockText(source: unknown) {
    return JSON.stringify(source ?? "").includes("????");
  }

  private restoreMockState() {
    if (!existsSync(this.stateFilePath)) return;

    try {
      const state = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Record<string, unknown>;
      this.replaceArray(this.batteries, state.batteries);
      this.replaceArray(this.orders, state.orders);
      this.replaceArray(this.outbounds, state.outbounds);
      this.replaceArray(this.bills, state.bills);
      this.replaceArray(this.approvals, state.approvals);
      if (!this.hasCorruptedMockText(state.approvalFlows)) {
        this.replaceArray(this.approvalFlows, state.approvalFlows);
      }
      this.replaceArray(this.repairs, state.repairs);
      this.replaceArray(this.alarms, state.alarms);
      this.replaceArray(this.alarmRules, state.alarmRules);
      this.replaceArray(this.inboundRecords, state.inboundRecords);
      this.replaceArray(this.transferRecords, state.transferRecords);
      this.replaceArray(this.disposalRecords, state.disposalRecords);
      this.replaceArray(this.inventoryRecords, state.inventoryRecords);
      this.replaceArray(this.depreciationRecords, state.depreciationRecords);
      this.replaceArray(this.assetFinanceRecords, state.assetFinanceRecords);
      this.replaceArray(this.uploadedFiles, state.uploadedFiles);
      if (!this.hasCorruptedMockText(state.systemOperationLogs)) {
        this.replaceArray(this.systemOperationLogs, state.systemOperationLogs);
      }
      this.replaceRecord(this.automationState, state.automationState);
      this.replaceRecord(this.repairLogs, state.repairLogs);
      this.replaceRecord(this.assetMovements, state.assetMovements);
      this.restoreSystemConfigState(state.systemManagement);
    } catch (error) {
      console.warn("[mock-state] restore failed", error);
    }
  }

  private getSystemConfigState(): SystemConfigState {
    return {
      accounts: this.systemAccounts,
      roles: this.systemRoles,
      dictionaries: this.dictionaries,
      interfaces: this.platformInterfaces.map((item) =>
        this.sanitizePlatformInterface(item),
      ),
      approvalFlows: this.approvalFlows,
      parameters: this.systemParameters,
      operationLogs: this.systemOperationLogs,
    };
  }

  private cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private restoreSystemConfigState(source: unknown, requireComplete = false) {
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      if (requireComplete) {
        throw new BadRequestException("系统配置快照格式不正确");
      }
      return;
    }

    const state = source as Partial<SystemConfigState>;
    const requiredKeys: Array<keyof SystemConfigState> = [
      "accounts",
      "roles",
      "dictionaries",
      "interfaces",
      "approvalFlows",
      "parameters",
      "operationLogs",
    ];

    if (requireComplete) {
      const missingKey = requiredKeys.find((key) => !Array.isArray(state[key]));
      if (missingKey) {
        throw new BadRequestException(`系统配置快照缺少 ${missingKey}`);
      }
    }

    const restoreArray = (
      key: keyof SystemConfigState,
      target: Array<Record<string, any>>,
    ) => {
      if (this.hasCorruptedMockText(state[key])) {
        if (requireComplete) {
          throw new BadRequestException(
            `系统配置快照 ${key} 存在乱码，已拒绝恢复`,
          );
        }
        return;
      }
      this.replaceArray(target, state[key]);
    };

    restoreArray("accounts", this.systemAccounts as Array<Record<string, any>>);
    restoreArray("roles", this.systemRoles as Array<Record<string, any>>);
    restoreArray(
      "dictionaries",
      this.dictionaries as Array<Record<string, any>>,
    );
    restoreArray(
      "interfaces",
      this.platformInterfaces as Array<Record<string, any>>,
    );
    restoreArray(
      "approvalFlows",
      this.approvalFlows as Array<Record<string, any>>,
    );
    restoreArray(
      "parameters",
      this.systemParameters as Array<Record<string, any>>,
    );
    restoreArray(
      "operationLogs",
      this.systemOperationLogs as Array<Record<string, any>>,
    );
    this.hydrateSystemInterfaceConfig();
  }

  private persistMockState() {
    try {
      mkdirSync(dirname(this.stateFilePath), { recursive: true });
      writeFileSync(
        this.stateFilePath,
        JSON.stringify(
          {
            version: 1,
            savedAt: this.nowText(),
            batteries: this.batteries,
            orders: this.orders,
            outbounds: this.outbounds,
            bills: this.bills,
            approvals: this.approvals,
            approvalFlows: this.approvalFlows,
            repairs: this.repairs,
            alarms: this.alarms,
            alarmRules: this.alarmRules,
            inboundRecords: this.inboundRecords,
            transferRecords: this.transferRecords,
            disposalRecords: this.disposalRecords,
            inventoryRecords: this.inventoryRecords,
            depreciationRecords: this.depreciationRecords,
            assetFinanceRecords: this.assetFinanceRecords,
            uploadedFiles: this.uploadedFiles,
            automationState: this.automationState,
            systemOperationLogs: this.systemOperationLogs,
            repairLogs: this.repairLogs,
            assetMovements: this.assetMovements,
            systemManagement: this.getSystemConfigState(),
          },
          null,
          2,
        ),
        "utf8",
      );
    } catch (error) {
      console.warn("[mock-state] persist failed", error);
    }
  }

  private readonly batteries: Array<Record<string, any>> = [
    {
      id: "bat-001",
      btCode: "BT202605170001",
      deviceNum: "LN202605170001",
      batterySn: "BT202605170001",
      model: "72V 45AH",
      specification: "72V / 45AH / 24串",
      orgName: "延成科讯 / 河南示例物流",
      sourcePlatform: "平台A",
      runningStatus: DeviceRunningStatus.Online,
      assetStatus: BatteryAssetStatus.Leasing,
      powerPercent: 86,
      voltage: 74.6,
      current: -12.4,
      temperature: 32,
      protectFactory: "嘉佰达",
      protectStatus: "在线",
      locatorSoftwareVersion: "LNA-2.8.1",
      bmsSoftwareVersion: "BMS-4.2.0",
      imei: "867202605170001",
      iccid: "8986042026051700012",
      signal: 28,
      lifecycle: "运营",
      customStatus: "正常运营",
      inboundState: "已出库",
      cardState: "正常",
      batchNum: "BATCH202605",
      groupName: "郑州高新区配送组",
      packageName: "标准年包",
      remainingDays: 312,
      renewalDesc: "正常",
      expiryTime: "2027-04-30",
      activationTime: "2026-05-01",
      purchaseDate: "2026-04-18",
      onlineTime: "2026-05-17 09:20",
      offlineTime: "",
      gpsUpdateTime: "2026-05-17 09:20",
      qrCode: "LN202605170001",
      userName: "河南示例物流",
      abnormal: "无",
      movementStatus: "移动",
      offlineDays: 0,
      locationHardwareVersion: "LNA-HW-2.1",
      bmsDetailVersion: "PB-2026.05",
      bmsManufacturers: "嘉佰达",
      configuration: "已配置",
      output: "打开",
      charging: "关",
      discharging: "开",
      locationMethod: "GPS",
      pressureDiff: 0.042,
      pressureMax: 3.666,
      pressureMin: 3.624,
      sendTimeGeneral: "2026-05-16 16:20",
      sendTimeProtect: "2026-05-16 16:28",
      lastChargeDate: "2026-05-16 22:10",
      lastDischargeDate: "2026-05-17 08:58",
      exchangeKey: "EX-170001",
      price: 365,
      stopUse: "否",
      stopTime: "",
      isPush: "否",
      replaceQrCode: "",
      oldImei: "",
      oldQrCode: "",
      newQrCode: "",
      oldBT: "",
      newBT: "",
      bmsIsConnect: "已连接",
      bmsTime: "2026-05-17 09:20",
      bmsFactoryDate: "2026-04-08",
      bmsAddress: "0x01",
      cellType: "三元",
      designCapacity: 45,
      cellTemperature1: 32,
      cellTemperature2: 34,
      chargeMos: "已打开",
      dischargeMos: "已打开",
      preDischargeMos: "已关闭",
      balanceStatus: "均衡中",
      heatStatus: "空闲中",
      recoveryStatus: "已恢复",
      totalMileage: 1286,
      cycleNum: 42,
      nominalCapacity: 45,
      remainingCapacity: 38.7,
      serialNumber: 24,
      satelliteNum: 12,
      location: "郑州高新区",
      customerId,
      orderId: "order-001",
      updatedAt: "2026-05-17 09:20",
    },
    {
      id: "bat-002",
      btCode: "BT202605170002",
      deviceNum: "LN202605170002",
      batterySn: "BT202605170002",
      model: "72V 45AH",
      specification: "72V / 45AH / 24串",
      orgName: "延成科讯 / 河南示例物流",
      sourcePlatform: "平台B",
      runningStatus: DeviceRunningStatus.Abnormal,
      assetStatus: BatteryAssetStatus.Leasing,
      powerPercent: 23,
      voltage: 66.8,
      current: -18.9,
      temperature: 41,
      protectFactory: "极空",
      protectStatus: "在线",
      locatorSoftwareVersion: "LNA-2.7.5",
      bmsSoftwareVersion: "BMS-4.1.9",
      imei: "867202605170002",
      iccid: "8986042026051700020",
      signal: 16,
      lifecycle: "运营",
      customStatus: "低电量告警",
      inboundState: "已出库",
      cardState: "正常",
      batchNum: "BATCH202605",
      groupName: "郑州经开区配送组",
      packageName: "标准年包",
      remainingDays: 312,
      renewalDesc: "正常",
      expiryTime: "2027-04-30",
      activationTime: "2026-05-01",
      purchaseDate: "2026-04-18",
      onlineTime: "2026-05-17 09:18",
      offlineTime: "",
      gpsUpdateTime: "2026-05-17 09:18",
      qrCode: "LN202605170002",
      userName: "河南示例物流",
      abnormal: "低电量告警 / 温度偏高",
      movementStatus: "移动",
      offlineDays: 0,
      locationHardwareVersion: "LNA-HW-2.1",
      bmsDetailVersion: "PB-2026.05",
      bmsManufacturers: "极空",
      configuration: "已配置",
      output: "打开",
      charging: "关",
      discharging: "开",
      locationMethod: "GPS",
      pressureDiff: 0.058,
      pressureMax: 3.451,
      pressureMin: 3.393,
      sendTimeGeneral: "2026-05-16 16:20",
      sendTimeProtect: "2026-05-16 16:28",
      lastChargeDate: "2026-05-15 21:46",
      lastDischargeDate: "2026-05-17 08:54",
      exchangeKey: "EX-170002",
      price: 365,
      stopUse: "否",
      stopTime: "",
      isPush: "是",
      replaceQrCode: "",
      oldImei: "",
      oldQrCode: "",
      newQrCode: "",
      oldBT: "",
      newBT: "",
      bmsIsConnect: "已连接",
      bmsTime: "2026-05-17 09:18",
      bmsFactoryDate: "2026-04-08",
      bmsAddress: "0x02",
      cellType: "三元",
      designCapacity: 45,
      cellTemperature1: 41,
      cellTemperature2: 43,
      chargeMos: "已打开",
      dischargeMos: "已打开",
      preDischargeMos: "已关闭",
      balanceStatus: "均衡中",
      heatStatus: "空闲中",
      recoveryStatus: "未恢复",
      totalMileage: 1468,
      cycleNum: 51,
      nominalCapacity: 45,
      remainingCapacity: 29.2,
      serialNumber: 24,
      satelliteNum: 9,
      location: "郑州经开区",
      customerId,
      orderId: "order-001",
      updatedAt: "2026-05-17 09:18",
    },
    {
      id: "bat-003",
      btCode: "BT202605170003",
      deviceNum: "LN202605170003",
      batterySn: "BT202605170003",
      model: "60V 50AH",
      specification: "60V / 50AH / 20串",
      orgName: "延成科讯 / 总仓",
      sourcePlatform: "平台C",
      runningStatus: DeviceRunningStatus.Offline,
      assetStatus: BatteryAssetStatus.InStock,
      powerPercent: 0,
      voltage: 0,
      current: 0,
      temperature: 25,
      protectFactory: "锂钠安",
      protectStatus: "离线",
      locatorSoftwareVersion: "LNA-2.6.8",
      bmsSoftwareVersion: "BMS-3.9.1",
      imei: "867202605170003",
      iccid: "8986042026051700038",
      signal: 0,
      lifecycle: "库存",
      customStatus: "待激活",
      inboundState: "在库",
      cardState: "未激活",
      batchNum: "BATCH202604",
      groupName: "总仓备货",
      packageName: "未绑定",
      remainingDays: 0,
      renewalDesc: "未激活",
      expiryTime: "",
      activationTime: "",
      purchaseDate: "2026-04-12",
      onlineTime: "",
      offlineTime: "2026-05-17 08:42",
      gpsUpdateTime: "2026-05-16 18:20",
      qrCode: "LN202605170003",
      userName: "总仓",
      abnormal: "设备离线",
      movementStatus: "静止",
      offlineDays: 1,
      locationHardwareVersion: "LNA-HW-2.0",
      bmsDetailVersion: "PB-2026.04",
      bmsManufacturers: "锂钠安",
      configuration: "待配置",
      output: "关闭",
      charging: "关",
      discharging: "关",
      locationMethod: "基站",
      pressureDiff: 0,
      pressureMax: 0,
      pressureMin: 0,
      sendTimeGeneral: "",
      sendTimeProtect: "",
      lastChargeDate: "",
      lastDischargeDate: "",
      exchangeKey: "EX-170003",
      price: 0,
      stopUse: "否",
      stopTime: "",
      isPush: "否",
      replaceQrCode: "",
      oldImei: "",
      oldQrCode: "",
      newQrCode: "",
      oldBT: "",
      newBT: "",
      bmsIsConnect: "已断开",
      bmsTime: "2026-05-17 08:42",
      bmsFactoryDate: "2026-04-02",
      bmsAddress: "0x03",
      cellType: "磷酸铁锂",
      designCapacity: 50,
      cellTemperature1: 25,
      cellTemperature2: 25,
      chargeMos: "已关闭",
      dischargeMos: "已关闭",
      preDischargeMos: "已关闭",
      balanceStatus: "空闲中",
      heatStatus: "空闲中",
      recoveryStatus: "已恢复",
      totalMileage: 0,
      cycleNum: 0,
      nominalCapacity: 50,
      remainingCapacity: 0,
      serialNumber: 20,
      satelliteNum: 0,
      location: "总仓",
      customerId: null,
      orderId: null,
      updatedAt: "2026-05-17 08:42",
    },
  ];

  private readonly orders: Array<Record<string, any>> = [
    {
      id: "order-001",
      orderNo: "ORD202605170001",
      customerId,
      customerName: "河南示例物流有限公司",
      customerShortName: "河南示例物流",
      customerContact: "张经理",
      contactPhone: "13800138001",
      region: "郑州高新区",
      status: OrderStatus.Leasing,
      leaseStart: "2026-05-01",
      leaseEnd: "2027-04-30",
      billingDay: 5,
      monthlyRent: 8000,
      depositAmount: 12000,
      orderedBatteryCount: 5,
      batteryCount: 2,
      outboundProgress: "2/5",
      outboundCount: 2,
      receivedCount: 0,
      pendingReceiptCount: 2,
      receivableAmount: 16000,
      paidAmount: 1600,
      debtAmount: 6400,
      overdueAmount: 6400,
      currentPeriod: "2026-05",
      nextBillingDate: "2026-06-05",
      salesOwner: "刘销售",
      assetOwner: "王库管",
      financeOwner: "赵财务",
      contractName: "锂电池租赁合同-河南示例物流",
      contractNo: "HT20260501001",
      contractStatus: "已会签",
      createdAt: "2026-05-01 09:30",
      updatedAt: "2026-05-17 09:20",
      remark: "首批 2 组已出库，剩余 3 组等待客户排车。",
      contract: {
        name: "锂电池租赁合同-河南示例物流",
        contractNo: "HT20260501001",
        status: "已会签",
        signDate: "2026-05-01",
        startDate: "2026-05-01",
        endDate: "2027-04-30",
        fileName: "HT20260501001.pdf",
        approvalNo: "SP20260501008",
      },
      approvals: [
        {
          node: "销售发起",
          operator: "刘销售",
          result: "已提交",
          time: "2026-05-01 09:30",
          remark: "客户确认租赁 5 组电池。",
        },
        {
          node: "部门负责人",
          operator: "陈经理",
          result: "通过",
          time: "2026-05-01 10:12",
          remark: "价格和租期符合标准。",
        },
        {
          node: "财务复核",
          operator: "赵财务",
          result: "通过",
          time: "2026-05-01 11:05",
          remark: "押金与账单日已确认。",
        },
      ],
      timeline: [
        {
          time: "2026-05-01 09:30",
          title: "创建租赁订单",
          content: "录入客户、租期、月租和账单日。",
        },
        {
          time: "2026-05-01 11:05",
          title: "合同会签通过",
          content: "订单进入待出库状态。",
        },
        {
          time: "2026-05-10 16:20",
          title: "首批出库",
          content: "出库 2 组电池，等待客户收货确认。",
        },
        {
          time: "2026-05-12 00:00",
          title: "生成首期账单",
          content: "账期 2026-05，应收 8000 元。",
        },
      ],
    },
    {
      id: "order-002",
      orderNo: "ORD202605170002",
      customerId: "customer-demo-2",
      customerName: "郑州测试配送有限公司",
      customerShortName: "郑州测试配送",
      customerContact: "李主管",
      contactPhone: "13800138002",
      region: "郑州经开区",
      status: OrderStatus.PendingOutbound,
      leaseStart: "2026-06-01",
      leaseEnd: "2027-05-31",
      billingDay: 10,
      monthlyRent: 15600,
      depositAmount: 30000,
      orderedBatteryCount: 10,
      batteryCount: 0,
      outboundProgress: "0/10",
      outboundCount: 0,
      receivedCount: 0,
      pendingReceiptCount: 0,
      receivableAmount: 0,
      paidAmount: 0,
      debtAmount: 0,
      overdueAmount: 0,
      currentPeriod: "",
      nextBillingDate: "2026-06-10",
      salesOwner: "刘销售",
      assetOwner: "王库管",
      financeOwner: "赵财务",
      contractName: "锂电池租赁合同-郑州测试配送",
      contractNo: "HT20260517002",
      contractStatus: "已会签",
      createdAt: "2026-05-17 14:40",
      updatedAt: "2026-05-17 15:15",
      remark: "合同通过，等待资产部创建首批出库单。",
      contract: {
        name: "锂电池租赁合同-郑州测试配送",
        contractNo: "HT20260517002",
        status: "已会签",
        signDate: "2026-05-17",
        startDate: "2026-06-01",
        endDate: "2027-05-31",
        fileName: "HT20260517002.pdf",
        approvalNo: "SP20260517021",
      },
      approvals: [
        {
          node: "销售发起",
          operator: "刘销售",
          result: "已提交",
          time: "2026-05-17 14:40",
          remark: "客户新增 10 组电池。",
        },
        {
          node: "财务复核",
          operator: "赵财务",
          result: "通过",
          time: "2026-05-17 15:15",
          remark: "押金已确认。",
        },
      ],
      timeline: [
        {
          time: "2026-05-17 14:40",
          title: "创建租赁订单",
          content: "录入客户和租赁计划。",
        },
        {
          time: "2026-05-17 15:15",
          title: "合同会签通过",
          content: "订单进入待出库。",
        },
      ],
    },
    {
      id: "order-003",
      orderNo: "ORD202604280006",
      customerId: "customer-demo-3",
      customerName: "开封城配新能源有限公司",
      customerShortName: "开封城配",
      customerContact: "周总",
      contactPhone: "13800138003",
      region: "开封龙亭区",
      status: OrderStatus.PartiallyOutbound,
      leaseStart: "2026-04-28",
      leaseEnd: "2027-04-27",
      billingDay: 15,
      monthlyRent: 9600,
      depositAmount: 18000,
      orderedBatteryCount: 6,
      batteryCount: 3,
      outboundProgress: "3/6",
      outboundCount: 3,
      receivedCount: 3,
      pendingReceiptCount: 0,
      receivableAmount: 9600,
      paidAmount: 9600,
      debtAmount: 0,
      overdueAmount: 0,
      currentPeriod: "2026-05",
      nextBillingDate: "2026-06-15",
      salesOwner: "孙销售",
      assetOwner: "王库管",
      financeOwner: "赵财务",
      contractName: "锂电池租赁合同-开封城配",
      contractNo: "HT20260428006",
      contractStatus: "已会签",
      createdAt: "2026-04-28 10:30",
      updatedAt: "2026-05-15 17:30",
      remark: "已完成第一批出库，第二批等待仓库备货。",
      contract: {
        name: "锂电池租赁合同-开封城配",
        contractNo: "HT20260428006",
        status: "已会签",
        signDate: "2026-04-28",
        startDate: "2026-04-28",
        endDate: "2027-04-27",
        fileName: "HT20260428006.pdf",
        approvalNo: "SP20260428017",
      },
      approvals: [
        {
          node: "销售发起",
          operator: "孙销售",
          result: "已提交",
          time: "2026-04-28 10:30",
          remark: "开封区域配送用车。",
        },
        {
          node: "部门负责人",
          operator: "陈经理",
          result: "通过",
          time: "2026-04-28 11:02",
          remark: "同意分批出库。",
        },
      ],
      timeline: [
        {
          time: "2026-04-28 10:30",
          title: "创建订单",
          content: "订单需求 6 组电池。",
        },
        {
          time: "2026-05-02 09:10",
          title: "第一批客户收货",
          content: "客户确认收到 3 组电池。",
        },
        {
          time: "2026-05-15 00:00",
          title: "账单结清",
          content: "2026-05 账期已收 9600 元。",
        },
      ],
    },
  ];

  private readonly outbounds: Array<Record<string, any>> = [
    {
      id: "out-001",
      outboundNo: "OUT202605170001",
      orderId: "order-001",
      customerName: "河南示例物流有限公司",
      status: OutboundStatus.PendingReceipt,
      outboundAt: "2026-05-10",
      autoReceiveAt: "2026-05-17",
      receivedAt: "",
      warehouse: "郑州总仓",
      operator: "王库管",
      receiver: "张经理",
      address: "郑州高新区科学大道100号",
      btCodes: ["BT202605170001", "BT202605170002"],
    },
    {
      id: "out-002",
      outboundNo: "OUT202605020006",
      orderId: "order-003",
      customerName: "开封城配新能源有限公司",
      status: OutboundStatus.Received,
      outboundAt: "2026-04-30",
      autoReceiveAt: "2026-05-07",
      receivedAt: "2026-05-02 09:10",
      warehouse: "郑州总仓",
      operator: "王库管",
      receiver: "周总",
      address: "开封龙亭区复兴大道88号",
      btCodes: ["BT202604280061", "BT202604280062", "BT202604280063"],
    },
  ];

  private readonly bills: Array<Record<string, any>> = [
    {
      id: "bill-001",
      billNo: "BILL202605001",
      customerName: "河南示例物流有限公司",
      orderNo: "ORD202605170001",
      period: "2026-05",
      receivableAmount: 8000,
      paidAmount: 1600,
      debtAmount: 6400,
      status: BillStatus.Overdue,
      generatedAt: "2026-05-05",
      dueDate: "2026-05-12",
      confirmedAt: "2026-05-05 10:00",
      adjustReason: "",
      payments: [
        {
          paymentNo: "PAY20260509001",
          amount: 1600,
          paidAt: "2026-05-09 16:20",
          method: "银行转账",
          remark: "首期部分回款",
        },
      ],
    },
    {
      id: "bill-002",
      billNo: "BILL202606001",
      customerName: "河南示例物流有限公司",
      orderNo: "ORD202605170001",
      period: "2026-06",
      receivableAmount: 8000,
      paidAmount: 0,
      debtAmount: 8000,
      status: BillStatus.PendingConfirm,
      generatedAt: "2026-06-05",
      dueDate: "2026-06-12",
      confirmedAt: "",
      adjustReason: "",
      payments: [],
    },
    {
      id: "bill-003",
      billNo: "BILL202605003",
      customerName: "开封城配新能源有限公司",
      orderNo: "ORD202604280006",
      period: "2026-05",
      receivableAmount: 9600,
      paidAmount: 9600,
      debtAmount: 0,
      status: BillStatus.Settled,
      generatedAt: "2026-05-15",
      dueDate: "2026-05-22",
      confirmedAt: "2026-05-15 09:20",
      adjustReason: "",
      payments: [
        {
          paymentNo: "PAY20260515003",
          amount: 9600,
          paidAt: "2026-05-15 17:30",
          method: "银行转账",
          remark: "月租已结清",
        },
      ],
    },
  ];

  private readonly approvals: Record<string, any>[] = [
    {
      id: "approval-001",
      approvalNo: "SP20260518001",
      type: "SALES_CONTRACT",
      typeLabel: "销售/租赁合同会签",
      title: "河南示例物流租赁合同补充会签",
      status: ApprovalStatus.Processing,
      applicant: "刘销售",
      department: "销售部",
      priority: "紧急",
      businessId: "order-001",
      businessNo: "ORD202605170001",
      customerName: "河南示例物流有限公司",
      amount: 16000,
      currentNode: "财务复核",
      currentOperator: "赵财务",
      dueAt: "2026-05-18 18:00",
      createdAt: "2026-05-18 09:10",
      updatedAt: "2026-05-18 10:05",
      summary:
        "客户追加 3 组电池并要求沿用原合同账单日，需确认押金、月租和出库节奏。",
      riskItems: [
        "当前订单仍有 6400 元逾期欠款",
        "首批出库仍有 2 组等待客户收货确认",
        "追加电池需重新确认押金差额",
      ],
      formItems: [
        { label: "合同编号", value: "HT20260501001-B01" },
        { label: "追加电池", value: "3 组" },
        { label: "月租增量", value: "¥4,800" },
        { label: "账单日", value: "每月 5 日" },
      ],
      nodes: [
        {
          name: "销售发起",
          operator: "刘销售",
          status: "APPROVED",
          time: "2026-05-18 09:10",
          remark: "客户确认追加需求。",
        },
        {
          name: "部门负责人",
          operator: "陈经理",
          status: "APPROVED",
          time: "2026-05-18 09:42",
          remark: "同意按原价格体系执行。",
        },
        {
          name: "财务复核",
          operator: "赵财务",
          status: "CURRENT",
          time: "",
          remark: "待确认押金差额和历史欠款处理。",
        },
        {
          name: "总经理审批",
          operator: "周总",
          status: "PENDING",
          time: "",
          remark: "",
        },
      ],
      logs: [
        {
          time: "2026-05-18 09:10",
          operator: "刘销售",
          action: "提交",
          nodeName: "销售发起",
          result: "已提交",
          comment: "客户追加 3 组电池，申请合同补充会签。",
        },
        {
          time: "2026-05-18 09:42",
          operator: "陈经理",
          action: "通过",
          nodeName: "部门负责人",
          result: "通过",
          comment: "价格和租期符合现有客户政策。",
        },
        {
          time: "2026-05-18 10:05",
          operator: "系统",
          action: "流转",
          nodeName: "财务复核",
          result: "等待处理",
          comment: "已流转至赵财务。",
        },
      ],
      attachments: ["补充合同草稿.docx", "客户确认截图.png"],
    },
    {
      id: "approval-002",
      approvalNo: "SP20260517021",
      type: "LEASE_OUTBOUND",
      typeLabel: "租赁出库申请",
      title: "郑州测试配送首批 10 组电池出库",
      status: ApprovalStatus.Processing,
      applicant: "王库管",
      department: "资产管理部",
      priority: "普通",
      businessId: "order-002",
      businessNo: "ORD202605170002",
      customerName: "郑州测试配送有限公司",
      amount: 30000,
      currentNode: "仓库复核",
      currentOperator: "李仓储",
      dueAt: "2026-05-19 12:00",
      createdAt: "2026-05-17 16:20",
      updatedAt: "2026-05-17 16:30",
      summary:
        "合同已会签，客户要求 2026-06-01 前完成首批电池交付，需审批出库与配送安排。",
      riskItems: [
        "需确认 72V 45AH 库存是否满足 10 组",
        "出库后 7 日内客户未确认将自动收货",
      ],
      formItems: [
        { label: "出库仓库", value: "郑州总仓" },
        { label: "出库数量", value: "10 组" },
        { label: "收货地址", value: "郑州经开区客户仓" },
        { label: "计划出库", value: "2026-05-20" },
      ],
      nodes: [
        {
          name: "资产发起",
          operator: "王库管",
          status: "APPROVED",
          time: "2026-05-17 16:20",
          remark: "按订单创建首批出库申请。",
        },
        {
          name: "仓库复核",
          operator: "李仓储",
          status: "CURRENT",
          time: "",
          remark: "待核对批次和库存。",
        },
        {
          name: "业务确认",
          operator: "刘销售",
          status: "PENDING",
          time: "",
          remark: "",
        },
      ],
      logs: [
        {
          time: "2026-05-17 16:20",
          operator: "王库管",
          action: "提交",
          nodeName: "资产发起",
          result: "已提交",
          comment: "订单已会签，申请生成首批出库。",
        },
        {
          time: "2026-05-17 16:30",
          operator: "系统",
          action: "流转",
          nodeName: "仓库复核",
          result: "等待处理",
          comment: "已流转至李仓储。",
        },
      ],
      attachments: ["出库清单.xlsx"],
    },
    {
      id: "approval-003",
      approvalNo: "SP20260516012",
      type: "FACTORY_REPAIR",
      typeLabel: "返厂维修申请",
      title: "定位模块返厂维修质保确认",
      status: ApprovalStatus.Approved,
      applicant: "赵工",
      department: "售后技术部",
      priority: "普通",
      businessId: "repair-003",
      businessNo: "REP202605160006",
      customerName: "内部仓储",
      amount: 0,
      currentNode: "流程完成",
      currentOperator: "",
      dueAt: "2026-05-17 18:00",
      createdAt: "2026-05-16 10:20",
      updatedAt: "2026-05-17 16:40",
      summary: "定位模块离线经检测属于厂商质保范围，维修完成后走资产入库流程。",
      riskItems: ["已要求维修完成后必须重新入库，不能直接再次出库"],
      formItems: [
        { label: "维修单号", value: "REP202605160006" },
        { label: "故障类型", value: "定位模块" },
        { label: "责任归属", value: "厂商质保" },
        { label: "费用金额", value: "¥0" },
      ],
      nodes: [
        {
          name: "技术提交",
          operator: "赵工",
          status: "APPROVED",
          time: "2026-05-16 10:20",
          remark: "判断为厂商质保。",
        },
        {
          name: "售后负责人",
          operator: "李主管",
          status: "APPROVED",
          time: "2026-05-16 11:10",
          remark: "同意质保处理。",
        },
        {
          name: "资产确认",
          operator: "王库管",
          status: "APPROVED",
          time: "2026-05-17 16:40",
          remark: "维修完成，等待入库。",
        },
      ],
      logs: [
        {
          time: "2026-05-16 10:20",
          operator: "赵工",
          action: "提交",
          nodeName: "技术提交",
          result: "已提交",
          comment: "返厂检测记录已上传。",
        },
        {
          time: "2026-05-16 11:10",
          operator: "李主管",
          action: "通过",
          nodeName: "售后负责人",
          result: "通过",
          comment: "同意走质保。",
        },
        {
          time: "2026-05-17 16:40",
          operator: "王库管",
          action: "通过",
          nodeName: "资产确认",
          result: "通过",
          comment: "维修完成后重新入库。",
        },
      ],
      attachments: ["返修回执.pdf", "检测记录.jpg"],
    },
    {
      id: "approval-004",
      approvalNo: "SP20260515009",
      type: "BILL_ADJUST",
      typeLabel: "账单调整",
      title: "开封城配 2026-05 账单优惠确认",
      status: ApprovalStatus.Rejected,
      applicant: "赵财务",
      department: "财务部",
      priority: "普通",
      businessId: "bill-003",
      businessNo: "BILL202605003",
      customerName: "开封城配新能源有限公司",
      amount: 9600,
      currentNode: "流程结束",
      currentOperator: "",
      dueAt: "2026-05-16 18:00",
      createdAt: "2026-05-15 09:30",
      updatedAt: "2026-05-15 15:20",
      summary:
        "客户申请当月月租优惠，因已按合同完成交付且账单已结清，本次调整被驳回。",
      riskItems: ["优惠无合同依据", "账单已回款完成"],
      formItems: [
        { label: "账单号", value: "BILL202605003" },
        { label: "原应收", value: "¥9,600" },
        { label: "申请调整", value: "¥1,200" },
        { label: "回款状态", value: "已结清" },
      ],
      nodes: [
        {
          name: "财务发起",
          operator: "赵财务",
          status: "APPROVED",
          time: "2026-05-15 09:30",
          remark: "客户提出优惠诉求。",
        },
        {
          name: "业务确认",
          operator: "孙销售",
          status: "REJECTED",
          time: "2026-05-15 15:20",
          remark: "无合同依据，不建议调整。",
        },
      ],
      logs: [
        {
          time: "2026-05-15 09:30",
          operator: "赵财务",
          action: "提交",
          nodeName: "财务发起",
          result: "已提交",
          comment: "客户申请账单优惠。",
        },
        {
          time: "2026-05-15 15:20",
          operator: "孙销售",
          action: "驳回",
          nodeName: "业务确认",
          result: "已驳回",
          comment: "无合同依据，维持原账单。",
        },
      ],
      attachments: [],
    },
  ];

  private readonly repairs: Array<Record<string, any>> = [
    {
      id: "repair-001",
      repairNo: "REP202605170001",
      source: RepairSource.Customer,
      customerName: "河南示例物流有限公司",
      customerShortName: "河南物流",
      orderId: "order-001",
      btCode: "BT202605170002",
      status: RepairStatus.Processing,
      priority: "紧急",
      description: "车辆启动时电池异常报警，续航明显下降。",
      address: "郑州经开区第八大街",
      contactName: "张经理",
      contactPhone: "13800138001",
      createdAt: "2026-05-17 10:10",
      acceptedAt: "2026-05-17 10:28",
      expectedFinishAt: "2026-05-18 18:00",
      completedAt: "",
      handler: "售后一组",
      technician: "李工",
      faultType: "低电量/温度异常",
      responsibility: "待判定",
      repairMethod: "上门检测",
      costAmount: 0,
      customerConfirmed: false,
      customerConfirmedAt: "",
      sourceAlarmNo: "ALM202605170018",
      images: ["故障面板照片", "车辆安装位置"],
    },
    {
      id: "repair-002",
      repairNo: "REP202605120003",
      source: RepairSource.Customer,
      customerName: "开封城配新能源有限公司",
      customerShortName: "开封城配",
      orderId: "order-003",
      btCode: "BT202604280062",
      status: RepairStatus.PendingAccept,
      priority: "普通",
      description: "客户反馈充电口松动，需要上门确认。",
      address: "开封龙亭区复兴大道88号",
      contactName: "刘主管",
      contactPhone: "13900139002",
      createdAt: "2026-05-12 13:45",
      acceptedAt: "",
      expectedFinishAt: "2026-05-19 18:00",
      completedAt: "",
      handler: "待分配",
      technician: "",
      faultType: "充电接口",
      responsibility: "待判定",
      repairMethod: "待受理",
      costAmount: 0,
      customerConfirmed: false,
      customerConfirmedAt: "",
      sourceAlarmNo: "",
      images: ["客户上传照片"],
    },
    {
      id: "repair-003",
      repairNo: "REP202605160006",
      source: RepairSource.Internal,
      customerName: "内部仓储",
      customerShortName: "郑州总仓",
      orderId: "",
      btCode: "BT202605170003",
      status: RepairStatus.PendingInbound,
      priority: "普通",
      description: "仓库盘点发现定位模块离线，已返修完成，等待资产重新入库。",
      address: "郑州总仓",
      contactName: "王库管",
      contactPhone: "13700137003",
      createdAt: "2026-05-16 09:30",
      acceptedAt: "2026-05-16 09:42",
      expectedFinishAt: "2026-05-18 12:00",
      completedAt: "2026-05-17 16:40",
      handler: "技术二组",
      technician: "赵工",
      faultType: "定位模块",
      responsibility: "厂商质保",
      repairMethod: "返厂维修",
      costAmount: 0,
      customerConfirmed: true,
      customerConfirmedAt: "2026-05-17 16:45",
      sourceAlarmNo: "",
      images: ["内部检测记录", "返修回执"],
    },
  ];

  private readonly alarms: Array<Record<string, any>> = [
    {
      id: "alarm-001",
      alarmNo: "ALM202605170018",
      alarmIndex: "low_power",
      level: AlarmLevel.Severe,
      status: AlarmStatus.Processing,
      type: "低电量/温度异常",
      btCode: "BT202605170002",
      deviceNum: "LN202605170002",
      qrCode: "LN202605170002",
      batterySn: "BT202605170002",
      customerName: "河南示例物流有限公司",
      orderNo: "ORD202605170001",
      sourcePlatform: "平台B",
      bmsManufacturers: "极空",
      alarmTime: "2026-05-17 09:30",
      recoveredAt: "",
      description: "电量低于 25%，电芯温度达到 43℃，客户车辆续航明显下降。",
      currentValue: "SOC 23% / 温度 43℃",
      threshold: "SOC < 25% 或温度 > 42℃",
      location: "郑州经开区",
      handler: "售后一组",
      mpPush: true,
      repairNo: "REP202605170001",
      pushes: [
        {
          id: "alarm-001-push-1",
          pushType: "mp",
          userName: "张经理",
          userType: "customer",
          userPhone: "13800138001",
          firstPushTime: "2026-05-17 09:31",
          lastPushTime: "2026-05-17 09:31",
          answerTime: "2026-05-17 09:34",
          pushCount: 1,
          sendStatus: "success",
          receiveStatus: "answered",
          failReason: "",
          remark: "公众号已读",
        },
        {
          id: "alarm-001-push-2",
          pushType: "sms",
          userName: "值班人员",
          userType: "operator",
          userPhone: "13900139002",
          firstPushTime: "2026-05-17 09:33",
          lastPushTime: "2026-05-17 09:40",
          answerTime: "",
          pushCount: 2,
          sendStatus: "success",
          receiveStatus: "unread",
          failReason: "",
          remark: "短信通道推送",
        },
      ],
      logs: [
        {
          time: "2026-05-17 09:30",
          operator: "平台B同步",
          action: "生成告警",
          status: "待处理",
          remark: "第三方平台同步电池低电量和温度异常。",
        },
        {
          time: "2026-05-17 10:10",
          operator: "售后一组",
          action: "转报修",
          status: "处理中",
          remark: "已生成报修单 REP202605170001 并安排李工跟进。",
        },
      ],
      createdAt: "2026-05-17 09:30",
      updatedAt: "2026-05-17 10:10",
    },
    {
      id: "alarm-002",
      alarmNo: "ALM202605170021",
      alarmIndex: "offline",
      level: AlarmLevel.Warning,
      status: AlarmStatus.Pending,
      type: "设备离线",
      btCode: "BT202605170003",
      deviceNum: "LN202605170003",
      qrCode: "LN202605170003",
      batterySn: "BT202605170003",
      customerName: "内部仓储",
      orderNo: "",
      sourcePlatform: "平台C",
      bmsManufacturers: "锂钠安",
      alarmTime: "2026-05-17 08:42",
      recoveredAt: "",
      description: "库存电池定位模块离线，BMS 通讯已断开，需要内部检测。",
      currentValue: "信号 0 / BMS 断开",
      threshold: "连续 30 分钟无定位或保护板数据",
      location: "郑州总仓",
      handler: "技术二组",
      mpPush: false,
      repairNo: "REP202605160006",
      pushes: [
        {
          id: "alarm-002-push-1",
          pushType: "sms",
          userName: "王库管",
          userType: "manager",
          userPhone: "13700137003",
          firstPushTime: "2026-05-17 08:43",
          lastPushTime: "2026-05-17 08:43",
          answerTime: "",
          pushCount: 1,
          sendStatus: "success",
          receiveStatus: "unread",
          failReason: "",
          remark: "库存异常通知",
        },
      ],
      logs: [
        {
          time: "2026-05-17 08:42",
          operator: "平台C同步",
          action: "生成告警",
          status: "待处理",
          remark: "设备离线，资产仍保持在库状态。",
        },
      ],
      createdAt: "2026-05-17 08:42",
      updatedAt: "2026-05-17 08:42",
    },
    {
      id: "alarm-003",
      alarmNo: "ALM202605170023",
      alarmIndex: "temperature",
      level: AlarmLevel.Severe,
      status: AlarmStatus.Pending,
      type: "温度过高",
      btCode: "BT202605170002",
      deviceNum: "LN202605170002",
      qrCode: "LN202605170002",
      batterySn: "BT202605170002",
      customerName: "河南示例物流有限公司",
      orderNo: "ORD202605170001",
      sourcePlatform: "平台B",
      bmsManufacturers: "极空",
      alarmTime: "2026-05-17 12:08",
      recoveredAt: "",
      description: "运行中功率温度短时过高，需判断是否与负载和环境温度有关。",
      currentValue: "功率温度 58℃",
      threshold: "功率温度 > 55℃",
      location: "郑州经开区",
      handler: "售后一组",
      mpPush: true,
      repairNo: "",
      pushes: [
        {
          id: "alarm-003-push-1",
          pushType: "phone",
          userName: "张经理",
          userType: "customer",
          userPhone: "13800138001",
          firstPushTime: "2026-05-17 12:09",
          lastPushTime: "2026-05-17 12:15",
          answerTime: "2026-05-17 12:16",
          pushCount: 2,
          sendStatus: "success",
          receiveStatus: "answered",
          failReason: "",
          remark: "电话确认车辆已暂停使用",
        },
      ],
      logs: [
        {
          time: "2026-05-17 12:08",
          operator: "平台B同步",
          action: "生成告警",
          status: "待处理",
          remark: "温度高于严重阈值。",
        },
      ],
      createdAt: "2026-05-17 12:08",
      updatedAt: "2026-05-17 12:08",
    },
    {
      id: "alarm-004",
      alarmNo: "ALM202605160006",
      alarmIndex: "single_undervoltage",
      level: AlarmLevel.Warning,
      status: AlarmStatus.Resolved,
      type: "单体压差过大",
      btCode: "BT202605170001",
      deviceNum: "LN202605170001",
      qrCode: "LN202605170001",
      batterySn: "BT202605170001",
      customerName: "河南示例物流有限公司",
      orderNo: "ORD202605170001",
      sourcePlatform: "平台A",
      bmsManufacturers: "嘉佰达",
      alarmTime: "2026-05-16 16:20",
      recoveredAt: "2026-05-16 18:05",
      description: "单体压差短时放大，充电后恢复。",
      currentValue: "压差 58mV",
      threshold: "压差 > 50mV",
      location: "郑州高新区",
      handler: "技术二组",
      mpPush: true,
      repairNo: "",
      pushes: [
        {
          id: "alarm-004-push-1",
          pushType: "mp",
          userName: "张经理",
          userType: "customer",
          userPhone: "13800138001",
          firstPushTime: "2026-05-16 16:21",
          lastPushTime: "2026-05-16 16:21",
          answerTime: "",
          pushCount: 1,
          sendStatus: "success",
          receiveStatus: "unread",
          failReason: "",
          remark: "公众号提醒",
        },
      ],
      logs: [
        {
          time: "2026-05-16 16:20",
          operator: "平台A同步",
          action: "生成告警",
          status: "待处理",
          remark: "单体压差超过预警阈值。",
        },
        {
          time: "2026-05-16 18:05",
          operator: "赵工",
          action: "处理完成",
          status: "已处理",
          remark: "复核充电曲线后恢复，无需报修。",
        },
      ],
      createdAt: "2026-05-16 16:20",
      updatedAt: "2026-05-16 18:05",
    },
    {
      id: "alarm-005",
      alarmNo: "ALM202605150011",
      alarmIndex: "gps",
      level: AlarmLevel.Info,
      status: AlarmStatus.FalseAlarm,
      type: "基站定位漂移",
      btCode: "BT202605170001",
      deviceNum: "LN202605170001",
      qrCode: "LN202605170001",
      batterySn: "BT202605170001",
      customerName: "河南示例物流有限公司",
      orderNo: "ORD202605170001",
      sourcePlatform: "平台A",
      bmsManufacturers: "嘉佰达",
      alarmTime: "2026-05-15 20:10",
      recoveredAt: "2026-05-15 20:42",
      description: "基站定位从高新区漂移到中牟，GPS 回传正常后判定误报。",
      currentValue: "基站位置偏移 18km",
      threshold: "单次定位偏移 > 10km",
      location: "郑州高新区",
      handler: "资产管理部",
      mpPush: false,
      repairNo: "",
      pushes: [],
      logs: [
        {
          time: "2026-05-15 20:10",
          operator: "平台A同步",
          action: "生成告警",
          status: "待处理",
          remark: "定位漂移触发预警。",
        },
        {
          time: "2026-05-15 20:42",
          operator: "王库管",
          action: "标记误报",
          status: "误报",
          remark: "GPS 轨迹连续，判断为基站漂移误报。",
        },
      ],
      createdAt: "2026-05-15 20:10",
      updatedAt: "2026-05-15 20:42",
    },
  ];

  private readonly alarmRules: Array<Record<string, any>> = [
    {
      id: "rule-low-power",
      alarmIndex: "low_power",
      name: "低电量优先处置",
      level: AlarmLevel.Severe,
      enabled: true,
      responseMinutes: 30,
      autoRepair: true,
      defaultHandler: "售后一组",
      escalationReceivers: ["售后一组", "技术二组", "彭总"],
      channels: ["mp", "sms", "phone"],
      remark: "SOC 低于阈值时先通知客户和售后，超时升级到技术负责人。",
      updatedAt: "2026-05-17 09:20",
    },
    {
      id: "rule-temperature",
      alarmIndex: "temperature",
      name: "温度异常强提醒",
      level: AlarmLevel.Severe,
      enabled: true,
      responseMinutes: 20,
      autoRepair: true,
      defaultHandler: "售后一组",
      escalationReceivers: ["售后一组", "技术二组", "彭总"],
      channels: ["phone", "sms"],
      remark: "温度异常需电话确认车辆是否停用，严重告警建议转报修。",
      updatedAt: "2026-05-17 11:55",
    },
    {
      id: "rule-offline",
      alarmIndex: "offline",
      name: "离线设备复核",
      level: AlarmLevel.Warning,
      enabled: true,
      responseMinutes: 120,
      autoRepair: false,
      defaultHandler: "技术二组",
      escalationReceivers: ["技术二组", "资产管理部"],
      channels: ["sms"],
      remark: "库存或在租设备连续离线后先排查平台通讯和设备定位。",
      updatedAt: "2026-05-16 18:30",
    },
    {
      id: "rule-single-undervoltage",
      alarmIndex: "single_undervoltage",
      name: "单体欠压复核",
      level: AlarmLevel.Warning,
      enabled: true,
      responseMinutes: 180,
      autoRepair: false,
      defaultHandler: "技术二组",
      escalationReceivers: ["技术二组", "售后一组"],
      channels: ["mp", "sms"],
      remark: "先复核充放电曲线，持续异常再进入维修流程。",
      updatedAt: "2026-05-16 16:05",
    },
    {
      id: "rule-gps",
      alarmIndex: "gps",
      name: "定位异常观察",
      level: AlarmLevel.Info,
      enabled: true,
      responseMinutes: 240,
      autoRepair: false,
      defaultHandler: "资产管理部",
      escalationReceivers: ["资产管理部"],
      channels: ["mp"],
      remark: "定位漂移先观察轨迹连续性，确认异常再升级。",
      updatedAt: "2026-05-15 19:40",
    },
    {
      id: "rule-mos",
      alarmIndex: "mos",
      name: "MOS 异常转技术",
      level: AlarmLevel.Severe,
      enabled: true,
      responseMinutes: 30,
      autoRepair: true,
      defaultHandler: "技术二组",
      escalationReceivers: ["技术二组", "售后一组", "彭总"],
      channels: ["phone", "sms"],
      remark: "保护板异常默认技术先行判断，严重场景同步售后。",
      updatedAt: "2026-05-15 19:20",
    },
  ];

  private readonly repairLogs: Record<
    string,
    {
      time: string;
      operator: string;
      action: string;
      status: string;
      result: string;
      remark: string;
    }[]
  > = {
    "repair-001": [
      {
        time: "2026-05-17 10:10",
        operator: "客户移动端",
        action: "提交报修",
        status: "待受理",
        result: "已生成报修单",
        remark: "客户上传故障描述和现场地址。",
      },
      {
        time: "2026-05-17 10:28",
        operator: "售后一组",
        action: "受理报修",
        status: "处理中",
        result: "已分配李工",
        remark: "与客户确认上门检测时间。",
      },
      {
        time: "2026-05-17 11:10",
        operator: "李工",
        action: "远程诊断",
        status: "处理中",
        result: "建议上门检测",
        remark: "温度偏高且压差波动，需要现场复核。",
      },
    ],
    "repair-002": [
      {
        time: "2026-05-12 13:45",
        operator: "客户移动端",
        action: "提交报修",
        status: "待受理",
        result: "等待售后受理",
        remark: "充电口松动，客户要求上门确认。",
      },
    ],
    "repair-003": [
      {
        time: "2026-05-16 09:30",
        operator: "王库管",
        action: "内部报修",
        status: "待受理",
        result: "仓库异常转维修",
        remark: "定位模块离线，非客户订单场景。",
      },
      {
        time: "2026-05-16 10:20",
        operator: "赵工",
        action: "开始维修",
        status: "维修中",
        result: "返厂维修",
        remark: "判断为定位模块硬件异常。",
      },
      {
        time: "2026-05-17 16:40",
        operator: "赵工",
        action: "维修完成",
        status: "待入库",
        result: "等待资产入库",
        remark: "维修完成后必须走入库流程，不能直接重新出库。",
      },
    ],
  };

  private readonly assetMovements: Record<
    string,
    {
      type: string;
      title: string;
      time: string;
      operator: string;
      target: string;
      status: string;
      remark: string;
    }[]
  > = {
    "bat-001": [
      {
        type: "入库",
        title: "采购入库",
        time: "2026-04-18 11:20",
        operator: "王库管",
        target: "郑州总仓",
        status: "已完成",
        remark: "BATCH202605 批次验收入库。",
      },
      {
        type: "出库",
        title: "订单首批出库",
        time: "2026-05-10 09:30",
        operator: "王库管",
        target: "河南示例物流有限公司",
        status: "待客户收货",
        remark: "OUT202605170001，绑定 ORD202605170001。",
      },
    ],
    "bat-002": [
      {
        type: "入库",
        title: "采购入库",
        time: "2026-04-18 11:20",
        operator: "王库管",
        target: "郑州总仓",
        status: "已完成",
        remark: "BATCH202605 批次验收入库。",
      },
      {
        type: "出库",
        title: "订单首批出库",
        time: "2026-05-10 09:30",
        operator: "王库管",
        target: "河南示例物流有限公司",
        status: "待客户收货",
        remark: "OUT202605170001，绑定 ORD202605170001。",
      },
      {
        type: "维修",
        title: "客户报修处理中",
        time: "2026-05-17 10:10",
        operator: "售后一组",
        target: "郑州经开区第八大街",
        status: "处理中",
        remark: "车辆启动时电池异常报警，续航明显下降。",
      },
    ],
    "bat-003": [
      {
        type: "入库",
        title: "采购入库",
        time: "2026-04-12 16:40",
        operator: "王库管",
        target: "郑州总仓",
        status: "已完成",
        remark: "BATCH202604 批次备货入库，暂未绑定订单。",
      },
      {
        type: "盘点",
        title: "仓库盘点",
        time: "2026-05-17 08:42",
        operator: "系统同步",
        target: "郑州总仓",
        status: "在库",
        remark: "设备离线，资产仍保持在库状态。",
      },
    ],
  };

  private readonly inboundRecords: Array<Record<string, any>> = [];

  private readonly transferRecords: Array<Record<string, any>> = [
    {
      id: "transfer-bat-003-demo",
      assetId: "bat-003",
      transferNo: "TR202605170003",
      btCode: "BT202605170003",
      fromWarehouse: "郑州总仓",
      toWarehouse: "高新区前置仓",
      status: "待调拨",
      operator: "王库管",
      createdAt: "2026-05-17 14:20",
      remark: "为郑州测试配送订单预留库存。",
    },
  ];

  private readonly disposalRecords: Array<Record<string, any>> = [];

  private readonly inventoryRecords: Array<Record<string, any>> = [
    {
      id: "check-bat-003-demo",
      assetId: "bat-003",
      btCode: "BT202605170003",
      checkNo: "CHK202605170003",
      expectedWarehouse: "郑州总仓",
      actualWarehouse: "郑州总仓",
      result: "MATCHED",
      resultLabel: "账实相符",
      operator: "系统同步",
      checkedAt: "2026-05-17 08:42",
      powerPercent: 0,
      runningStatus: DeviceRunningStatus.Offline,
      syncLocation: false,
      remark: "设备离线，资产仍保持在库状态。",
    },
  ];

  private readonly depreciationRecords: Array<Record<string, any>> = [
    {
      id: "dep-bat-001-2026-05",
      assetId: "bat-001",
      btCode: "BT202605170001",
      depreciationNo: "DEP202605170001",
      period: "2026-05",
      method: "直线法",
      originalValue: 4800,
      salvageValue: 480,
      usefulLifeMonths: 36,
      depreciableAmount: 4320,
      monthlyAmount: 120,
      accumulatedBefore: 0,
      amount: 120,
      accumulatedAfter: 120,
      netValueAfter: 4680,
      operator: "赵财务",
      postedAt: "2026-05-18 09:20",
      remark: "首月租赁运营资产折旧计提。",
    },
    {
      id: "dep-bat-002-2026-05",
      assetId: "bat-002",
      btCode: "BT202605170002",
      depreciationNo: "DEP202605170002",
      period: "2026-05",
      method: "直线法",
      originalValue: 4800,
      salvageValue: 480,
      usefulLifeMonths: 36,
      depreciableAmount: 4320,
      monthlyAmount: 120,
      accumulatedBefore: 0,
      amount: 120,
      accumulatedAfter: 120,
      netValueAfter: 4680,
      operator: "赵财务",
      postedAt: "2026-05-18 09:22",
      remark: "异常运营资产仍按账面规则计提折旧。",
    },
  ];

  private readonly assetFinanceRecords: Array<Record<string, any>> = [];

  private readonly systemAccounts: SystemAccount[] = [
    {
      id: "acc-admin",
      type: "INTERNAL",
      username: "admin",
      name: "系统管理员",
      roleId: "role-admin",
      roleName: "系统管理员",
      department: "总经办",
      customerName: "",
      phone: "13800000001",
      status: "ENABLED",
      lastLoginAt: "2026-05-18 08:45",
      createdAt: "2026-05-01 09:00",
    },
    {
      id: "acc-sales",
      type: "INTERNAL",
      username: "sales01",
      name: "刘销售",
      roleId: "role-sales",
      roleName: "销售",
      department: "销售部",
      customerName: "",
      phone: "13800000002",
      status: "ENABLED",
      lastLoginAt: "2026-05-18 08:20",
      createdAt: "2026-05-01 09:10",
    },
    {
      id: "acc-asset",
      type: "INTERNAL",
      username: "asset01",
      name: "王库管",
      roleId: "role-asset",
      roleName: "资产管理员",
      department: "资产部",
      customerName: "",
      phone: "13800000003",
      status: "ENABLED",
      lastLoginAt: "2026-05-17 19:28",
      createdAt: "2026-05-01 09:20",
    },
    {
      id: "acc-finance",
      type: "INTERNAL",
      username: "finance01",
      name: "赵财务",
      roleId: "role-finance",
      roleName: "财务",
      department: "财务部",
      customerName: "",
      phone: "13800000004",
      status: "ENABLED",
      lastLoginAt: "2026-05-18 09:12",
      createdAt: "2026-05-01 09:30",
    },
    {
      id: "acc-after-sales",
      type: "INTERNAL",
      username: "service01",
      name: "李售后",
      roleId: "role-after-sales",
      roleName: "售后",
      department: "售后部",
      customerName: "",
      phone: "13800000005",
      status: "DISABLED",
      lastLoginAt: "2026-05-12 13:18",
      createdAt: "2026-05-01 09:40",
    },
    {
      id: "acc-customer-admin",
      type: "CUSTOMER",
      username: "hnwl_admin",
      name: "张经理",
      roleId: "role-customer-admin",
      roleName: "客户管理员",
      department: "",
      customerName: "河南示例物流有限公司",
      phone: "13800138001",
      status: "ENABLED",
      lastLoginAt: "2026-05-18 08:02",
      createdAt: "2026-05-02 10:00",
    },
    {
      id: "acc-customer-staff",
      type: "CUSTOMER",
      username: "hnwl_staff01",
      name: "陈调度",
      roleId: "role-customer-staff",
      roleName: "客户员工",
      department: "",
      customerName: "河南示例物流有限公司",
      phone: "13800138006",
      status: "ENABLED",
      lastLoginAt: "2026-05-17 20:16",
      createdAt: "2026-05-02 10:10",
    },
  ];

  private readonly systemRoles: SystemRole[] = [
    {
      id: "role-admin",
      name: "系统管理员",
      scope: "内部后台",
      userCount: 1,
      dataScope: "全部业务与系统配置",
      description: "维护账号、角色、字典、审批流、接口配置和审计日志。",
      permissionSummary: ["系统管理", "账号权限", "接口配置", "操作审计"],
      permissions: [
        {
          code: "system.account.write",
          name: "账号维护",
          module: "系统管理",
          enabled: true,
          sensitive: true,
        },
        {
          code: "system.role.write",
          name: "角色权限维护",
          module: "系统管理",
          enabled: true,
          sensitive: true,
        },
        {
          code: "system.interface.write",
          name: "接口配置维护",
          module: "系统管理",
          enabled: true,
          sensitive: true,
        },
        {
          code: "audit.read",
          name: "查看操作日志",
          module: "系统管理",
          enabled: true,
          sensitive: false,
        },
      ],
      riskNotes: ["不直接修改财务金额", "关键配置必须留痕"],
    },
    {
      id: "role-sales",
      name: "销售",
      scope: "内部后台",
      userCount: 1,
      dataScope: "本人客户和本人订单",
      description: "创建租赁订单、查看合同进度和客户履约状态。",
      permissionSummary: ["租赁订单", "客户信息", "合同进度"],
      permissions: [
        {
          code: "order.write",
          name: "创建/编辑订单",
          module: "租赁订单",
          enabled: true,
          sensitive: false,
        },
        {
          code: "contract.read",
          name: "查看合同",
          module: "租赁订单",
          enabled: true,
          sensitive: false,
        },
        {
          code: "bill.adjust",
          name: "调整账单",
          module: "财务管理",
          enabled: false,
          sensitive: true,
        },
        {
          code: "asset.outbound",
          name: "资产出库",
          module: "固定资产",
          enabled: false,
          sensitive: true,
        },
      ],
      riskNotes: ["不可确认账单", "不可调整库存状态"],
    },
    {
      id: "role-asset",
      name: "资产管理员",
      scope: "内部后台",
      userCount: 1,
      dataScope: "全部电池资产与出入库记录",
      description: "管理电池入库、出库、调拨、维修入库和资产状态。",
      permissionSummary: ["设备管理", "固定资产", "出入库"],
      permissions: [
        {
          code: "asset.write",
          name: "资产台账维护",
          module: "固定资产",
          enabled: true,
          sensitive: false,
        },
        {
          code: "asset.outbound",
          name: "资产出库",
          module: "固定资产",
          enabled: true,
          sensitive: true,
        },
        {
          code: "asset.dispose",
          name: "资产处置",
          module: "固定资产",
          enabled: false,
          sensitive: true,
        },
        {
          code: "bill.read",
          name: "查看账单金额",
          module: "财务管理",
          enabled: false,
          sensitive: true,
        },
      ],
      riskNotes: ["出库必须绑定订单", "维修完成后必须走入库"],
    },
    {
      id: "role-finance",
      name: "财务",
      scope: "内部后台",
      userCount: 1,
      dataScope: "账单、回款和订单财务信息",
      description: "确认账单、登记回款、查看欠款和逾期客户。",
      permissionSummary: ["财务管理", "账单确认", "回款登记"],
      permissions: [
        {
          code: "bill.confirm",
          name: "确认账单",
          module: "财务管理",
          enabled: true,
          sensitive: true,
        },
        {
          code: "bill.payment",
          name: "登记回款",
          module: "财务管理",
          enabled: true,
          sensitive: true,
        },
        {
          code: "bill.adjust",
          name: "调整账单",
          module: "财务管理",
          enabled: true,
          sensitive: true,
        },
        {
          code: "system.interface.write",
          name: "接口配置维护",
          module: "系统管理",
          enabled: false,
          sensitive: true,
        },
      ],
      riskNotes: ["调整账单必须填写原因", "所有金额操作保留审计记录"],
    },
    {
      id: "role-after-sales",
      name: "售后",
      scope: "内部后台",
      userCount: 1,
      dataScope: "报修工单、故障设备和维修记录",
      description: "受理客户报修、派工、记录维修过程和发起维修入库。",
      permissionSummary: ["售后报修", "设备告警", "维修记录"],
      permissions: [
        {
          code: "repair.write",
          name: "报修处理",
          module: "售后报修",
          enabled: true,
          sensitive: false,
        },
        {
          code: "alarm.write",
          name: "告警处理",
          module: "告警管理",
          enabled: true,
          sensitive: false,
        },
        {
          code: "asset.repair_inbound",
          name: "维修入库",
          module: "固定资产",
          enabled: true,
          sensitive: true,
        },
        {
          code: "bill.adjust",
          name: "调整账单",
          module: "财务管理",
          enabled: false,
          sensitive: true,
        },
      ],
      riskNotes: ["客户责任费用需财务确认", "已关闭工单不可再编辑"],
    },
    {
      id: "role-customer-admin",
      name: "客户管理员",
      scope: "客户移动端",
      userCount: 1,
      dataScope: "本公司订单、电池、账单和报修",
      description: "查看本公司订单、确认收货、查看账单并提交报修。",
      permissionSummary: ["客户订单", "收货确认", "账单金额", "报修提交"],
      permissions: [
        {
          code: "customer.order.read",
          name: "查看本公司订单",
          module: "客户移动端",
          enabled: true,
          sensitive: false,
        },
        {
          code: "customer.receipt.confirm",
          name: "确认收货",
          module: "客户移动端",
          enabled: true,
          sensitive: true,
        },
        {
          code: "customer.bill.read",
          name: "查看账单金额",
          module: "客户移动端",
          enabled: true,
          sensitive: true,
        },
        {
          code: "customer.repair.write",
          name: "提交报修",
          module: "客户移动端",
          enabled: true,
          sensitive: false,
        },
      ],
      riskNotes: ["仅能查看本公司数据", "不能访问内部后台"],
    },
    {
      id: "role-customer-staff",
      name: "客户员工",
      scope: "客户移动端",
      userCount: 1,
      dataScope: "本公司订单、电池和报修，不显示金额",
      description: "查看电池状态、提交报修，不可查看账单金额和欠款。",
      permissionSummary: ["客户订单", "电池列表", "报修提交"],
      permissions: [
        {
          code: "customer.order.read",
          name: "查看本公司订单",
          module: "客户移动端",
          enabled: true,
          sensitive: false,
        },
        {
          code: "customer.receipt.confirm",
          name: "确认收货",
          module: "客户移动端",
          enabled: false,
          sensitive: true,
        },
        {
          code: "customer.bill.read",
          name: "查看账单金额",
          module: "客户移动端",
          enabled: false,
          sensitive: true,
        },
        {
          code: "customer.repair.write",
          name: "提交报修",
          module: "客户移动端",
          enabled: true,
          sensitive: false,
        },
      ],
      riskNotes: ["金额字段后端过滤", "不能确认账单"],
    },
  ];

  private readonly dictionaries: DictionaryGroup[] = [
    {
      code: "ASSET_STATUS",
      name: "资产状态",
      owner: "资产部",
      updatedAt: "2026-05-17 18:20",
      items: [
        {
          code: "IN_STOCK",
          label: "在库",
          businessRule: "可出库、可调拨、可盘点",
          usedBy: "固定资产 / 设备管理",
          enabled: true,
        },
        {
          code: "LEASING",
          label: "租赁中",
          businessRule: "必须绑定客户订单和出库单",
          usedBy: "订单 / 客户端",
          enabled: true,
        },
        {
          code: "REPAIRING",
          label: "维修中",
          businessRule: "不可出库，维修完成后必须入库",
          usedBy: "售后 / 资产",
          enabled: true,
        },
        {
          code: "SCRAPPED",
          label: "已报废",
          businessRule: "不可重新投入租赁",
          usedBy: "资产处置",
          enabled: true,
        },
      ],
    },
    {
      code: "ORDER_STATUS",
      name: "租赁订单状态",
      owner: "销售部",
      updatedAt: "2026-05-17 18:25",
      items: [
        {
          code: "DRAFT",
          label: "草稿",
          businessRule: "销售录入，未提交审批",
          usedBy: "租赁订单",
          enabled: true,
        },
        {
          code: "PENDING_OUTBOUND",
          label: "待出库",
          businessRule: "合同会签后进入资产出库",
          usedBy: "租赁订单 / 出库",
          enabled: true,
        },
        {
          code: "PENDING_RECEIPT",
          label: "待客户收货",
          businessRule: "客户 7 天未确认则自动收货",
          usedBy: "订单 / 客户端",
          enabled: true,
        },
        {
          code: "LEASING",
          label: "租赁中",
          businessRule: "客户已确认或系统自动确认收货",
          usedBy: "订单 / 账单",
          enabled: true,
        },
      ],
    },
    {
      code: "BILL_STATUS",
      name: "账单状态",
      owner: "财务部",
      updatedAt: "2026-05-17 18:30",
      items: [
        {
          code: "PENDING_CONFIRM",
          label: "待确认",
          businessRule: "财务确认前客户不可见",
          usedBy: "财务管理",
          enabled: true,
        },
        {
          code: "PENDING_PAYMENT",
          label: "待付款",
          businessRule: "确认后进入客户应付",
          usedBy: "财务 / 客户端",
          enabled: true,
        },
        {
          code: "OVERDUE",
          label: "已逾期",
          businessRule: "到期 7 天未结清自动逾期",
          usedBy: "财务风控",
          enabled: true,
        },
        {
          code: "VOIDED",
          label: "已作废",
          businessRule: "仅管理员可作废，必须保留原因",
          usedBy: "财务审计",
          enabled: true,
        },
      ],
    },
    {
      code: "REPAIR_STATUS",
      name: "报修状态",
      owner: "售后部",
      updatedAt: "2026-05-17 18:35",
      items: [
        {
          code: "PENDING_ACCEPT",
          label: "待受理",
          businessRule: "客户提交或内部发起后等待派工",
          usedBy: "售后报修",
          enabled: true,
        },
        {
          code: "PROCESSING",
          label: "处理中",
          businessRule: "售后已受理，等待检测",
          usedBy: "售后报修",
          enabled: true,
        },
        {
          code: "PENDING_INBOUND",
          label: "待入库",
          businessRule: "维修完成后回到资产入库流程",
          usedBy: "售后 / 资产",
          enabled: true,
        },
        {
          code: "CLOSED",
          label: "已关闭",
          businessRule: "客户确认或内部关闭后不可再编辑",
          usedBy: "售后审计",
          enabled: true,
        },
      ],
    },
  ];

  private readonly platformInterfaces: PlatformInterface[] = [
    {
      id: "if-platform-a",
      name: "平台A设备数据",
      platform: "锂钠安",
      endpoint: "https://api.platform-a.example/devices",
      requestMethod: "GET",
      syncInterval: "5分钟",
      owner: "设备运维组",
      authMode: "Bearer Token",
      credential: "",
      timeoutMs: 8000,
      enabled: true,
      status: "ONLINE",
      lastSyncAt: "2026-05-18 09:05",
      lastResult: "同步 426 条设备运行数据",
    },
    {
      id: "if-platform-b",
      name: "平台B告警数据",
      platform: "第三方BMS平台",
      endpoint: "https://api.platform-b.example/alarms",
      requestMethod: "GET",
      syncInterval: "3分钟",
      owner: "设备运维组",
      authMode: "Bearer Token",
      credential: "",
      timeoutMs: 8000,
      enabled: true,
      status: "ERROR",
      lastSyncAt: "2026-05-18 08:55",
      lastResult: "鉴权失败，等待重新配置 token",
    },
    {
      id: "if-map",
      name: "设备定位服务",
      platform: "地图服务",
      endpoint: "https://restapi.amap.com/v3/geocode",
      requestMethod: "GET",
      syncInterval: "按需",
      owner: "技术部",
      authMode: "API Key",
      credential: process.env.AMAP_KEY || "",
      timeoutMs: 5000,
      enabled: true,
      status: "ONLINE",
      lastSyncAt: "2026-05-18 08:50",
      lastResult: "最近一次查询成功",
    },
    {
      id: "if-sms",
      name: "短信通知接口",
      platform: "短信服务商",
      endpoint: "https://sms.example/send",
      requestMethod: "POST",
      syncInterval: "按需",
      owner: "系统管理员",
      authMode: "AccessKey",
      credential: "",
      timeoutMs: 5000,
      enabled: false,
      status: "DISABLED",
      lastSyncAt: "",
      lastResult: "暂未启用，当前采用站内通知",
    },
  ];

  private readonly approvalFlows: ApprovalFlowConfig[] = [
    {
      id: "flow-sample-delivery",
      name: "送样审批",
      businessType: "样品管理",
      enabled: true,
      nodeCount: 6,
      approvers: [
        "业务员发起",
        "刘少鹏审批",
        "彭总审批",
        "资产管理员协同",
        "业务员测试跟进",
        "固定资产处理去向",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:10",
    },
    {
      id: "flow-purchase-request",
      name: "采购需求审批",
      businessType: "采购管理",
      enabled: true,
      nodeCount: 4,
      approvers: [
        "业务员/需求部门发起",
        "刘少鹏审批",
        "彭总审批",
        "采购抄送执行",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:12",
    },
    {
      id: "flow-purchase-contract",
      name: "采购合同会签",
      businessType: "采购管理",
      enabled: true,
      nodeCount: 8,
      approvers: [
        "采购发起",
        "财务审批",
        "法务审批",
        "技术审批",
        "刘少鹏审批",
        "彭总审批",
        "行政用印",
        "财务/资产抄送",
      ],
      slaHours: 48,
      updatedAt: "2026-05-18 10:14",
    },
    {
      id: "flow-payment-request",
      name: "付款申请",
      businessType: "财务付款",
      enabled: true,
      nodeCount: 6,
      approvers: [
        "发起人",
        "部门负责人审核",
        "财务审核",
        "刘少鹏审批",
        "彭总审批",
        "出纳付款",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:16",
    },
    {
      id: "flow-sales-contract",
      name: "销售/租赁合同会签",
      businessType: "销售租赁",
      enabled: true,
      nodeCount: 9,
      approvers: [
        "合同专员发起",
        "业务负责人审批",
        "财务审批",
        "法务审批",
        "技术审批",
        "刘少鹏审批",
        "彭总审批",
        "行政用印",
        "财务/资产抄送",
      ],
      slaHours: 48,
      updatedAt: "2026-05-18 10:18",
    },
    {
      id: "flow-purchase-inbound",
      name: "采购入库申请",
      businessType: "固定资产",
      enabled: true,
      nodeCount: 4,
      approvers: ["采购发起", "技术部审核", "固定资产专员入库", "财务抄送入账"],
      slaHours: 12,
      updatedAt: "2026-05-18 10:20",
    },
    {
      id: "flow-lease-outbound",
      name: "租赁出库申请",
      businessType: "固定资产",
      enabled: true,
      nodeCount: 4,
      approvers: [
        "业务员发起",
        "资产管理员核对",
        "技术部划拨",
        "财务依据发货单入账",
      ],
      slaHours: 12,
      updatedAt: "2026-05-18 10:22",
    },
    {
      id: "flow-asset-transfer",
      name: "调拨审批",
      businessType: "固定资产",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "业务员发起",
        "技术部审核",
        "彭总审批",
        "固定资产管理员协同",
        "技术/财务抄送",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:24",
    },
    {
      id: "flow-factory-repair",
      name: "返厂维修申请",
      businessType: "售后维修",
      enabled: true,
      nodeCount: 7,
      approvers: [
        "售后发起",
        "技术审核",
        "售后物流发出",
        "固定资产审核",
        "技术协同厂商",
        "售后物流收回",
        "固定资产处理",
      ],
      slaHours: 48,
      updatedAt: "2026-05-18 10:26",
    },
    {
      id: "flow-damage-compensation",
      name: "人为损坏赔偿",
      businessType: "售后索赔",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "技术部发起",
        "业务员审核赔付条款",
        "财务审核赔付金额",
        "彭总审批标准",
        "资产/财务执行",
      ],
      slaHours: 48,
      updatedAt: "2026-05-18 10:28",
    },
    {
      id: "flow-customer-return",
      name: "客户退租审批",
      businessType: "租赁退租",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "业务发起",
        "技术部验收",
        "彭总审批",
        "固定资产回收入库",
        "财务对账记账",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:30",
    },
    {
      id: "flow-customer-buyout",
      name: "客户买断审批",
      businessType: "租赁买断",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "业务发起",
        "财务审批",
        "彭总审批",
        "固定资产出库",
        "财务对账记账",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:32",
    },
    {
      id: "flow-warranty-scrap",
      name: "质保期内电池报废",
      businessType: "质保报废",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "技术部发起",
        "采购签订赔偿/换新协议",
        "财务审核协议",
        "彭总审批",
        "财务/固定资产执行",
      ],
      slaHours: 48,
      updatedAt: "2026-05-18 10:34",
    },
    {
      id: "flow-used-battery-disposal",
      name: "废旧电池处置",
      businessType: "资产处置",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "资产管理员发起",
        "技术部审批",
        "采购签售卖合同",
        "资产管理员出库",
        "财务记账",
      ],
      slaHours: 48,
      updatedAt: "2026-05-18 10:36",
    },
    {
      id: "flow-seal-use",
      name: "用印申请",
      businessType: "行政用印",
      enabled: true,
      nodeCount: 6,
      approvers: [
        "发起人",
        "行政风控审批并加签",
        "所涉部门负责人审批",
        "刘少鹏审批",
        "彭总审批",
        "行政协同用印",
      ],
      slaHours: 12,
      updatedAt: "2026-05-18 10:38",
    },
    {
      id: "flow-business-trip",
      name: "公出申请",
      businessType: "行政人事",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "申请人",
        "部门负责人审批",
        "刘少鹏审批",
        "彭总审批",
        "人事考勤计算",
      ],
      slaHours: 12,
      updatedAt: "2026-05-18 10:40",
    },
    {
      id: "flow-reimbursement",
      name: "报销流程",
      businessType: "财务报销",
      enabled: true,
      nodeCount: 6,
      approvers: [
        "申请人",
        "财务专员审核",
        "财务负责人复核",
        "刘少鹏审批",
        "彭总审批",
        "出纳付款",
      ],
      slaHours: 24,
      updatedAt: "2026-05-18 10:42",
    },
    {
      id: "flow-loan",
      name: "借款申请",
      businessType: "财务借款",
      enabled: true,
      nodeCount: 5,
      approvers: ["发起人", "财务审批", "刘少鹏审批", "彭总审批", "出纳付款"],
      slaHours: 24,
      updatedAt: "2026-05-18 10:44",
    },
    {
      id: "flow-leave-request",
      name: "请假申请",
      businessType: "行政人事",
      enabled: true,
      nodeCount: 5,
      approvers: [
        "发起人",
        "部门负责人审批",
        "刘少鹏审批",
        "彭总审批",
        "行政人事",
      ],
      slaHours: 12,
      updatedAt: "2026-05-18 10:46",
    },
  ];

  private readonly systemParameters: SystemParameter[] = [
    {
      code: "AUTO_RECEIPT_DAYS",
      name: "自动收货天数",
      module: "租赁订单",
      value: 7,
      unit: "天",
      description: "出库后客户未确认收货时，系统自动确认的等待天数。",
      riskLevel: "高",
      updatedAt: "2026-05-17 18:40",
    },
    {
      code: "BILL_OVERDUE_DAYS",
      name: "账单逾期天数",
      module: "财务管理",
      value: 7,
      unit: "天",
      description: "账单到期后超过该天数未结清即标记为逾期。",
      riskLevel: "高",
      updatedAt: "2026-05-17 18:42",
    },
    {
      code: "DEVICE_SYNC_RETRY",
      name: "接口同步重试次数",
      module: "设备管理",
      value: 3,
      unit: "次",
      description: "第三方平台同步失败后的自动重试次数。",
      riskLevel: "中",
      updatedAt: "2026-05-17 18:44",
    },
    {
      code: "PASSWORD_EXPIRE_DAYS",
      name: "密码有效期",
      module: "账号权限",
      value: 90,
      unit: "天",
      description: "内部账号密码到期后需要重新设置。",
      riskLevel: "中",
      updatedAt: "2026-05-17 18:46",
    },
    {
      code: "CUSTOMER_AMOUNT_VISIBLE",
      name: "客户员工金额可见",
      module: "客户移动端",
      value: false,
      unit: "",
      description: "关闭时客户员工不可查看账单金额和欠款金额。",
      riskLevel: "高",
      updatedAt: "2026-05-17 18:48",
    },
  ];

  private readonly systemOperationLogs: SystemOperationLog[] = [
    {
      id: "sys-log-001",
      module: "财务管理",
      action: "登记回款",
      operator: "赵财务",
      target: "BILL202605001",
      result: "成功",
      ip: "10.0.0.24",
      createdAt: "2026-05-18 09:06",
      detail: "银行转账回款 1600 元",
    },
    {
      id: "sys-log-002",
      module: "系统管理",
      action: "测试接口",
      operator: "系统管理员",
      target: "平台B告警数据",
      result: "失败",
      ip: "10.0.0.11",
      createdAt: "2026-05-18 08:55",
      detail: "鉴权失败，需更新 token",
    },
    {
      id: "sys-log-003",
      module: "售后报修",
      action: "受理报修",
      operator: "李售后",
      target: "REP202605170001",
      result: "成功",
      ip: "10.0.0.31",
      createdAt: "2026-05-17 10:28",
      detail: "分配李工上门检测",
    },
    {
      id: "sys-log-004",
      module: "客户移动端",
      action: "确认收货",
      operator: "张经理",
      target: "OUT202605170001",
      result: "成功",
      ip: "223.88.12.8",
      createdAt: "2026-05-17 09:50",
      detail: "客户确认收到首批 2 组电池",
    },
  ];

  private enrichRepair(
    repair: Record<string, any>,
    index = 0,
  ): Record<string, any> {
    const order = repair.orderId
      ? this.orders.find((item) => item.id === repair.orderId)
      : undefined;
    const battery = this.batteries.find(
      (item) => item.btCode === repair.btCode,
    );
    const logs = this.repairLogs[repair.id] ?? [];
    const latestLog = logs.at(-1);
    const sla = this.repairSlaInfo(repair);

    return {
      index: index + 1,
      ...repair,
      sourceLabel:
        repair.source === RepairSource.Internal ? "内部报修" : "客户报修",
      statusLabel: this.repairStatusLabel(repair.status),
      orderNo: order?.orderNo ?? "",
      contractNo: order?.contractNo ?? "",
      salesOwner: order?.salesOwner ?? "",
      deviceNum: battery?.deviceNum ?? "",
      model: battery?.model ?? "",
      specification: battery?.specification ?? "",
      sourcePlatform: battery?.sourcePlatform ?? "",
      runningStatus: battery?.runningStatus ?? "",
      assetStatus: battery?.assetStatus ?? "",
      powerPercent: battery?.powerPercent ?? 0,
      temperature: battery?.temperature ?? 0,
      voltage: battery?.voltage ?? 0,
      location: battery?.location ?? repair.address,
      logs,
      latestLog: latestLog?.action ?? "提交报修",
      latestLogAt: latestLog?.time ?? repair.createdAt,
      logCount: logs.length,
      imageCount: repair.images?.length ?? 0,
      slaHours: sla.hours,
      slaDueAt: sla.dueAt,
      slaStatus: sla.status,
      slaStatusLabel: sla.label,
      slaRemainingText: sla.remainingText,
      slaOverdue: sla.status === "OVERDUE",
      slaDueSoon: sla.status === "DUE_SOON",
      servicePromise: sla.servicePromise,
      customerConfirmRequired:
        repair.source === RepairSource.Customer &&
        repair.status === RepairStatus.Completed,
      customerConfirmedAt: repair.customerConfirmedAt ?? "",
      inboundRequired: repair.status === RepairStatus.PendingInbound,
      canAccept: repair.status === RepairStatus.PendingAccept,
      canStartRepair: repair.status === RepairStatus.Processing,
      canCompleteRepair: repair.status === RepairStatus.Repairing,
      canInbound: repair.status === RepairStatus.PendingInbound,
      canCustomerConfirm:
        repair.source === RepairSource.Customer &&
        repair.status === RepairStatus.Completed &&
        !repair.customerConfirmed,
    };
  }

  private repairStatusLabel(status: string) {
    return (
      {
        [RepairStatus.PendingAccept]: "待受理",
        [RepairStatus.Processing]: "处理中",
        [RepairStatus.Repairing]: "维修中",
        [RepairStatus.PendingInbound]: "待入库",
        [RepairStatus.Completed]: "已完成",
        [RepairStatus.Closed]: "已关闭",
      }[status] ?? status
    );
  }

  private defaultRepairSlaHours(repair: Record<string, any>) {
    if (repair.priority === "紧急") return 24;
    if (repair.source === RepairSource.Customer) return 48;
    return 72;
  }

  private repairSlaInfo(repair: Record<string, any>) {
    const hours = Number(repair.slaHours ?? this.defaultRepairSlaHours(repair));
    const baseAt = repair.acceptedAt || repair.createdAt || this.nowText();
    const dueAt =
      repair.slaDueAt ||
      repair.expectedFinishAt ||
      (Number.isFinite(hours) ? this.addMinutesText(baseAt, hours * 60) : "");
    const dueTime = this.parseTextTime(dueAt);
    const now = Date.now();

    if (repair.status === RepairStatus.Closed) {
      return {
        hours,
        dueAt,
        status: "CLOSED",
        label: "已关闭",
        remainingText: "",
        servicePromise: dueAt ? `服务承诺：${dueAt} 前完成` : "",
      };
    }
    if (repair.status === RepairStatus.Completed) {
      return {
        hours,
        dueAt,
        status: "DONE",
        label: "已完成",
        remainingText: repair.completedAt ? `完成于 ${repair.completedAt}` : "",
        servicePromise: dueAt ? `服务承诺：${dueAt} 前完成` : "",
      };
    }
    if (!dueAt || !Number.isFinite(dueTime)) {
      return {
        hours,
        dueAt: "",
        status: "UNSET",
        label: "未设置",
        remainingText: "",
        servicePromise: "",
      };
    }

    const diffMinutes = Math.floor((dueTime - now) / 60000);
    if (diffMinutes < 0) {
      return {
        hours,
        dueAt,
        status: "OVERDUE",
        label: "已超时",
        remainingText: `超时 ${this.durationText(dueAt)}`,
        servicePromise: `服务承诺：${dueAt} 前完成`,
      };
    }

    return {
      hours,
      dueAt,
      status: diffMinutes <= 360 ? "DUE_SOON" : "NORMAL",
      label: diffMinutes <= 360 ? "即将到期" : "正常",
      remainingText: `剩余 ${this.durationText(this.nowText(), dueAt)}`,
      servicePromise: `服务承诺：${dueAt} 前完成`,
    };
  }

  private createRepairIdentity() {
    const now = new Date();
    const day = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");
    const maxSequence = this.repairs.reduce((max, repair) => {
      const match = String(repair.repairNo ?? "").match(
        new RegExp(`^REP${day}(\\d+)$`),
      );
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const sequence = String(maxSequence + 1).padStart(4, "0");
    return {
      id: `repair-${day}-${sequence}`,
      repairNo: `REP${day}${sequence}`,
    };
  }

  private findRepairTicket(id: string): Record<string, any> {
    const repair = this.repairs.find(
      (item) => item.id === id || item.repairNo === id,
    );
    if (!repair) throw new NotFoundException("报修单不存在");
    return repair;
  }

  private findCustomerRepairTicket(id: string): Record<string, any> {
    const repair = this.findRepairTicket(id);
    const customerOrders = new Set(
      this.orders
        .filter((order) => order.customerId === customerId)
        .map((order) => order.id),
    );
    if (
      repair.source !== RepairSource.Customer ||
      !customerOrders.has(repair.orderId)
    ) {
      throw new NotFoundException("报修单不存在或无权查看。");
    }
    return repair;
  }

  private findActiveRepairForBt(btCode: string, exceptId = "") {
    return this.repairs.find(
      (repair) =>
        repair.btCode === btCode &&
        repair.id !== exceptId &&
        !([RepairStatus.Completed, RepairStatus.Closed] as string[]).includes(
          repair.status,
        ),
    );
  }

  private ensureNoActiveRepair(btCode: string) {
    const activeRepair = this.findActiveRepairForBt(btCode);
    if (activeRepair) {
      throw new BadRequestException(
        `该电池已有未完结报修单 ${activeRepair.repairNo}，请先处理原工单。`,
      );
    }
  }

  private getRepairMaterials(repair: Record<string, any>) {
    if (repair.materials) return repair.materials;
    return [
      {
        name: "定位模块",
        quantity: repair.id === "repair-003" ? 1 : 0,
        amount: repair.id === "repair-003" ? 0 : 0,
        remark: repair.id === "repair-003" ? "质保更换" : "待检测确认",
      },
    ];
  }

  private getRepairCostItems(repair: Record<string, any>) {
    if (repair.costItems) return repair.costItems;
    return repair.costAmount > 0
      ? [
          {
            item: "维修服务费",
            amount: repair.costAmount,
            payer: repair.responsibility === "客户责任" ? "客户" : "公司",
          },
        ]
      : [];
  }

  private appendRepairLog(
    repair: Record<string, any>,
    body: {
      action: string;
      result: string;
      remark?: string;
      operator?: string;
    },
  ) {
    const log = {
      time: this.nowText(),
      operator:
        body.operator || repair.technician || repair.handler || "售后人员",
      action: body.action,
      status: this.repairStatusLabel(repair.status),
      result: body.result,
      remark: body.remark || "",
    };
    this.repairLogs[repair.id] = this.repairLogs[repair.id] ?? [];
    this.repairLogs[repair.id].push(log);
    return log;
  }

  private syncRepairAsset(
    repair: Record<string, any>,
    action: string,
    operator: string,
    remark: string,
  ) {
    const battery = this.batteries.find(
      (item) => item.btCode === repair.btCode,
    );
    if (!battery) return;

    if (
      [RepairStatus.Repairing, RepairStatus.PendingInbound].includes(
        repair.status,
      )
    ) {
      battery.assetStatus = BatteryAssetStatus.Repairing;
      battery.customStatus = "维修中";
      battery.inboundState = "维修";
    }

    if (repair.status === RepairStatus.Completed) {
      battery.assetStatus = BatteryAssetStatus.InStock;
      battery.customStatus = "维修完成已入库";
      battery.inboundState = "在库";
      battery.customerId = null;
      battery.orderId = null;
    }

    const movements = this.assetMovements[battery.id] ?? [];
    this.assetMovements[battery.id] = movements;
    movements.push({
      type: "维修",
      title: action,
      time: this.nowText(),
      operator,
      target: repair.address || battery.location || "售后维修",
      status: this.repairStatusLabel(repair.status),
      remark,
    });
    battery.updatedAt = this.nowText();
  }

  private alarmLevelLabel(level: string) {
    return (
      {
        [AlarmLevel.Severe]: "严重",
        [AlarmLevel.Warning]: "一般",
        [AlarmLevel.Info]: "提示",
      }[level] ?? level
    );
  }

  private alarmStatusLabel(status: string) {
    return (
      {
        [AlarmStatus.Pending]: "待处理",
        [AlarmStatus.Processing]: "处理中",
        [AlarmStatus.Resolved]: "已处理",
        [AlarmStatus.FalseAlarm]: "误报",
      }[status] ?? status
    );
  }

  private parseTextTime(value?: string) {
    if (!value) return Number.NaN;
    const normalized = value.replace(/\//g, "-").trim();
    const match = normalized.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
    );
    if (match) {
      const [, year, month, day, hour, minute, second = "0"] = match;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ).getTime();
    }
    return new Date(normalized.replace(" ", "T")).getTime();
  }

  private formatTextTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, "0");
    return [
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    ].join(" ");
  }

  private addMinutesText(value: string, minutes: number) {
    const start = this.parseTextTime(value);
    if (!Number.isFinite(start)) return "";
    return this.formatTextTime(new Date(start + minutes * 60000));
  }

  private durationText(startValue?: string, endValue?: string) {
    const start = this.parseTextTime(startValue);
    const end = this.parseTextTime(endValue) || Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
    const minutes = Math.max(Math.floor((end - start) / 60000), 0);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;
    if (days) return `${days}天${hours}小时${rest}分钟`;
    if (hours) return `${hours}小时${rest}分钟`;
    return `${rest}分钟`;
  }

  private defaultAlarmResponseMinutes(level: string) {
    if (level === AlarmLevel.Severe) return 30;
    if (level === AlarmLevel.Warning) return 120;
    return 240;
  }

  private findAlarmRule(alarmIndex: string) {
    return this.alarmRules.find(
      (rule) => rule.alarmIndex === alarmIndex && rule.enabled !== false,
    );
  }

  private findAlarmRuleById(id: string) {
    const rule = this.alarmRules.find(
      (item) => item.id === id || item.alarmIndex === id,
    );
    if (!rule) throw new NotFoundException("告警规则不存在");
    return rule;
  }

  private findAlarm(id: string) {
    const alarm = this.alarms.find(
      (item) => item.id === id || item.alarmNo === id,
    );
    if (!alarm) throw new NotFoundException("告警不存在");
    return alarm;
  }

  private appendAlarmLog(
    alarm: Record<string, any>,
    action: string,
    status: string,
    operator: string,
    remark: string,
  ) {
    alarm.logs = alarm.logs ?? [];
    alarm.logs.unshift({
      time: this.nowText(),
      operator,
      action,
      status,
      remark,
    });
    alarm.updatedAt = this.nowText();
  }

  private enrichAlarm(
    alarm: Record<string, any>,
    index = 0,
  ): Record<string, any> {
    const battery = this.batteries.find((item) => item.btCode === alarm.btCode);
    const order =
      this.orders.find((item) => item.orderNo === alarm.orderNo) ??
      (battery?.orderId
        ? this.orders.find((item) => item.id === battery.orderId)
        : undefined);
    const repair = alarm.repairNo
      ? this.repairs.find((item) => item.repairNo === alarm.repairNo)
      : undefined;
    const closed = [AlarmStatus.Resolved, AlarmStatus.FalseAlarm].includes(
      alarm.status,
    );
    const silenceUntilTime = this.parseTextTime(alarm.silenceUntil);
    const isSilenced =
      !closed &&
      Number.isFinite(silenceUntilTime) &&
      silenceUntilTime > Date.now();
    const rule = this.findAlarmRule(alarm.alarmIndex);
    const responseMinutes = Number(
      rule?.responseMinutes ?? this.defaultAlarmResponseMinutes(alarm.level),
    );
    const slaDueAt = this.addMinutesText(alarm.alarmTime, responseMinutes);
    const nextEscalationDueAt = alarm.nextEscalationDueAt || slaDueAt;
    const dueAt = this.parseTextTime(nextEscalationDueAt);
    const isSlaOverdue =
      !closed && !isSilenced && Number.isFinite(dueAt) && dueAt < Date.now();
    const escalationLevel = Number(alarm.escalationLevel ?? 0);
    const receivers = Array.isArray(rule?.escalationReceivers)
      ? rule?.escalationReceivers
      : [];
    const escalationTarget =
      receivers[Math.min(escalationLevel, Math.max(receivers.length - 1, 0))] ??
      rule?.defaultHandler ??
      alarm.handler ??
      "";

    return {
      index: index + 1,
      ...alarm,
      levelLabel: this.alarmLevelLabel(alarm.level),
      statusLabel: this.alarmStatusLabel(alarm.status),
      btCode: alarm.btCode ?? battery?.btCode ?? "",
      deviceNum: alarm.deviceNum ?? battery?.deviceNum ?? "",
      qrCode: alarm.qrCode ?? battery?.qrCode ?? battery?.deviceNum ?? "",
      batterySn: alarm.batterySn ?? battery?.batterySn ?? battery?.btCode ?? "",
      customerName:
        alarm.customerName ?? order?.customerName ?? battery?.userName ?? "",
      customerShortName:
        order?.customerShortName ??
        alarm.customerName ??
        battery?.userName ??
        "",
      orderId: order?.id ?? battery?.orderId ?? "",
      orderNo: alarm.orderNo ?? order?.orderNo ?? "",
      sourcePlatform: alarm.sourcePlatform ?? battery?.sourcePlatform ?? "",
      bmsManufacturers:
        alarm.bmsManufacturers ?? battery?.bmsManufacturers ?? "",
      powerPercent: battery?.powerPercent ?? null,
      voltage: battery?.voltage ?? null,
      temperature: battery?.temperature ?? null,
      location: alarm.location ?? battery?.location ?? "",
      duration: this.durationText(alarm.alarmTime, alarm.recoveredAt),
      pushCount: alarm.pushes?.length ?? 0,
      logCount: alarm.logs?.length ?? 0,
      repairId: repair?.id ?? "",
      ruleId: rule?.id ?? "",
      ruleName: rule?.name ?? "未配置规则",
      responseMinutes,
      slaDueAt,
      nextEscalationDueAt,
      slaStatus: closed
        ? "closed"
        : isSilenced
          ? "silenced"
          : isSlaOverdue
            ? "overdue"
            : "normal",
      isSlaOverdue,
      isSilenced,
      silenceUntil: alarm.silenceUntil || "",
      silenceReason: alarm.silenceReason || "",
      silenceOperator: alarm.silenceOperator || "",
      silencedAt: alarm.silencedAt || "",
      silenceRemaining: isSilenced
        ? this.durationText(this.nowText(), alarm.silenceUntil)
        : "",
      escalationLevel,
      escalationTarget,
      notificationChannels: rule?.channels ?? [],
      autoRepairSuggested: Boolean(rule?.autoRepair),
      canProcess: !closed,
      canPush: !closed && !isSilenced,
      canSilence: !closed && !isSilenced,
      canUnsilence: !closed && isSilenced,
      canEscalate: !closed && !isSilenced && Boolean(rule),
      canCreateRepair:
        alarm.level === AlarmLevel.Severe && !alarm.repairNo && !closed,
    };
  }

  private alarmQueryRows(
    query: Record<string, any> = {},
  ): Record<string, any>[] {
    const keyword = String(query.keyword ?? "")
      .trim()
      .toLowerCase();
    const silenceStatus = String(query.silenceStatus ?? query.silence ?? "");
    const startAt = this.parseTextTime(query.startAt || query.startTime);
    const endAt = this.parseTextTime(query.endAt || query.endTime);

    return [...this.alarms]
      .sort(
        (a, b) =>
          this.parseTextTime(b.alarmTime) - this.parseTextTime(a.alarmTime),
      )
      .map((alarm, index) => this.enrichAlarm(alarm, index))
      .filter((alarm) => {
        if (query.alarmIndex && alarm.alarmIndex !== query.alarmIndex)
          return false;
        if (query.level && alarm.level !== query.level) return false;
        if (query.status && alarm.status !== query.status) return false;
        if (silenceStatus === "silenced" && !alarm.isSilenced) return false;
        if (silenceStatus === "normal" && alarm.isSilenced) return false;

        const alarmTime = this.parseTextTime(alarm.alarmTime);
        if (Number.isFinite(startAt) && alarmTime < startAt) return false;
        if (Number.isFinite(endAt) && alarmTime > endAt) return false;

        if (!keyword) return true;
        return [
          alarm.alarmNo,
          alarm.type,
          alarm.btCode,
          alarm.deviceNum,
          alarm.customerName,
          alarm.orderNo,
          alarm.sourcePlatform,
          alarm.handler,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .map((alarm, index) => ({ ...alarm, index: index + 1 }));
  }

  private alarmIdsFromBody(body: Record<string, any>) {
    const ids = Array.isArray(body.ids)
      ? body.ids
      : String(body.ids ?? "")
          .split(/[\s,，、;；]+/)
          .map((item) => item.trim());
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length)
      throw new BadRequestException("请选择需要操作的告警。");
    return uniqueIds;
  }

  private approvalStatusLabel(status: string) {
    return (
      {
        [ApprovalStatus.Draft]: "草稿",
        [ApprovalStatus.Processing]: "审批中",
        [ApprovalStatus.Approved]: "已通过",
        [ApprovalStatus.Rejected]: "已驳回",
        [ApprovalStatus.Cancelled]: "已撤销",
      }[status] ?? status
    );
  }

  private approvalTypeLabel(type: string) {
    return (
      {
        SAMPLE_DELIVERY: "送样审批",
        PURCHASE_REQUEST: "采购需求审批",
        PURCHASE_CONTRACT: "采购合同会签",
        PAYMENT_REQUEST: "付款申请",
        SALES_CONTRACT: "销售/租赁合同会签",
        PURCHASE_INBOUND: "采购入库申请",
        LEASE_OUTBOUND: "租赁出库申请",
        ASSET_TRANSFER: "调拨审批",
        FACTORY_REPAIR: "返厂维修申请",
        DAMAGE_COMPENSATION: "人为损坏赔偿",
        CUSTOMER_RETURN: "客户退租审批",
        CUSTOMER_BUYOUT: "客户买断审批",
        WARRANTY_SCRAP: "质保期内电池报废",
        USED_BATTERY_DISPOSAL: "废旧电池处置",
        SEAL_USE: "用印申请",
        BUSINESS_TRIP: "公出申请",
        REIMBURSEMENT: "报销流程",
        LOAN: "借款申请",
        LEAVE_REQUEST: "请假申请",
        CONTRACT: "合同会签",
        ASSET_OUTBOUND: "资产出库",
        REPAIR_COST: "维修费用",
        BILL_ADJUST: "账单调整",
        GENERAL: "通用审批",
      }[type] ?? type
    );
  }

  private nowText() {
    return this.formatTextTime(new Date());
  }

  private scheduleAutomationTasks() {
    this.automationState.intervalMs = this.automationIntervalMs;
    if (!this.automationState.enabled) return;

    this.automationState.nextRunAt = this.addMinutesText(
      this.nowText(),
      Math.ceil(this.automationIntervalMs / 60000),
    );
    this.automationTimer = setInterval(() => {
      try {
        this.runAutomationTasks({
          operator: "系统自动任务",
          trigger: "SCHEDULED",
        });
      } catch (error) {
        this.automationState.lastResult = {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
        this.automationState.lastRunAt = this.nowText();
      }
    }, this.automationIntervalMs);
    this.automationTimer.unref?.();
  }

  private autoReceiveOutbounds(asOfDate = this.dateText(), operator = "系统自动任务") {
    const receivedOutbounds: Record<string, any>[] = [];
    const now = this.nowText();
    this.outbounds
      .filter(
        (outbound) =>
          outbound.status === OutboundStatus.PendingReceipt &&
          String(outbound.autoReceiveAt || "") !== "" &&
          String(outbound.autoReceiveAt || "") <= asOfDate,
      )
      .forEach((outbound) => {
        outbound.status = OutboundStatus.AutoReceived;
        outbound.receivedAt = now;
        outbound.autoReceivedBy = operator;
        outbound.autoReceivedAt = now;

        outbound.btCodes?.forEach((btCode: string) => {
          const battery = this.batteries.find((item) => item.btCode === btCode);
          if (!battery) return;
          battery.customStatus = "正常运营";
          battery.updatedAt = now;
          this.appendAssetMovement(battery.id, {
            type: "收货",
            title: "系统自动收货",
            time: now,
            operator,
            target: outbound.customerName || outbound.orderId,
            status: "自动收货",
            remark: `${outbound.outboundNo} 到期自动确认收货。`,
          });
        });

        const order = this.orders.find((item) => item.id === outbound.orderId);
        if (order) {
          this.appendOrderEvent(
            order,
            "系统自动收货",
            `${outbound.outboundNo} 已超过自动收货日，系统按规则确认 ${outbound.btCodes?.length ?? 0} 组电池收货。`,
          );
          order.updatedAt = now;
          this.syncOrderOperationalState(order);
        }
        receivedOutbounds.push({
          id: outbound.id,
          outboundNo: outbound.outboundNo,
          orderId: outbound.orderId,
          orderNo: order?.orderNo ?? "",
          btCodes: outbound.btCodes ?? [],
          receivedAt: now,
        });
      });

    return {
      autoReceivedCount: receivedOutbounds.length,
      receivedOutbounds,
    };
  }

  runAutomationTasks(body: Record<string, any> = {}) {
    const operator =
      String(body.operator ?? "").trim() || "系统自动任务";
    const trigger = String(body.trigger ?? "").trim() || "MANUAL";
    const asOfDate = String(body.asOfDate ?? "").trim() || this.dateText();
    const receiptResult = this.autoReceiveOutbounds(asOfDate, operator);
    const financeResult = this.runFinanceScheduler({
      asOfDate,
      operator,
      trigger,
      persist: false,
    });
    this.automationState.lastRunAt = this.nowText();
    this.automationState.nextRunAt = this.addMinutesText(
      this.nowText(),
      Math.ceil(this.automationIntervalMs / 60000),
    );
    this.automationState.lastResult = {
      ok: true,
      trigger,
      asOfDate,
      receipt: receiptResult,
      finance: financeResult,
    };
    this.persistMockState();
    return this.automationState.lastResult;
  }

  getAutomationState() {
    return {
      ...this.automationState,
      intervalMs: this.automationIntervalMs,
      pendingAutoReceiptCount: this.outbounds.filter(
        (outbound) =>
          outbound.status === OutboundStatus.PendingReceipt &&
          String(outbound.autoReceiveAt || "") !== "" &&
          String(outbound.autoReceiveAt || "") <= this.dateText(),
      ).length,
    };
  }

  runAutoReceiveJob(body: Record<string, any> = {}) {
    const operator =
      String(body.operator ?? "").trim() || "系统自动任务";
    const asOfDate = String(body.asOfDate ?? "").trim() || this.dateText();
    const result = this.autoReceiveOutbounds(asOfDate, operator);
    this.automationState.runCount = Number(this.automationState.runCount || 0) + 1;
    this.automationState.lastRunAt = this.nowText();
    this.automationState.nextRunAt = this.addMinutesText(
      this.nowText(),
      Math.ceil(this.automationIntervalMs / 60000),
    );
    this.automationState.lastResult = {
      ok: true,
      trigger: "AUTO_RECEIVE_MANUAL",
      asOfDate,
      receipt: result,
    };
    this.persistMockState();
    return {
      ...result,
      automationState: this.getAutomationState(),
    };
  }

  private sanitizeFileName(value: unknown) {
    const name = String(value || "attachment")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    return name || "attachment";
  }

  private attachmentDisplayName(item: unknown) {
    if (item && typeof item === "object") {
      const entry = item as Record<string, any>;
      return String(entry.name ?? entry.fileName ?? entry.originalName ?? "")
        .trim();
    }
    return String(item ?? "").trim();
  }

  uploadFiles(files: Array<Record<string, any>> = [], body: Record<string, any>) {
    if (!files.length) {
      throw new BadRequestException("请至少选择一个附件文件。");
    }

    const category = this.sanitizeFileName(body.category || "general");
    const businessId = String(body.businessId ?? "").trim();
    const businessType = String(body.businessType ?? "").trim();
    const uploadedBy = String(body.operator ?? body.uploadedBy ?? "").trim() || "系统";
    const targetDir = join(this.uploadDirPath, category);
    mkdirSync(targetDir, { recursive: true });

    const uploadedAt = this.nowText();
    const metas = files.map((file) => {
      const originalName = this.sanitizeFileName(file.originalname || file.name);
      const ext = extname(originalName).slice(0, 16);
      const id = `file-${randomUUID()}`;
      const storedName = `${id}${ext}`;
      const storageKey = `${category}/${storedName}`;
      const buffer = file.buffer as Buffer | undefined;
      if (!buffer?.length) {
        throw new BadRequestException(`${originalName} 文件内容为空。`);
      }
      writeFileSync(join(targetDir, storedName), buffer);

      const meta: UploadedFileMeta = {
        id,
        name: originalName,
        fileName: originalName,
        storedName,
        storageKey,
        category,
        businessId,
        businessType,
        mimeType: String(file.mimetype || "application/octet-stream"),
        size: Number(file.size || buffer.length),
        uploadedAt,
        uploadedBy,
        fileUrl: `/api/mock/files/${id}`,
      };
      this.uploadedFiles.unshift(meta);
      return meta;
    });

    this.persistMockState();
    return {
      uploadedCount: metas.length,
      files: metas,
    };
  }

  getUploadedFile(id: string) {
    const meta = this.uploadedFiles.find((file) => file.id === id);
    if (!meta) throw new NotFoundException("附件不存在");
    const fullPath = join(this.uploadDirPath, meta.storageKey);
    if (!existsSync(fullPath)) throw new NotFoundException("附件文件已丢失");
    return {
      meta,
      buffer: readFileSync(fullPath),
    };
  }

  private bindUploadedFilesToApproval(approval: Record<string, any>) {
    const attachments = this.normalizeApprovalAttachments(approval.attachments);
    approval.attachments = attachments;
    attachments.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const fileId = String((item as Record<string, any>).id ?? "").trim();
      if (!fileId) return;
      const meta = this.uploadedFiles.find((file) => file.id === fileId);
      if (!meta) return;
      meta.businessId = approval.id;
      meta.businessType = approval.type || "APPROVAL";
      meta.fileUrl = `/api/mock/files/${meta.id}`;
      (item as Record<string, any>).fileUrl = meta.fileUrl;
      (item as Record<string, any>).uploadedAt =
        (item as Record<string, any>).uploadedAt || meta.uploadedAt;
      (item as Record<string, any>).uploadedBy =
        (item as Record<string, any>).uploadedBy || meta.uploadedBy;
    });
  }

  private bindUploadedFilesToRepair(repair: Record<string, any>) {
    const images = this.normalizeApprovalAttachments(repair.images ?? []);
    repair.images = images;
    images.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const fileId = String((item as Record<string, any>).id ?? "").trim();
      if (!fileId) return;
      const meta = this.uploadedFiles.find((file) => file.id === fileId);
      if (!meta) return;
      meta.businessId = repair.id;
      meta.businessType = "REPAIR";
      meta.fileUrl = `/api/mock/files/${meta.id}`;
      (item as Record<string, any>).fileUrl = meta.fileUrl;
      (item as Record<string, any>).uploadedAt =
        (item as Record<string, any>).uploadedAt || meta.uploadedAt;
      (item as Record<string, any>).uploadedBy =
        (item as Record<string, any>).uploadedBy || meta.uploadedBy;
    });
  }

  private resolveActor(body: Record<string, any> = {}, fallbackOperator = "") {
    const actorId = String(body.actorId ?? "").trim();
    const actorRoleId = String(body.actorRoleId ?? "").trim();
    const operator = String(body.operator ?? fallbackOperator ?? "").trim();
    const account = this.systemAccounts.find(
      (item) =>
        item.id === actorId ||
        item.username === actorId ||
        item.name === operator ||
        item.username === operator,
    );
    if (account && account.status !== "ENABLED") {
      throw new BadRequestException(`账号 ${account.name} 已停用，不能执行该操作。`);
    }
    const role =
      this.systemRoles.find((item) => item.id === (account?.roleId || actorRoleId)) ??
      this.systemRoles.find((item) => item.name === body.actorRoleName);
    const permissions = new Set(
      role?.permissions
        ?.filter((permission) => permission.enabled)
        .map((permission) => permission.code) ?? [],
    );
    return {
      account,
      role,
      name: account?.name || operator || role?.name || "未识别账号",
      permissions,
    };
  }

  private assertPermission(
    body: Record<string, any> = {},
    permissionCode: string,
    fallbackOperator = "",
  ) {
    const actor = this.resolveActor(body, fallbackOperator);
    if (actor.name === "系统自动任务") return actor;
    if (actor.role?.id === "role-admin") return actor;
    if (!actor.role || !actor.permissions.has(permissionCode)) {
      const label =
        {
          "order.write": "租赁订单维护",
          "asset.outbound": "资产出入库",
          "bill.confirm": "账单确认",
          "bill.adjust": "账单调整",
          "bill.payment": "回款登记",
          "customer.receipt.confirm": "客户收货确认",
        }[permissionCode] ?? permissionCode;
      throw new BadRequestException(
        `${actor.name} 缺少「${label}」权限，不能执行该订单操作。`,
      );
    }
    return actor;
  }

  private resolveApprovalOperator(operator: unknown, applicant: string) {
    const value = String(operator ?? "").trim();
    if (!value || value === "申请人" || value === "发起人") return applicant;
    return value;
  }

  private approvalNodeOverrides(type: string): Array<Partial<ApprovalFlowNodeInput>> {
    return (
      {
        PURCHASE_CONTRACT: [
          {},
          {
            condition: { field: "amount", operator: "gt", value: 0 },
            conditionLabel: "采购金额大于 0 时财务审批",
          },
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "amount", operator: "gte", value: 30000 },
                { field: "paymentTerm", operator: "includes", value: "预付" },
              ],
            },
            conditionLabel: "采购金额达到 30000 元或存在预付款条款时法务审批",
          },
          {
            condition: {
              field: "contractType",
              operator: "in",
              value: ["电池采购合同", "电柜采购合同", "零部件采购合同"],
            },
            conditionLabel: "涉及电池、电柜或零部件采购时技术审批",
          },
          {
            condition: { field: "amount", operator: "gte", value: 50000 },
            conditionLabel: "采购金额达到 50000 元时刘少鹏审批",
          },
          {
            condition: { field: "amount", operator: "gte", value: 100000 },
            conditionLabel: "采购金额达到 100000 元时彭总审批",
          },
        ],
        PAYMENT_REQUEST: [
          {},
          {},
          {},
          {
            condition: { field: "paymentAmount", operator: "gte", value: 10000 },
            conditionLabel: "付款金额达到 10000 元时刘少鹏审批",
          },
          {
            condition: { field: "paymentAmount", operator: "gte", value: 50000 },
            conditionLabel: "付款金额达到 50000 元时彭总审批",
          },
        ],
        SALES_CONTRACT: [
          {},
          {},
          {},
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "contractType", operator: "eq", value: "联营合同" },
                { field: "amount", operator: "gte", value: 30000 },
              ],
            },
            conditionLabel: "联营合同或押金金额较大时法务审批",
          },
          {},
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "contractType", operator: "eq", value: "联营合同" },
                { field: "amount", operator: "gte", value: 20000 },
              ],
            },
            conditionLabel: "联营合同或押金金额达到 20000 元时刘少鹏审批",
          },
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "contractType", operator: "eq", value: "联营合同" },
                { field: "amount", operator: "gte", value: 100000 },
              ],
            },
            conditionLabel: "联营合同或押金金额达到 100000 元时彭总审批",
          },
        ],
        CUSTOMER_RETURN: [
          {},
          {},
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "depositRefundAmount", operator: "gte", value: 5000 },
                { field: "damageClaimAmount", operator: "gt", value: 0 },
                { field: "returnQuantity", operator: "gte", value: 20 },
              ],
            },
            conditionLabel: "存在退款/索赔金额较大或批量退租时彭总审批",
          },
        ],
        CUSTOMER_BUYOUT: [
          {},
          {},
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "buyoutType", operator: "eq", value: "未到期买断" },
                { field: "buyoutAmount", operator: "gte", value: 30000 },
              ],
            },
            conditionLabel: "未到期买断或买断金额达到 30000 元时彭总审批",
          },
        ],
        USED_BATTERY_DISPOSAL: [
          {},
          {},
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "buyerName", operator: "exists" },
                { field: "saleAmount", operator: "gt", value: 0 },
              ],
            },
            conditionLabel: "存在出售对象或销售金额时采购签订售卖合同",
          },
        ],
        SEAL_USE: [
          {},
          {},
          {},
          {
            condition: {
              field: "sealType",
              operator: "in",
              value: ["公章", "合同章", "法人章"],
            },
            conditionLabel: "使用公章、合同章或法人章时刘少鹏审批",
          },
          {
            condition: {
              logic: "any",
              conditions: [
                { field: "sealType", operator: "eq", value: "法人章" },
                { field: "copies", operator: "gte", value: 5 },
              ],
            },
            conditionLabel: "使用法人章或份数较多时彭总审批",
          },
        ],
        BUSINESS_TRIP: [
          {},
          {},
          {
            condition: { field: "budgetAmount", operator: "gte", value: 1000 },
            conditionLabel: "出差预算达到 1000 元时刘少鹏审批",
          },
          {
            condition: { field: "budgetAmount", operator: "gte", value: 5000 },
            conditionLabel: "出差预算达到 5000 元时彭总审批",
          },
        ],
        REIMBURSEMENT: [
          {},
          {},
          {
            condition: { field: "amount", operator: "gte", value: 500 },
            conditionLabel: "报销金额达到 500 元时财务负责人复核",
          },
          {
            condition: { field: "amount", operator: "gte", value: 3000 },
            conditionLabel: "报销金额达到 3000 元时刘少鹏审批",
          },
          {
            condition: { field: "amount", operator: "gte", value: 10000 },
            conditionLabel: "报销金额达到 10000 元时彭总审批",
          },
        ],
        LOAN: [
          {},
          {},
          {
            condition: { field: "loanAmount", operator: "gte", value: 3000 },
            conditionLabel: "借款金额达到 3000 元时刘少鹏审批",
          },
          {
            condition: { field: "loanAmount", operator: "gte", value: 10000 },
            conditionLabel: "借款金额达到 10000 元时彭总审批",
          },
        ],
        LEAVE_REQUEST: [
          {},
          {},
          {
            condition: { field: "days", operator: "gte", value: 3 },
            conditionLabel: "请假天数达到 3 天时刘少鹏审批",
          },
          {
            condition: { field: "days", operator: "gte", value: 7 },
            conditionLabel: "请假天数达到 7 天时彭总审批",
          },
        ],
        BILL_ADJUST: [
          {},
          {},
          {
            condition: { field: "amount", operator: "gte", value: 1000 },
            conditionLabel: "账单调整金额达到 1000 元时总经理审批",
          },
        ],
      } satisfies Record<string, Array<Partial<ApprovalFlowNodeInput>>>
    )[type] ?? [];
  }

  private approvalConditionFieldLabel(field: string) {
    return (
      {
        amount: "审批金额",
        paymentAmount: "付款金额",
        depositTotal: "押金金额",
        depositRefundAmount: "退款金额",
        damageClaimAmount: "索赔金额",
        buyoutAmount: "买断金额",
        budgetAmount: "预算金额",
        loanAmount: "借款金额",
        days: "请假天数",
        returnQuantity: "退租数量",
        copies: "用印份数",
        contractType: "合同类型",
        paymentTerm: "付款条款",
        buyoutType: "买断类型",
        sealType: "印章类型",
        buyerName: "出售对象",
        saleAmount: "出售金额",
      }[field] ?? field
    );
  }

  private describeApprovalCondition(
    condition?: ApprovalCondition | ApprovalCondition[],
  ): string {
    if (!condition) return "";
    if (Array.isArray(condition)) {
      return condition
        .map((item) => this.describeApprovalCondition(item))
        .filter(Boolean)
        .join(" 且 ");
    }

    if (Array.isArray(condition.conditions) && condition.conditions.length) {
      const text = condition.conditions
        .map((item) => this.describeApprovalCondition(item))
        .filter(Boolean)
        .join(condition.logic === "any" ? " 或 " : " 且 ");
      return text;
    }

    const field = this.approvalConditionFieldLabel(
      String(condition.field ?? "").trim(),
    );
    const operatorMap: Record<string, string> = {
      eq: "=",
      neq: "!=",
      gt: ">",
      gte: ">=",
      lt: "<",
      lte: "<=",
      includes: "包含",
      in: "属于",
      exists: "已填写",
      not_exists: "未填写",
      truthy: "为真",
      falsy: "为假",
    };
    const operator = String(condition.operator ?? "eq").trim().toLowerCase();
    if (["exists", "not_exists", "truthy", "falsy"].includes(operator)) {
      return `${field}${operatorMap[operator] ?? operator}`;
    }
    const value = Array.isArray(condition.value)
      ? condition.value.join(" / ")
      : String(condition.value ?? "");
    return `${field} ${operatorMap[operator] ?? operator} ${value}`.trim();
  }

  private toApprovalNumber(value: unknown, fallback = 0) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : fallback;
  }

  private buildApprovalContext(source: Record<string, any>): Record<string, any> {
    const formValues =
      source.formValues && typeof source.formValues === "object"
        ? (source.formValues as Record<string, any>)
        : {};
    const amount = this.toApprovalNumber(
      source.amount ??
        formValues.amount ??
        formValues.paymentAmount ??
        formValues.depositTotal ??
        formValues.buyoutAmount ??
        formValues.loanAmount ??
        formValues.budgetAmount,
    );

    return {
      ...formValues,
      formValues,
      type: source.type,
      businessId: source.businessId,
      businessNo: source.businessNo,
      customerName: source.customerName,
      applicant: source.applicant,
      department: source.department,
      priority: source.priority,
      amount,
      paymentAmount: this.toApprovalNumber(formValues.paymentAmount, amount),
      depositTotal: this.toApprovalNumber(formValues.depositTotal, amount),
      depositRefundAmount: this.toApprovalNumber(formValues.depositRefundAmount),
      damageClaimAmount: this.toApprovalNumber(
        formValues.damageClaimAmount ?? formValues.claimAmount,
      ),
      claimAmount: this.toApprovalNumber(formValues.claimAmount),
      buyoutAmount: this.toApprovalNumber(formValues.buyoutAmount, amount),
      budgetAmount: this.toApprovalNumber(formValues.budgetAmount, amount),
      loanAmount: this.toApprovalNumber(formValues.loanAmount, amount),
      days: this.toApprovalNumber(formValues.days),
      returnQuantity: this.toApprovalNumber(formValues.returnQuantity),
      buyoutQuantity: this.toApprovalNumber(formValues.buyoutQuantity),
      copies: this.toApprovalNumber(formValues.copies),
      saleAmount: this.toApprovalNumber(formValues.saleAmount, amount),
      contractType: String(formValues.contractType ?? "").trim(),
      paymentTerm: String(formValues.paymentTerm ?? "").trim(),
      buyoutType: String(formValues.buyoutType ?? "").trim(),
      sealType: String(formValues.sealType ?? "").trim(),
      buyerName: String(formValues.buyerName ?? "").trim(),
    };
  }

  private approvalContextValue(context: Record<string, any>, field: string): unknown {
    return field
      .split(".")
      .filter(Boolean)
      .reduce<unknown>((value, key) => {
        if (value && typeof value === "object") {
          return (value as Record<string, any>)[key];
        }
        return undefined;
      }, context);
  }

  private isEmptyApprovalValue(value: unknown): boolean {
    return (
      value == null ||
      String(value).trim() === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  private compareApprovalValues(left: unknown, right: unknown): number {
    const leftNumber = this.toApprovalNumber(left, Number.NaN);
    const rightNumber = this.toApprovalNumber(right, Number.NaN);
    if (
      Number.isFinite(leftNumber) &&
      Number.isFinite(rightNumber) &&
      !this.isEmptyApprovalValue(left) &&
      !this.isEmptyApprovalValue(right)
    ) {
      return leftNumber - rightNumber;
    }
    return String(left ?? "")
      .trim()
      .localeCompare(String(right ?? "").trim(), "zh-CN");
  }

  private evaluateApprovalCondition(
    condition: ApprovalCondition | ApprovalCondition[] | undefined,
    context: Record<string, any>,
  ): boolean {
    if (!condition) return true;
    if (Array.isArray(condition)) {
      return condition.every((item) =>
        this.evaluateApprovalCondition(item, context),
      );
    }

    if (Array.isArray(condition.conditions) && condition.conditions.length) {
      return condition.logic === "any"
        ? condition.conditions.some((item) =>
            this.evaluateApprovalCondition(item, context),
          )
        : condition.conditions.every((item) =>
            this.evaluateApprovalCondition(item, context),
          );
    }

    const field = String(condition.field ?? "").trim();
    if (!field) return true;
    const actual = this.approvalContextValue(context, field);
    const operator = String(condition.operator ?? "eq").trim().toLowerCase();
    const expected = condition.value;

    if (operator === "exists") return !this.isEmptyApprovalValue(actual);
    if (operator === "not_exists") return this.isEmptyApprovalValue(actual);
    if (operator === "truthy") return Boolean(actual);
    if (operator === "falsy") return !Boolean(actual);

    if (this.isEmptyApprovalValue(actual)) return false;

    if (operator === "includes") {
      if (Array.isArray(actual)) {
        return actual.some((item) => this.compareApprovalValues(item, expected) === 0);
      }
      return String(actual).includes(String(expected ?? ""));
    }

    if (operator === "in") {
      const expectedValues = Array.isArray(expected) ? expected : [expected];
      return expectedValues.some(
        (item) => this.compareApprovalValues(actual, item) === 0,
      );
    }

    const compareResult = this.compareApprovalValues(actual, expected);
    if (operator === "eq") {
      if (Array.isArray(expected)) {
        return expected.some((item) => this.compareApprovalValues(actual, item) === 0);
      }
      return compareResult === 0;
    }
    if (operator === "neq") return compareResult !== 0;
    if (operator === "gt") return compareResult > 0;
    if (operator === "gte") return compareResult >= 0;
    if (operator === "lt") return compareResult < 0;
    if (operator === "lte") return compareResult <= 0;
    return true;
  }

  private submitApprovalFlow(approval: Record<string, any>, now: string) {
    const nodes = Array.isArray(approval.nodes) ? approval.nodes : [];
    nodes.forEach((node: Record<string, any>) => {
      node.status = "PENDING";
      node.time = "";
      node.remark = "";
      node.skipReason = "";
      if (node.condition && !node.conditionLabel) {
        node.conditionLabel = this.describeApprovalCondition(node.condition);
      }
    });
    if (!nodes.length) return null;
    nodes[0].status = "APPROVED";
    nodes[0].time = now;
    nodes[0].remark = "申请已提交。";
    nodes[0].skipReason = "";
    return this.advanceApprovalFlow(approval, 1, now);
  }

  private advanceApprovalFlow(
    approval: Record<string, any>,
    startIndex: number,
    now: string,
  ) {
    const nodes = Array.isArray(approval.nodes) ? approval.nodes : [];
    const context = this.buildApprovalContext(approval);
    approval.logs = approval.logs ?? [];

    for (let index = Math.max(startIndex, 0); index < nodes.length; index += 1) {
      const node = nodes[index];
      if (!node || node.status !== "PENDING") continue;

      const conditionLabel =
        String(node.conditionLabel ?? "").trim() ||
        this.describeApprovalCondition(node.condition);
      if (!this.evaluateApprovalCondition(node.condition, context)) {
        node.status = "SKIPPED";
        node.time = now;
        node.conditionLabel = conditionLabel;
        node.skipReason = conditionLabel
          ? `未命中条件：${conditionLabel}`
          : "未命中节点条件，系统自动跳过。";
        node.remark = node.skipReason;
        approval.logs.push({
          time: now,
          operator: "系统",
          action: "条件跳过",
          nodeName: node.name,
          result: "已跳过",
          comment: node.skipReason,
        });
        continue;
      }

      node.status = "CURRENT";
      node.time = "";
      node.conditionLabel = conditionLabel;
      node.skipReason = "";
      node.remark = conditionLabel ? `命中条件：${conditionLabel}` : "";
      approval.status = ApprovalStatus.Processing;
      approval.currentNode = node.name;
      approval.currentOperator = node.operator;
      approval.logs.push({
        time: now,
        operator: "系统",
        action: "流转",
        nodeName: node.name,
        result: "等待处理",
        comment: conditionLabel
          ? `已流转至${node.operator}，${conditionLabel}`
          : `已流转至${node.operator}。`,
      });
      return node;
    }

    approval.status = ApprovalStatus.Approved;
    approval.currentNode = "流程完成";
    approval.currentOperator = "";
    approval.logs.push({
      time: now,
      operator: "系统",
      action: "归档",
      nodeName: "流程完成",
      result: "已完成",
      comment: "所有有效节点已处理完成。",
    });
    return null;
  }

  private buildApprovalNodes(
    type: string,
    applicant: string,
    flowNodes?: Array<Record<string, any>>,
  ) {
    const nodeMap: Record<string, ApprovalFlowNodeInput[]> = {
      SAMPLE_DELIVERY: [
        { name: "业务员发起送样申请", operator: applicant },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "资产管理员协同", operator: "资产管理员" },
        { name: "业务员跟进测试", operator: applicant },
        { name: "固定资产管理员处理样品去向", operator: "资产管理员" },
      ],
      PURCHASE_REQUEST: [
        { name: "业务员或需求部门发起", operator: applicant },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "采购抄送并执行", operator: "采购" },
      ],
      PURCHASE_CONTRACT: [
        { name: "采购发起", operator: applicant },
        { name: "财务审批", operator: "赵财务" },
        { name: "法务审批", operator: "法务" },
        { name: "技术审批", operator: "技术部" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "行政抄送用印", operator: "行政" },
        { name: "财务/固定资产抄送", operator: "财务/资产" },
      ],
      PAYMENT_REQUEST: [
        { name: "发起人", operator: applicant },
        { name: "部门负责人审核", operator: "部门负责人" },
        { name: "财务审核", operator: "赵财务" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "出纳付款", operator: "出纳" },
      ],
      SALES_CONTRACT: [
        { name: "合同专员发起", operator: applicant },
        { name: "业务负责人审批", operator: "业务负责人" },
        { name: "财务审批", operator: "赵财务" },
        { name: "法务审批", operator: "法务" },
        { name: "技术审批", operator: "技术部" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "行政抄送用印", operator: "行政" },
        { name: "财务/固定资产抄送", operator: "财务/资产" },
      ],
      PURCHASE_INBOUND: [
        { name: "采购发起", operator: applicant },
        { name: "技术部审核", operator: "技术部" },
        { name: "固定资产专员入库", operator: "资产管理员" },
        { name: "财务部抄送入账", operator: "财务" },
      ],
      LEASE_OUTBOUND: [
        { name: "业务员发起", operator: applicant },
        { name: "资产管理员核对出库", operator: "资产管理员" },
        { name: "技术部电池管理系统划拨", operator: "技术部" },
        { name: "财务部依据发货单入账", operator: "财务" },
      ],
      ASSET_TRANSFER: [
        { name: "业务员发起调拨申请", operator: applicant },
        { name: "技术部审核", operator: "技术部" },
        { name: "彭总审批", operator: "彭总" },
        { name: "固定资产管理员协同", operator: "资产管理员" },
        { name: "技术/财务抄送", operator: "技术/财务" },
      ],
      FACTORY_REPAIR: [
        { name: "售后发起返厂维修申请", operator: applicant },
        { name: "技术审核", operator: "技术部" },
        { name: "售后物流发出确认", operator: "售后物流" },
        { name: "固定资产审核", operator: "资产管理员" },
        { name: "技术协同厂商沟通", operator: "技术部" },
        { name: "售后物流收回确认", operator: "售后物流" },
        { name: "固定资产处理", operator: "资产管理员" },
      ],
      DAMAGE_COMPENSATION: [
        { name: "技术部发起", operator: applicant },
        { name: "业务员审核赔付条款", operator: "业务员" },
        { name: "财务审核赔付金额", operator: "赵财务" },
        { name: "彭总审批赔偿标准", operator: "彭总" },
        { name: "资产管理员/财务执行", operator: "资产/财务" },
      ],
      CUSTOMER_RETURN: [
        { name: "业务发起", operator: applicant },
        { name: "技术部审核", operator: "技术部" },
        { name: "彭总审批", operator: "彭总" },
        { name: "固定资产管理员回收入库", operator: "资产管理员" },
        { name: "财务协同对账记账", operator: "财务" },
      ],
      CUSTOMER_BUYOUT: [
        { name: "业务发起", operator: applicant },
        { name: "财务审批", operator: "赵财务" },
        { name: "彭总审批", operator: "彭总" },
        { name: "固定资产管理员出库", operator: "资产管理员" },
        { name: "财务协同对账记账", operator: "财务" },
      ],
      WARRANTY_SCRAP: [
        { name: "技术部发起", operator: applicant },
        { name: "采购签订赔偿/换新协议", operator: "采购" },
        { name: "财务审核协议", operator: "赵财务" },
        { name: "彭总审批", operator: "彭总" },
        { name: "财务/固定资产执行", operator: "财务/资产" },
      ],
      USED_BATTERY_DISPOSAL: [
        { name: "资产管理员发起", operator: applicant },
        { name: "技术部审批", operator: "技术部" },
        { name: "采购审批并签售卖合同", operator: "采购" },
        { name: "资产管理员出库", operator: "资产管理员" },
        { name: "财务记账", operator: "财务" },
      ],
      SEAL_USE: [
        { name: "发起人", operator: applicant },
        { name: "行政风控审批并加签", operator: "行政风控" },
        { name: "所涉部门负责人审批", operator: "部门负责人" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "行政协同用印", operator: "行政" },
      ],
      BUSINESS_TRIP: [
        { name: "申请人", operator: applicant },
        { name: "部门负责人审批", operator: "部门负责人" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "人事考勤计算", operator: "行政人事" },
      ],
      REIMBURSEMENT: [
        { name: "申请人", operator: applicant },
        { name: "财务专员审核", operator: "财务专员" },
        { name: "财务负责人复核", operator: "财务负责人" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "出纳付款", operator: "出纳" },
      ],
      LOAN: [
        { name: "发起人", operator: applicant },
        { name: "财务审批", operator: "赵财务" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "出纳付款", operator: "出纳" },
      ],
      LEAVE_REQUEST: [
        { name: "发起人", operator: applicant },
        { name: "部门负责人审批", operator: "部门负责人" },
        { name: "刘少鹏审批", operator: "刘少鹏" },
        { name: "彭总审批", operator: "彭总" },
        { name: "行政人事", operator: "行政人事" },
      ],
      CONTRACT: [
        { name: "申请人提交", operator: applicant },
        { name: "部门负责人", operator: "陈经理" },
        { name: "财务复核", operator: "赵财务" },
        { name: "总经理审批", operator: "周总" },
      ],
      ASSET_OUTBOUND: [
        { name: "资产发起", operator: applicant },
        { name: "仓库复核", operator: "李仓储" },
        { name: "业务确认", operator: "刘销售" },
      ],
      REPAIR_COST: [
        { name: "技术提交", operator: applicant },
        { name: "售后负责人", operator: "李主管" },
        { name: "资产确认", operator: "王库管" },
      ],
      BILL_ADJUST: [
        { name: "财务发起", operator: applicant },
        { name: "业务确认", operator: "孙销售" },
        { name: "总经理审批", operator: "周总" },
      ],
      GENERAL: [
        { name: "申请人提交", operator: applicant },
        { name: "部门负责人", operator: "陈经理" },
      ],
    };
    const defaultNodes = nodeMap[type] ?? nodeMap.GENERAL;
    const overrides = this.approvalNodeOverrides(type);

    const sourceNodes =
      Array.isArray(flowNodes) && flowNodes.length
        ? flowNodes
            .map((node, index) => {
              const fallback =
                defaultNodes[index] ?? defaultNodes[defaultNodes.length - 1];
              const override = overrides[index] ?? {};
              const mergedCondition =
                (node.condition as ApprovalCondition | ApprovalCondition[] | undefined) ??
                override.condition ??
                fallback?.condition;
              const mergedLabel =
                String(node.conditionLabel ?? "").trim() ||
                override.conditionLabel ||
                fallback?.conditionLabel ||
                this.describeApprovalCondition(mergedCondition);
              return {
              name: String(node.name ?? "").trim(),
              operator: this.resolveApprovalOperator(node.operator, applicant),
                condition: mergedCondition,
                conditionLabel: mergedLabel,
              };
            })
            .filter((node) => node.name)
        : defaultNodes.map((node, index) => {
            const override = overrides[index] ?? {};
            const condition = override.condition ?? node.condition;
            const conditionLabel =
              override.conditionLabel ??
              node.conditionLabel ??
              this.describeApprovalCondition(condition);
            return {
              ...node,
              condition,
              conditionLabel,
            };
          });

    return sourceNodes.map((node) => ({
      ...node,
      status: "PENDING",
      time: "",
      remark: "",
      skipReason: "",
    }));
  }

  private enrichApproval(
    approval: Record<string, any>,
    index = 0,
  ): Record<string, any> {
    const nodes = approval.nodes ?? [];
    const logs = approval.logs ?? [];
    const approvedNodeCount = nodes.filter((node: Record<string, any>) =>
      ["APPROVED", "SKIPPED"].includes(String(node.status)),
    ).length;
    const currentNodeIndex = nodes.findIndex(
      (node: Record<string, any>) => node.status === "CURRENT",
    );
    const dueTime = Date.parse(String(approval.dueAt ?? "").replace(" ", "T"));
    const overdue =
      approval.status === ApprovalStatus.Processing &&
      Number.isFinite(dueTime) &&
      dueTime < Date.now();

    return {
      index: index + 1,
      ...approval,
      typeLabel: approval.typeLabel ?? this.approvalTypeLabel(approval.type),
      statusLabel: this.approvalStatusLabel(approval.status),
      nodeCount: nodes.length,
      approvedNodeCount,
      currentNodeIndex,
      progressPercent: nodes.length
        ? Math.round((approvedNodeCount / nodes.length) * 100)
        : 0,
      latestLog: logs.at(-1),
      logCount: logs.length,
      attachmentCount: approval.attachments?.length ?? 0,
      overdue,
      canApprove: approval.status === ApprovalStatus.Processing,
      canReject: approval.status === ApprovalStatus.Processing,
      canTransfer: approval.status === ApprovalStatus.Processing,
      canCancel:
        approval.status === ApprovalStatus.Processing ||
        approval.status === ApprovalStatus.Draft,
      canSubmit: approval.status === ApprovalStatus.Draft,
      canDelete: [
        ApprovalStatus.Draft,
        ApprovalStatus.Rejected,
        ApprovalStatus.Cancelled,
      ].includes(approval.status),
    };
  }

  getApprovals() {
    return this.approvals.map((approval, index) =>
      this.enrichApproval(approval, index),
    );
  }

  getApproval(id: string) {
    const approval = this.approvals.find(
      (item) => item.id === id || item.approvalNo === id,
    );
    if (!approval) throw new NotFoundException("审批单不存在");
    return this.enrichApproval(approval);
  }

  private findApprovalRecord(id: string) {
    const approval = this.approvals.find(
      (item) => item.id === id || item.approvalNo === id,
    );
    if (!approval) throw new NotFoundException("审批单不存在");
    return approval;
  }

  private normalizeApprovalAttachments(source: unknown): any[] {
    const values = Array.isArray(source)
      ? source
      : String(source ?? "")
          .split(/[\n,，;；]+/)
          .map((item) => item.trim());
    const deduped = new Map<string, unknown>();
    values.forEach((item) => {
      if (item && typeof item === "object") {
        const entry = item as Record<string, any>;
        const name = this.attachmentDisplayName(entry);
        if (!name) return;
        const fileId = String(entry.id ?? entry.fileId ?? "").trim();
        deduped.set(fileId || name, {
          id: fileId || `manual-${name}`,
          name,
          fileName: String(entry.fileName ?? name),
          fileUrl: String(entry.fileUrl ?? entry.url ?? ""),
          mimeType: String(entry.mimeType ?? ""),
          size: Number(entry.size ?? 0),
          uploadedAt: String(entry.uploadedAt ?? ""),
          uploadedBy: String(entry.uploadedBy ?? ""),
        });
        return;
      }
      const name = String(item ?? "").trim();
      if (name) deduped.set(name, name);
    });
    return Array.from(deduped.values());
  }

  createApproval(body: Record<string, any>): Record<string, any> {
    const title = String(body.title ?? "").trim();
    const applicant = String(body.applicant ?? "").trim();
    if (!title || !applicant) {
      throw new BadRequestException("请填写审批标题和申请人。");
    }

    const type = String(body.type || "GENERAL");
    const saveAsDraft =
      body.draft === true ||
      String(body.status ?? "").toUpperCase() === ApprovalStatus.Draft;
    const now = this.nowText();
    const nodes = this.buildApprovalNodes(type, applicant, body.flowNodes);
    const suffix = String(Date.now()).slice(-8);
    const formItems =
      Array.isArray(body.formItems) && body.formItems.length
        ? body.formItems
            .map((item: Record<string, any>) => ({
              label: String(item.label ?? "").trim(),
              value: String(item.value ?? "").trim() || "--",
            }))
            .filter((item: Record<string, any>) => item.label)
        : [
            { label: "业务单号", value: body.businessNo || "未关联" },
            { label: "客户/对象", value: body.customerName || "未填写" },
            {
              label: "金额",
              value: `¥${Number(body.amount || 0).toLocaleString("zh-CN")}`,
            },
            { label: "优先级", value: body.priority || "普通" },
          ];
    const riskItems =
      Array.isArray(body.riskItems) && body.riskItems.length
        ? body.riskItems.map((item: unknown) => String(item)).filter(Boolean)
        : ["请审批人核对业务资料、费用和后续执行责任。"];
    const formValues =
      body.formValues && typeof body.formValues === "object"
        ? body.formValues
        : {};
    const approval: Record<string, any> = {
      id: `approval-${suffix}`,
      approvalNo: `SP${suffix}`,
      type,
      typeLabel: body.typeLabel || this.approvalTypeLabel(type),
      title,
      status: saveAsDraft ? ApprovalStatus.Draft : ApprovalStatus.Processing,
      applicant,
      department: body.department || "业务部",
      priority: body.priority || "普通",
      businessId: body.businessId || "",
      businessNo: body.businessNo || "",
      customerName: body.customerName || "",
      amount: Number(body.amount || 0),
      currentNode: saveAsDraft ? "草稿未提交" : "流程初始化",
      currentOperator: saveAsDraft ? applicant : "",
      dueAt: body.dueAt || "",
      createdAt: now,
      updatedAt: now,
      summary: body.summary || "业务人员发起的通用审批。",
      riskItems,
      formItems,
      nodes,
      assetTerminalPayload: body.assetTerminalPayload || null,
      assetTerminalAppliedAt: "",
      assetInboundPayload: body.assetInboundPayload || null,
      assetInboundAppliedAt: "",
      logs: [],
      attachments: this.normalizeApprovalAttachments(body.attachments),
      formValues,
      flowNodes: Array.isArray(body.flowNodes) ? body.flowNodes : [],
      sourceTemplateKey: type,
    };

    if (saveAsDraft) {
      approval.logs.push({
        time: now,
        operator: applicant,
        action: "保存草稿",
        nodeName: "草稿箱",
        result: "已保存",
        comment: body.summary || "审批草稿已保存，尚未提交流转。",
      });
    } else {
      approval.logs.push({
        time: now,
        operator: applicant,
        action: "提交",
        nodeName: nodes[0]?.name ?? "申请人提交",
        result: "已提交",
        comment: body.summary || "审批已提交。",
      });
      this.submitApprovalFlow(approval, now);
    }

    this.bindUploadedFilesToApproval(approval);
    if (!saveAsDraft && approval.status === ApprovalStatus.Approved) {
      this.syncBusinessApprovalStatus(approval, now, applicant);
    }

    this.approvals.unshift(approval);
    this.persistMockState();
    return this.enrichApproval(approval);
  }

  updateApproval(id: string, body: Record<string, any>) {
    const approval = this.findApprovalRecord(id);
    if (approval.status !== ApprovalStatus.Draft) {
      throw new BadRequestException("只有草稿审批可以修改。");
    }

    const title = String(body.title ?? approval.title ?? "").trim();
    const applicant = String(body.applicant ?? approval.applicant ?? "").trim();
    if (!title || !applicant) {
      throw new BadRequestException("请填写审批标题和申请人。");
    }

    const type = String(body.type || approval.type || "GENERAL");
    const now = this.nowText();
    approval.type = type;
    approval.typeLabel = body.typeLabel || this.approvalTypeLabel(type);
    approval.title = title;
    approval.applicant = applicant;
    approval.department = body.department || approval.department || "业务部";
    approval.priority = body.priority || approval.priority || "普通";
    approval.businessId = body.businessId ?? approval.businessId ?? "";
    approval.businessNo = body.businessNo ?? approval.businessNo ?? "";
    approval.customerName = body.customerName ?? approval.customerName ?? "";
    approval.amount = Number(body.amount ?? approval.amount ?? 0);
    approval.dueAt = body.dueAt ?? approval.dueAt ?? "";
    approval.summary =
      body.summary || approval.summary || "业务人员发起的通用审批。";
    if (Array.isArray(body.riskItems)) {
      approval.riskItems = body.riskItems
        .map((item: unknown) => String(item))
        .filter(Boolean);
    }
    if (Array.isArray(body.formItems)) {
      approval.formItems = body.formItems
        .map((item: Record<string, any>) => ({
          label: String(item.label ?? "").trim(),
          value: String(item.value ?? "").trim() || "--",
        }))
        .filter((item: Record<string, any>) => item.label);
    }
    if (body.formValues && typeof body.formValues === "object") {
      approval.formValues = body.formValues;
    }
    approval.flowNodes = Array.isArray(body.flowNodes)
      ? body.flowNodes
      : (approval.flowNodes ?? []);
    approval.nodes = this.buildApprovalNodes(type, applicant, approval.flowNodes);
    approval.attachments = this.normalizeApprovalAttachments([
      ...(approval.attachments ?? []),
      ...this.normalizeApprovalAttachments(body.attachments),
    ]);
    this.bindUploadedFilesToApproval(approval);
    approval.currentNode = "草稿未提交";
    approval.currentOperator = applicant;
    approval.updatedAt = now;
    approval.logs.push({
      time: now,
      operator: String(body.operator || applicant),
      action: "更新草稿",
      nodeName: "草稿箱",
      result: "已保存",
      comment: body.summary || "审批草稿已更新。",
    });

    this.persistMockState();
    return this.enrichApproval(approval);
  }

  appendApprovalAttachments(id: string, body: Record<string, any>) {
    const approval = this.findApprovalRecord(id);
    const attachments = this.normalizeApprovalAttachments(body.attachments);
    if (!attachments.length) {
      throw new BadRequestException("请提供需要补充的附件名称。");
    }
    const attachmentNames = attachments.map((item) =>
      this.attachmentDisplayName(item),
    );

    approval.attachments = this.normalizeApprovalAttachments([
      ...(approval.attachments ?? []),
      ...attachments,
    ]);
    this.bindUploadedFilesToApproval(approval);
    const now = this.nowText();
    approval.updatedAt = now;
    approval.logs.push({
      time: now,
      operator: String(body.operator || approval.applicant || "系统"),
      action: "补充附件",
      nodeName: approval.currentNode || "附件",
      result: "已上传",
      comment: `补充附件：${attachmentNames.join("、")}`,
    });

    this.persistMockState();
    return this.enrichApproval(approval);
  }

  deleteApproval(id: string) {
    const approval = this.findApprovalRecord(id);
    if (approval.status === ApprovalStatus.Processing) {
      throw new BadRequestException("审批中单据需先撤销后再删除。");
    }
    if (approval.status === ApprovalStatus.Approved) {
      throw new BadRequestException("已通过审批需要保留归档，不能删除。");
    }
    const index = this.approvals.findIndex(
      (item) =>
        item.id === approval.id || item.approvalNo === approval.approvalNo,
    );
    this.approvals.splice(index, 1);
    this.persistMockState();
    return { id: approval.id, approvalNo: approval.approvalNo, deleted: true };
  }

  private assertApprovalActionOperator(
    approval: Record<string, any>,
    action: string,
    operator: string,
  ) {
    if (!["APPROVE", "REJECT", "TRANSFER"].includes(action)) return;
    const expectedOperator = String(approval.currentOperator ?? "").trim();
    const isAdminOperator = this.systemAccounts.some(
      (account) =>
        account.roleId === "role-admin" &&
        account.status === "ENABLED" &&
        [account.username, account.name].includes(operator),
    );
    if (
      expectedOperator &&
      operator !== expectedOperator &&
      !isAdminOperator
    ) {
      throw new BadRequestException(
        `当前节点由 ${expectedOperator} 处理，${operator} 不能代办。`,
      );
    }
  }

  private syncOrderContractApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    if (!["CONTRACT", "SALES_CONTRACT"].includes(String(approval.type))) return;
    if (!approval.businessId) return;

    const order = this.orders.find((item) => item.id === approval.businessId);
    if (!order) return;

    order.contract = {
      name: order.contract?.name || order.contractName,
      contractNo: order.contract?.contractNo || order.contractNo,
      signDate: order.contract?.signDate || "",
      startDate: order.contract?.startDate || order.leaseStart,
      endDate: order.contract?.endDate || order.leaseEnd,
      fileName: order.contract?.fileName || "",
      ...order.contract,
      approvalNo: approval.approvalNo,
      approvalId: approval.id,
      approvalCurrentNode: approval.currentNode,
      approvalCurrentOperator: approval.currentOperator,
      approvalStatus: approval.status,
    };

    const previousSyncedStatus = order.contract.approvalSyncedStatus;
    if (approval.status === ApprovalStatus.Approved) {
      order.status = OrderStatus.PendingOutbound;
      order.contractStatus = "已会签";
      order.contract.status = "已会签";
      order.contract.signDate = order.contract.signDate || this.dateText();
      if (previousSyncedStatus !== ApprovalStatus.Approved) {
        order.approvals = order.approvals ?? [];
        order.approvals.push({
          node: "合同会签完成",
          operator,
          result: "通过",
          time: now,
          remark: `审批单 ${approval.approvalNo} 已完成全部节点。`,
        });
        this.appendOrderEvent(
          order,
          "合同会签通过",
          "审批引擎已完成全部合同节点，订单进入待出库。",
        );
      }
    } else if (approval.status === ApprovalStatus.Rejected) {
      order.status = OrderStatus.Draft;
      order.contractStatus = "会签驳回";
      order.contract.status = "会签驳回";
      if (previousSyncedStatus !== ApprovalStatus.Rejected) {
        order.approvals = order.approvals ?? [];
        order.approvals.push({
          node: approval.currentNode || "合同会签",
          operator,
          result: "驳回",
          time: now,
          remark: approval.logs?.at(-1)?.comment || "合同会签被驳回。",
        });
        this.appendOrderEvent(
          order,
          "合同会签驳回",
          "订单已退回草稿，可补充合同资料后重新发起会签。",
        );
      }
    } else if (approval.status === ApprovalStatus.Cancelled) {
      order.status = OrderStatus.Draft;
      order.contractStatus = "待会签";
      order.contract.status = "待会签";
      if (previousSyncedStatus !== ApprovalStatus.Cancelled) {
        this.appendOrderEvent(order, "合同会签撤销", "审批单已撤销，订单退回草稿。");
      }
    } else if (approval.status === ApprovalStatus.Processing) {
      order.status = OrderStatus.Approving;
      order.contractStatus = "会签中";
      order.contract.status = "会签中";
      const previousNode = order.contract.approvalSyncedNode;
      if (previousNode !== approval.currentNode) {
        this.appendOrderEvent(
          order,
          "合同会签流转",
          `当前节点：${approval.currentNode} / ${approval.currentOperator || "待处理人"}`,
        );
      }
    }

    order.contract.approvalSyncedStatus = approval.status;
    order.contract.approvalSyncedNode = approval.currentNode;
    order.updatedAt = now;
    if (approval.status === ApprovalStatus.Approved) {
      this.syncOrderOperationalState(order);
    }
  }

  private findOrderForApproval(approval: Record<string, any>) {
    const formValues =
      approval.formValues && typeof approval.formValues === "object"
        ? (approval.formValues as Record<string, any>)
        : {};
    const refs = [
      approval.businessId,
      approval.businessNo,
      formValues.orderId,
      formValues.orderNo,
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return (
      refs
        .map((ref) =>
          this.orders.find(
            (item) => item.id === ref || item.orderNo === ref,
          ) as Record<string, any> | undefined,
        )
        .find(Boolean) ?? null
    );
  }

  private findBillForApproval(approval: Record<string, any>) {
    const formValues =
      approval.formValues && typeof approval.formValues === "object"
        ? (approval.formValues as Record<string, any>)
        : {};
    const refs = [
      approval.businessId,
      approval.businessNo,
      formValues.billId,
      formValues.billNo,
    ]
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return (
      refs
        .map((ref) =>
          this.bills.find(
            (item) => item.id === ref || item.billNo === ref,
          ) as Record<string, any> | undefined,
        )
        .find(Boolean) ?? null
    );
  }

  private approvalBtCodes(approval: Record<string, any>) {
    const formValues =
      approval.formValues && typeof approval.formValues === "object"
        ? (approval.formValues as Record<string, any>)
        : {};
    const raw = [
      formValues.assetCodes,
      formValues.assetCode,
      formValues.btCodes,
      formValues.btCode,
      formValues.batteryScope,
    ].find((value) => !this.isEmptyApprovalValue(value));
    return Array.from(new Set(this.parseBtCodeList(raw)));
  }

  private syncLeaseOutboundApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    if (!["LEASE_OUTBOUND", "ASSET_OUTBOUND"].includes(String(approval.type))) {
      return;
    }
    const order = this.findOrderForApproval(approval);
    if (!order) return;

    if (approval.status === ApprovalStatus.Approved) {
      if (approval.outboundAppliedAt) return;
      const btCodes = this.approvalBtCodes(approval).filter((btCode) =>
        this.batteries.some(
          (battery) =>
            battery.btCode === btCode &&
            battery.assetStatus === BatteryAssetStatus.InStock,
        ),
      );
      if (!btCodes.length) return;

      this.createAssetBatchOutbound({
        orderId: order.id,
        btCodes,
        outboundAt: now.slice(0, 10),
        warehouse: order.assetWarehouse || "郑州总仓",
        receiver: order.customerContact || approval.customerName || "客户收货人",
        address: order.region || "客户现场",
        operator: "系统自动任务",
        remark: `${approval.approvalNo} 审批通过后自动生成出库单，审批处理人：${operator}。`,
      });
      approval.outboundAppliedAt = now;
      this.appendOrderEvent(
        order,
        "审批自动出库",
        `${approval.approvalNo} 审批通过后已自动生成出库单。`,
      );
      return;
    }

    if (
      [ApprovalStatus.Rejected, ApprovalStatus.Cancelled].includes(
        approval.status,
      )
    ) {
      this.appendOrderEvent(
        order,
        "出库审批关闭",
        `${approval.approvalNo} 已${approval.status === ApprovalStatus.Rejected ? "驳回" : "撤销"}，未触发自动出库。`,
      );
    }
  }

  private syncCustomerReturnApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    if (String(approval.type) !== "CUSTOMER_RETURN") return;
    const order = this.findOrderForApproval(approval);
    if (!order) return;

    if (approval.status === ApprovalStatus.Approved) {
      if (approval.customerReturnAppliedAt) return;
      const requestedBtCodes = this.approvalBtCodes(approval);
      const activeBtCodes = this.activeBtCodesForOrder(order);
      const btCodes = requestedBtCodes.length ? requestedBtCodes : activeBtCodes;
      if (!btCodes.length) return;
      this.returnOrderLease(order.id, {
        btCodes,
        returnAll: btCodes.length === activeBtCodes.length,
        warehouse: "郑州总仓",
        operator: "系统自动任务",
        remark: `${approval.approvalNo} 审批通过后自动执行退租回收入库，审批处理人：${operator}。`,
      });
      approval.customerReturnAppliedAt = now;
      this.appendOrderEvent(
        order,
        "审批自动退租",
        `${approval.approvalNo} 审批通过后已自动完成退租回收入库。`,
      );
      return;
    }

    if (
      [ApprovalStatus.Rejected, ApprovalStatus.Cancelled].includes(
        approval.status,
      )
    ) {
      this.appendOrderEvent(
        order,
        "退租审批关闭",
        `${approval.approvalNo} 已${approval.status === ApprovalStatus.Rejected ? "驳回" : "撤销"}，未触发自动退租。`,
      );
    }
  }

  private syncCustomerBuyoutApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    if (String(approval.type) !== "CUSTOMER_BUYOUT") return;
    const order = this.findOrderForApproval(approval);
    if (!order) return;

    if (
      approval.status !== ApprovalStatus.Approved ||
      approval.customerBuyoutAppliedAt
    ) {
      return;
    }

    const btCodes = this.approvalBtCodes(approval);
    const targetBtCodes = btCodes.length
      ? btCodes
      : this.activeBtCodesForOrder(order);
    if (!targetBtCodes.length) return;

    const formValues =
      approval.formValues && typeof approval.formValues === "object"
        ? (approval.formValues as Record<string, any>)
        : {};
    const totalAmount = this.toApprovalNumber(
      formValues.buyoutAmount ?? approval.amount,
    );
    const unitPrice = this.toApprovalNumber(formValues.unitPrice);
    const totalByUnit =
      totalAmount > 0
        ? totalAmount
        : this.roundMoney(unitPrice * targetBtCodes.length);
    const totalCount = targetBtCodes.length;
    const perUnitAmount =
      totalCount > 0 ? this.roundMoney(totalByUnit / totalCount) : 0;
    const affectedOrderIds = new Set<string>();
    const baseSuffix = String(Date.now()).slice(-8);

    targetBtCodes.forEach((btCode, index) => {
      const battery = this.batteries.find((item) => item.btCode === btCode);
      if (!battery || battery.assetStatus === BatteryAssetStatus.BoughtOut) {
        return;
      }

      this.closeActiveOutboundsForBt(btCode, now, "TERMINAL").forEach((orderId) =>
        affectedOrderIds.add(orderId),
      );
      const profile = this.assetFinancialProfile(battery);
      const amount =
        index === totalCount - 1
          ? this.roundMoney(totalByUnit - perUnitAmount * Math.max(totalCount - 1, 0))
          : perUnitAmount;
      const gainLossAmount = this.roundMoney(amount - profile.netValue);
      const record: Record<string, any> = {
        id: `dispose-${baseSuffix}${String(index + 1).padStart(2, "0")}`,
        assetId: battery.id,
        btCode,
        disposalNo: `DSP${baseSuffix}${String(index + 1).padStart(2, "0")}`,
        type: this.disposalActionLabel(BatteryAssetStatus.BoughtOut),
        status: "已登记",
        approvalStatus: ApprovalStatus.Approved,
        approvalNo: approval.approvalNo,
        approvalId: approval.id,
        operator,
        amount,
        bookValue: profile.netValue,
        accumulatedDepreciation: profile.accumulatedDepreciation,
        gainLossAmount,
        financeResult:
          gainLossAmount >= 0
            ? `买断收益 ${gainLossAmount} 元`
            : `买断损失 ${Math.abs(gainLossAmount)} 元`,
        reason:
          String(formValues.buyoutType ?? "").trim() ||
          approval.summary ||
          "客户买断审批自动联动",
        createdAt: now,
        approvedAt: now,
        finalizedAt: now,
        remark: `${approval.approvalNo} 审批通过后自动生成买断处置记录。`,
      };
      this.disposalRecords.unshift(record);
      const voucher = this.createDisposalVoucher(battery, record, operator, now);
      record.voucherNo = voucher.voucherNo;

      battery.assetStatus = BatteryAssetStatus.BoughtOut;
      battery.lifecycle = record.type;
      battery.warehouse = battery.warehouse || battery.location || "客户现场";
      battery.location = battery.warehouse;
      battery.disposalApprovalNo = approval.approvalNo;
      battery.disposalVoucherNo = voucher.voucherNo;
      battery.disposalBookValue = profile.netValue;
      battery.disposalGainLossAmount = gainLossAmount;
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: record.type,
        title: "客户买断审批自动联动",
        time: now,
        operator,
        target: approval.approvalNo,
        status: "已登记",
        remark: record.financeResult,
      });
    });

    affectedOrderIds.add(order.id);
    affectedOrderIds.forEach((orderId) => {
      const currentOrder = this.orders.find((item) => item.id === orderId);
      if (!currentOrder) return;
      this.appendOrderEvent(
        currentOrder,
        "审批自动买断",
        `${approval.approvalNo} 审批通过后已自动完成买断出库。`,
      );
      this.syncOrderOutbound(currentOrder);
      this.syncOrderOperationalState(currentOrder);
      this.syncOrderFinance(currentOrder.orderNo, false);
    });
    approval.customerBuyoutAppliedAt = now;
  }

  private syncBillAdjustApprovalStatus(
    approval: Record<string, any>,
    now: string,
    _operator: string,
  ) {
    if (String(approval.type) !== "BILL_ADJUST") return;
    const bill = this.findBillForApproval(approval);
    if (!bill) return;
    if (
      approval.status !== ApprovalStatus.Approved ||
      approval.billAdjustmentAppliedAt
    ) {
      return;
    }

    const formValues =
      approval.formValues && typeof approval.formValues === "object"
        ? (approval.formValues as Record<string, any>)
        : {};
    const receivableAmount = this.toApprovalNumber(
      formValues.receivableAmount ??
        formValues.adjustedAmount ??
        approval.amount ??
        bill.receivableAmount,
      Number(bill.receivableAmount || 0),
    );
    const reason =
      String(formValues.reason ?? "").trim() ||
      String(formValues.adjustReason ?? "").trim() ||
      approval.summary ||
      "账单调整审批自动联动";
    if (receivableAmount <= 0 || !reason) return;
    this.adjustBill(bill.id, {
      receivableAmount,
      reason: `${reason}（审批单 ${approval.approvalNo} 自动同步）`,
      operator: "系统自动任务",
    });
    approval.billAdjustmentAppliedAt = now;
  }

  private syncBusinessApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    this.syncAssetPurchaseInboundApprovalStatus(approval, now, operator);
    this.syncAssetTerminalApprovalStatus(approval, now, operator);
    this.syncOrderContractApprovalStatus(approval, now, operator);
    this.syncLeaseOutboundApprovalStatus(approval, now, operator);
    this.syncCustomerReturnApprovalStatus(approval, now, operator);
    this.syncCustomerBuyoutApprovalStatus(approval, now, operator);
    this.syncRepairCostApprovalStatus(approval, now, operator);
    this.syncBillAdjustApprovalStatus(approval, now, operator);
  }

  private syncRepairCostApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    if (approval.type !== "REPAIR_COST" || !approval.businessId) return;
    const repair = this.repairs.find((item) => item.id === approval.businessId);
    if (!repair) return;
    const costItems = (repair.costItems ?? []) as Record<string, any>[];
    const relatedItems = costItems.filter(
      (item) =>
        item.approvalId === approval.id ||
        item.approvalNo === approval.approvalNo,
    );
    if (!relatedItems.length) return;

    relatedItems.forEach((costItem) => {
      const previousStatus = costItem.approvalSyncedStatus;
      costItem.approvalStatus = approval.status;
      costItem.approvalStatusLabel = this.approvalStatusLabel(approval.status);
      costItem.approvalSyncedStatus = approval.status;
      const bill = this.bills.find(
        (item) =>
          item.sourceType === "REPAIR_COST" &&
          (item.costItemId === costItem.id ||
            item.approvalNo === approval.approvalNo),
      );
      if (bill) {
        bill.approvalStatus = approval.status;
        bill.approvalStatusLabel = costItem.approvalStatusLabel;
      }

      if (approval.status === ApprovalStatus.Approved) {
        const battery = this.batteries.find(
          (item) => item.btCode === repair.btCode,
        );
        if (battery && Number(costItem.amount || 0) > 0) {
          const customerPay =
            String(costItem.payer || "").includes("客户") ||
            String(repair.responsibility || costItem.responsibility || "").includes(
              "客户",
            );
          const voucher = this.createAssetFinanceVoucher({
            voucherType: "REPAIR_COST",
            typeLabel: "维修费用",
            sourceType: "REPAIR_COST",
            sourceId: repair.id,
            sourceNo: `${repair.repairNo}-${costItem.id}`,
            assetId: battery.id,
            btCode: repair.btCode,
            approvalNo: approval.approvalNo,
            operator,
            postedAt: now,
            amount: Number(costItem.amount || 0),
            remark: `${repair.repairNo} 维修费用审批通过后自动生成。`,
            entries: customerPay
              ? [
                  {
                    accountTitle: "应收维修款",
                    direction: "DEBIT",
                    amount: Number(costItem.amount || 0),
                    summary: "客户责任维修费用",
                  },
                  {
                    accountTitle: "其他业务收入",
                    direction: "CREDIT",
                    amount: Number(costItem.amount || 0),
                    summary: "客户责任维修费用",
                  },
                ]
              : [
                  {
                    accountTitle: "维修费用",
                    direction: "DEBIT",
                    amount: Number(costItem.amount || 0),
                    summary: "维修费用归集",
                  },
                  {
                    accountTitle: "应付/现金",
                    direction: "CREDIT",
                    amount: Number(costItem.amount || 0),
                    summary: "维修费用归集",
                  },
                ],
          });
          costItem.financeVoucherId = voucher.id;
          costItem.financeVoucherNo = voucher.voucherNo;
          repair.financeVoucherId = voucher.id;
          repair.financeVoucherNo = voucher.voucherNo;
        }
        if (bill && bill.status === BillStatus.PendingConfirm) {
          bill.collectionStatus = "OA已通过，待财务确认";
        }
      }

      if (
        [ApprovalStatus.Rejected, ApprovalStatus.Cancelled].includes(
          approval.status as any,
        )
      ) {
        costItem.financeStatus = "APPROVAL_STOPPED";
        costItem.financeStatusLabel =
          approval.status === ApprovalStatus.Rejected ? "OA驳回" : "OA撤销";
        if (
          bill &&
          bill.status === BillStatus.PendingConfirm &&
          Number(bill.paidAmount || 0) <= 0
        ) {
          bill.status = BillStatus.Voided;
          bill.voidedAt = now;
          this.appendBillLog(
            bill,
            "作废维修费用账单",
            operator,
            `关联OA ${approval.approvalNo} 未通过，账单自动作废。`,
          );
        }
      }

      if (previousStatus !== approval.status) {
        this.appendRepairLog(repair, {
          action: "同步维修费用审批",
          result: `${approval.approvalNo} ${this.approvalStatusLabel(approval.status)}`,
          remark: bill ? `关联账单 ${bill.billNo}` : "非客户应收费用归档",
          operator,
        });
      }
    });

    repair.approvalId = approval.id;
    repair.approvalNo = approval.approvalNo;
    repair.approvalStatus = approval.status;
    repair.approvalStatusLabel = this.approvalStatusLabel(approval.status);
    repair.updatedAt = now;
  }

  actionApproval(id: string, body: Record<string, any>) {
    const approval = this.findApprovalRecord(id);

    const action = String(body.action ?? "").toUpperCase();
    const comment = String(body.comment ?? "").trim();
    const operator =
      String(body.operator ?? "").trim() ||
      approval.currentOperator ||
      "当前审批人";
    const now = this.nowText();

    const isSubmitDraft =
      action === "SUBMIT" && approval.status === ApprovalStatus.Draft;
    const isCancelAllowed =
      action === "CANCEL" &&
      [ApprovalStatus.Processing, ApprovalStatus.Draft].includes(
        approval.status,
      );
    if (
      action !== "COMMENT" &&
      !isSubmitDraft &&
      !isCancelAllowed &&
      approval.status !== ApprovalStatus.Processing
    ) {
      throw new BadRequestException("当前审批单已结束，不能继续处理。");
    }

    const currentIndex = approval.nodes.findIndex(
      (node: Record<string, any>) => node.status === "CURRENT",
    );
    const currentNode =
      currentIndex >= 0 ? approval.nodes[currentIndex] : undefined;
    this.assertApprovalActionOperator(approval, action, operator);

    if (action === "SUBMIT") {
      if (approval.status !== ApprovalStatus.Draft) {
        throw new BadRequestException("只有草稿审批可以提交。");
      }
      if (!Array.isArray(approval.nodes) || !approval.nodes.length) {
        approval.nodes = this.buildApprovalNodes(
          approval.type || "GENERAL",
          approval.applicant || operator,
          approval.flowNodes,
        );
      }
      approval.logs.push({
        time: now,
        operator,
        action: "提交",
        nodeName: approval.nodes[0]?.name ?? "申请人提交",
        result: "已提交",
        comment: comment || "草稿已提交审批。",
      });
      this.submitApprovalFlow(approval, now);
    } else if (action === "APPROVE") {
      if (!currentNode) throw new BadRequestException("当前没有待审批节点。");
      currentNode.status = "APPROVED";
      currentNode.time = now;
      currentNode.remark = comment || "同意。";
      approval.logs.push({
        time: now,
        operator,
        action: "通过",
        nodeName: currentNode.name,
        result: "通过",
        comment: comment || "同意进入下一节点。",
      });
      this.advanceApprovalFlow(approval, currentIndex + 1, now);
    } else if (action === "REJECT") {
      if (!currentNode) throw new BadRequestException("当前没有待审批节点。");
      currentNode.status = "REJECTED";
      currentNode.time = now;
      currentNode.remark = comment || "驳回。";
      approval.status = ApprovalStatus.Rejected;
      approval.currentNode = "流程结束";
      approval.currentOperator = "";
      approval.logs.push({
        time: now,
        operator,
        action: "驳回",
        nodeName: currentNode.name,
        result: "已驳回",
        comment: comment || "审批被驳回。",
      });
    } else if (action === "TRANSFER") {
      if (!currentNode) throw new BadRequestException("当前没有待审批节点。");
      const nextOperator = String(body.nextOperator ?? "").trim();
      if (!nextOperator) throw new BadRequestException("请填写转办处理人。");
      currentNode.operator = nextOperator;
      approval.currentOperator = nextOperator;
      approval.logs.push({
        time: now,
        operator,
        action: "转办",
        nodeName: currentNode.name,
        result: "已转办",
        comment: comment || `转办给${nextOperator}处理。`,
      });
    } else if (action === "CANCEL") {
      approval.status = ApprovalStatus.Cancelled;
      approval.currentNode = "流程结束";
      approval.currentOperator = "";
      approval.logs.push({
        time: now,
        operator,
        action: "撤销",
        nodeName: currentNode?.name ?? approval.currentNode,
        result: "已撤销",
        comment: comment || "申请人撤销审批。",
      });
    } else if (action === "COMMENT") {
      approval.logs.push({
        time: now,
        operator,
        action: "备注",
        nodeName: currentNode?.name ?? approval.currentNode,
        result: "已记录",
        comment: comment || "补充说明。",
      });
    } else {
      throw new BadRequestException("不支持的审批动作。");
    }

    approval.updatedAt = now;
    this.bindUploadedFilesToApproval(approval);
    if (action !== "COMMENT") {
      this.syncBusinessApprovalStatus(approval, now, operator);
    }
    this.persistMockState();
    return this.enrichApproval(approval);
  }

  getDashboard() {
    const activeAlarms = this.alarms.filter(
      (alarm) =>
        ![AlarmStatus.Resolved, AlarmStatus.FalseAlarm].includes(alarm.status),
    );
    return {
      batteryTotal: 1280,
      leasingCount: 930,
      inStockCount: 210,
      repairingCount: 46,
      alarmCount: activeAlarms.length,
      severeAlarmCount: activeAlarms.filter(
        (alarm) => alarm.level === AlarmLevel.Severe,
      ).length,
      pendingApprovalCount: 12,
      pendingOutboundCount: 5,
      pendingRepairCount: 9,
      receivableThisMonth: 286000,
      paidThisMonth: 198000,
      debtAmount: 88000,
      overdueAmount: 32600,
    };
  }

  getBatteries() {
    return this.batteries;
  }

  private findBatteryAsset(id: string) {
    const battery = this.batteries.find(
      (item) => item.id === id || item.btCode === id,
    );
    if (!battery) throw new NotFoundException("资产不存在");
    return battery;
  }

  private assetWarehouse(
    battery: Record<string, any>,
    outbound?: Record<string, any>,
  ) {
    if (battery.assetStatus === BatteryAssetStatus.InStock) {
      return battery.warehouse || battery.location || "郑州总仓";
    }
    if (battery.assetStatus === BatteryAssetStatus.Repairing) {
      return battery.warehouse || "维修中心";
    }
    if (battery.assetStatus === BatteryAssetStatus.Leasing) {
      return battery.warehouse || battery.location || "客户现场";
    }
    return (
      battery.warehouse ||
      outbound?.warehouse ||
      battery.location ||
      "资产终态库"
    );
  }

  private appendAssetMovement(
    assetId: string,
    movement: {
      type: string;
      title: string;
      operator: string;
      target: string;
      status: string;
      remark: string;
      time?: string;
    },
  ) {
    this.assetMovements[assetId] = this.assetMovements[assetId] ?? [];
    this.assetMovements[assetId].push({
      ...movement,
      time: movement.time || this.nowText(),
    });
  }

  private parseAssetRefs(body: Record<string, any>) {
    const fields = [
      body.assetIds,
      body.ids,
      body.btCodes,
      body.assetId,
      body.btCode,
    ];
    return fields
      .flatMap((value) => {
        if (value == null) return [];
        if (Array.isArray(value)) {
          return value.flatMap((item) =>
            String(item ?? "").split(/[\s,，、;；]+/),
          );
        }
        return String(value).split(/[\s,，、;；]+/);
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private findUniqueBatteryAssets(refs: string[]) {
    if (!refs.length) throw new BadRequestException("请选择要处理的资产。");

    const batteries = refs.map((ref) => this.findBatteryAsset(ref));
    const seen = new Set<string>();
    const duplicate = batteries.find((battery) => {
      if (seen.has(battery.id)) return true;
      seen.add(battery.id);
      return false;
    });
    if (duplicate) {
      throw new BadRequestException(`资产 ${duplicate.btCode} 被重复选择。`);
    }
    return batteries;
  }

  private closedBtCodes(outbound: Record<string, any>) {
    return new Set<string>([
      ...(outbound.returnedBtCodes ?? []),
      ...(outbound.closedBtCodes ?? []),
    ]);
  }

  private isOutboundBtActive(outbound: Record<string, any>, btCode: string) {
    return (
      outbound.btCodes?.includes(btCode) &&
      !this.closedBtCodes(outbound).has(btCode)
    );
  }

  private activeOutboundsForBt(btCode: string) {
    return this.outbounds.filter((outbound) =>
      this.isOutboundBtActive(outbound, btCode),
    );
  }

  private inventoryResultLabel(result: string) {
    const labels: Record<string, string> = {
      MATCHED: "账实相符",
      LOCATION_MISMATCH: "库位不一致",
      MISSING: "盘亏待查",
      DAMAGED: "发现损坏",
    };
    return labels[result] ?? "待核查";
  }

  private roundMoney(value: number) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  private assetDefaultOriginalValue(battery: Record<string, any>) {
    const model = String(battery.model ?? "");
    if (Number(battery.originalValue) > 0) return Number(battery.originalValue);
    if (model.includes("60V") && model.includes("50AH")) return 5200;
    if (model.includes("72V") && model.includes("45AH")) return 4800;
    return 5000;
  }

  private depreciationRecordsForAsset(battery: Record<string, any>) {
    return this.depreciationRecords.filter(
      (item) => item.assetId === battery.id || item.btCode === battery.btCode,
    );
  }

  private assetFinancialProfile(battery: Record<string, any>) {
    const originalValue = this.roundMoney(
      this.assetDefaultOriginalValue(battery),
    );
    const salvageValue = this.roundMoney(
      Number(battery.salvageValue ?? 0) >= 0
        ? Number(battery.salvageValue ?? Math.round(originalValue * 0.1))
        : Math.round(originalValue * 0.1),
    );
    const usefulLifeMonths = Math.max(
      Number(battery.usefulLifeMonths || 36),
      1,
    );
    const depreciationRecords = this.depreciationRecordsForAsset(battery);
    const accumulatedDepreciation = this.roundMoney(
      depreciationRecords.reduce(
        (total, item) => total + Number(item.amount || 0),
        0,
      ),
    );
    const depreciableAmount = Math.max(originalValue - salvageValue, 0);
    const monthlyDepreciation = this.roundMoney(
      depreciableAmount / usefulLifeMonths,
    );
    const netValue = this.roundMoney(
      Math.max(originalValue - accumulatedDepreciation, salvageValue),
    );
    const latestRecord = [...depreciationRecords].sort((a, b) => {
      const periodCompare = String(b.period ?? "").localeCompare(
        String(a.period ?? ""),
      );
      if (periodCompare) return periodCompare;
      return String(b.postedAt ?? "").localeCompare(String(a.postedAt ?? ""));
    })[0];
    const terminal = [
      BatteryAssetStatus.Scrapped,
      BatteryAssetStatus.BoughtOut,
    ].includes(battery.assetStatus);
    const depreciationStatus = terminal
      ? "已终止"
      : netValue <= salvageValue || accumulatedDepreciation >= depreciableAmount
        ? "已足额"
        : accumulatedDepreciation > 0
          ? "计提中"
          : "待计提";

    return {
      originalValue,
      salvageValue,
      usefulLifeMonths,
      depreciationStart:
        battery.depreciationStart || battery.purchaseDate || "",
      depreciationMethod: battery.depreciationMethod || "直线法",
      depreciableAmount,
      monthlyDepreciation,
      accumulatedDepreciation,
      netValue,
      depreciationMonths: depreciationRecords.length,
      remainingDepreciationMonths:
        monthlyDepreciation > 0
          ? Math.max(
              Math.ceil((netValue - salvageValue) / monthlyDepreciation),
              0,
            )
          : 0,
      depreciationStatus,
      lastDepreciationPeriod: latestRecord?.period ?? "",
      lastDepreciationAt: latestRecord?.postedAt ?? "",
      supplierName: battery.supplierName || "",
      invoiceNo: battery.invoiceNo || "",
    };
  }

  private financeRecordsForAsset(battery: Record<string, any>) {
    return this.assetFinanceRecords
      .filter((item) => item.assetId === battery.id || item.btCode === battery.btCode)
      .sort((a, b) => String(b.postedAt ?? "").localeCompare(String(a.postedAt ?? "")));
  }

  private createAssetFinanceVoucher(input: {
    voucherType: string;
    typeLabel: string;
    sourceType: string;
    sourceId?: string;
    sourceNo: string;
    assetId: string;
    btCode: string;
    approvalNo?: string;
    operator: string;
    postedAt?: string;
    amount: number;
    remark?: string;
    entries: Array<{
      accountTitle: string;
      direction: "DEBIT" | "CREDIT";
      amount: number;
      summary?: string;
    }>;
  }) {
    const existing = this.assetFinanceRecords.find(
      (item) =>
        item.sourceType === input.sourceType &&
        item.sourceNo === input.sourceNo &&
        item.assetId === input.assetId &&
        item.voucherType === input.voucherType,
    );
    if (existing) return existing;

    const entries = input.entries
      .map((entry) => ({
        ...entry,
        amount: this.roundMoney(Number(entry.amount || 0)),
        summary: entry.summary || input.typeLabel,
      }))
      .filter((entry) => entry.amount > 0);
    const debitTotal = this.roundMoney(
      entries
        .filter((entry) => entry.direction === "DEBIT")
        .reduce((total, entry) => total + Number(entry.amount || 0), 0),
    );
    const creditTotal = this.roundMoney(
      entries
        .filter((entry) => entry.direction === "CREDIT")
        .reduce((total, entry) => total + Number(entry.amount || 0), 0),
    );
    const suffix = `${String(Date.now()).slice(-8)}${randomUUID().slice(0, 6)}`;
    const voucher = {
      id: `afv-${suffix}`,
      voucherNo: `VCH${suffix}`,
      voucherType: input.voucherType,
      typeLabel: input.typeLabel,
      sourceType: input.sourceType,
      sourceId: input.sourceId || "",
      sourceNo: input.sourceNo,
      assetId: input.assetId,
      btCode: input.btCode,
      approvalNo: input.approvalNo || "",
      amount: this.roundMoney(Number(input.amount || Math.max(debitTotal, creditTotal))),
      debitTotal,
      creditTotal,
      balanced: Math.abs(debitTotal - creditTotal) < 0.01,
      entries,
      operator: input.operator,
      postedAt: input.postedAt || this.nowText(),
      status: "POSTED",
      statusLabel: "已入账",
      remark: input.remark || "",
    };

    this.assetFinanceRecords.unshift(voucher);
    return voucher;
  }

  private createPurchaseInboundVoucher(
    battery: Record<string, any>,
    record: Record<string, any>,
    operator: string,
    postedAt: string,
  ) {
    const originalValue = this.roundMoney(
      Number(record.originalValue || battery.originalValue || this.assetDefaultOriginalValue(battery)),
    );
    const voucher = this.createAssetFinanceVoucher({
      voucherType: "ASSET_PURCHASE_INBOUND",
      typeLabel: "采购入库",
      sourceType: "PURCHASE_INBOUND",
      sourceId: record.id,
      sourceNo: record.inboundNo,
      assetId: battery.id,
      btCode: battery.btCode,
      approvalNo: record.approvalNo,
      operator,
      postedAt,
      amount: originalValue,
      remark: `${record.inboundNo} 采购入库形成固定资产原值。`,
      entries: [
        {
          accountTitle: "固定资产-锂电池",
          direction: "DEBIT",
          amount: originalValue,
          summary: `${battery.btCode} 采购验收入库`,
        },
        {
          accountTitle: record.invoiceNo ? "应付账款-供应商" : "暂估应付款",
          direction: "CREDIT",
          amount: originalValue,
          summary: record.supplierName || "采购入库",
        },
      ],
    });
    record.voucherNo = voucher.voucherNo;
    return voucher;
  }

  private createDepreciationVoucher(
    battery: Record<string, any>,
    record: Record<string, any>,
  ) {
    const amount = this.roundMoney(Number(record.amount || 0));
    if (amount <= 0) return null;
    const voucher = this.createAssetFinanceVoucher({
      voucherType: "ASSET_DEPRECIATION",
      typeLabel: "折旧计提",
      sourceType: "ASSET_DEPRECIATION",
      sourceId: record.id,
      sourceNo: record.depreciationNo,
      assetId: battery.id,
      btCode: battery.btCode,
      operator: record.operator || "财务",
      postedAt: record.postedAt || this.nowText(),
      amount,
      remark: `${record.period} 固定资产折旧计提。`,
      entries: [
        {
          accountTitle: "管理费用-折旧费",
          direction: "DEBIT",
          amount,
          summary: `${battery.btCode} ${record.period} 折旧`,
        },
        {
          accountTitle: "累计折旧-锂电池",
          direction: "CREDIT",
          amount,
          summary: record.depreciationNo,
        },
      ],
    });
    record.voucherNo = voucher.voucherNo;
    return voucher;
  }

  private createDisposalVoucher(
    battery: Record<string, any>,
    record: Record<string, any>,
    operator: string,
    postedAt: string,
  ) {
    const originalValue = this.roundMoney(this.assetDefaultOriginalValue(battery));
    const accumulatedDepreciation = this.roundMoney(
      Number(record.accumulatedDepreciation || 0),
    );
    const disposalAmount = this.roundMoney(Number(record.amount || 0));
    const bookValue = this.roundMoney(
      Number(record.bookValue || Math.max(originalValue - accumulatedDepreciation, 0)),
    );
    const gainAmount = this.roundMoney(Math.max(disposalAmount - bookValue, 0));
    const lossAmount = this.roundMoney(Math.max(bookValue - disposalAmount, 0));
    const voucher = this.createAssetFinanceVoucher({
      voucherType: "ASSET_DISPOSAL",
      typeLabel: record.type || "资产处置",
      sourceType: "ASSET_DISPOSAL",
      sourceId: record.id,
      sourceNo: record.disposalNo,
      assetId: battery.id,
      btCode: battery.btCode,
      approvalNo: record.approvalNo,
      operator,
      postedAt,
      amount: Math.max(originalValue, disposalAmount),
      remark: `${record.disposalNo} 审批通过后自动生成处置凭证。`,
      entries: [
        {
          accountTitle: "累计折旧-锂电池",
          direction: "DEBIT",
          amount: accumulatedDepreciation,
          summary: `${battery.btCode} 冲销累计折旧`,
        },
        {
          accountTitle: "银行存款/应收处置款",
          direction: "DEBIT",
          amount: disposalAmount,
          summary: record.type || "资产处置",
        },
        {
          accountTitle: "资产处置损失",
          direction: "DEBIT",
          amount: lossAmount,
          summary: `${battery.btCode} 处置损失`,
        },
        {
          accountTitle: "固定资产-锂电池",
          direction: "CREDIT",
          amount: originalValue,
          summary: `${battery.btCode} 冲销原值`,
        },
        {
          accountTitle: "资产处置收益",
          direction: "CREDIT",
          amount: gainAmount,
          summary: `${battery.btCode} 处置收益`,
        },
      ],
    });
    record.voucherNo = voucher.voucherNo;
    return voucher;
  }

  private ensureHistoricalAssetFinanceRecords() {
    const beforeCount = this.assetFinanceRecords.length;
    this.batteries.forEach((battery) => {
      const sourceNo =
        battery.initialInboundNo || `IN${String(battery.btCode || battery.id).slice(-8)}`;
      this.createPurchaseInboundVoucher(
        battery,
        {
          id: `initial-${battery.id}`,
          inboundNo: sourceNo,
          assetId: battery.id,
          btCode: battery.btCode,
          approvalNo: battery.inboundApprovalNo || "",
          originalValue: this.assetDefaultOriginalValue(battery),
          supplierName: battery.supplierName || "",
          invoiceNo: battery.invoiceNo || "",
        },
        battery.keeper || "资产管理员",
        battery.purchaseDate ? `${battery.purchaseDate} 09:00` : this.nowText(),
      );
    });

    this.depreciationRecords.forEach((record) => {
      const battery = this.batteries.find(
        (item) => item.id === record.assetId || item.btCode === record.btCode,
      );
      if (battery) this.createDepreciationVoucher(battery, record);
    });

    this.disposalRecords
      .filter((record) => record.status === "已登记")
      .forEach((record) => {
        const battery = this.batteries.find(
          (item) => item.id === record.assetId || item.btCode === record.btCode,
        );
        if (battery) {
          this.createDisposalVoucher(
            battery,
            record,
            record.operator || "财务",
            record.finalizedAt || record.approvedAt || this.nowText(),
          );
        }
      });

    if (this.assetFinanceRecords.length !== beforeCount) {
      this.persistMockState();
    }
  }

  private normalizeDepreciationPeriod(value: unknown) {
    const period = String(value ?? this.monthText(this.dateText())).trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      throw new BadRequestException("折旧期间格式应为 YYYY-MM。");
    }
    return period;
  }

  private disposalActionLabel(action: string) {
    return action === BatteryAssetStatus.Scrapped ? "报废" : "买断";
  }

  private disposalApprovalType(action: string) {
    return action === BatteryAssetStatus.BoughtOut
      ? "CUSTOMER_BUYOUT"
      : "USED_BATTERY_DISPOSAL";
  }

  private pendingDisposalRecordForAsset(battery: Record<string, any>) {
    return this.disposalRecords.find(
      (item) =>
        (item.assetId === battery.id || item.btCode === battery.btCode) &&
        item.status === "审批中",
    );
  }

  private pendingPurchaseInboundRecordForBt(btCode: string) {
    return this.inboundRecords.find(
      (item) => item.btCode === btCode && item.status === "审批中",
    );
  }

  private applyAssetPurchaseInboundApproval(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    const payload = approval.assetInboundPayload as
      | {
          recordIds: string[];
          items: Array<{ recordId: string; btCode: string }>;
        }
      | undefined;
    if (!payload || approval.assetInboundAppliedAt) return;

    payload.recordIds.forEach((recordId) => {
      const record = this.inboundRecords.find((item) => item.id === recordId);
      if (!record) return;

      let battery = this.batteries.find((item) => item.btCode === record.btCode);
      if (!battery) {
        const asset = this.createAssetInboundDirect({
          ...record,
          source: record.source || "采购入库",
          remark:
            record.remark ||
            `${approval.approvalNo} 审批通过后自动写入固定资产台账。`,
        });
        battery = this.batteries.find((item) => item.id === asset.id);
      }
      if (!battery) return;

      record.assetId = battery.id;
      record.status = "已入库";
      record.approvalStatus = ApprovalStatus.Approved;
      record.approvalNo = approval.approvalNo;
      record.approvalId = approval.id;
      record.approvedAt = now;
      record.finalizedAt = now;
      record.inboundAt = record.inboundAt || now;
      const voucher = this.createPurchaseInboundVoucher(
        battery,
        record,
        operator,
        now,
      );
      record.voucherNo = voucher.voucherNo;
      battery.inboundApprovalNo = approval.approvalNo;
      battery.purchaseVoucherNo = voucher.voucherNo;
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: "入库",
        title: "采购入库审批通过",
        time: now,
        operator,
        target: approval.approvalNo,
        status: "已入库",
        remark: `已生成财务凭证 ${voucher.voucherNo}。`,
      });
    });

    approval.assetInboundAppliedAt = now;
  }

  private syncAssetPurchaseInboundApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    const payload = approval.assetInboundPayload as
      | { recordIds: string[] }
      | undefined;
    if (!payload) return;

    if (approval.status === ApprovalStatus.Approved) {
      this.applyAssetPurchaseInboundApproval(approval, now, operator);
      return;
    }

    if (
      ![ApprovalStatus.Rejected, ApprovalStatus.Cancelled].includes(
        approval.status,
      )
    ) {
      return;
    }

    const statusText =
      approval.status === ApprovalStatus.Rejected ? "已驳回" : "已撤销";
    payload.recordIds.forEach((recordId) => {
      const record = this.inboundRecords.find((item) => item.id === recordId);
      if (!record || record.status !== "审批中") return;
      record.status = statusText;
      record.approvalStatus = approval.status;
      record.closedAt = now;
      record.operator = operator || record.operator;
      record.remark =
        approval.logs?.at(-1)?.comment || record.remark || "采购入库审批未通过。";
    });
  }

  private applyAssetTerminalApproval(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    const payload = approval.assetTerminalPayload as
      | {
          action: string;
          recordIds: string[];
          items: Array<{
            recordId: string;
            assetId: string;
            btCode: string;
            amount: number;
            reason: string;
            remark: string;
          }>;
        }
      | undefined;
    if (!payload || approval.assetTerminalAppliedAt) return;

    const action = payload.action as
      | typeof BatteryAssetStatus.Scrapped
      | typeof BatteryAssetStatus.BoughtOut;
    const affectedOrderIds = new Set<string>();

    payload.items.forEach((item) => {
      const record = this.disposalRecords.find(
        (entry) => entry.id === item.recordId,
      );
      const battery = this.batteries.find(
        (entry) => entry.id === item.assetId || entry.btCode === item.btCode,
      );
      if (!record || !battery) return;

      const profile = this.assetFinancialProfile(battery);
      const amount = this.roundMoney(Number(record.amount || item.amount || 0));
      const gainLossAmount = this.roundMoney(amount - profile.netValue);
      const financeResult =
        action === BatteryAssetStatus.BoughtOut
          ? gainLossAmount >= 0
            ? `买断收益 ${gainLossAmount} 元`
            : `买断损失 ${Math.abs(gainLossAmount)} 元`
          : `报废损失 ${profile.netValue} 元`;

      if (action === BatteryAssetStatus.BoughtOut) {
        this.closeActiveOutboundsForBt(battery.btCode, now, "TERMINAL").forEach(
          (orderId) => affectedOrderIds.add(orderId),
        );
      }

      record.status = "已登记";
      record.approvalStatus = ApprovalStatus.Approved;
      record.approvedAt = now;
      record.finalizedAt = now;
      record.bookValue = profile.netValue;
      record.accumulatedDepreciation = profile.accumulatedDepreciation;
      record.gainLossAmount = gainLossAmount;
      record.financeResult = financeResult;
      record.approvalNo = approval.approvalNo;
      const voucher = this.createDisposalVoucher(battery, record, operator, now);
      record.voucherNo = voucher.voucherNo;

      battery.assetStatus = action;
      battery.lifecycle = record.type;
      battery.warehouse =
        action === BatteryAssetStatus.Scrapped
          ? "报废暂存区"
          : battery.warehouse || battery.location || "客户现场";
      battery.location = battery.warehouse;
      battery.disposalApprovalNo = approval.approvalNo;
      battery.disposalVoucherNo = voucher.voucherNo;
      battery.disposalBookValue = profile.netValue;
      battery.disposalGainLossAmount = gainLossAmount;
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: record.type,
        title: `${record.type}审批通过`,
        time: now,
        operator,
        target: approval.approvalNo,
        status: "已登记",
        remark: `${record.reason}；${financeResult}。`,
      });
    });

    affectedOrderIds.forEach((orderId) => {
      const order = this.orders.find((item) => item.id === orderId);
      if (!order) return;
      const btCodes = payload.items.map((item) => item.btCode).join("、");
      this.appendOrderEvent(
        order,
        "资产买断审批通过",
        `${btCodes} 已审批通过并从在租统计中移除。`,
      );
      this.syncOrderOutbound(order);
    });

    approval.assetTerminalAppliedAt = now;
  }

  private syncAssetTerminalApprovalStatus(
    approval: Record<string, any>,
    now: string,
    operator: string,
  ) {
    const payload = approval.assetTerminalPayload as
      | { recordIds: string[]; action: string }
      | undefined;
    if (!payload) return;

    if (approval.status === ApprovalStatus.Approved) {
      this.applyAssetTerminalApproval(approval, now, operator);
      return;
    }

    if (
      ![ApprovalStatus.Rejected, ApprovalStatus.Cancelled].includes(
        approval.status,
      )
    ) {
      return;
    }

    const statusText =
      approval.status === ApprovalStatus.Rejected ? "已驳回" : "已撤销";
    payload.recordIds.forEach((recordId) => {
      const record = this.disposalRecords.find((item) => item.id === recordId);
      if (!record || record.status !== "审批中") return;
      record.status = statusText;
      record.approvalStatus = approval.status;
      record.closedAt = now;
      record.financeResult = "审批未通过，未入账";
      this.appendAssetMovement(record.assetId, {
        type: record.type,
        title: `${record.type}审批${statusText.replace("已", "")}`,
        time: now,
        operator,
        target: approval.approvalNo,
        status: statusText,
        remark: record.reason,
      });
    });
  }

  private closeActiveOutboundsForBt(
    btCode: string,
    now: string,
    closeType: "RETURN" | "TERMINAL" = "RETURN",
  ) {
    const affectedOrderIds = new Set<string>();
    this.activeOutboundsForBt(btCode).forEach((outbound) => {
      affectedOrderIds.add(outbound.orderId);
      if (closeType === "RETURN") {
        outbound.returnedBtCodes = Array.from(
          new Set([...(outbound.returnedBtCodes ?? []), btCode]),
        );
        outbound.returnedAt = now;
      } else {
        outbound.closedBtCodes = Array.from(
          new Set([...(outbound.closedBtCodes ?? []), btCode]),
        );
        outbound.closedAt = now;
      }
    });
    return Array.from(affectedOrderIds);
  }

  private getAssetInboundRecords(
    battery: Record<string, any>,
    warehouse: string,
  ) {
    const baseRecord = {
      inboundNo:
        battery.initialInboundNo ||
        (battery.assetStatus === BatteryAssetStatus.InStock
          ? "IN202604120003"
          : "IN202604180001"),
      source: battery.initialInboundSource || "采购入库",
      warehouse: battery.initialWarehouse || warehouse || "郑州总仓",
      operator: battery.keeper || "王库管",
      quantity: 1,
      inboundAt: battery.purchaseDate,
      remark: `${battery.batchNum} 批次验收入库`,
    };

    const records = this.inboundRecords.filter(
      (item) => item.assetId === battery.id || item.btCode === battery.btCode,
    );
    return [
      ...(records.some((item) => item.inboundNo === baseRecord.inboundNo)
        ? []
        : [baseRecord]),
      ...records,
    ];
  }

  private syncOrderOutbound(order: Record<string, any>) {
    const orderOutbounds = this.outbounds.filter(
      (item) => item.orderId === order.id,
    );
    const outboundBtCodes = new Set(
      orderOutbounds.flatMap((item) => item.btCodes ?? []),
    );
    const closedBtCodes = new Set(
      orderOutbounds.flatMap((item) => [
        ...(item.returnedBtCodes ?? []),
        ...(item.closedBtCodes ?? []),
      ]),
    );
    const activeBtCodes = new Set(
      [...outboundBtCodes].filter((btCode) => !closedBtCodes.has(btCode)),
    );
    const receivedBtCodes = new Set(
      orderOutbounds
        .filter((item) =>
          [OutboundStatus.Received, OutboundStatus.AutoReceived].includes(
            item.status,
          ),
        )
        .flatMap((item) => item.btCodes ?? [])
        .filter((btCode) => activeBtCodes.has(btCode)),
    );
    const orderedBatteryCount = Number(order.orderedBatteryCount || 0);

    order.batteryCount = activeBtCodes.size;
    order.outboundCount = activeBtCodes.size;
    order.receivedCount = receivedBtCodes.size;
    order.pendingReceiptCount = Math.max(
      activeBtCodes.size - receivedBtCodes.size,
      0,
    );
    order.outboundProgress = `${activeBtCodes.size}/${orderedBatteryCount || activeBtCodes.size}`;
    if (
      [
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      order.updatedAt = this.nowText();
      return;
    }
    if (activeBtCodes.size <= 0 && orderedBatteryCount) {
      order.status = OrderStatus.PendingOutbound;
    } else if (activeBtCodes.size > 0 && order.pendingReceiptCount > 0) {
      order.status = OrderStatus.PendingReceipt;
    } else if (
      orderedBatteryCount &&
      activeBtCodes.size < orderedBatteryCount
    ) {
      order.status = OrderStatus.PartiallyOutbound;
    } else if (activeBtCodes.size > 0) {
      order.status = OrderStatus.Leasing;
    }
    order.updatedAt = this.nowText();
  }

  getAssets() {
    return this.batteries.map((battery, index) => {
      const order = this.orders.find((item) => item.id === battery.orderId);
      const outbound = this.activeOutboundsForBt(battery.btCode).at(0);
      const repair = this.repairs.find(
        (item) => item.btCode === battery.btCode,
      );
      const movements = this.assetMovements[battery.id] ?? [];
      const warehouse = this.assetWarehouse(battery, outbound);
      const inboundRecords = this.getAssetInboundRecords(battery, warehouse);
      const latestInbound = inboundRecords.at(-1);
      const latestInventory = this.inventoryRecords.find(
        (item) => item.assetId === battery.id || item.btCode === battery.btCode,
      );
      const financial = this.assetFinancialProfile(battery);
      const pendingDisposal = this.pendingDisposalRecordForAsset(battery);
      const financeRecords = this.financeRecordsForAsset(battery);

      return {
        id: battery.id,
        index: index + 1,
        assetNo: `ASSET-${battery.btCode.slice(-6)}`,
        btCode: battery.btCode,
        deviceNum: battery.deviceNum,
        model: battery.model,
        specification: battery.specification,
        assetStatus: battery.assetStatus,
        runningStatus: battery.runningStatus,
        powerPercent: battery.powerPercent,
        warehouse,
        location: battery.location,
        customerName: order?.customerName ?? "",
        customerShortName: order?.customerShortName ?? "",
        orderNo: order?.orderNo ?? "",
        outboundNo: outbound?.outboundNo ?? "",
        inboundNo: latestInbound?.inboundNo ?? "",
        batchNum: battery.batchNum,
        purchaseDate: battery.purchaseDate,
        inboundAt: latestInbound?.inboundAt ?? battery.purchaseDate,
        outboundAt: outbound?.outboundAt ?? "",
        receivedAt: outbound?.receivedAt ?? "",
        repairNo: repair?.repairNo ?? "",
        keeper: battery.keeper || "王库管",
        assetOwner: "资产管理部",
        latestAction: movements.at(-1)?.title ?? "采购入库",
        latestActionAt: movements.at(-1)?.time ?? battery.updatedAt,
        lastInventoryAt: latestInventory?.checkedAt ?? "",
        inventoryResult: latestInventory?.result ?? "",
        inventoryStatus: latestInventory?.resultLabel ?? "未盘点",
        ...financial,
        voucherCount: financeRecords.length,
        latestVoucherNo: financeRecords[0]?.voucherNo ?? "",
        hasPendingDisposal: Boolean(pendingDisposal),
        pendingDisposalApprovalNo: pendingDisposal?.approvalNo ?? "",
        pendingDisposalStatus: pendingDisposal?.status ?? "",
        canOutbound: battery.assetStatus === BatteryAssetStatus.InStock,
        cannotOutboundReason:
          battery.assetStatus === BatteryAssetStatus.InStock
            ? ""
            : ["SCRAPPED", "BOUGHT_OUT"].includes(battery.assetStatus)
              ? "当前资产已进入终态，不能再次出库"
              : "当前资产不在库，不能再次出库",
        updatedAt: battery.updatedAt,
      };
    });
  }

  getAsset(id: string) {
    const battery = this.findBatteryAsset(id);
    const asset = this.getAssets().find((item) => item.id === battery.id);
    const order = this.orders.find((item) => item.id === battery.orderId);
    const outbounds = this.outbounds.filter((item) =>
      item.btCodes.includes(battery.btCode),
    );
    const repairs = this.repairs.filter(
      (item) => item.btCode === battery.btCode,
    );
    const movements = this.assetMovements[battery.id] ?? [];

    return {
      ...asset,
      battery,
      order,
      outbounds,
      repairs,
      inboundRecords: this.getAssetInboundRecords(
        battery,
        asset?.warehouse ?? "郑州总仓",
      ),
      transferRecords: this.transferRecords.filter(
        (item) => item.assetId === battery.id || item.btCode === battery.btCode,
      ),
      disposalRecords: this.disposalRecords.filter(
        (item) => item.assetId === battery.id || item.btCode === battery.btCode,
      ),
      inventoryRecords: this.inventoryRecords.filter(
        (item) => item.assetId === battery.id || item.btCode === battery.btCode,
      ),
      depreciationRecords: this.depreciationRecordsForAsset(battery),
      financeRecords: this.financeRecordsForAsset(battery),
      movements,
    };
  }

  private createAssetInboundDirect(body: Record<string, any>) {
    const btCode = String(body.btCode ?? "").trim();
    const model = String(body.model ?? "").trim();
    const warehouse = String(body.warehouse ?? "").trim() || "郑州总仓";
    const batchNum =
      String(body.batchNum ?? "").trim() ||
      `BATCH${this.dateText().replace(/-/g, "").slice(0, 6)}`;
    const purchaseDate =
      String(body.purchaseDate ?? "").trim() || this.dateText();
    const keeper = String(body.keeper ?? "").trim() || "王库管";
    const originalValue = this.roundMoney(
      Number(body.originalValue || this.assetDefaultOriginalValue({ model })),
    );
    const salvageValue = this.roundMoney(
      Number(body.salvageValue ?? Math.round(originalValue * 0.1)),
    );
    const usefulLifeMonths = Math.max(Number(body.usefulLifeMonths || 36), 1);

    if (!btCode) throw new BadRequestException("请填写 BT 码。");
    if (!model) throw new BadRequestException("请填写电池型号。");
    if (!Number.isFinite(originalValue) || originalValue <= 0) {
      throw new BadRequestException("资产原值必须大于 0。");
    }
    if (
      !Number.isFinite(salvageValue) ||
      salvageValue < 0 ||
      salvageValue >= originalValue
    ) {
      throw new BadRequestException("残值必须大于等于 0 且小于资产原值。");
    }
    if (this.batteries.some((item) => item.btCode === btCode)) {
      throw new BadRequestException("BT 码已存在，不能重复入库。");
    }

    const suffix = String(Date.now()).slice(-8);
    const now = this.nowText();
    const battery: Record<string, any> = {
      id: `bat-${suffix}`,
      btCode,
      deviceNum: body.deviceNum || `LN${suffix}`,
      batterySn: btCode,
      model,
      specification: body.specification || `${model} / 新增入库`,
      orgName: "延成科讯 / 内部仓储",
      sourcePlatform: "内部入库",
      runningStatus: DeviceRunningStatus.Offline,
      assetStatus: BatteryAssetStatus.InStock,
      powerPercent: Number(body.powerPercent ?? 100),
      voltage: 0,
      current: 0,
      temperature: 25,
      protectFactory: body.protectFactory || "待同步",
      protectStatus: "离线",
      locatorSoftwareVersion: "",
      bmsSoftwareVersion: "",
      imei: body.imei || "",
      iccid: "",
      signal: 0,
      lifecycle: "库存",
      customStatus: "新增入库",
      inboundState: "在库",
      cardState: "未激活",
      batchNum,
      groupName: warehouse,
      packageName: "未绑定",
      remainingDays: 0,
      renewalDesc: "未激活",
      expiryTime: "",
      activationTime: "",
      purchaseDate,
      originalValue,
      salvageValue,
      usefulLifeMonths,
      depreciationStart: body.depreciationStart || purchaseDate,
      depreciationMethod: "直线法",
      supplierName: body.supplierName || "",
      invoiceNo: body.invoiceNo || "",
      onlineTime: "",
      offlineTime: now,
      gpsUpdateTime: "",
      qrCode: btCode,
      userName: warehouse,
      abnormal: "无",
      movementStatus: "静止",
      offlineDays: 0,
      locationHardwareVersion: "",
      bmsDetailVersion: "",
      bmsManufacturers: body.protectFactory || "待同步",
      configuration: "待配置",
      output: "关闭",
      charging: "关",
      discharging: "关",
      locationMethod: "仓库登记",
      pressureDiff: 0,
      pressureMax: 0,
      pressureMin: 0,
      sendTimeGeneral: "",
      sendTimeProtect: "",
      lastChargeDate: "",
      lastDischargeDate: "",
      exchangeKey: "",
      price: 0,
      stopUse: "否",
      stopTime: "",
      isPush: "否",
      replaceQrCode: "",
      oldImei: "",
      oldQrCode: "",
      newQrCode: "",
      oldBT: "",
      newBT: "",
      bmsIsConnect: "未连接",
      bmsTime: "",
      bmsFactoryDate: purchaseDate,
      bmsAddress: "",
      cellType: body.cellType || "",
      designCapacity: Number(body.designCapacity || 0),
      cellTemperature1: 25,
      cellTemperature2: 25,
      chargeMos: "已关闭",
      dischargeMos: "已关闭",
      preDischargeMos: "已关闭",
      balanceStatus: "空闲中",
      heatStatus: "空闲中",
      recoveryStatus: "已恢复",
      totalMileage: 0,
      cycleNum: 0,
      nominalCapacity: Number(body.nominalCapacity || 0),
      remainingCapacity: 0,
      serialNumber: 0,
      satelliteNum: 0,
      location: warehouse,
      warehouse,
      initialWarehouse: warehouse,
      initialInboundNo: body.inboundNo || `IN${suffix}`,
      initialInboundSource: body.source || "采购入库",
      keeper,
      customerId: null,
      orderId: null,
      updatedAt: now,
    };

    this.batteries.unshift(battery);
    this.assetMovements[battery.id] = [];
    this.appendAssetMovement(battery.id, {
      type: "入库",
      title: body.source || "采购入库",
      time: now,
      operator: keeper,
      target: warehouse,
      status: "已完成",
      remark: body.remark || `${batchNum} 批次新增入库。`,
    });

    this.persistMockState();
    return this.getAsset(battery.id);
  }

  private normalizeAssetInboundDraft(input: Record<string, any>, index: number) {
    const btCode = String(input.btCode ?? "").trim();
    const model = String(input.model ?? "").trim();
    const warehouse = String(input.warehouse ?? "").trim() || "郑州总仓";
    const batchNum =
      String(input.batchNum ?? "").trim() ||
      `BATCH${this.dateText().replace(/-/g, "").slice(0, 6)}`;
    const purchaseDate =
      String(input.purchaseDate ?? "").trim() || this.dateText();
    const keeper = String(input.keeper ?? "").trim() || "王库管";
    const originalValue = this.roundMoney(
      Number(input.originalValue || this.assetDefaultOriginalValue({ model })),
    );
    const salvageValue = this.roundMoney(
      Number(input.salvageValue ?? Math.round(originalValue * 0.1)),
    );
    const usefulLifeMonths = Math.max(Number(input.usefulLifeMonths || 36), 1);

    if (!btCode) throw new BadRequestException(`第 ${index + 1} 行缺少 BT 码`);
    if (!model) throw new BadRequestException(`第 ${index + 1} 行缺少电池型号`);
    if (!Number.isFinite(originalValue) || originalValue <= 0) {
      throw new BadRequestException(`第 ${index + 1} 行资产原值必须大于 0`);
    }
    if (
      !Number.isFinite(salvageValue) ||
      salvageValue < 0 ||
      salvageValue >= originalValue
    ) {
      throw new BadRequestException(`第 ${index + 1} 行残值必须大于等于 0 且小于原值`);
    }

    return {
      btCode,
      deviceNum: String(input.deviceNum ?? "").trim(),
      model,
      specification:
        String(input.specification ?? "").trim() || `${model} / 采购入库`,
      warehouse,
      batchNum,
      purchaseDate,
      keeper,
      powerPercent: Number(input.powerPercent ?? 100),
      originalValue,
      salvageValue,
      usefulLifeMonths,
      depreciationStart:
        String(input.depreciationStart ?? "").trim() || purchaseDate,
      supplierName: String(input.supplierName ?? "").trim(),
      invoiceNo: String(input.invoiceNo ?? "").trim(),
      protectFactory: String(input.protectFactory ?? "").trim(),
      cellType: String(input.cellType ?? "").trim(),
      designCapacity: Number(input.designCapacity || 0),
      nominalCapacity: Number(input.nominalCapacity || 0),
      remark: String(input.remark ?? "").trim(),
    };
  }

  importAssetInbounds(body: Record<string, any>) {
    const sourceRecords =
      Array.isArray(body.records) && body.records.length
        ? body.records
        : Array.isArray(body.items) && body.items.length
          ? body.items
          : [body];
    const drafts = sourceRecords.map((item: Record<string, any>, index: number) =>
      this.normalizeAssetInboundDraft(item, index),
    );
    const seenBtCodes = new Set<string>();
    const duplicateDraft = drafts.find((item) => {
      if (seenBtCodes.has(item.btCode)) return true;
      seenBtCodes.add(item.btCode);
      return false;
    });
    if (duplicateDraft) {
      throw new BadRequestException(`导入明细中 BT 码重复：${duplicateDraft.btCode}`);
    }

    const existingAssets = drafts.filter((item) =>
      this.batteries.some((battery) => battery.btCode === item.btCode),
    );
    if (existingAssets.length) {
      throw new BadRequestException(
        `${existingAssets.map((item) => item.btCode).join("、")} 已存在，不能重复入库`,
      );
    }

    const pendingAssets = drafts.filter((item) =>
      this.pendingPurchaseInboundRecordForBt(item.btCode),
    );
    if (pendingAssets.length) {
      throw new BadRequestException(
        `${pendingAssets.map((item) => item.btCode).join("、")} 已有采购入库审批在处理中`,
      );
    }

    const now = this.nowText();
    const operator = String(body.operator ?? "").trim() || drafts[0]?.keeper || "王库管";
    const records = drafts.map((draft, index) => {
      const suffix = `${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`;
      return {
        id: `pin-${suffix}`,
        inboundNo: `PIN${suffix}`,
        source: "采购入库",
        status: "审批中",
        approvalStatus: ApprovalStatus.Processing,
        approvalNo: "",
        approvalId: "",
        assetId: "",
        quantity: 1,
        inboundAt: "",
        createdAt: now,
        operator,
        ...draft,
        remark:
          draft.remark ||
          "采购入库申请已提交审批，审批通过后自动生成资产台账和财务凭证。",
      };
    });

    records.forEach((record) => this.inboundRecords.unshift(record));
    const totalAmount = this.roundMoney(
      records.reduce((total, record) => total + Number(record.originalValue || 0), 0),
    );
    const approval = this.createApproval({
      type: "PURCHASE_INBOUND",
      title:
        records.length > 1
          ? `固定资产批量采购入库审批（${records.length} 组）`
          : `固定资产采购入库审批（${records[0].btCode}）`,
      applicant: operator,
      department: "资产管理部",
      priority: totalAmount > 50000 || records.length >= 10 ? "高" : "普通",
      businessId: records[0]?.id ?? "",
      businessNo: records.map((record) => record.inboundNo).join("、"),
      customerName:
        Array.from(new Set(records.map((record) => record.supplierName).filter(Boolean))).join("、") ||
        "供应商采购入库",
      amount: totalAmount,
      summary: `${records.length} 组电池申请采购入库，原值合计 ${totalAmount} 元，审批通过后自动入账。`,
      formItems: [
        { label: "入库数量", value: `${records.length} 组` },
        { label: "BT码", value: records.map((record) => record.btCode).join("、") },
        { label: "入库仓库", value: Array.from(new Set(records.map((record) => record.warehouse))).join("、") },
        { label: "采购批次", value: Array.from(new Set(records.map((record) => record.batchNum))).join("、") },
        {
          label: "原值合计",
          value: `¥${totalAmount.toLocaleString("zh-CN")}`,
        },
      ],
      riskItems: [
        "采购入库审批通过后才写入固定资产台账，避免未验收资产提前可出库。",
        "财务凭证将按资产原值生成固定资产借方和应付款贷方分录。",
        "BT 码必须唯一，审批处理中和已入库资产均不能重复导入。",
      ],
      assetInboundPayload: {
        recordIds: records.map((record) => record.id),
        items: records.map((record) => ({
          recordId: record.id,
          btCode: record.btCode,
        })),
      },
    }) as Record<string, any>;

    records.forEach((record) => {
      record.approvalId = approval.id;
      record.approvalNo = approval.approvalNo;
    });

    this.persistMockState();
    return {
      successCount: records.length,
      failedCount: 0,
      approval,
      records,
      assets: [],
    };
  }

  createAssetInbound(body: Record<string, any>) {
    return this.importAssetInbounds({
      ...body,
      records: [body],
    });
  }

  createAssetOutbound(id: string, body: Record<string, any>) {
    const battery = this.findBatteryAsset(id);
    if (battery.assetStatus !== BatteryAssetStatus.InStock) {
      throw new BadRequestException("只有在库资产可以创建出库单。");
    }

    const order = this.findOrder(
      String(body.orderId ?? body.orderNo ?? "").trim(),
    );
    if (
      [OrderStatus.Draft, OrderStatus.Approving].includes(order.status as any)
    ) {
      throw new BadRequestException("合同会签通过后才能创建出库单。");
    }
    if (
      [
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException(
        "退租结算中、已完成或已取消订单不能创建出库单。",
      );
    }
    const suffix = String(Date.now()).slice(-8);
    const now = this.nowText();
    const outboundAt = String(body.outboundAt ?? "").trim() || this.dateText();
    const warehouse =
      String(body.warehouse ?? "").trim() || this.assetWarehouse(battery);
    const operator = String(body.operator ?? "").trim() || "王库管";
    const receiver =
      String(body.receiver ?? "").trim() ||
      order.customerContact ||
      "客户收货人";
    const address =
      String(body.address ?? "").trim() || order.region || "客户现场";
    const outbound = {
      id: `out-${suffix}`,
      outboundNo: `OUT${suffix}`,
      orderId: order.id,
      customerName: order.customerName,
      status: OutboundStatus.PendingReceipt,
      outboundAt,
      autoReceiveAt: body.autoReceiveAt || this.addDaysText(outboundAt, 7),
      receivedAt: "",
      warehouse,
      operator,
      receiver,
      address,
      btCodes: [battery.btCode],
      remark: body.remark || "资产部门基于租赁订单创建出库单。",
    };

    this.outbounds.unshift(outbound);
    battery.assetStatus = BatteryAssetStatus.Leasing;
    battery.customerId = order.customerId;
    battery.orderId = order.id;
    battery.userName = order.customerShortName || order.customerName;
    battery.location = address;
    battery.warehouse = `${order.customerShortName || order.customerName}现场`;
    battery.inboundState = "已出库";
    battery.lifecycle = "运营";
    battery.updatedAt = now;
    this.syncOrderOutbound(order);
    this.appendAssetMovement(battery.id, {
      type: "出库",
      title: "订单出库",
      time: now,
      operator,
      target: order.customerName,
      status: "待客户收货",
      remark: `${outbound.outboundNo}，绑定 ${order.orderNo}。`,
    });

    this.persistMockState();
    return this.getAsset(battery.id);
  }

  createAssetBatchOutbound(body: Record<string, any>) {
    const batteries = this.findUniqueBatteryAssets(this.parseAssetRefs(body));
    const unavailable = batteries.filter(
      (battery) => battery.assetStatus !== BatteryAssetStatus.InStock,
    );
    if (unavailable.length) {
      throw new BadRequestException(
        `${unavailable.map((item) => item.btCode).join("、")} 当前不是在库状态，不能批量出库。`,
      );
    }

    const order = this.findOrder(
      String(body.orderId ?? body.orderNo ?? "").trim(),
    );
    if (
      [OrderStatus.Draft, OrderStatus.Approving].includes(order.status as any)
    ) {
      throw new BadRequestException("合同会签通过后才能批量出库。");
    }
    if (
      [
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException(
        "退租结算中、已完成或已取消订单不能批量出库。",
      );
    }
    this.syncOrderOutbound(order);
    const orderedBatteryCount = Number(order.orderedBatteryCount || 0);
    const remainingCount =
      orderedBatteryCount - Number(order.outboundCount || 0);
    if (orderedBatteryCount && batteries.length > remainingCount) {
      throw new BadRequestException(
        `本订单剩余可出库 ${remainingCount} 组，不能批量出库 ${batteries.length} 组。`,
      );
    }

    const suffix = String(Date.now()).slice(-8);
    const now = this.nowText();
    const outboundAt = String(body.outboundAt ?? "").trim() || this.dateText();
    const warehouse = String(body.warehouse ?? "").trim() || "郑州总仓";
    const operator =
      String(body.operator ?? "").trim() || order.assetOwner || "王库管";
    const receiver =
      String(body.receiver ?? "").trim() ||
      order.customerContact ||
      "客户收货人";
    const address =
      String(body.address ?? "").trim() || order.region || "客户现场";
    const btCodes = batteries.map((battery) => battery.btCode);
    const outbound: Record<string, any> = {
      id: `out-${suffix}`,
      outboundNo: `OUT${suffix}`,
      orderId: order.id,
      customerName: order.customerName,
      status: OutboundStatus.PendingReceipt,
      outboundAt,
      autoReceiveAt: body.autoReceiveAt || this.addDaysText(outboundAt, 7),
      receivedAt: "",
      warehouse,
      operator,
      receiver,
      address,
      btCodes,
      remark:
        body.remark ||
        `资产部门批量出库 ${batteries.length} 组电池，绑定订单 ${order.orderNo}。`,
    };

    this.outbounds.unshift(outbound);
    batteries.forEach((battery) => {
      battery.assetStatus = BatteryAssetStatus.Leasing;
      battery.customerId = order.customerId;
      battery.orderId = order.id;
      battery.userName = order.customerShortName || order.customerName;
      battery.location = address;
      battery.warehouse = `${order.customerShortName || order.customerName}现场`;
      battery.inboundState = "已出库";
      battery.lifecycle = "运营";
      battery.customStatus = "待客户收货";
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: "出库",
        title: "批量订单出库",
        time: now,
        operator,
        target: order.customerName,
        status: "待客户收货",
        remark: `${outbound.outboundNo}，批量绑定 ${order.orderNo}。`,
      });
    });

    this.appendOrderEvent(
      order,
      "批量创建出库单",
      `${outbound.outboundNo} 出库 ${batteries.length} 组电池，等待客户确认收货。`,
    );
    this.syncOrderOutbound(order);

    this.persistMockState();
    return {
      successCount: batteries.length,
      failedCount: 0,
      outbound,
      order: this.getOrder(order.id),
      assets: batteries.map((battery) => this.getAsset(battery.id)),
    };
  }

  returnAssetInbound(id: string, body: Record<string, any>) {
    this.batchReturnAssetInbound({ ...body, assetIds: [id] });
    this.persistMockState();
    return this.getAsset(id);
  }

  batchReturnAssetInbound(body: Record<string, any>) {
    const batteries = this.findUniqueBatteryAssets(this.parseAssetRefs(body));
    const invalid = batteries.filter(
      (battery) => battery.assetStatus !== BatteryAssetStatus.Leasing,
    );
    if (invalid.length) {
      throw new BadRequestException(
        `${invalid.map((item) => item.btCode).join("、")} 当前不是租赁状态，不能退回入库。`,
      );
    }

    const warehouse = String(body.warehouse ?? "").trim() || "郑州总仓";
    const operator = String(body.operator ?? "").trim() || "王库管";
    const now = this.nowText();
    const affectedOrderIds = new Set<string>();

    batteries.forEach((battery, index) => {
      const suffix = `${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`;
      const order = this.orders.find((item) => item.id === battery.orderId);
      this.closeActiveOutboundsForBt(battery.btCode, now, "RETURN").forEach(
        (orderId) => affectedOrderIds.add(orderId),
      );
      const inboundRecord = {
        id: `ret-${suffix}`,
        assetId: battery.id,
        btCode: battery.btCode,
        inboundNo: `RET${suffix}`,
        source: "租赁退回入库",
        warehouse,
        operator,
        quantity: 1,
        inboundAt: now,
        remark:
          body.remark ||
          `${order?.orderNo ?? "原租赁订单"} 退回后重新入库，资产恢复可调拨状态。`,
      };

      this.inboundRecords.unshift(inboundRecord);
      battery.assetStatus = BatteryAssetStatus.InStock;
      battery.customerId = null;
      battery.orderId = null;
      battery.userName = warehouse;
      battery.warehouse = warehouse;
      battery.location = warehouse;
      battery.groupName = warehouse;
      battery.inboundState = "退回入库";
      battery.lifecycle = "库存";
      battery.customStatus = "租赁退回";
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: "入库",
        title: "租赁退回入库",
        time: now,
        operator,
        target: warehouse,
        status: "已完成",
        remark: inboundRecord.remark,
      });
    });

    affectedOrderIds.forEach((orderId) => {
      const order = this.orders.find((item) => item.id === orderId);
      if (order) {
        this.appendOrderEvent(
          order,
          "资产退回入库",
          `${batteries.length} 组电池已从客户现场退回仓库。`,
        );
        this.syncOrderOutbound(order);
      }
    });

    this.persistMockState();
    return {
      successCount: batteries.length,
      failedCount: 0,
      assets: batteries.map((battery) => this.getAsset(battery.id)),
    };
  }

  transferAsset(id: string, body: Record<string, any>) {
    const battery = this.findBatteryAsset(id);
    if (battery.assetStatus !== BatteryAssetStatus.InStock) {
      throw new BadRequestException("只有在库资产可以调拨。");
    }
    const toWarehouse = String(body.toWarehouse ?? "").trim();
    if (!toWarehouse) throw new BadRequestException("请填写调入仓库。");

    const fromWarehouse =
      String(body.fromWarehouse ?? "").trim() || this.assetWarehouse(battery);
    const operator = String(body.operator ?? "").trim() || "王库管";
    const suffix = String(Date.now()).slice(-8);
    const now = this.nowText();
    const transfer = {
      id: `transfer-${suffix}`,
      assetId: battery.id,
      transferNo: `TR${suffix}`,
      btCode: battery.btCode,
      fromWarehouse,
      toWarehouse,
      status: "已调拨",
      operator,
      createdAt: now,
      remark: body.remark || "内部仓库调拨。",
    };

    this.transferRecords.unshift(transfer);
    battery.warehouse = toWarehouse;
    battery.location = toWarehouse;
    battery.groupName = toWarehouse;
    battery.updatedAt = now;
    this.appendAssetMovement(battery.id, {
      type: "调拨",
      title: "仓库调拨",
      time: now,
      operator,
      target: `${fromWarehouse} → ${toWarehouse}`,
      status: "已完成",
      remark: transfer.remark,
    });

    this.persistMockState();
    return this.getAsset(battery.id);
  }

  batchTransferAssets(body: Record<string, any>) {
    const batteries = this.findUniqueBatteryAssets(this.parseAssetRefs(body));
    const invalid = batteries.filter(
      (battery) => battery.assetStatus !== BatteryAssetStatus.InStock,
    );
    if (invalid.length) {
      throw new BadRequestException(
        `${invalid.map((item) => item.btCode).join("、")} 当前不是在库状态，不能批量调拨。`,
      );
    }

    const toWarehouse = String(body.toWarehouse ?? "").trim();
    if (!toWarehouse) throw new BadRequestException("请填写调入仓库。");

    const operator = String(body.operator ?? "").trim() || "王库管";
    const now = this.nowText();
    const transfers = batteries.map((battery, index) => {
      const fromWarehouse =
        String(body.fromWarehouse ?? "").trim() || this.assetWarehouse(battery);
      const suffix = `${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`;
      const transfer = {
        id: `transfer-${suffix}`,
        assetId: battery.id,
        transferNo: `TR${suffix}`,
        btCode: battery.btCode,
        fromWarehouse,
        toWarehouse,
        status: "已调拨",
        operator,
        createdAt: now,
        remark: body.remark || `批量调拨到 ${toWarehouse}。`,
      };

      this.transferRecords.unshift(transfer);
      battery.warehouse = toWarehouse;
      battery.location = toWarehouse;
      battery.groupName = toWarehouse;
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: "调拨",
        title: "批量仓库调拨",
        time: now,
        operator,
        target: `${fromWarehouse} → ${toWarehouse}`,
        status: "已完成",
        remark: transfer.remark,
      });
      return transfer;
    });

    this.persistMockState();
    return {
      successCount: batteries.length,
      failedCount: 0,
      transfers,
      assets: batteries.map((battery) => this.getAsset(battery.id)),
    };
  }

  checkAssetInventory(id: string, body: Record<string, any>) {
    this.batchCheckAssetInventory({ ...body, assetIds: [id] });
    return this.getAsset(id);
  }

  batchCheckAssetInventory(body: Record<string, any>) {
    const batteries = this.findUniqueBatteryAssets(this.parseAssetRefs(body));
    const boughtOutAssets = batteries.filter(
      (battery) => battery.assetStatus === BatteryAssetStatus.BoughtOut,
    );
    if (boughtOutAssets.length) {
      throw new BadRequestException(
        `${boughtOutAssets.map((item) => item.btCode).join("、")} 已买断，不能继续盘点。`,
      );
    }

    const result = String(body.result ?? "MATCHED").trim();
    const allowedResults = [
      "MATCHED",
      "LOCATION_MISMATCH",
      "MISSING",
      "DAMAGED",
    ];
    if (!allowedResults.includes(result)) {
      throw new BadRequestException("请选择有效的盘点结果。");
    }

    const operator = String(body.operator ?? "").trim() || "王库管";
    const checkedAt = String(body.checkedAt ?? "").trim() || this.nowText();
    const actualWarehouseInput = String(
      body.actualWarehouse ?? body.warehouse ?? "",
    ).trim();
    const syncLocation = Boolean(body.syncLocation);
    const records = batteries.map((battery, index) => {
      const expectedWarehouse = this.assetWarehouse(battery);
      const actualWarehouse = actualWarehouseInput || expectedWarehouse;
      const suffix = `${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`;
      const resultLabel = this.inventoryResultLabel(result);
      const record: Record<string, any> = {
        id: `check-${suffix}`,
        assetId: battery.id,
        btCode: battery.btCode,
        checkNo: `CHK${suffix}`,
        expectedWarehouse,
        actualWarehouse,
        result,
        resultLabel,
        operator,
        checkedAt,
        powerPercent:
          body.powerPercent === "" || body.powerPercent == null
            ? battery.powerPercent
            : Number(body.powerPercent),
        runningStatus: body.runningStatus || battery.runningStatus,
        syncLocation,
        remark:
          body.remark ||
          (result === "MATCHED"
            ? "本次盘点账实相符。"
            : `${resultLabel}，需资产负责人跟进核查。`),
      };

      this.inventoryRecords.unshift(record);
      if (
        record.powerPercent != null &&
        Number.isFinite(Number(record.powerPercent))
      ) {
        battery.powerPercent = Number(record.powerPercent);
      }
      if (record.runningStatus) {
        battery.runningStatus = record.runningStatus;
      }
      if (
        syncLocation &&
        actualWarehouse &&
        actualWarehouse !== expectedWarehouse
      ) {
        battery.warehouse = actualWarehouse;
        battery.location = actualWarehouse;
        battery.groupName = actualWarehouse;
      }
      if (result === "MISSING") {
        battery.customStatus = "盘亏待核查";
        battery.runningStatus = DeviceRunningStatus.Abnormal;
      }
      if (result === "DAMAGED") {
        battery.customStatus = "盘点发现损坏";
        battery.runningStatus = DeviceRunningStatus.Abnormal;
      }
      battery.updatedAt = checkedAt;
      this.appendAssetMovement(battery.id, {
        type: "盘点",
        title: result === "MATCHED" ? "资产盘点" : "盘点异常登记",
        time: checkedAt,
        operator,
        target: actualWarehouse,
        status: resultLabel,
        remark: record.remark,
      });
      return record;
    });

    this.persistMockState();
    return {
      successCount: batteries.length,
      failedCount: 0,
      records,
      assets: batteries.map((battery) => this.getAsset(battery.id)),
    };
  }

  updateAssetValuation(id: string, body: Record<string, any>) {
    const battery = this.findBatteryAsset(id);
    const current = this.assetFinancialProfile(battery);
    const originalValue =
      body.originalValue === "" || body.originalValue == null
        ? current.originalValue
        : this.roundMoney(Number(body.originalValue));
    const salvageValue =
      body.salvageValue === "" || body.salvageValue == null
        ? current.salvageValue
        : this.roundMoney(Number(body.salvageValue));
    const usefulLifeMonths =
      body.usefulLifeMonths === "" || body.usefulLifeMonths == null
        ? current.usefulLifeMonths
        : Math.max(Number(body.usefulLifeMonths), 1);

    if (!Number.isFinite(originalValue) || originalValue <= 0) {
      throw new BadRequestException("资产原值必须大于 0。");
    }
    if (
      !Number.isFinite(salvageValue) ||
      salvageValue < 0 ||
      salvageValue >= originalValue
    ) {
      throw new BadRequestException("残值必须大于等于 0 且小于资产原值。");
    }
    if (!Number.isFinite(usefulLifeMonths) || usefulLifeMonths <= 0) {
      throw new BadRequestException("折旧年限必须大于 0。");
    }
    if (originalValue - salvageValue < current.accumulatedDepreciation) {
      throw new BadRequestException(
        "原值与残值不能低于已累计折旧后的账面规则。",
      );
    }

    const operator = String(body.operator ?? "").trim() || "赵财务";
    const now = this.nowText();
    battery.originalValue = originalValue;
    battery.salvageValue = salvageValue;
    battery.usefulLifeMonths = usefulLifeMonths;
    battery.depreciationStart =
      String(body.depreciationStart ?? "").trim() || current.depreciationStart;
    battery.depreciationMethod = "直线法";
    battery.supplierName = String(body.supplierName ?? "").trim();
    battery.invoiceNo = String(body.invoiceNo ?? "").trim();
    battery.updatedAt = now;
    this.appendAssetMovement(battery.id, {
      type: "财务",
      title: "资产价值设置",
      time: now,
      operator,
      target: `原值 ${originalValue} / 残值 ${salvageValue}`,
      status: "已更新",
      remark: body.remark || "更新资产原值、残值和折旧期间参数。",
    });

    this.persistMockState();
    return this.getAsset(battery.id);
  }

  depreciateAsset(id: string, body: Record<string, any>) {
    this.batchDepreciateAssets({ ...body, assetIds: [id] });
    return this.getAsset(id);
  }

  batchDepreciateAssets(body: Record<string, any>) {
    const batteries = this.findUniqueBatteryAssets(this.parseAssetRefs(body));
    const terminalAssets = batteries.filter((battery) =>
      [BatteryAssetStatus.Scrapped, BatteryAssetStatus.BoughtOut].includes(
        battery.assetStatus,
      ),
    );
    if (terminalAssets.length) {
      throw new BadRequestException(
        `${terminalAssets.map((item) => item.btCode).join("、")} 已进入终态，不能继续计提折旧。`,
      );
    }

    const period = this.normalizeDepreciationPeriod(body.period);
    const duplicateAssets = batteries.filter((battery) =>
      this.depreciationRecordsForAsset(battery).some(
        (item) => item.period === period,
      ),
    );
    if (duplicateAssets.length) {
      throw new BadRequestException(
        `${duplicateAssets.map((item) => item.btCode).join("、")} 已存在 ${period} 折旧记录。`,
      );
    }

    const operator = String(body.operator ?? "").trim() || "赵财务";
    const postedAt = String(body.postedAt ?? "").trim() || this.nowText();
    const customAmount =
      body.amount === "" || body.amount == null ? null : Number(body.amount);
    if (
      customAmount != null &&
      (!Number.isFinite(customAmount) || customAmount <= 0)
    ) {
      throw new BadRequestException("折旧金额必须大于 0。");
    }

    const records = batteries.map((battery, index) => {
      const profile = this.assetFinancialProfile(battery);
      const remainingDepreciable = this.roundMoney(
        Math.max(
          profile.depreciableAmount - profile.accumulatedDepreciation,
          0,
        ),
      );
      if (remainingDepreciable <= 0) {
        throw new BadRequestException(`${battery.btCode} 已足额计提折旧。`);
      }

      const amount = this.roundMoney(
        Math.min(
          customAmount ?? profile.monthlyDepreciation,
          remainingDepreciable,
        ),
      );
      const accumulatedAfter = this.roundMoney(
        profile.accumulatedDepreciation + amount,
      );
      const netValueAfter = this.roundMoney(
        Math.max(
          profile.originalValue - accumulatedAfter,
          profile.salvageValue,
        ),
      );
      const suffix = `${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`;
      const record: Record<string, any> = {
        id: `dep-${suffix}`,
        assetId: battery.id,
        btCode: battery.btCode,
        depreciationNo: `DEP${suffix}`,
        period,
        method: "直线法",
        originalValue: profile.originalValue,
        salvageValue: profile.salvageValue,
        usefulLifeMonths: profile.usefulLifeMonths,
        depreciableAmount: profile.depreciableAmount,
        monthlyAmount: profile.monthlyDepreciation,
        accumulatedBefore: profile.accumulatedDepreciation,
        amount,
        accumulatedAfter,
        netValueAfter,
        operator,
        postedAt,
        remark: body.remark || `${period} 固定资产折旧计提。`,
      };

      this.depreciationRecords.unshift(record);
      const voucher = this.createDepreciationVoucher(battery, record);
      if (voucher) {
        record.voucherNo = voucher.voucherNo;
        battery.lastDepreciationVoucherNo = voucher.voucherNo;
      }
      battery.accumulatedDepreciation = accumulatedAfter;
      battery.netValue = netValueAfter;
      battery.lastDepreciationPeriod = period;
      battery.updatedAt = postedAt;
      this.appendAssetMovement(battery.id, {
        type: "折旧",
        title: "资产折旧计提",
        time: postedAt,
        operator,
        target: period,
        status: "已计提",
        remark: `${record.depreciationNo} 计提 ${amount} 元，账面净值 ${netValueAfter} 元。`,
      });
      return record;
    });

    this.persistMockState();
    return {
      successCount: batteries.length,
      failedCount: 0,
      records,
      assets: batteries.map((battery) => this.getAsset(battery.id)),
    };
  }

  repairInboundAsset(id: string, body: Record<string, any>) {
    const battery = this.findBatteryAsset(id);
    const repair =
      this.repairs.find(
        (item) =>
          item.btCode === battery.btCode &&
          (item.id === body.repairId || item.repairNo === body.repairNo),
      ) ??
      this.repairs.find(
        (item) =>
          item.btCode === battery.btCode &&
          item.status === RepairStatus.PendingInbound,
      );

    if (!repair && battery.assetStatus !== BatteryAssetStatus.Repairing) {
      throw new BadRequestException("当前资产没有待入库维修单。");
    }

    const warehouse = String(body.warehouse ?? "").trim() || "郑州总仓";
    const operator = String(body.operator ?? "").trim() || "王库管";
    const suffix = String(Date.now()).slice(-8);
    const now = this.nowText();
    const inboundRecord = {
      id: `rin-${suffix}`,
      assetId: battery.id,
      btCode: battery.btCode,
      inboundNo: `RIN${suffix}`,
      source: "维修完成入库",
      warehouse,
      operator,
      quantity: 1,
      inboundAt: now,
      remark: body.remark || `${repair?.repairNo ?? "维修单"}完成后重新入库。`,
    };

    this.inboundRecords.unshift(inboundRecord);
    if (repair) {
      repair.status = RepairStatus.Completed;
      repair.completedAt = repair.completedAt || now;
      this.repairLogs[repair.id] = this.repairLogs[repair.id] ?? [];
      this.repairLogs[repair.id].push({
        time: now,
        operator,
        action: "资产入库",
        status: "已完成",
        result: "重新入库",
        remark: inboundRecord.remark,
      });
    }
    battery.assetStatus = BatteryAssetStatus.InStock;
    battery.customerId = null;
    battery.orderId = null;
    battery.userName = warehouse;
    battery.warehouse = warehouse;
    battery.location = warehouse;
    battery.inboundState = "在库";
    battery.lifecycle = "库存";
    battery.updatedAt = now;
    this.appendAssetMovement(battery.id, {
      type: "入库",
      title: "维修完成入库",
      time: now,
      operator,
      target: warehouse,
      status: "已完成",
      remark: inboundRecord.remark,
    });

    this.persistMockState();
    return this.getAsset(battery.id);
  }

  disposeAsset(id: string, body: Record<string, any>) {
    this.batchDisposeAssets({ ...body, assetIds: [id] });
    return this.getAsset(id);
  }

  batchDisposeAssets(body: Record<string, any>) {
    const action = String(body.action ?? "").trim() as
      | typeof BatteryAssetStatus.Scrapped
      | typeof BatteryAssetStatus.BoughtOut;
    if (
      ![BatteryAssetStatus.Scrapped, BatteryAssetStatus.BoughtOut].includes(
        action as any,
      )
    ) {
      throw new BadRequestException("请选择报废或买断动作。");
    }

    const reason = String(body.reason ?? "").trim();
    if (!reason) throw new BadRequestException("请填写处理原因。");

    const batteries = this.findUniqueBatteryAssets(this.parseAssetRefs(body));
    const terminalAssets = batteries.filter((battery) =>
      [BatteryAssetStatus.Scrapped, BatteryAssetStatus.BoughtOut].includes(
        battery.assetStatus,
      ),
    );
    if (terminalAssets.length) {
      throw new BadRequestException(
        `${terminalAssets.map((item) => item.btCode).join("、")} 已经进入终态。`,
      );
    }

    const leasingScraps = batteries.filter(
      (battery) =>
        action === BatteryAssetStatus.Scrapped &&
        battery.assetStatus === BatteryAssetStatus.Leasing,
    );
    if (leasingScraps.length) {
      throw new BadRequestException(
        `${leasingScraps.map((item) => item.btCode).join("、")} 仍在租赁中，需先退回入库后再报废。`,
      );
    }

    const now = this.nowText();
    const operator = String(body.operator ?? "").trim() || "王库管";
    const pendingAssets = batteries.filter((battery) =>
      this.pendingDisposalRecordForAsset(battery),
    );
    if (pendingAssets.length) {
      throw new BadRequestException(
        `${pendingAssets.map((item) => item.btCode).join("、")} 已有终态审批在处理中。`,
      );
    }

    const records = batteries.map((battery, index) => {
      const suffix = `${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`;
      const profile = this.assetFinancialProfile(battery);
      const amount = this.roundMoney(Number(body.amount || 0));
      const record = {
        id: `dispose-${suffix}`,
        assetId: battery.id,
        btCode: battery.btCode,
        disposalNo: `DSP${suffix}`,
        type: this.disposalActionLabel(action),
        status: "审批中",
        approvalStatus: ApprovalStatus.Processing,
        approvalNo: "",
        approvalId: "",
        operator,
        amount,
        bookValue: profile.netValue,
        accumulatedDepreciation: profile.accumulatedDepreciation,
        gainLossAmount: this.roundMoney(amount - profile.netValue),
        financeResult: "待审批通过后入账",
        reason,
        createdAt: now,
        remark: body.remark || "已发起资产终态审批，审批通过后自动登记。",
      };

      this.disposalRecords.unshift(record);
      battery.updatedAt = now;
      this.appendAssetMovement(battery.id, {
        type: record.type,
        title: `${record.type}审批发起`,
        time: now,
        operator,
        target: record.disposalNo,
        status: "审批中",
        remark: reason,
      });
      return record;
    });

    const totalAmount = records.reduce(
      (total, record) => total + Number(record.amount || 0),
      0,
    );
    const totalBookValue = records.reduce(
      (total, record) => total + Number(record.bookValue || 0),
      0,
    );
    const approval = this.createApproval({
      type: this.disposalApprovalType(action),
      title: `固定资产${this.disposalActionLabel(action)}审批`,
      applicant: operator,
      department: "资产部",
      priority:
        action === BatteryAssetStatus.Scrapped || totalBookValue > 10000
          ? "高"
          : "普通",
      businessId: records[0]?.id ?? "",
      businessNo: records.map((record) => record.disposalNo).join("、"),
      customerName:
        action === BatteryAssetStatus.BoughtOut
          ? batteries
              .map((battery) => {
                const order = this.orders.find(
                  (item) => item.id === battery.orderId,
                );
                return (
                  order?.customerShortName ||
                  order?.customerName ||
                  battery.userName
                );
              })
              .filter(Boolean)
              .join("、") || "客户买断"
          : "内部资产处置",
      amount: totalAmount,
      summary: `${records.length} 组资产申请${this.disposalActionLabel(action)}，账面净值合计 ${this.roundMoney(totalBookValue)} 元。`,
      formItems: [
        { label: "处理类型", value: this.disposalActionLabel(action) },
        { label: "资产数量", value: `${records.length} 组` },
        {
          label: "BT码",
          value: records.map((record) => record.btCode).join("、"),
        },
        {
          label: "账面净值",
          value: `¥${this.roundMoney(totalBookValue).toLocaleString("zh-CN")}`,
        },
        {
          label: "处置金额",
          value: `¥${this.roundMoney(totalAmount).toLocaleString("zh-CN")}`,
        },
        { label: "处理原因", value: reason },
      ],
      riskItems: [
        "审批通过后资产会进入终态，不能再次出库或租赁。",
        "买断审批通过后会同步关闭对应在租出库统计。",
        "财务需核对处置金额、账面净值和处置损益。",
      ],
      assetTerminalPayload: {
        action,
        recordIds: records.map((record) => record.id),
        items: records.map((record) => ({
          recordId: record.id,
          assetId: record.assetId,
          btCode: record.btCode,
          amount: record.amount,
          reason: record.reason,
          remark: record.remark,
        })),
      },
    }) as Record<string, any>;

    records.forEach((record) => {
      record.approvalId = approval.id;
      record.approvalNo = approval.approvalNo;
    });

    this.persistMockState();
    return {
      successCount: batteries.length,
      failedCount: 0,
      approval,
      records,
      assets: batteries.map((battery) => this.getAsset(battery.id)),
    };
  }

  private findOrder(id: string) {
    const order = this.orders.find(
      (item) => item.id === id || item.orderNo === id,
    ) as Record<string, any> | undefined;
    if (!order) throw new NotFoundException("订单不存在");
    return order;
  }

  private dateText(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  private addDaysText(dateText: string, days: number) {
    const date = new Date(`${dateText || this.dateText()}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + days);
    return this.dateText(date);
  }

  private monthText(dateText: string) {
    return String(dateText || this.dateText()).slice(0, 7);
  }

  private billingDateFrom(
    seedDate: string,
    billingDay: number,
    monthOffset = 0,
  ) {
    const seed = new Date(`${seedDate || this.dateText()}T00:00:00`);
    if (Number.isNaN(seed.getTime())) return "";
    seed.setMonth(seed.getMonth() + monthOffset);
    seed.setDate(1);
    seed.setDate(Math.min(Math.max(Number(billingDay) || 1, 1), 28));
    return this.dateText(seed);
  }

  private appendOrderEvent(
    order: Record<string, any>,
    title: string,
    content: string,
  ) {
    order.timeline = order.timeline ?? [];
    order.timeline.push({
      time: this.nowText(),
      title,
      content,
    });
  }

  private activeBtCodesForOrder(order: Record<string, any>) {
    const orderOutbounds = this.outbounds.filter(
      (outbound) => outbound.orderId === order.id,
    );
    const closedBtCodes = new Set(
      orderOutbounds.flatMap((outbound) => [
        ...(outbound.returnedBtCodes ?? []),
        ...(outbound.closedBtCodes ?? []),
      ]),
    );
    return Array.from(
      new Set(
        orderOutbounds
          .flatMap((outbound) => outbound.btCodes ?? [])
          .filter((btCode) => !closedBtCodes.has(btCode)),
      ),
    );
  }

  private parseBtCodeList(input: unknown) {
    const raw = Array.isArray(input) ? input.join("\n") : String(input ?? "");
    return raw
      .split(/[\s,，、;；]+/)
      .map((code) => code.trim())
      .filter(Boolean);
  }

  private syncOrderOperationalState(order: Record<string, any>) {
    const orderOutbounds = this.outbounds.filter(
      (outbound) => outbound.orderId === order.id,
    );
    const closedBtCodes = new Set(
      orderOutbounds.flatMap((outbound) => [
        ...(outbound.returnedBtCodes ?? []),
        ...(outbound.closedBtCodes ?? []),
      ]),
    );
    const activeBtCodes = new Set(
      orderOutbounds
        .flatMap((outbound) => outbound.btCodes ?? [])
        .filter((btCode) => !closedBtCodes.has(btCode)),
    );
    const outboundCount = activeBtCodes.size;
    const receivedCount = orderOutbounds
      .filter((outbound) =>
        [OutboundStatus.Received, OutboundStatus.AutoReceived].includes(
          outbound.status as any,
        ),
      )
      .flatMap((outbound) => outbound.btCodes ?? [])
      .filter((btCode) => activeBtCodes.has(btCode)).length;
    const pendingReceiptCount = Math.max(outboundCount - receivedCount, 0);

    order.outboundCount = outboundCount;
    order.batteryCount = outboundCount;
    order.receivedCount = receivedCount;
    order.pendingReceiptCount = pendingReceiptCount;
    order.outboundProgress = `${outboundCount}/${order.orderedBatteryCount}`;

    if (
      [
        OrderStatus.Draft,
        OrderStatus.Approving,
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      return;
    }

    if (outboundCount <= 0) {
      order.status = OrderStatus.PendingOutbound;
    } else if (pendingReceiptCount > 0) {
      order.status = OrderStatus.PendingReceipt;
    } else if (outboundCount < Number(order.orderedBatteryCount || 0)) {
      order.status = OrderStatus.PartiallyOutbound;
    } else {
      order.status = OrderStatus.Leasing;
    }
  }

  getOrders() {
    this.orders.forEach((order) => {
      this.syncOrderOperationalState(order as Record<string, any>);
      this.syncOrderFinance(order.orderNo, false);
    });
    return this.orders;
  }

  getOrder(id: string) {
    const order = this.findOrder(id);
    this.syncOrderOperationalState(order);
    this.syncOrderFinance(order.orderNo, false);

    return {
      ...order,
      batteries: this.batteries.filter(
        (battery) => battery.orderId === order.id,
      ),
      outbounds: this.outbounds.filter(
        (outbound) => outbound.orderId === order.id,
      ),
      bills: this.bills
        .filter((bill) => bill.orderNo === order.orderNo)
        .map((bill, index) =>
          this.enrichBill(bill as Record<string, any>, index),
        ),
      repairs: this.repairs.filter((repair) => repair.orderId === order.id),
    };
  }

  createOrder(body: Record<string, any>) {
    const customerName = String(body.customerName ?? "").trim();
    if (!customerName) throw new BadRequestException("请填写客户名称。");

    const orderedBatteryCount = Number(body.orderedBatteryCount);
    const monthlyRent = Number(body.monthlyRent);
    const billingDay = Number(body.billingDay);
    if (!Number.isFinite(orderedBatteryCount) || orderedBatteryCount <= 0) {
      throw new BadRequestException("租赁电池数量必须大于 0。");
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      throw new BadRequestException("月租金额必须大于 0。");
    }
    if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 28) {
      throw new BadRequestException("账单日必须在 1 到 28 日之间。");
    }
    this.assertPermission(
      { ...body, operator: body.operator || body.salesOwner || "刘销售" },
      "order.write",
      body.salesOwner || "刘销售",
    );

    const now = this.nowText();
    const suffix = String(Date.now()).slice(-8);
    const order: Record<string, any> = {
      id: `order-${suffix}`,
      orderNo: `ORD${suffix}`,
      customerId: `customer-${suffix}`,
      customerName,
      customerShortName: body.customerShortName || customerName,
      customerContact: String(body.customerContact ?? "").trim(),
      contactPhone: String(body.contactPhone ?? "").trim(),
      region: String(body.region ?? "").trim(),
      status: OrderStatus.Draft,
      leaseStart: body.leaseStart || this.dateText(),
      leaseEnd:
        body.leaseEnd || this.billingDateFrom(this.dateText(), billingDay, 12),
      billingDay,
      monthlyRent,
      depositAmount: Number(body.depositAmount || 0),
      orderedBatteryCount,
      batteryCount: 0,
      outboundProgress: `0/${orderedBatteryCount}`,
      outboundCount: 0,
      receivedCount: 0,
      pendingReceiptCount: 0,
      receivableAmount: 0,
      paidAmount: 0,
      debtAmount: 0,
      overdueAmount: 0,
      currentPeriod: "",
      nextBillingDate: this.billingDateFrom(body.leaseStart, billingDay),
      salesOwner: body.salesOwner || "刘销售",
      assetOwner: body.assetOwner || "王库管",
      financeOwner: body.financeOwner || "赵财务",
      contractName: body.contractName || `锂电池租赁合同-${customerName}`,
      contractNo: `HT${suffix}`,
      contractStatus: "待会签",
      createdAt: now,
      updatedAt: now,
      remark: body.remark || "销售新建租赁订单，待发起合同会签。",
      contract: {
        name: body.contractName || `锂电池租赁合同-${customerName}`,
        contractNo: `HT${suffix}`,
        status: "待会签",
        signDate: "",
        startDate: body.leaseStart || this.dateText(),
        endDate:
          body.leaseEnd ||
          this.billingDateFrom(this.dateText(), billingDay, 12),
        fileName: "",
        approvalNo: "",
      },
      approvals: [
        {
          node: "销售创建",
          operator: body.salesOwner || "刘销售",
          result: "已保存",
          time: now,
          remark: "订单草稿已生成，可发起销售租赁合同会签。",
        },
      ],
      timeline: [
        {
          time: now,
          title: "创建租赁订单",
          content: "录入客户、租期、月租、押金和账单日。",
        },
      ],
    };

    this.orders.unshift(order as any);
    this.persistMockState();
    return this.getOrder(order.id);
  }

  submitOrderApproval(id: string, body: Record<string, any>) {
    const order = this.findOrder(id);
    if (order.status !== OrderStatus.Draft) {
      throw new BadRequestException("只有草稿订单可以发起合同会签。");
    }
    const operator = String(body.operator ?? "").trim() || order.salesOwner || "刘销售";
    this.assertPermission({ ...body, operator }, "order.write", operator);

    const approval = this.createApproval({
      type: "SALES_CONTRACT",
      title: `${order.customerShortName || order.customerName}租赁合同会签`,
      applicant: operator,
      department: "销售部",
      priority: body.priority || "普通",
      businessId: order.id,
      businessNo: order.orderNo,
      customerName: order.customerName,
      amount: Number(order.depositAmount || 0),
      attachments: body.attachments,
      formItems: [
        { label: "合同类型", value: "租赁合同" },
        { label: "合同名称", value: order.contractName },
        { label: "合同编号", value: order.contractNo },
        { label: "客户名称", value: order.customerName },
        { label: "租赁数量", value: `${order.orderedBatteryCount} 组` },
        { label: "月租金额", value: `${order.monthlyRent} 元` },
        { label: "押金金额", value: `${order.depositAmount || 0} 元` },
        { label: "租期", value: `${order.leaseStart} 至 ${order.leaseEnd}` },
      ],
      formValues: {
        contractType: "租赁合同",
        contractName: order.contractName,
        contractNo: order.contractNo,
        signDate: this.dateText(),
        companyName: "延成新能源",
        counterparty: order.customerName,
        leaseItems: `${order.orderedBatteryCount} 组锂电池 / 月租 ${order.monthlyRent} 元 / 押金 ${order.depositAmount || 0} 元 / 租期 ${order.leaseStart} 至 ${order.leaseEnd}`,
        depositTotal: Number(order.depositAmount || 0),
      },
      riskItems: ["财务审核量、价、税、费和付款条件。", "技术审核售后质保条款，法务审核合同风险。"],
      summary:
        body.remark ||
        `客户租赁 ${order.orderedBatteryCount} 组电池，月租 ${order.monthlyRent} 元。`,
    }) as Record<string, any>;

    order.status = OrderStatus.Approving;
    order.contractStatus = "会签中";
    order.contract.status = "会签中";
    order.contract.approvalNo = approval.approvalNo;
    order.contract.approvalId = approval.id;
    order.contract.approvalCurrentNode = approval.currentNode;
    order.contract.approvalCurrentOperator = approval.currentOperator;
    order.contract.approvalStatus = approval.status;
    order.updatedAt = this.nowText();
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: "合同会签",
      operator: body.operator || order.salesOwner || "刘销售",
      result: "已发起",
      time: order.updatedAt,
      remark: `会签单 ${approval.approvalNo} 已提交。`,
    });
    this.appendOrderEvent(
      order,
      "发起合同会签",
      "订单进入会签中，等待审批通过后出库。",
    );

    this.persistMockState();
    return this.getOrder(order.id);
  }

  approveOrderContract(id: string, body: Record<string, any>) {
    const order = this.findOrder(id);
    const approval = this.approvals.find(
      (item) =>
        item.businessId === order.id &&
        ["CONTRACT", "SALES_CONTRACT"].includes(item.type) &&
        item.status === ApprovalStatus.Processing,
    ) as Record<string, any> | undefined;

    if (!approval) {
      const approved = this.approvals.find(
        (item) =>
          item.businessId === order.id &&
          ["CONTRACT", "SALES_CONTRACT"].includes(item.type) &&
          item.status === ApprovalStatus.Approved,
      ) as Record<string, any> | undefined;
      if (approved) {
        this.syncOrderContractApprovalStatus(
          approved,
          this.nowText(),
          String(body.operator || approved.applicant || "系统"),
        );
        this.persistMockState();
        return this.getOrder(order.id);
      }
      throw new BadRequestException("当前订单没有审批中的合同会签单。");
    }

    this.actionApproval(approval.id, {
      action: "APPROVE",
      operator: String(body.operator ?? "").trim() || approval.currentOperator,
      comment: body.remark || "同意。",
    });
    return this.getOrder(order.id);
  }

  archiveOrderContract(id: string, body: Record<string, any>) {
    body = body ?? {};
    const order = this.findOrder(id);
    if (
      [
        OrderStatus.Draft,
        OrderStatus.Approving,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException("合同会签通过后才能归档。");
    }

    const now = this.nowText();
    const operator =
      String(body.operator ?? "").trim() || order.salesOwner || "刘销售";
    this.assertPermission({ ...body, operator }, "order.write", operator);
    const fileName =
      String(body.fileName ?? "").trim() ||
      `${order.contractNo || order.orderNo}-签署版.pdf`;
    const fileUrl = String(body.fileUrl ?? "").trim();
    const attachments = this.normalizeApprovalAttachments([
      ...(order.contract?.attachments ?? []),
      ...(Array.isArray(body.attachments) ? body.attachments : []),
      body.attachment,
      fileName,
    ]);
    const remark =
      String(body.remark ?? "").trim() || "签署版合同附件已完成归档。";

    order.contract = {
      name: order.contract?.name || order.contractName,
      contractNo: order.contract?.contractNo || order.contractNo,
      signDate: order.contract?.signDate || this.dateText(),
      startDate: order.contract?.startDate || order.leaseStart,
      endDate: order.contract?.endDate || order.leaseEnd,
      approvalNo: order.contract?.approvalNo || "",
      ...order.contract,
      fileName,
      fileUrl,
      attachments,
      archivedAt: now,
      archivedBy: operator,
      status: "已归档",
    };
    order.contractStatus = "已归档";
    order.updatedAt = now;
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: "合同归档",
      operator,
      result: "已归档",
      time: now,
      remark,
    });
    this.appendOrderEvent(
      order,
      "合同归档",
      `${fileName} 已归档，可在订单合同页查看。`,
    );
    this.persistMockState();
    return this.getOrder(order.id);
  }

  cancelOrder(id: string, body: Record<string, any>) {
    body = body ?? {};
    const order = this.findOrder(id);
    if (order.status === OrderStatus.Completed) {
      throw new BadRequestException("已完成订单不能取消。");
    }
    if (order.status === OrderStatus.Returning) {
      throw new BadRequestException("退租结算中的订单不能取消，请先完成结算。");
    }
    if (order.status === OrderStatus.Cancelled) return this.getOrder(order.id);

    this.syncOrderOperationalState(order);
    this.syncOrderFinance(order.orderNo, false);
    const activeBtCodes = this.activeBtCodesForOrder(order);
    if (activeBtCodes.length) {
      throw new BadRequestException(
        "订单存在已出库资产，请先退回入库或完成终态处理。",
      );
    }
    if (Number(order.debtAmount || 0) > 0) {
      throw new BadRequestException("订单存在未结清账单，请先处理财务欠款。");
    }

    const now = this.nowText();
    const operator =
      String(body.operator ?? "").trim() || order.salesOwner || "刘销售";
    this.assertPermission({ ...body, operator }, "order.write", operator);
    const remark =
      String(body.remark ?? "").trim() || "业务终止，取消租赁订单。";
    order.status = OrderStatus.Cancelled;
    order.contractStatus = "已取消";
    order.cancelledAt = now;
    order.cancelledBy = operator;
    order.updatedAt = now;
    if (order.contract) order.contract.status = "已取消";
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: "订单取消",
      operator,
      result: "已取消",
      time: now,
      remark,
    });

    this.approvals
      .filter(
        (approval) =>
          approval.businessId === order.id &&
          ["CONTRACT", "SALES_CONTRACT"].includes(approval.type) &&
          approval.status === ApprovalStatus.Processing,
      )
      .forEach((approval) => {
        approval.status = ApprovalStatus.Cancelled;
        approval.currentNode = "流程结束";
        approval.currentOperator = "";
        approval.updatedAt = now;
        approval.logs?.push({
          time: now,
          operator,
          action: "撤销",
          nodeName: "合同会签",
          result: "已撤销",
          comment: remark,
        });
      });

    this.bills
      .filter(
        (bill) =>
          bill.orderNo === order.orderNo &&
          bill.status === BillStatus.PendingConfirm,
      )
      .forEach((bill) => {
        bill.status = BillStatus.Voided;
        bill.voidedAt = now;
        this.appendBillLog(
          bill as Record<string, any>,
          "订单取消作废",
          operator,
          remark,
        );
      });
    this.appendOrderEvent(order, "取消租赁订单", remark);
    this.syncOrderFinance(order.orderNo);
    this.persistMockState();
    return this.getOrder(order.id);
  }

  renewOrder(id: string, body: Record<string, any>) {
    body = body ?? {};
    const order = this.findOrder(id);
    if (
      [
        OrderStatus.Draft,
        OrderStatus.Approving,
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException("当前订单状态不能办理续租。");
    }

    this.syncOrderOperationalState(order);
    this.syncOrderFinance(order.orderNo, false);
    if (Number(order.overdueAmount || 0) > 0) {
      throw new BadRequestException("订单存在逾期欠款，请先处理后再续租。");
    }

    const newLeaseEnd = String(body.leaseEnd ?? body.newLeaseEnd ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newLeaseEnd)) {
      throw new BadRequestException("请填写新的租期结束日期。");
    }
    if (order.leaseEnd && newLeaseEnd <= String(order.leaseEnd)) {
      throw new BadRequestException("续租结束日期必须晚于当前租期结束日期。");
    }

    const monthlyRent = Number(body.monthlyRent ?? order.monthlyRent);
    const depositAmount = Number(
      body.depositAmount ?? order.depositAmount ?? 0,
    );
    const billingDay = Number(body.billingDay ?? order.billingDay);
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      throw new BadRequestException("续租月租必须大于 0。");
    }
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      throw new BadRequestException("押金不能小于 0。");
    }
    if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 28) {
      throw new BadRequestException("账单日必须在 1 到 28 日之间。");
    }

    const now = this.nowText();
    const operator =
      String(body.operator ?? "").trim() || order.salesOwner || "刘销售";
    this.assertPermission({ ...body, operator }, "order.write", operator);
    const oldLeaseEnd = order.leaseEnd;
    const oldMonthlyRent = order.monthlyRent;
    const oldDepositAmount = order.depositAmount;
    const oldBillingDay = order.billingDay;
    const remark =
      String(body.remark ?? "").trim() ||
      `租期从 ${oldLeaseEnd} 延长至 ${newLeaseEnd}，月租调整为 ${monthlyRent} 元。`;

    order.leaseEnd = newLeaseEnd;
    order.monthlyRent = monthlyRent;
    order.depositAmount = depositAmount;
    order.billingDay = billingDay;
    order.renewalCount = Number(order.renewalCount || 0) + 1;
    order.renewalDesc = `已续租至 ${newLeaseEnd}`;
    order.contractStatus = "续租待归档";
    order.updatedAt = now;
    order.contract = {
      name: order.contract?.name || order.contractName,
      contractNo: order.contract?.contractNo || order.contractNo,
      signDate: order.contract?.signDate || this.dateText(),
      startDate: order.contract?.startDate || order.leaseStart,
      fileName: order.contract?.fileName || "",
      approvalNo: order.contract?.approvalNo || "",
      ...order.contract,
      endDate: newLeaseEnd,
      status: "续租待归档",
      renewalAt: now,
      renewalBy: operator,
    };
    if (!order.nextBillingDate) {
      order.nextBillingDate = this.billingDateFrom(
        order.leaseStart,
        billingDay,
      );
    }

    const change = {
      id: `renew-${String(Date.now()).slice(-8)}`,
      type: "RENEW",
      operator,
      time: now,
      oldLeaseEnd,
      newLeaseEnd,
      oldMonthlyRent,
      newMonthlyRent: monthlyRent,
      oldDepositAmount,
      newDepositAmount: depositAmount,
      oldBillingDay,
      newBillingDay: billingDay,
      remark,
    };
    order.leaseChanges = [...(order.leaseChanges ?? []), change];
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: "续租变更",
      operator,
      result: "已生效",
      time: now,
      remark,
    });
    this.appendOrderEvent(order, "订单续租", remark);
    this.persistMockState();
    return this.getOrder(order.id);
  }

  returnOrderLease(id: string, body: Record<string, any>) {
    body = body ?? {};
    let order = this.findOrder(id);
    if (
      [
        OrderStatus.Draft,
        OrderStatus.Approving,
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException("当前订单状态不能办理退租。");
    }

    this.syncOrderOperationalState(order);
    this.syncOrderFinance(order.orderNo, false);
    if (Number(order.pendingReceiptCount || 0) > 0) {
      throw new BadRequestException(
        "订单存在待收货出库单，请先确认收货后再办理退租。",
      );
    }

    const activeBtCodes = this.activeBtCodesForOrder(order);
    if (!activeBtCodes.length) {
      throw new BadRequestException(
        "订单当前没有在租资产，请使用取消或完成订单处理。",
      );
    }

    const requestedInput = this.parseBtCodeList(body.btCodes);
    const shouldReturnAll =
      body.returnAll !== false || requestedInput.length === 0;
    const requestedBtCodes = shouldReturnAll ? activeBtCodes : requestedInput;
    const seen = new Set<string>();
    const duplicated = requestedBtCodes.find((btCode) => {
      if (seen.has(btCode)) return true;
      seen.add(btCode);
      return false;
    });
    if (duplicated) {
      throw new BadRequestException(`退租 BT 码 ${duplicated} 重复。`);
    }

    const activeSet = new Set(activeBtCodes);
    const invalid = requestedBtCodes.find((btCode) => !activeSet.has(btCode));
    if (invalid) {
      throw new BadRequestException(`${invalid} 不属于该订单当前在租资产。`);
    }

    const now = this.nowText();
    const operator =
      String(body.operator ?? "").trim() || order.assetOwner || "王库管";
    this.assertPermission({ ...body, operator }, "asset.outbound", operator);
    const warehouse = String(body.warehouse ?? "").trim() || "郑州总仓";
    const remark =
      String(body.remark ?? "").trim() ||
      `退回 ${requestedBtCodes.length} 组电池至 ${warehouse}。`;
    const isFullReturn = requestedBtCodes.length === activeBtCodes.length;

    this.batchReturnAssetInbound({
      btCodes: requestedBtCodes,
      warehouse,
      operator,
      remark,
    });

    order = this.findOrder(id);
    this.syncOrderFinance(order.orderNo, false);
    order.returnedAt = now;
    order.returnedBy = operator;
    order.returnWarehouse = warehouse;
    order.returnRemark = remark;
    order.updatedAt = now;
    order.leaseChanges = [
      ...(order.leaseChanges ?? []),
      {
        id: `return-${String(Date.now()).slice(-8)}`,
        type: isFullReturn ? "RETURN_ALL" : "RETURN_PART",
        operator,
        time: now,
        btCodes: requestedBtCodes,
        warehouse,
        remark,
      },
    ];
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: isFullReturn ? "退租处理" : "部分退租",
      operator,
      result: "已退回",
      time: now,
      remark,
    });

    if (isFullReturn) {
      order.nextBillingDate = "";
      if (Number(order.debtAmount || 0) > 0) {
        order.status = OrderStatus.Returning;
        order.contractStatus = "退租结算中";
        if (order.contract) order.contract.status = "退租结算中";
        this.appendOrderEvent(
          order,
          "退租结算中",
          `${requestedBtCodes.length} 组电池已退回，剩余欠款 ${order.debtAmount} 元待结清。`,
        );
      } else {
        order.status = OrderStatus.Completed;
        order.contractStatus = "已完结";
        order.completedAt = now;
        order.completedBy = operator;
        if (order.contract) order.contract.status = "已完结";
        this.appendOrderEvent(
          order,
          "退租完成",
          `${requestedBtCodes.length} 组电池已退回，账款已结清，订单完结。`,
        );
      }
    } else {
      order.orderedBatteryCount = Math.max(
        Number(order.orderedBatteryCount || 0) - requestedBtCodes.length,
        activeBtCodes.length - requestedBtCodes.length,
      );
      this.syncOrderOperationalState(order);
      this.appendOrderEvent(
        order,
        "部分退租",
        `${requestedBtCodes.length} 组电池已退回，订单剩余 ${order.outboundCount} 组在租。`,
      );
    }

    this.persistMockState();
    return this.getOrder(order.id);
  }

  settleReturnOrder(id: string, body: Record<string, any>) {
    body = body ?? {};
    const order = this.findOrder(id);
    if (order.status !== OrderStatus.Returning) {
      throw new BadRequestException("只有退租结算中的订单可以办理退租结清。");
    }

    this.syncOrderOperationalState(order);
    this.syncOrderFinance(order.orderNo, false);
    const activeBtCodes = this.activeBtCodesForOrder(order);
    if (Number(order.pendingReceiptCount || 0) > 0 || activeBtCodes.length) {
      throw new BadRequestException(
        "订单仍有未完成收货或在租资产，请先完成退租入库。",
      );
    }

    const now = this.nowText();
    const operator =
      String(body.operator ?? "").trim() || order.financeOwner || "赵财务";
    this.assertPermission({ ...body, operator }, "bill.payment", operator);
    const method = String(body.method ?? "").trim() || "银行转账";
    const paidAt = String(body.paidAt ?? "").trim() || now;
    const remark =
      String(body.remark ?? "").trim() || "退租欠款结清，租赁订单完结。";
    const collectOutstanding = body.collectOutstanding !== false;
    const unsettledBills = this.bills.filter(
      (bill) =>
        bill.orderNo === order.orderNo &&
        bill.status !== BillStatus.Voided &&
        Number(bill.debtAmount || 0) > 0,
    ) as Record<string, any>[];

    if (unsettledBills.length && !collectOutstanding) {
      throw new BadRequestException(
        "订单仍有未结清账单，请先登记回款或勾选同步结清欠款。",
      );
    }

    let settlementAmount = 0;
    if (collectOutstanding) {
      unsettledBills.forEach((bill, index) => {
        if (bill.status === BillStatus.PendingConfirm && !bill.confirmedAt) {
          bill.confirmedAt = now;
          this.appendBillLog(
            bill,
            "退租结算确认账单",
            operator,
            "退租结算时确认客户应收账单。",
          );
        }
        this.normalizeBillStatus(bill);
        const amount = Number(bill.debtAmount || 0);
        if (amount <= 0) return;
        const payment = {
          paymentNo: `PAY${String(Date.now()).slice(-8)}${String(index + 1).padStart(2, "0")}`,
          amount,
          paidAt,
          method,
          remark: `${remark}（${bill.billNo}）`,
          operator,
        };
        bill.payments = bill.payments ?? [];
        bill.payments.push(payment);
        bill.paidAmount = Number(bill.paidAmount || 0) + amount;
        bill.debtAmount = Math.max(
          Number(bill.receivableAmount || 0) - Number(bill.paidAmount || 0),
          0,
        );
        settlementAmount += amount;
        this.normalizeBillStatus(bill);
        this.appendBillLog(
          bill,
          "退租结清回款",
          operator,
          `${method}结清 ${amount} 元。`,
          payment,
        );
      });
    }

    this.syncOrderFinance(order.orderNo, false);
    if (Number(order.debtAmount || 0) > 0) {
      throw new BadRequestException("订单仍有未结清欠款，不能完成退租结清。");
    }

    order.status = OrderStatus.Completed;
    order.contractStatus = "已完结";
    order.completedAt = now;
    order.completedBy = operator;
    order.returnSettlementAt = now;
    order.returnSettlementBy = operator;
    order.returnSettlementAmount = this.roundMoney(settlementAmount);
    order.returnSettlementRemark = remark;
    order.nextBillingDate = "";
    order.updatedAt = now;
    if (order.contract) order.contract.status = "已完结";
    order.leaseChanges = [
      ...(order.leaseChanges ?? []),
      {
        id: `settle-${String(Date.now()).slice(-8)}`,
        type: "RETURN_SETTLEMENT",
        operator,
        time: now,
        amount: order.returnSettlementAmount,
        method,
        remark,
      },
    ];
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: "退租结清",
      operator,
      result: "已结清",
      time: now,
      remark,
    });
    this.appendOrderEvent(
      order,
      "退租结清",
      settlementAmount > 0
        ? `已登记退租结清回款 ${this.roundMoney(settlementAmount)} 元，订单完结。`
        : "退租账款已结清，订单完结。",
    );

    this.persistMockState();
    return this.getOrder(order.id);
  }

  completeOrder(id: string, body: Record<string, any>) {
    body = body ?? {};
    let order = this.findOrder(id);
    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestException("已取消订单不能完结。");
    }
    if (order.status === OrderStatus.Completed) return this.getOrder(order.id);

    this.syncOrderOperationalState(order);
    this.syncOrderFinance(order.orderNo, false);
    if (Number(order.pendingReceiptCount || 0) > 0) {
      throw new BadRequestException(
        "订单存在待收货出库单，请先完成客户收货确认。",
      );
    }
    if (Number(order.debtAmount || 0) > 0) {
      throw new BadRequestException(
        "订单存在未结清账单，请先完成账单确认和回款。",
      );
    }

    const activeBtCodes = this.activeBtCodesForOrder(order);
    const operator =
      String(body.operator ?? "").trim() || order.assetOwner || "王库管";
    this.assertPermission({ ...body, operator }, "asset.outbound", operator);
    const warehouse = String(body.warehouse ?? "").trim() || "郑州总仓";
    const remark =
      String(body.remark ?? "").trim() || "租赁到期结清，资产退回入库。";
    if (activeBtCodes.length && body.returnAssets === false) {
      throw new BadRequestException("订单仍有在租资产，请先退回入库后再完结。");
    }
    if (activeBtCodes.length) {
      this.batchReturnAssetInbound({
        btCodes: activeBtCodes,
        warehouse,
        operator,
        remark,
      });
      order = this.findOrder(id);
    }

    const now = this.nowText();
    order.status = OrderStatus.Completed;
    order.contractStatus = "已完结";
    order.completedAt = now;
    order.completedBy = operator;
    order.updatedAt = now;
    if (order.contract) order.contract.status = "已完结";
    order.approvals = order.approvals ?? [];
    order.approvals.push({
      node: "订单完结",
      operator,
      result: "已完成",
      time: now,
      remark,
    });
    this.appendOrderEvent(
      order,
      "订单完结",
      activeBtCodes.length
        ? `已退回 ${activeBtCodes.length} 组电池并完成订单。`
        : "账款与资产均已结清，订单完成。",
    );
    this.syncOrderFinance(order.orderNo);
    this.persistMockState();
    return this.getOrder(order.id);
  }

  createOrderOutbound(id: string, body: Record<string, any>) {
    const order = this.findOrder(id);
    const operator = String(body.operator ?? "").trim() || order.assetOwner || "王库管";
    this.assertPermission({ ...body, operator }, "asset.outbound", operator);
    if (
      [OrderStatus.Draft, OrderStatus.Approving].includes(order.status as any)
    ) {
      throw new BadRequestException("合同会签通过后才能创建出库单。");
    }
    if (
      [
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException(
        "退租结算中、已完成或已取消订单不能创建出库单。",
      );
    }

    const rawBtCodes = Array.isArray(body.btCodes)
      ? body.btCodes.join("\n")
      : String(body.btCodes ?? "");
    const btCodes = rawBtCodes
      .split(/[\s,，、;；]+/)
      .map((code) => code.trim())
      .filter(Boolean);
    const uniqueBtCodes = Array.from(new Set(btCodes));
    if (!uniqueBtCodes.length)
      throw new BadRequestException("请填写出库 BT 码。");
    if (uniqueBtCodes.length !== btCodes.length) {
      throw new BadRequestException("出库 BT 码不能重复。");
    }

    this.syncOrderOperationalState(order);
    const remainingCount =
      Number(order.orderedBatteryCount || 0) - Number(order.outboundCount || 0);
    if (uniqueBtCodes.length > remainingCount) {
      throw new BadRequestException(
        `本订单剩余可出库 ${remainingCount} 组，不能超量出库。`,
      );
    }

    const batteries = uniqueBtCodes.map((btCode) => {
      const battery = this.batteries.find((item) => item.btCode === btCode) as
        | Record<string, any>
        | undefined;
      if (!battery) throw new BadRequestException(`未找到 BT 码 ${btCode}。`);
      if (
        battery.assetStatus !== BatteryAssetStatus.InStock ||
        battery.orderId
      ) {
        throw new BadRequestException(
          `${btCode} 当前不是在库状态，不能绑定到该订单。`,
        );
      }
      return battery;
    });

    const now = this.nowText();
    const outboundAt = body.outboundAt || this.dateText();
    const outbound: Record<string, any> = {
      id: `out-${String(Date.now()).slice(-8)}`,
      outboundNo: `OUT${String(Date.now()).slice(-8)}`,
      orderId: order.id,
      customerName: order.customerName,
      status: OutboundStatus.PendingReceipt,
      outboundAt,
      autoReceiveAt: this.addDaysText(outboundAt, 7),
      receivedAt: "",
      warehouse: body.warehouse || "郑州总仓",
      operator,
      receiver: body.receiver || order.customerContact || "客户联系人",
      address: body.address || order.region || "",
      btCodes: uniqueBtCodes,
    };

    batteries.forEach((battery) => {
      battery.assetStatus = BatteryAssetStatus.Leasing;
      battery.customerId = order.customerId;
      battery.orderId = order.id;
      battery.userName = order.customerShortName || order.customerName;
      battery.orgName = `延成科讯 / ${battery.userName}`;
      battery.inboundState = "已出库";
      battery.lifecycle = "运营";
      battery.customStatus = "待客户收货";
      battery.packageName = "租赁订单绑定";
      battery.updatedAt = now;
      this.assetMovements[battery.id] = this.assetMovements[battery.id] ?? [];
      this.assetMovements[battery.id].push({
        type: "OUTBOUND",
        title: "租赁订单出库",
        time: now,
        operator: outbound.operator,
        target: order.customerName,
        status: "待客户收货",
        remark: `${outbound.outboundNo} 绑定到订单 ${order.orderNo}`,
      });
    });

    this.outbounds.unshift(outbound as any);
    order.updatedAt = now;
    this.appendOrderEvent(
      order,
      "创建出库单",
      `${outbound.outboundNo} 出库 ${uniqueBtCodes.length} 组电池，等待客户确认收货。`,
    );
    this.syncOrderOperationalState(order);
    this.persistMockState();
    return this.getOrder(order.id);
  }

  generateOrderBill(id: string, body: Record<string, any>) {
    const order = this.findOrder(id);
    const operator = String(body.operator ?? "").trim() || order.financeOwner || "赵财务";
    this.assertPermission({ ...body, operator }, "bill.confirm", operator);
    if (
      [OrderStatus.Draft, OrderStatus.Approving].includes(order.status as any)
    ) {
      throw new BadRequestException("订单未生效，不能生成账单。");
    }
    if (
      [
        OrderStatus.Returning,
        OrderStatus.Completed,
        OrderStatus.Cancelled,
      ].includes(order.status as any)
    ) {
      throw new BadRequestException(
        "退租结算中、已完成或已取消订单不能生成新账单。",
      );
    }

    const generatedAt =
      body.generatedAt || order.nextBillingDate || this.dateText();
    const period = body.period || this.monthText(generatedAt);
    const duplicated = this.bills.some(
      (bill) => bill.orderNo === order.orderNo && bill.period === period,
    );
    if (duplicated) {
      throw new BadRequestException(`${period} 账期已存在，不能重复生成。`);
    }

    const bill: Record<string, any> = {
      id: `bill-${String(Date.now()).slice(-8)}`,
      billNo: `BILL${String(Date.now()).slice(-8)}`,
      customerName: order.customerName,
      orderNo: order.orderNo,
      period,
      receivableAmount: Number(body.receivableAmount || order.monthlyRent || 0),
      paidAmount: 0,
      debtAmount: Number(body.receivableAmount || order.monthlyRent || 0),
      status: BillStatus.PendingConfirm,
      generatedAt,
      dueDate: body.dueDate || this.addDaysText(generatedAt, 7),
      confirmedAt: "",
      adjustReason: "",
      payments: [],
      operationLogs: [
        {
          time: this.nowText(),
          operator,
          action: "生成账单",
          remark: "按订单账单日生成月度应收账单。",
        },
      ],
    };

    this.bills.push(bill as any);
    order.nextBillingDate = this.billingDateFrom(
      generatedAt,
      order.billingDay,
      1,
    );
    order.updatedAt = this.nowText();
    this.appendOrderEvent(
      order,
      "生成月度账单",
      `${period} 账期应收 ${bill.receivableAmount} 元。`,
    );
    this.syncOrderFinance(order.orderNo);
    this.persistMockState();
    return this.getOrder(order.id);
  }

  getAlarms(query: Record<string, any> = {}) {
    return this.alarmQueryRows(query);
  }

  getAlarmStats(query: Record<string, any> = {}) {
    const rows = this.alarmQueryRows(query);
    const active = rows.filter(
      (alarm) =>
        ![AlarmStatus.Resolved, AlarmStatus.FalseAlarm].includes(alarm.status),
    );
    const unconfirmedPushes = rows.reduce(
      (count, alarm) =>
        count +
        (alarm.pushes ?? []).filter(
          (push: Record<string, any>) =>
            push.sendStatus !== "success" || push.receiveStatus !== "answered",
        ).length,
      0,
    );

    return {
      total: rows.length,
      active: active.length,
      severe: active.filter((alarm) => alarm.level === AlarmLevel.Severe)
        .length,
      pending: rows.filter((alarm) => alarm.status === AlarmStatus.Pending)
        .length,
      processing: rows.filter(
        (alarm) => alarm.status === AlarmStatus.Processing,
      ).length,
      resolved: rows.filter((alarm) => alarm.status === AlarmStatus.Resolved)
        .length,
      falseAlarm: rows.filter(
        (alarm) => alarm.status === AlarmStatus.FalseAlarm,
      ).length,
      repairLinked: rows.filter((alarm) => Boolean(alarm.repairNo)).length,
      unconfirmedPushes,
      overdue: active.filter((alarm) => alarm.isSlaOverdue).length,
      silenced: active.filter((alarm) => alarm.isSilenced).length,
    };
  }

  getAlarmRules() {
    return this.alarmRules.map((rule, index) => ({
      index: index + 1,
      ...rule,
    }));
  }

  updateAlarmRule(
    id: string,
    body: {
      name?: string;
      level?: string;
      enabled?: boolean;
      responseMinutes?: number;
      autoRepair?: boolean;
      defaultHandler?: string;
      escalationReceivers?: string[];
      channels?: string[];
      remark?: string;
    },
  ) {
    const rule = this.findAlarmRuleById(id);
    const levels = Object.values(AlarmLevel) as string[];
    const channels = ["mp", "sms", "phone"];

    if (body.name !== undefined)
      rule.name = String(body.name).trim() || rule.name;
    if (body.level !== undefined) {
      if (!levels.includes(body.level)) {
        throw new BadRequestException("不支持的告警等级。");
      }
      rule.level = body.level;
    }
    if (body.enabled !== undefined) rule.enabled = Boolean(body.enabled);
    if (body.responseMinutes !== undefined) {
      const minutes = Number(body.responseMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new BadRequestException("响应时限必须大于 0 分钟。");
      }
      rule.responseMinutes = Math.round(minutes);
    }
    if (body.autoRepair !== undefined)
      rule.autoRepair = Boolean(body.autoRepair);
    if (body.defaultHandler !== undefined) {
      rule.defaultHandler =
        String(body.defaultHandler).trim() || rule.defaultHandler;
    }
    if (body.escalationReceivers !== undefined) {
      rule.escalationReceivers = body.escalationReceivers
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
    if (body.channels !== undefined) {
      rule.channels = body.channels.filter((item) =>
        channels.includes(String(item)),
      );
      if (!rule.channels.length) rule.channels = ["sms"];
    }
    if (body.remark !== undefined) rule.remark = String(body.remark).trim();
    rule.updatedAt = this.nowText();
    this.persistMockState();
    return { ...rule };
  }

  getAlarm(id: string) {
    return this.enrichAlarm(this.findAlarm(id));
  }

  updateAlarmStatus(
    id: string,
    body: {
      status?: string;
      remark?: string;
      operator?: string;
      handler?: string;
    },
  ) {
    const alarm = this.findAlarm(id);
    const nextStatus = body.status || AlarmStatus.Processing;
    const allowedStatuses = Object.values(AlarmStatus) as string[];
    if (!allowedStatuses.includes(nextStatus)) {
      throw new BadRequestException("不支持的告警状态。");
    }

    const remark = body.remark?.trim();
    if (
      [AlarmStatus.Resolved, AlarmStatus.FalseAlarm].includes(
        nextStatus as any,
      ) &&
      !remark
    ) {
      throw new BadRequestException("关闭告警必须填写处理说明。");
    }

    alarm.status = nextStatus;
    alarm.handler = body.handler || alarm.handler || "售后一组";
    if (
      [AlarmStatus.Resolved, AlarmStatus.FalseAlarm].includes(nextStatus as any)
    ) {
      alarm.recoveredAt = alarm.recoveredAt || this.nowText();
      alarm.silenceUntil = "";
    }

    const action =
      nextStatus === AlarmStatus.Resolved
        ? "处理完成"
        : nextStatus === AlarmStatus.FalseAlarm
          ? "标记误报"
          : "开始处理";
    this.appendAlarmLog(
      alarm,
      action,
      this.alarmStatusLabel(nextStatus),
      body.operator || alarm.handler || "运维人员",
      remark || "告警已进入处理流程。",
    );
    this.persistMockState();
    return this.enrichAlarm(alarm);
  }

  batchUpdateAlarmStatus(body: {
    ids?: string[];
    status?: string;
    remark?: string;
    operator?: string;
    handler?: string;
  }) {
    const ids = this.alarmIdsFromBody(body);
    const updated = ids.map((id) =>
      this.updateAlarmStatus(id, {
        status: body.status,
        remark: body.remark,
        operator: body.operator,
        handler: body.handler,
      }),
    );

    return {
      count: updated.length,
      updated,
    };
  }

  silenceAlarm(
    id: string,
    body: {
      minutes?: number;
      silenceMinutes?: number;
      until?: string;
      reason?: string;
      remark?: string;
      operator?: string;
    } = {},
  ) {
    const alarm = this.findAlarm(id);
    const detail = this.enrichAlarm(alarm);
    if (
      ![AlarmStatus.Pending, AlarmStatus.Processing].includes(
        alarm.status as any,
      )
    ) {
      throw new BadRequestException("已关闭告警无需静默。");
    }

    const reason = String(body.reason || body.remark || "").trim();
    if (!reason) throw new BadRequestException("静默告警必须填写原因。");

    const minutes = Number(body.minutes ?? body.silenceMinutes ?? 120);
    const untilTime = body.until
      ? this.parseTextTime(body.until)
      : Date.now() + Math.round(minutes) * 60000;
    if (!Number.isFinite(untilTime) || untilTime <= Date.now()) {
      throw new BadRequestException("静默截止时间必须晚于当前时间。");
    }

    const silenceUntil = this.formatTextTime(new Date(untilTime));
    const operator = body.operator || detail.handler || "告警管理";
    alarm.silencedAt = this.nowText();
    alarm.silenceUntil = silenceUntil;
    alarm.silenceReason = reason;
    alarm.silenceOperator = operator;

    this.appendAlarmLog(
      alarm,
      detail.isSilenced ? "更新静默" : "静默告警",
      "静默中",
      operator,
      `静默至 ${silenceUntil}，原因：${reason}`,
    );
    this.persistMockState();
    return this.enrichAlarm(alarm);
  }

  batchSilenceAlarms(body: {
    ids?: string[];
    minutes?: number;
    silenceMinutes?: number;
    until?: string;
    reason?: string;
    remark?: string;
    operator?: string;
  }) {
    const ids = this.alarmIdsFromBody(body);
    const updated = ids.map((id) => this.silenceAlarm(id, body));
    return {
      count: updated.length,
      updated,
    };
  }

  unsilenceAlarm(
    id: string,
    body: {
      remark?: string;
      operator?: string;
    } = {},
  ) {
    const alarm = this.findAlarm(id);
    const detail = this.enrichAlarm(alarm);
    if (
      ![AlarmStatus.Pending, AlarmStatus.Processing].includes(
        alarm.status as any,
      )
    ) {
      throw new BadRequestException("已关闭告警无需解除静默。");
    }

    alarm.silenceUntil = "";
    alarm.silenceReason = "";
    alarm.silenceOperator = "";
    alarm.silencedAt = "";
    this.appendAlarmLog(
      alarm,
      "解除静默",
      this.alarmStatusLabel(alarm.status),
      body.operator || detail.handler || "告警管理",
      body.remark ||
        (detail.isSilenced
          ? "告警已恢复正常提醒和升级规则。"
          : "告警当前未处于静默，已复核。"),
    );
    this.persistMockState();
    return this.enrichAlarm(alarm);
  }

  batchUnsilenceAlarms(body: {
    ids?: string[];
    remark?: string;
    operator?: string;
  }) {
    const ids = this.alarmIdsFromBody(body);
    const updated = ids.map((id) => this.unsilenceAlarm(id, body));
    return {
      count: updated.length,
      updated,
    };
  }

  pushAlarm(
    id: string,
    body: {
      pushType?: string;
      userName?: string;
      userPhone?: string;
      remark?: string;
      operator?: string;
    } = {},
  ) {
    const alarm = this.findAlarm(id);
    const detail = this.enrichAlarm(alarm);
    if (!detail.canPush) {
      throw new BadRequestException("该告警已关闭或处于静默中，不能重新推送。");
    }
    const pushTypes = ["mp", "sms", "phone"];
    const pushType = pushTypes.includes(String(body.pushType))
      ? String(body.pushType)
      : alarm.mpPush
        ? "mp"
        : "sms";
    const now = this.nowText();
    const receiverName =
      body.userName || alarm.handler || alarm.customerName || "值班人员";
    const receiverPhone = body.userPhone || "13900139002";
    alarm.pushes = alarm.pushes ?? [];
    alarm.pushes.unshift({
      id: `${alarm.id}-push-${Date.now()}-${alarm.pushes.length + 1}`,
      pushType,
      userName: receiverName,
      userType: receiverName === alarm.customerName ? "customer" : "operator",
      userPhone: receiverPhone,
      firstPushTime: now,
      lastPushTime: now,
      answerTime: "",
      pushCount: 1,
      sendStatus: "success",
      receiveStatus: "unread",
      failReason: "",
      remark: body.remark || "告警重新推送，等待接收人确认。",
    });

    this.appendAlarmLog(
      alarm,
      "重新推送",
      this.alarmStatusLabel(alarm.status),
      body.operator || "告警管理",
      `${receiverName} 已接收 ${pushType === "mp" ? "公众号" : pushType === "phone" ? "电话" : "短信"}提醒。`,
    );

    this.persistMockState();
    return this.enrichAlarm(alarm);
  }

  acknowledgeAlarmPush(
    id: string,
    pushId: string,
    body: {
      operator?: string;
      remark?: string;
    } = {},
  ) {
    const alarm = this.findAlarm(id);
    const push = (alarm.pushes ?? []).find(
      (item: Record<string, any>) => item.id === pushId,
    );
    if (!push) throw new NotFoundException("告警推送记录不存在。");

    const now = this.nowText();
    push.sendStatus = "success";
    push.receiveStatus = "answered";
    push.answerTime = push.answerTime || now;
    push.remark = body.remark || push.remark || "接收人已确认收到告警。";
    push.lastPushTime = now;
    alarm.updatedAt = now;
    this.appendAlarmLog(
      alarm,
      "确认推送",
      this.alarmStatusLabel(alarm.status),
      body.operator || push.userName || "值班人员",
      `${push.userName || "接收人"} 已确认收到告警通知。`,
    );

    this.persistMockState();
    return this.enrichAlarm(alarm);
  }

  escalateAlarm(
    id: string,
    body: {
      operator?: string;
      remark?: string;
      receiverName?: string;
      receiverPhone?: string;
      pushType?: string;
    } = {},
  ) {
    const alarm = this.findAlarm(id);
    const detail = this.enrichAlarm(alarm);
    if (!detail.canEscalate) {
      throw new BadRequestException("该告警已关闭或未启用升级规则。");
    }

    const rule = this.findAlarmRule(alarm.alarmIndex);
    const channels = Array.isArray(rule?.channels) ? rule?.channels : ["sms"];
    const pushType = channels.includes(body.pushType)
      ? body.pushType
      : channels[0] || "sms";
    const now = this.nowText();
    const receiverName =
      body.receiverName ||
      detail.escalationTarget ||
      alarm.handler ||
      "值班人员";
    const receiverPhone = body.receiverPhone || "13900139002";
    const nextLevel = Number(alarm.escalationLevel ?? 0) + 1;

    alarm.status =
      alarm.status === AlarmStatus.Pending
        ? AlarmStatus.Processing
        : alarm.status;
    alarm.handler = receiverName;
    alarm.escalationLevel = nextLevel;
    alarm.lastEscalatedAt = now;
    alarm.nextEscalationDueAt = this.addMinutesText(
      now,
      Number(detail.responseMinutes || 60),
    );
    alarm.pushes = alarm.pushes ?? [];
    alarm.pushes.unshift({
      id: `${alarm.id}-escalation-${Date.now()}-${nextLevel}`,
      pushType,
      userName: receiverName,
      userType: "operator",
      userPhone: receiverPhone,
      firstPushTime: now,
      lastPushTime: now,
      answerTime: "",
      pushCount: 1,
      sendStatus: "success",
      receiveStatus: "unread",
      failReason: "",
      remark: body.remark || "SLA 超时升级提醒，等待接收人确认。",
    });

    this.appendAlarmLog(
      alarm,
      "告警升级",
      this.alarmStatusLabel(alarm.status),
      body.operator || "告警管理",
      body.remark || `已升级给 ${receiverName}，请在新的响应时限内处理。`,
    );
    this.persistMockState();
    return this.enrichAlarm(alarm);
  }

  batchEscalateAlarms(body: {
    ids?: string[];
    operator?: string;
    remark?: string;
    receiverName?: string;
    receiverPhone?: string;
    pushType?: string;
  }) {
    const ids = this.alarmIdsFromBody(body);
    const updated = ids.map((id) => this.escalateAlarm(id, body));
    return {
      count: updated.length,
      updated,
    };
  }

  batchPushAlarms(body: {
    ids?: string[];
    pushType?: string;
    userName?: string;
    userPhone?: string;
    remark?: string;
    operator?: string;
  }) {
    const ids = this.alarmIdsFromBody(body);
    const updated = ids.map((id) => this.pushAlarm(id, body));
    return {
      count: updated.length,
      updated,
    };
  }

  createRepairFromAlarm(
    id: string,
    body: {
      description?: string;
      address?: string;
      handler?: string;
      operator?: string;
    },
  ) {
    const alarm = this.findAlarm(id);
    if (alarm.repairNo) {
      const existing = this.repairs.find(
        (repair) => repair.repairNo === alarm.repairNo,
      );
      if (existing) {
        return {
          alarm: this.enrichAlarm(alarm),
          repair: this.enrichRepair(existing),
        };
      }
    }

    const battery = this.batteries.find((item) => item.btCode === alarm.btCode);
    if (!battery) throw new BadRequestException("未找到告警关联的 BT 码。");
    this.ensureNoActiveRepair(alarm.btCode);
    const order = battery.orderId
      ? this.orders.find((item) => item.id === battery.orderId)
      : undefined;
    const now = this.nowText();
    const identity = this.createRepairIdentity();
    const slaHours = alarm.level === AlarmLevel.Severe ? 24 : 72;
    const slaDueAt = this.addMinutesText(now, slaHours * 60);
    const repair = {
      id: identity.id,
      repairNo: identity.repairNo,
      source: RepairSource.Internal,
      customerName: order?.customerName ?? alarm.customerName ?? "内部仓储",
      customerShortName:
        order?.customerShortName ?? alarm.customerName ?? "内部",
      orderId: order?.id ?? "",
      btCode: alarm.btCode,
      status: RepairStatus.PendingAccept,
      priority: alarm.level === AlarmLevel.Severe ? "紧急" : "普通",
      description:
        body.description ||
        `${alarm.type}：${alarm.description || "告警需要售后进一步检测。"}`,
      address: body.address || alarm.location || battery.location || "待确认",
      contactName: order?.customerContact ?? "内部人员",
      contactPhone: order?.contactPhone ?? "",
      createdAt: now,
      acceptedAt: "",
      expectedFinishAt: slaDueAt,
      completedAt: "",
      handler: body.handler || alarm.handler || "售后一组",
      technician: "",
      faultType: alarm.type,
      responsibility: "待判定",
      repairMethod: "待受理",
      costAmount: 0,
      slaHours,
      slaDueAt,
      customerConfirmed: false,
      customerConfirmedAt: "",
      sourceAlarmNo: alarm.alarmNo,
      images: [],
    };

    (this.repairs as Array<Record<string, any>>).unshift(repair);
    this.repairLogs[repair.id] = [
      {
        time: now,
        operator: body.operator || "告警管理",
        action: "告警转报修",
        status: "待受理",
        result: "已生成内部报修单",
        remark: `来源告警 ${alarm.alarmNo}。`,
      },
    ];

    alarm.status = AlarmStatus.Processing;
    alarm.handler = repair.handler;
    alarm.repairNo = identity.repairNo;
    this.appendAlarmLog(
      alarm,
      "转报修",
      this.alarmStatusLabel(AlarmStatus.Processing),
      body.operator || "告警管理",
      `已生成报修单 ${identity.repairNo}。`,
    );

    this.persistMockState();
    return {
      alarm: this.enrichAlarm(alarm),
      repair: this.enrichRepair(repair),
    };
  }

  getRepairs() {
    return this.repairs.map((repair, index) =>
      this.enrichRepair(repair, index),
    );
  }

  getRepair(id: string) {
    const repair = this.findRepairTicket(id);
    const detail = this.enrichRepair(repair);
    return {
      ...detail,
      materials: this.getRepairMaterials(repair),
      costItems: this.getRepairCostItems(repair),
      progressNodes: [
        { label: "提交", done: true },
        {
          label: "受理",
          done: repair.status !== RepairStatus.PendingAccept,
        },
        {
          label: "维修",
          done: (
            [
              RepairStatus.Repairing,
              RepairStatus.PendingInbound,
              RepairStatus.Completed,
              RepairStatus.Closed,
            ] as string[]
          ).includes(repair.status),
        },
        {
          label: "入库",
          done: (
            [RepairStatus.Completed, RepairStatus.Closed] as string[]
          ).includes(repair.status),
        },
      ],
    };
  }

  importCustomerRepairs(body: {
    records?: Array<{
      btCode?: string;
      description?: string;
      address?: string;
      images?: string[];
    }>;
  }) {
    const records = body.records ?? [];
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException("请提供需要导入的客户报修记录。");
    }

    const created: Record<string, any>[] = [];
    const failed: Array<{ row: number; btCode: string; reason: string }> = [];
    records.forEach((record, index) => {
      try {
        const images = (record.images ?? [])
          .map((item) => String(item).trim())
          .filter(Boolean);
        created.push(
          this.createCustomerRepair({
            btCode: String(record.btCode ?? "").trim(),
            description: String(record.description ?? "").trim(),
            address: String(record.address ?? "").trim(),
            images,
          }),
        );
      } catch (error: any) {
        failed.push({
          row: index + 1,
          btCode: String(record.btCode ?? ""),
          reason: error?.response?.message ?? error?.message ?? "导入失败",
        });
      }
    });

    return {
      total: records.length,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    };
  }

  updateRepairAssignment(
    id: string,
    body: {
      handler?: string;
      technician?: string;
      priority?: string;
      expectedFinishAt?: string;
      slaHours?: number;
      acceptNow?: boolean;
      operator?: string;
      remark?: string;
    },
  ) {
    const repair = this.findRepairTicket(id);
    if ([RepairStatus.Completed, RepairStatus.Closed].includes(repair.status)) {
      throw new BadRequestException("已完成或已关闭报修单不能重新派工。");
    }

    const handler =
      body.handler !== undefined ? String(body.handler).trim() : repair.handler;
    if (!handler) throw new BadRequestException("处理组不能为空。");

    const technician =
      body.technician !== undefined
        ? String(body.technician).trim()
        : repair.technician || "";
    const priority =
      body.priority !== undefined
        ? String(body.priority).trim()
        : repair.priority;
    if (priority && !["紧急", "普通"].includes(priority)) {
      throw new BadRequestException("优先级只能是紧急或普通。");
    }

    const slaHours = Number(
      body.slaHours ??
        repair.slaHours ??
        this.defaultRepairSlaHours({ ...repair, priority }),
    );
    if (!Number.isFinite(slaHours) || slaHours < 1) {
      throw new BadRequestException("SLA 时限必须大于 0 小时。");
    }

    const hasExpectedFinishAt = body.expectedFinishAt !== undefined;
    const expectedFinishAt = hasExpectedFinishAt
      ? String(body.expectedFinishAt).trim()
      : "";
    if (
      expectedFinishAt &&
      !Number.isFinite(this.parseTextTime(expectedFinishAt))
    ) {
      throw new BadRequestException("预计完成时间格式不正确。");
    }

    const operator = body.operator || repair.handler || "售后人员";
    const wasPending = repair.status === RepairStatus.PendingAccept;
    repair.handler = handler;
    repair.technician = technician;
    repair.priority = priority || repair.priority;
    repair.slaHours = slaHours;
    if (body.acceptNow !== false && wasPending) {
      repair.status = RepairStatus.Processing;
      repair.acceptedAt = repair.acceptedAt || this.nowText();
      repair.repairMethod =
        repair.repairMethod === "待受理" ? "售后受理" : repair.repairMethod;
    }

    if (expectedFinishAt) {
      repair.expectedFinishAt = expectedFinishAt;
      repair.slaDueAt = expectedFinishAt;
    } else if (hasExpectedFinishAt || body.slaHours !== undefined || !repair.slaDueAt) {
      repair.slaDueAt = this.addMinutesText(
        repair.acceptedAt || repair.createdAt || this.nowText(),
        slaHours * 60,
      );
      repair.expectedFinishAt = repair.slaDueAt;
    } else if (!repair.expectedFinishAt && repair.slaDueAt) {
      repair.expectedFinishAt = repair.slaDueAt;
    }
    repair.updatedAt = this.nowText();

    this.appendRepairLog(repair, {
      action:
        wasPending && body.acceptNow !== false ? "受理并派工" : "更新派工",
      result: `${repair.handler}${repair.technician ? ` / ${repair.technician}` : ""} 已负责该工单`,
      remark:
        body.remark ||
        `SLA ${slaHours} 小时，预计 ${repair.slaDueAt || repair.expectedFinishAt || "待确认"} 完成。`,
      operator,
    });
    this.syncRepairAsset(
      repair,
      "售后派工",
      operator,
      body.remark || "报修单已分配处理人。",
    );
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  updateRepairStatus(
    id: string,
    body: {
      status: string;
      operator?: string;
      handler?: string;
      technician?: string;
      result?: string;
      remark?: string;
    },
  ) {
    const repair = this.findRepairTicket(id);
    const nextStatus = body.status;
    if (!Object.values(RepairStatus).includes(nextStatus as any)) {
      throw new BadRequestException("报修状态不合法。");
    }

    const allowedTransitions: Record<string, string[]> = {
      [RepairStatus.PendingAccept]: [
        RepairStatus.Processing,
        RepairStatus.Closed,
      ],
      [RepairStatus.Processing]: [RepairStatus.Repairing, RepairStatus.Closed],
      [RepairStatus.Repairing]: [
        RepairStatus.PendingInbound,
        RepairStatus.Closed,
      ],
      [RepairStatus.PendingInbound]: [
        RepairStatus.Completed,
        RepairStatus.Closed,
      ],
      [RepairStatus.Completed]: [RepairStatus.Closed],
      [RepairStatus.Closed]: [],
    };
    if (
      repair.status !== nextStatus &&
      !allowedTransitions[repair.status]?.includes(nextStatus)
    ) {
      throw new BadRequestException("当前状态不能执行该流转。");
    }

    const operator =
      body.operator || repair.technician || repair.handler || "售后人员";
    repair.status = nextStatus;
    repair.handler = body.handler || repair.handler || "售后一组";
    repair.technician = body.technician || repair.technician;
    repair.updatedAt = this.nowText();

    if (nextStatus === RepairStatus.Processing) {
      repair.acceptedAt = repair.acceptedAt || this.nowText();
      repair.handler =
        repair.handler === "待分配" ? "售后一组" : repair.handler;
      repair.repairMethod =
        repair.repairMethod === "待受理" ? "售后受理" : repair.repairMethod;
      repair.slaHours = repair.slaHours ?? this.defaultRepairSlaHours(repair);
      repair.slaDueAt =
        repair.slaDueAt ||
        repair.expectedFinishAt ||
        this.addMinutesText(repair.acceptedAt, Number(repair.slaHours) * 60);
      repair.expectedFinishAt = repair.expectedFinishAt || repair.slaDueAt;
    }
    if (nextStatus === RepairStatus.Repairing) {
      repair.technician = repair.technician || "李工";
      repair.repairMethod =
        repair.repairMethod === "售后受理"
          ? "现场/返厂维修"
          : repair.repairMethod;
    }
    if (nextStatus === RepairStatus.PendingInbound) {
      repair.completedAt = repair.completedAt || this.nowText();
      repair.repairMethod = "维修完成待入库";
    }
    if (nextStatus === RepairStatus.Completed) {
      repair.completedAt = repair.completedAt || this.nowText();
      repair.repairMethod = "已入库完成";
      repair.customerConfirmed = repair.source === RepairSource.Internal;
      repair.customerConfirmedAt = repair.customerConfirmed
        ? repair.customerConfirmedAt || this.nowText()
        : "";
    }

    const defaultActions: Record<string, string> = {
      [RepairStatus.Processing]: "受理报修",
      [RepairStatus.Repairing]: "开始维修",
      [RepairStatus.PendingInbound]: "维修完成",
      [RepairStatus.Completed]: "入库完成",
      [RepairStatus.Closed]: "关闭报修",
    };
    const result =
      body.result || `${this.repairStatusLabel(nextStatus)}状态已更新`;
    const remark = body.remark || "后台售后流程操作。";
    this.appendRepairLog(repair, {
      action: defaultActions[nextStatus] || "状态更新",
      result,
      remark,
      operator,
    });
    this.syncRepairAsset(
      repair,
      defaultActions[nextStatus] || "状态更新",
      operator,
      remark,
    );
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  batchUpdateRepairStatus(body: {
    ids?: string[];
    status?: string;
    operator?: string;
    handler?: string;
    technician?: string;
    result?: string;
    remark?: string;
  }) {
    const ids = Array.from(
      new Set((body.ids ?? []).map((id) => String(id).trim()).filter(Boolean)),
    );
    if (!ids.length)
      throw new BadRequestException("请选择需要批量处理的报修单。");
    if (!body.status) throw new BadRequestException("请选择批量流转状态。");

    const updated: Record<string, any>[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    ids.forEach((id) => {
      try {
        updated.push(
          this.updateRepairStatus(id, {
            status: body.status as string,
            operator: body.operator,
            handler: body.handler,
            technician: body.technician,
            result: body.result,
            remark: body.remark,
          }),
        );
      } catch (error: any) {
        failed.push({
          id,
          reason: error?.response?.message ?? error?.message ?? "处理失败",
        });
      }
    });

    return {
      total: ids.length,
      updatedCount: updated.length,
      failedCount: failed.length,
      updated,
      failed,
    };
  }

  addRepairLog(
    id: string,
    body: {
      action: string;
      result: string;
      remark?: string;
      operator?: string;
    },
  ) {
    const repair = this.findRepairTicket(id);
    if (!body.action?.trim() || !body.result?.trim()) {
      throw new BadRequestException("请填写处理动作和处理结果。");
    }
    this.appendRepairLog(repair, {
      action: body.action.trim(),
      result: body.result.trim(),
      remark: body.remark?.trim(),
      operator: body.operator,
    });
    repair.updatedAt = this.nowText();
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  addRepairMaterial(
    id: string,
    body: {
      name: string;
      quantity: number;
      amount?: number;
      remark?: string;
    },
  ) {
    const repair = this.findRepairTicket(id);
    const name = body.name?.trim();
    const quantity = Number(body.quantity);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException("请填写有效的维修材料和数量。");
    }

    repair.materials = repair.materials ?? [];
    repair.materials.push({
      name,
      quantity,
      amount: Number(body.amount || 0),
      remark: body.remark || "",
    });
    this.appendRepairLog(repair, {
      action: "登记维修材料",
      result: `${name} x ${quantity}`,
      remark: body.remark || "",
      operator: repair.technician || repair.handler || "售后人员",
    });
    repair.updatedAt = this.nowText();
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  addRepairImage(
    id: string,
    body: {
      name?: string;
      files?: unknown[];
      images?: unknown[];
      operator?: string;
    },
  ) {
    const repair = this.findRepairTicket(id);
    const refs = this.normalizeApprovalAttachments([
      ...(Array.isArray(body.files) ? body.files : []),
      ...(Array.isArray(body.images) ? body.images : []),
      ...(body.name?.trim() ? [body.name.trim()] : []),
    ]);
    if (!refs.length) {
      throw new BadRequestException("请填写附件名称或上传文件。");
    }
    repair.images = this.normalizeApprovalAttachments([
      ...(repair.images ?? []),
      ...refs,
    ]);
    this.bindUploadedFilesToRepair(repair);
    const names = refs.map((item) => this.attachmentDisplayName(item));
    this.appendRepairLog(repair, {
      action: "上传维修附件",
      result: names.join("、"),
      remark: "已补充现场图片或维修凭证",
      operator:
        body.operator || repair.technician || repair.handler || "售后人员",
    });
    repair.updatedAt = this.nowText();
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  private createRepairCostApproval(
    repair: Record<string, any>,
    costItem: Record<string, any>,
    operator: string,
  ) {
    if (Number(costItem.amount || 0) <= 0) return null;
    const approval = this.createApproval({
      type: "REPAIR_COST",
      typeLabel: "维修费用",
      title: `${repair.repairNo} 维修费用审批`,
      applicant: operator,
      department: "售后服务部",
      priority: repair.priority || "普通",
      businessId: repair.id,
      businessNo: repair.repairNo,
      customerName: repair.customerName,
      amount: costItem.amount,
      dueAt: this.addMinutesText(this.nowText(), 48 * 60),
      summary: `${repair.repairNo} ${costItem.item} ${costItem.amount} 元，承担方：${costItem.payer}，责任：${repair.responsibility || costItem.responsibility || "待判定"}。`,
      formItems: [
        { label: "维修单号", value: repair.repairNo },
        { label: "BT码", value: repair.btCode },
        { label: "客户/仓库", value: repair.customerName },
        { label: "费用项目", value: costItem.item },
        {
          label: "费用金额",
          value: `¥${Number(costItem.amount || 0).toLocaleString("zh-CN")}`,
        },
        { label: "承担方", value: costItem.payer },
        {
          label: "责任归属",
          value: repair.responsibility || costItem.responsibility || "待判定",
        },
      ],
      riskItems: [
        "核对维修凭证、现场图片和责任判定。",
        "客户责任费用审批通过后需进入财务账单确认与回款。",
        "厂商质保或公司承担费用审批通过后需留存资产/财务凭证。",
      ],
      attachments: repair.images ?? [],
      formValues: {
        repairNo: repair.repairNo,
        btCode: repair.btCode,
        costItem: costItem.item,
        payer: costItem.payer,
        responsibility: repair.responsibility || costItem.responsibility || "",
      },
    });

    costItem.approvalId = approval.id;
    costItem.approvalNo = approval.approvalNo;
    costItem.approvalStatus = approval.status;
    costItem.approvalStatusLabel = approval.statusLabel;
    repair.approvalId = approval.id;
    repair.approvalNo = approval.approvalNo;
    repair.approvalStatus = approval.status;
    repair.approvalStatusLabel = approval.statusLabel;
    return approval;
  }

  private createRepairCostBill(
    repair: Record<string, any>,
    costItem: Record<string, any>,
    operator: string,
  ) {
    const amount = this.roundMoney(Number(costItem.amount || 0));
    const payer = String(costItem.payer || "");
    const responsibility = String(
      repair.responsibility || costItem.responsibility || "",
    );
    const shouldBillCustomer =
      amount > 0 && (payer.includes("客户") || responsibility.includes("客户"));
    if (!shouldBillCustomer) {
      costItem.financeStatus = "NON_CUSTOMER";
      costItem.financeStatusLabel = "非客户应收";
      repair.financeStatus = "NON_CUSTOMER";
      repair.financeStatusLabel = "非客户应收，等待OA审批归档";
      return null;
    }

    const order = repair.orderId
      ? this.orders.find((item) => item.id === repair.orderId)
      : undefined;
    const now = this.nowText();
    const suffix = `${this.dateText().replace(/-/g, "")}${String(Date.now()).slice(-5)}`;
    const bill: Record<string, any> = {
      id: `bill-repair-${costItem.id}`,
      billNo: `BILLRC${suffix}`,
      orderNo: order?.orderNo || repair.repairNo,
      customerName: repair.customerName,
      period: "维修费用",
      receivableAmount: amount,
      paidAmount: 0,
      debtAmount: amount,
      status: BillStatus.PendingConfirm,
      dueDate: this.addDaysText(this.dateText(), 7),
      generatedAt: now,
      confirmedAt: "",
      payments: [],
      followUpLogs: [],
      operationLogs: [],
      collectionStatus: "待财务确认",
      nextFollowUpAt: "",
      sourceType: "REPAIR_COST",
      sourceId: repair.id,
      sourceNo: repair.repairNo,
      repairNo: repair.repairNo,
      btCode: repair.btCode,
      approvalId: costItem.approvalId || "",
      approvalNo: costItem.approvalNo || "",
      approvalStatus: costItem.approvalStatus || "",
      approvalStatusLabel: costItem.approvalStatusLabel || "",
      costItemId: costItem.id,
      costItem: costItem.item,
      financeOwner: order?.financeOwner || "赵财务",
    };

    this.appendBillLog(
      bill,
      "生成维修费用账单",
      operator,
      `${repair.repairNo} 客户责任维修费用已进入财务确认。`,
      { repairNo: repair.repairNo, costItemId: costItem.id },
    );
    this.bills.unshift(bill);
    costItem.financeBillId = bill.id;
    costItem.financeBillNo = bill.billNo;
    costItem.financeStatus = bill.status;
    costItem.financeStatusLabel = "待财务确认";
    repair.financeBillId = bill.id;
    repair.financeBillNo = bill.billNo;
    repair.financeStatus = bill.status;
    repair.financeStatusLabel = "待财务确认";
    if (order?.orderNo) this.syncOrderFinance(order.orderNo);
    this.appendSystemOperationLog({
      module: "财务管理",
      action: "生成维修费用账单",
      operator,
      target: bill.billNo,
      detail: `${repair.repairNo} 客户责任维修费用 ${amount} 元已生成账单。`,
    });
    return bill;
  }

  updateRepairCost(
    id: string,
    body: {
      item: string;
      amount: number;
      payer?: string;
      responsibility?: string;
      customerConfirmed?: boolean;
      remark?: string;
      operator?: string;
    },
  ) {
    const repair = this.findRepairTicket(id);
    const amount = Number(body.amount);
    if (!body.item?.trim() || !Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException("费用项目和金额必须填写。");
    }

    const operator = body.operator || repair.handler || "售后人员";
    repair.costItems = repair.costItems ?? [];
    const costItem: Record<string, any> = {
      id: `repair-cost-${String(Date.now()).slice(-8)}-${randomUUID().slice(0, 6)}`,
      item: body.item.trim(),
      amount: this.roundMoney(amount),
      payer: body.payer || "公司",
      responsibility: body.responsibility || repair.responsibility || "待判定",
      remark: body.remark || "",
      createdAt: this.nowText(),
      operator,
    };
    repair.costItems.push(costItem);
    repair.costAmount = repair.costItems.reduce(
      (total: number, item: Record<string, any>) =>
        total + Number(item.amount || 0),
      0,
    );
    repair.responsibility = body.responsibility || repair.responsibility;
    repair.customerConfirmed =
      body.customerConfirmed ?? repair.customerConfirmed ?? false;
    repair.customerConfirmedAt = repair.customerConfirmed
      ? repair.customerConfirmedAt || this.nowText()
      : "";
    const approval = this.createRepairCostApproval(repair, costItem, operator);
    const bill = this.createRepairCostBill(repair, costItem, operator);
    this.appendRepairLog(repair, {
      action: "更新维修费用",
      result: `${body.item.trim()} ${this.roundMoney(amount)} 元`,
      remark:
        body.remark ||
        [
          approval ? `OA ${approval.approvalNo}` : "",
          bill ? `账单 ${bill.billNo}` : "",
        ]
          .filter(Boolean)
          .join("，") ||
        "维修费用已登记并进入责任闭环。",
      operator,
    });
    repair.updatedAt = this.nowText();
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  createInternalRepair(body: {
    btCode: string;
    description: string;
    address: string;
    handler?: string;
  }) {
    const battery = this.batteries.find((item) => item.btCode === body.btCode);
    if (!battery)
      throw new BadRequestException("未找到对应BT码，无法发起内部报修。");
    if (!body.description?.trim() || !body.address?.trim()) {
      throw new BadRequestException("内部报修必须填写故障描述和所在位置。");
    }
    this.ensureNoActiveRepair(body.btCode);

    const now = this.nowText();
    const slaHours = 72;
    const slaDueAt = this.addMinutesText(now, slaHours * 60);
    const identity = this.createRepairIdentity();
    const repair = {
      ...identity,
      source: RepairSource.Internal,
      customerName: battery.userName || "内部仓储",
      customerShortName: battery.userName || "内部",
      orderId: battery.orderId,
      btCode: body.btCode,
      status: RepairStatus.PendingAccept,
      priority: "普通",
      description: body.description.trim(),
      address: body.address.trim(),
      contactName: "内部人员",
      contactPhone: "",
      createdAt: now,
      acceptedAt: "",
      expectedFinishAt: slaDueAt,
      completedAt: "",
      handler: body.handler || "待分配",
      technician: "",
      faultType: "内部检测异常",
      responsibility: "待判定",
      repairMethod: "待受理",
      costAmount: 0,
      slaHours,
      slaDueAt,
      customerConfirmed: false,
      customerConfirmedAt: "",
      sourceAlarmNo: "",
      images: [],
      materials: [],
      costItems: [],
    };
    this.bindUploadedFilesToRepair(repair);
    this.repairs.unshift(repair);
    this.repairLogs[repair.id] = [
      {
        time: repair.createdAt,
        operator: "内部后台",
        action: "内部报修",
        status: "待受理",
        result: "已生成内部报修单",
        remark: "内部检测异常进入售后工单池。",
      },
    ];
    this.syncRepairAsset(
      repair,
      "内部报修",
      repair.handler,
      "内部检测异常进入报修流程。",
    );
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  private daysPastDue(dueDate: string) {
    if (!dueDate) return 0;
    const due = new Date(`${dueDate}T23:59:59`);
    if (Number.isNaN(due.getTime())) return 0;
    const diff = Date.now() - due.getTime();
    return Math.max(Math.floor(diff / 86400000), 0);
  }

  private daysUntilDue(dueDate: string) {
    if (!dueDate) return 0;
    const due = new Date(`${dueDate}T23:59:59`);
    if (Number.isNaN(due.getTime())) return 0;
    const diff = due.getTime() - Date.now();
    return Math.max(Math.ceil(diff / 86400000), 0);
  }

  private billAgeingBucket(bill: Record<string, any>) {
    if (bill.status === BillStatus.PendingConfirm) {
      return { key: "PENDING_CONFIRM", label: "待确认", tone: "warning" };
    }
    if (bill.debtAmount <= 0 || bill.status === BillStatus.Settled) {
      return { key: "SETTLED", label: "已结清", tone: "success" };
    }

    const daysOverdue = this.daysPastDue(bill.dueDate);
    if (daysOverdue <= 0) {
      return { key: "NOT_DUE", label: "未到期", tone: "primary" };
    }
    if (daysOverdue <= 7) {
      return { key: "DUE_1_7", label: "逾期1-7天", tone: "danger" };
    }
    if (daysOverdue <= 30) {
      return { key: "DUE_8_30", label: "逾期8-30天", tone: "danger" };
    }
    return { key: "DUE_30_PLUS", label: "逾期30天以上", tone: "danger" };
  }

  private billCollectionAction(bill: Record<string, any>) {
    if (bill.status === BillStatus.PendingConfirm) return "待财务确认";
    if (bill.status === BillStatus.Settled || bill.debtAmount <= 0)
      return "无需跟进";

    const daysOverdue = this.daysPastDue(bill.dueDate);
    if (daysOverdue >= 30) return "升级主管催收";
    if (daysOverdue >= 8) return "电话确认付款计划";
    if (daysOverdue > 0) return "发送逾期提醒";
    if (this.daysUntilDue(bill.dueDate) <= 2) return "到期前付款提醒";
    return "正常跟进";
  }

  private normalizeBillStatus(bill: Record<string, any>) {
    const receivableAmount = Number(bill.receivableAmount) || 0;
    const paidAmount = Number(bill.paidAmount) || 0;
    bill.debtAmount = Math.max(receivableAmount - paidAmount, 0);

    if (bill.status === BillStatus.PendingConfirm && !bill.confirmedAt) {
      return bill.status;
    }
    if (bill.status === BillStatus.Voided) {
      return bill.status;
    }

    if (bill.debtAmount <= 0) {
      bill.status = BillStatus.Settled;
      return bill.status;
    }

    if (this.daysPastDue(bill.dueDate) > 0) {
      bill.status = BillStatus.Overdue;
      return bill.status;
    }

    bill.status =
      paidAmount > 0 ? BillStatus.PartiallyPaid : BillStatus.PendingPayment;
    return bill.status;
  }

  private billStatusLabel(status: string) {
    return (
      {
        [BillStatus.PendingConfirm]: "待确认",
        [BillStatus.PendingPayment]: "待付款",
        [BillStatus.PartiallyPaid]: "部分回款",
        [BillStatus.Settled]: "已结清",
        [BillStatus.Overdue]: "已逾期",
        [BillStatus.Adjusted]: "已调整",
        [BillStatus.Voided]: "已作废",
      }[status] ?? status
    );
  }

  private findBill(id: string) {
    const bill = this.bills.find(
      (item) => item.id === id || item.billNo === id,
    ) as Record<string, any> | undefined;
    if (!bill) throw new NotFoundException("账单不存在");
    return bill;
  }

  private appendBillLog(
    bill: Record<string, any>,
    action: string,
    operator: string,
    remark: string,
    detail?: Record<string, any>,
  ) {
    bill.operationLogs = bill.operationLogs ?? [];
    bill.operationLogs.unshift({
      time: this.nowText(),
      operator,
      action,
      remark,
      detail,
    });
  }

  private enrichBill(
    bill: Record<string, any>,
    index = 0,
  ): Record<string, any> {
    this.normalizeBillStatus(bill);
    const order = this.orders.find((item) => item.orderNo === bill.orderNo);
    const latestPayment = bill.payments?.at(-1);
    const ageingBucket = this.billAgeingBucket(bill);
    const followUpLogs = bill.followUpLogs ?? [];
    const paymentVouchers = bill.paymentVouchers ?? [];
    const lastFollowUp = followUpLogs[0];
    const pendingVoucherCount = paymentVouchers.filter(
      (voucher: Record<string, any>) => voucher.status === "PENDING",
    ).length;
    const daysOverdue =
      bill.debtAmount > 0 && bill.status === BillStatus.Overdue
        ? this.daysPastDue(bill.dueDate)
        : 0;
    const approvalBlocked =
      bill.sourceType === "REPAIR_COST" &&
      bill.approvalStatus &&
      bill.approvalStatus !== ApprovalStatus.Approved;

    return {
      index: index + 1,
      ...bill,
      customerShortName: order?.customerShortName ?? bill.customerName,
      customerContact: order?.customerContact ?? "",
      contactPhone: order?.contactPhone ?? "",
      monthlyRent: order?.monthlyRent ?? bill.receivableAmount,
      billingDay: order?.billingDay ?? "",
      salesOwner: order?.salesOwner ?? "",
      financeOwner: order?.financeOwner ?? "赵财务",
      contractNo: order?.contractNo ?? "",
      statusLabel: this.billStatusLabel(bill.status),
      isAdjusted: Boolean(bill.adjustedAt || bill.adjustReason),
      paymentCount: bill.payments?.length ?? 0,
      latestPaymentAt: latestPayment?.paidAt ?? "",
      paymentVouchers,
      voucherCount: paymentVouchers.length,
      pendingVoucherCount,
      reconciledVoucherCount: paymentVouchers.filter(
        (voucher: Record<string, any>) => voucher.status === "VERIFIED",
      ).length,
      daysOverdue,
      daysUntilDue: bill.debtAmount > 0 ? this.daysUntilDue(bill.dueDate) : 0,
      ageingBucket: ageingBucket.key,
      ageingBucketLabel: ageingBucket.label,
      ageingTone: ageingBucket.tone,
      collectionAction: approvalBlocked
        ? "待维修费用OA审批通过"
        : this.billCollectionAction(bill),
      collectionStatus:
        bill.collectionStatus ??
        (approvalBlocked ? "待OA审批" : daysOverdue > 0 ? "待催收" : "正常"),
      followUpCount: followUpLogs.length,
      lastFollowUpAt: lastFollowUp?.createdAt ?? "",
      nextFollowUpAt: bill.nextFollowUpAt ?? "",
      promisedPayAt: bill.promisedPayAt ?? "",
      canConfirm: bill.status === BillStatus.PendingConfirm && !approvalBlocked,
      canRegisterPayment:
        bill.status !== BillStatus.PendingConfirm &&
        bill.status !== BillStatus.Settled &&
        bill.status !== BillStatus.Voided &&
        bill.debtAmount > 0,
      canFollowUp:
        bill.status !== BillStatus.PendingConfirm &&
        bill.status !== BillStatus.Settled &&
        bill.status !== BillStatus.Voided &&
        bill.debtAmount > 0,
      canSubmitVoucher:
        bill.status !== BillStatus.PendingConfirm &&
        bill.status !== BillStatus.Settled &&
        bill.status !== BillStatus.Voided &&
        bill.debtAmount > 0,
      canReconcile: pendingVoucherCount > 0,
    };
  }

  private syncOrderFinance(orderNo: string, touch = true) {
    const order = this.orders.find((item) => item.orderNo === orderNo);
    if (!order) return;

    const bills = this.bills.filter((bill) => bill.orderNo === orderNo);
    bills.forEach((bill) =>
      this.normalizeBillStatus(bill as Record<string, any>),
    );
    order.receivableAmount = bills.reduce(
      (total, bill) => total + Number(bill.receivableAmount || 0),
      0,
    );
    order.paidAmount = bills.reduce(
      (total, bill) => total + Number(bill.paidAmount || 0),
      0,
    );
    order.debtAmount = bills.reduce(
      (total, bill) => total + Number(bill.debtAmount || 0),
      0,
    );
    order.overdueAmount = bills
      .filter((bill) => bill.status === BillStatus.Overdue)
      .reduce((total, bill) => total + Number(bill.debtAmount || 0), 0);
    order.currentPeriod = bills.at(-1)?.period ?? order.currentPeriod;
    if (touch) order.updatedAt = this.nowText();
  }

  private markOverdueBills(asOfDate = this.dateText(), operator = "系统自动任务") {
    const markedBills: Record<string, any>[] = [];
    this.bills.forEach((bill) => {
      const previousStatus = bill.status;
      this.normalizeBillStatus(bill as Record<string, any>);
      if (
        previousStatus !== BillStatus.Overdue &&
        bill.status !== BillStatus.PendingConfirm &&
        bill.status !== BillStatus.Settled &&
        bill.status !== BillStatus.Voided &&
        Number(bill.debtAmount || 0) > 0 &&
        String(bill.dueDate || "") < asOfDate
      ) {
        bill.status = BillStatus.Overdue;
        bill.overdueMarkedAt = this.nowText();
        bill.overdueMarkedBy = operator;
        this.appendBillLog(
          bill as Record<string, any>,
          "标记逾期",
          operator,
          `${bill.dueDate} 已超过最晚付款日，后台任务标记为逾期。`,
        );
        markedBills.push(this.enrichBill(bill as Record<string, any>));
      }
      this.syncOrderFinance(bill.orderNo, false);
    });
    return {
      markedCount: markedBills.length,
      markedBills,
    };
  }

  runFinanceScheduler(
    body: {
      asOfDate?: string;
      operator?: string;
      trigger?: string;
      persist?: boolean;
    } = {},
  ) {
    const asOfDate = body.asOfDate || this.dateText();
    const operator = body.operator || "系统自动任务";
    const trigger = body.trigger || "MANUAL";
    const generated = this.generateDueBills(
      { asOfDate, operator },
      { skipPermission: true, skipOverdueMark: true, skipPersist: true },
    );
    const overdue = this.markOverdueBills(asOfDate, operator);
    const result = {
      ok: true,
      trigger,
      asOfDate,
      generatedCount: generated.generatedCount,
      skippedCount: generated.skippedCount,
      markedOverdueCount: overdue.markedCount,
      generatedBills: generated.generatedBills,
      skippedOrders: generated.skippedOrders,
      markedOverdueBills: overdue.markedBills,
      ranAt: this.nowText(),
    };
    if (body.persist !== false) {
      this.automationState.runCount =
        Number(this.automationState.runCount || 0) + 1;
      this.automationState.lastRunAt = result.ranAt;
      this.automationState.nextRunAt = this.addMinutesText(
        result.ranAt,
        Math.ceil(this.automationIntervalMs / 60000),
      );
      this.automationState.lastResult = result;
      this.persistMockState();
    }
    return result;
  }

  getFinanceScheduler() {
    return {
      ...this.automationState,
      jobName: "finance-monthly-billing-and-overdue-marking",
      cronText: "后台每隔数分钟自动检查：到达账单日则生成月度账单，超过最晚付款日则标记逾期。",
      nextRunAt:
        this.automationState.nextRunAt ||
        this.addMinutesText(
          this.nowText(),
          Math.ceil(this.automationIntervalMs / 60000),
        ),
    };
  }

  getFinanceOverview() {
    const bills = this.getBills();
    const receivableTotal = bills.reduce(
      (total, bill) => total + Number(bill.receivableAmount || 0),
      0,
    );
    const paidTotal = bills.reduce(
      (total, bill) => total + Number(bill.paidAmount || 0),
      0,
    );
    const debtTotal = bills.reduce(
      (total, bill) => total + Number(bill.debtAmount || 0),
      0,
    );
    const overdueTotal = bills
      .filter((bill) => bill.status === BillStatus.Overdue)
      .reduce((total, bill) => total + Number(bill.debtAmount || 0), 0);
    const customerDebts = bills.reduce<Record<string, number>>((acc, bill) => {
      acc[bill.customerName] =
        (acc[bill.customerName] ?? 0) + Number(bill.debtAmount || 0);
      return acc;
    }, {});
    const agingSeed = [
      { key: "PENDING_CONFIRM", label: "待确认", amount: 0, count: 0 },
      { key: "NOT_DUE", label: "未到期", amount: 0, count: 0 },
      { key: "DUE_1_7", label: "逾期1-7天", amount: 0, count: 0 },
      { key: "DUE_8_30", label: "逾期8-30天", amount: 0, count: 0 },
      { key: "DUE_30_PLUS", label: "逾期30天以上", amount: 0, count: 0 },
      { key: "SETTLED", label: "已结清", amount: 0, count: 0 },
    ];
    const agingMap = new Map(agingSeed.map((item) => [item.key, item]));
    bills.forEach((bill) => {
      const bucket = agingMap.get(bill.ageingBucket);
      if (!bucket) return;
      bucket.count += 1;
      bucket.amount += Number(bill.debtAmount || 0);
    });
    const periodSummary = bills.reduce<
      Record<
        string,
        { period: string; receivable: number; paid: number; debt: number }
      >
    >((acc, bill) => {
      const period = bill.period || "未分期";
      acc[period] = acc[period] ?? { period, receivable: 0, paid: 0, debt: 0 };
      acc[period].receivable += Number(bill.receivableAmount || 0);
      acc[period].paid += Number(bill.paidAmount || 0);
      acc[period].debt += Number(bill.debtAmount || 0);
      return acc;
    }, {});
    const collectionTasks = bills
      .filter(
        (bill) =>
          bill.debtAmount > 0 &&
          ![BillStatus.PendingConfirm, BillStatus.Voided].includes(
            bill.status as any,
          ),
      )
      .sort((a, b) => {
        const overdueDiff =
          Number(b.daysOverdue || 0) - Number(a.daysOverdue || 0);
        if (overdueDiff !== 0) return overdueDiff;
        return Number(b.debtAmount || 0) - Number(a.debtAmount || 0);
      })
      .slice(0, 8)
      .map((bill) => ({
        id: bill.id,
        billNo: bill.billNo,
        customerName: bill.customerName,
        orderNo: bill.orderNo,
        dueDate: bill.dueDate,
        debtAmount: bill.debtAmount,
        status: bill.status,
        statusLabel: bill.statusLabel,
        daysOverdue: bill.daysOverdue,
        nextFollowUpAt: bill.nextFollowUpAt,
        lastFollowUpAt: bill.lastFollowUpAt,
        collectionStatus: bill.collectionStatus,
        collectionAction: bill.collectionAction,
        contactPhone: bill.contactPhone,
      }));

    return {
      receivableTotal,
      paidTotal,
      debtTotal,
      overdueTotal,
      collectionRate:
        receivableTotal > 0
          ? Math.round((paidTotal / receivableTotal) * 100)
          : 0,
      pendingConfirmCount: bills.filter(
        (bill) => bill.status === BillStatus.PendingConfirm,
      ).length,
      pendingPaymentCount: bills.filter((bill) =>
        [BillStatus.PendingPayment, BillStatus.PartiallyPaid].includes(
          bill.status as any,
        ),
      ).length,
      overdueCount: bills.filter((bill) => bill.status === BillStatus.Overdue)
        .length,
      dueSoonCount: bills.filter(
        (bill) =>
          bill.debtAmount > 0 &&
          bill.daysUntilDue > 0 &&
          bill.daysUntilDue <= 2 &&
          bill.status !== BillStatus.PendingConfirm,
      ).length,
      dueSoonTotal: bills
        .filter(
          (bill) =>
            bill.debtAmount > 0 &&
            bill.daysUntilDue > 0 &&
            bill.daysUntilDue <= 2 &&
            bill.status !== BillStatus.PendingConfirm,
        )
        .reduce((total, bill) => total + Number(bill.debtAmount || 0), 0),
      unpaidCustomerCount: Object.values(customerDebts).filter(
        (amount) => amount > 0,
      ).length,
      customerDebts: Object.entries(customerDebts)
        .map(([customerName, amount]) => ({ customerName, amount }))
        .sort((a, b) => b.amount - a.amount),
      agingBuckets: agingSeed,
      periodSummary: Object.values(periodSummary).sort((a, b) =>
        a.period.localeCompare(b.period),
      ),
      collectionTasks,
    };
  }

  getFinanceReconciliation() {
    const records = this.getBills()
      .flatMap((bill) =>
        (bill.paymentVouchers ?? []).map((voucher: Record<string, any>) => ({
          id: voucher.id,
          voucherId: voucher.id,
          billId: bill.id,
          billNo: bill.billNo,
          orderNo: bill.orderNo,
          customerName: bill.customerName,
          period: bill.period,
          amount: Number(voucher.amount || 0),
          paidAt: voucher.paidAt,
          method: voucher.method,
          payerName: voucher.payerName,
          bankName: voucher.bankName,
          voucherNo: voucher.voucherNo,
          attachmentName: voucher.attachmentName,
          attachmentUrl: voucher.attachmentUrl,
          uploadedAt: voucher.uploadedAt,
          uploadedBy: voucher.uploadedBy,
          uploadedByType: voucher.uploadedByType,
          status: voucher.status,
          statusLabel:
            voucher.status === "VERIFIED"
              ? "已对账"
              : voucher.status === "REJECTED"
                ? "已驳回"
                : "待对账",
          reconciledAt: voucher.reconciledAt,
          reconciledBy: voucher.reconciledBy,
          reconciliationRemark: voucher.reconciliationRemark,
          paymentNo: voucher.paymentNo,
          billDebtAmount: bill.debtAmount,
          billStatus: bill.status,
          billStatusLabel: bill.statusLabel,
          canReconcile: voucher.status === "PENDING",
        })),
      )
      .sort((a, b) =>
        String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")),
      );

    return {
      summary: {
        totalCount: records.length,
        pendingCount: records.filter((item) => item.status === "PENDING").length,
        verifiedCount: records.filter((item) => item.status === "VERIFIED").length,
        rejectedCount: records.filter((item) => item.status === "REJECTED").length,
        pendingAmount: records
          .filter((item) => item.status === "PENDING")
          .reduce((total, item) => total + Number(item.amount || 0), 0),
        verifiedAmount: records
          .filter((item) => item.status === "VERIFIED")
          .reduce((total, item) => total + Number(item.amount || 0), 0),
      },
      records,
    };
  }

  private financeRiskFromTotals(summary: {
    overdueTotal: number;
    maxDaysOverdue: number;
    debtTotal: number;
    pendingConfirmCount: number;
  }) {
    if (summary.overdueTotal > 0 || summary.maxDaysOverdue > 0) {
      return summary.maxDaysOverdue >= 30
        ? { level: "HIGH", label: "高风险", sort: 3 }
        : { level: "OVERDUE", label: "已逾期", sort: 2 };
    }
    if (summary.debtTotal > 0 || summary.pendingConfirmCount > 0) {
      return { level: "WATCH", label: "待跟进", sort: 1 };
    }
    return { level: "NORMAL", label: "正常", sort: 0 };
  }

  private buildFinanceCustomerRecords(): Array<Record<string, any>> {
    const bills = this.getBills();
    const customerMap = new Map<string, Record<string, any>>();
    const ensureCustomer = (key: string, seed: Record<string, any> = {}) => {
      const safeKey = key || seed.customerName || "UNKNOWN";
      if (!customerMap.has(safeKey)) {
        customerMap.set(safeKey, {
          customerId: safeKey,
          customerName: seed.customerName || safeKey,
          customerShortName:
            seed.customerShortName || seed.customerName || safeKey,
          customerContact: seed.customerContact || "",
          contactPhone: seed.contactPhone || "",
          region: seed.region || "",
          salesOwner: seed.salesOwner || "",
          financeOwner: seed.financeOwner || "赵财务",
          orders: [],
          bills: [],
        });
      }

      const customer = customerMap.get(safeKey)!;
      [
        "customerName",
        "customerShortName",
        "customerContact",
        "contactPhone",
        "region",
        "salesOwner",
        "financeOwner",
      ].forEach((field) => {
        if (!customer[field] && seed[field]) customer[field] = seed[field];
      });
      return customer;
    };

    this.orders.forEach((order) => {
      const key = order.customerId || order.customerName;
      const customer = ensureCustomer(key, order);
      if (
        !customer.orders.some(
          (item: Record<string, any>) => item.id === order.id,
        )
      ) {
        customer.orders.push({
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          leaseStart: order.leaseStart,
          leaseEnd: order.leaseEnd,
          billingDay: order.billingDay,
          monthlyRent: order.monthlyRent,
          depositAmount: order.depositAmount,
          orderedBatteryCount: order.orderedBatteryCount,
          batteryCount: order.batteryCount,
          outboundProgress: order.outboundProgress,
          receivableAmount: order.receivableAmount,
          paidAmount: order.paidAmount,
          debtAmount: order.debtAmount,
          overdueAmount: order.overdueAmount,
          nextBillingDate: order.nextBillingDate,
          contractNo: order.contractNo,
          financeOwner: order.financeOwner,
          salesOwner: order.salesOwner,
        });
      }
    });

    bills.forEach((bill) => {
      const order = this.orders.find((item) => item.orderNo === bill.orderNo);
      const key = order?.customerId || bill.customerName;
      ensureCustomer(key, {
        customerName: bill.customerName,
        customerShortName: bill.customerShortName,
        customerContact: bill.customerContact,
        contactPhone: bill.contactPhone,
        region: order?.region,
        salesOwner: bill.salesOwner,
        financeOwner: bill.financeOwner,
      }).bills.push(bill);
    });

    return [...customerMap.values()]
      .map((customer) => {
        const customerBills = customer.bills as Record<string, any>[];
        const customerOrders = customer.orders as Record<string, any>[];
        const receivableTotal = customerBills.reduce(
          (total, bill) => total + Number(bill.receivableAmount || 0),
          0,
        );
        const paidTotal = customerBills.reduce(
          (total, bill) => total + Number(bill.paidAmount || 0),
          0,
        );
        const debtTotal = customerBills.reduce(
          (total, bill) => total + Number(bill.debtAmount || 0),
          0,
        );
        const overdueBills = customerBills.filter(
          (bill) => bill.status === BillStatus.Overdue,
        );
        const overdueTotal = overdueBills.reduce(
          (total, bill) => total + Number(bill.debtAmount || 0),
          0,
        );
        const pendingConfirmCount = customerBills.filter(
          (bill) => bill.status === BillStatus.PendingConfirm,
        ).length;
        const unsettledBillCount = customerBills.filter(
          (bill) => bill.debtAmount > 0 && bill.status !== BillStatus.Voided,
        ).length;
        const maxDaysOverdue = overdueBills.reduce(
          (max, bill) => Math.max(max, Number(bill.daysOverdue || 0)),
          0,
        );
        const risk = this.financeRiskFromTotals({
          overdueTotal,
          maxDaysOverdue,
          debtTotal,
          pendingConfirmCount,
        });
        const sortedBills = [...customerBills].sort((a, b) =>
          String(b.dueDate || "").localeCompare(String(a.dueDate || "")),
        );
        const followUpBills = customerBills
          .filter(
            (bill) =>
              bill.debtAmount > 0 && bill.status !== BillStatus.PendingConfirm,
          )
          .sort((a, b) => {
            const overdueDiff =
              Number(b.daysOverdue || 0) - Number(a.daysOverdue || 0);
            if (overdueDiff !== 0) return overdueDiff;
            return Number(b.debtAmount || 0) - Number(a.debtAmount || 0);
          });
        const payments = customerBills
          .flatMap((bill) =>
            (bill.payments ?? []).map((payment: Record<string, any>) => ({
              ...payment,
              billId: bill.id,
              billNo: bill.billNo,
              period: bill.period,
            })),
          )
          .sort((a, b) =>
            String(b.paidAt || "").localeCompare(String(a.paidAt || "")),
          );
        const paymentVouchers = customerBills
          .flatMap((bill) =>
            (bill.paymentVouchers ?? []).map((voucher: Record<string, any>) => ({
              ...voucher,
              billId: bill.id,
              billNo: bill.billNo,
              period: bill.period,
              billStatus: bill.status,
              billDebtAmount: bill.debtAmount,
            })),
          )
          .sort((a, b) =>
            String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")),
          );
        const followUpLogs = customerBills
          .flatMap((bill) =>
            (bill.followUpLogs ?? []).map((log: Record<string, any>) => ({
              ...log,
              billId: bill.id,
              billNo: bill.billNo,
              period: bill.period,
              debtAmount: bill.debtAmount,
            })),
          )
          .sort((a, b) =>
            String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
          );

        return {
          ...customer,
          receivableTotal,
          paidTotal,
          debtTotal,
          overdueTotal,
          billCount: customerBills.length,
          orderCount: customerOrders.length,
          activeOrderCount: customerOrders.filter((order) =>
            [
              OrderStatus.Leasing,
              OrderStatus.PendingOutbound,
              OrderStatus.PartiallyOutbound,
              OrderStatus.PendingReceipt,
            ].includes(order.status as any),
          ).length,
          batteryCount: customerOrders.reduce(
            (total, order) => total + Number(order.batteryCount || 0),
            0,
          ),
          pendingConfirmCount,
          unsettledBillCount,
          overdueBillCount: overdueBills.length,
          maxDaysOverdue,
          collectionRate:
            receivableTotal > 0
              ? Math.round((paidTotal / receivableTotal) * 100)
              : 0,
          latestBillPeriod: sortedBills[0]?.period ?? "",
          latestDueDate: sortedBills[0]?.dueDate ?? "",
          nextFollowUpAt:
            followUpBills
              .map((bill) => bill.nextFollowUpAt)
              .filter(Boolean)
              .sort()[0] ?? "",
          collectionAction:
            followUpBills[0]?.collectionAction ||
            (pendingConfirmCount > 0 ? "先确认待出账单" : "正常维护"),
          riskLevel: risk.level,
          riskLabel: risk.label,
          riskSort: risk.sort,
          payments,
          paymentVouchers,
          pendingVoucherCount: paymentVouchers.filter(
            (voucher: Record<string, any>) => voucher.status === "PENDING",
          ).length,
          followUpLogs,
        };
      })
      .sort((a, b) => {
        const riskDiff = Number(b.riskSort || 0) - Number(a.riskSort || 0);
        if (riskDiff !== 0) return riskDiff;
        return Number(b.debtTotal || 0) - Number(a.debtTotal || 0);
      });
  }

  getFinanceCustomers() {
    return this.buildFinanceCustomerRecords().map((customer) => {
      const {
        bills: _bills,
        orders: _orders,
        payments: _payments,
        paymentVouchers: _paymentVouchers,
        followUpLogs: _logs,
        ...row
      } = customer;
      return row;
    });
  }

  getFinanceCustomer(id: string) {
    const decodedId = decodeURIComponent(id);
    const customer = this.buildFinanceCustomerRecords().find(
      (item) =>
        item.customerId === decodedId ||
        item.customerName === decodedId ||
        item.customerShortName === decodedId,
    );
    if (!customer) throw new NotFoundException("客户财务档案不存在");
    return customer;
  }

  getBills() {
    return this.bills.map((bill, index) =>
      this.enrichBill(bill as Record<string, any>, index),
    );
  }

  getBill(id: string) {
    return this.enrichBill(this.findBill(id));
  }

  confirmBill(id: string, body?: { operator?: string }) {
    const bill = this.findBill(id);
    const operator = body?.operator || "赵财务";
    this.assertPermission({ ...(body ?? {}), operator }, "bill.confirm", operator);
    if (bill.status === BillStatus.Voided) {
      throw new BadRequestException("已作废账单不能确认");
    }
    if (
      bill.sourceType === "REPAIR_COST" &&
      bill.approvalStatus &&
      bill.approvalStatus !== ApprovalStatus.Approved
    ) {
      throw new BadRequestException("维修费用OA审批通过后才能确认账单");
    }
    if (!bill.confirmedAt) {
      bill.confirmedAt = this.nowText();
      this.appendBillLog(bill, "确认账单", operator, "账单已确认并对客户可见");
    }
    this.normalizeBillStatus(bill);
    this.syncOrderFinance(bill.orderNo);
    this.persistMockState();
    return this.enrichBill(bill);
  }

  adjustBill(
    id: string,
    body: { receivableAmount: number; reason: string; operator?: string },
  ) {
    const bill = this.findBill(id);
    const receivableAmount = Number(body.receivableAmount);
    const reason = body.reason?.trim();
    const operator = body.operator || "赵财务";
    this.assertPermission({ ...body, operator }, "bill.adjust", operator);

    if (bill.status === BillStatus.Voided) {
      throw new BadRequestException("已作废账单不能调整");
    }
    if (!Number.isFinite(receivableAmount) || receivableAmount <= 0) {
      throw new BadRequestException("调整后的应收金额必须大于 0");
    }
    if (!reason) {
      throw new BadRequestException("调整账单必须填写调整原因");
    }
    if (receivableAmount < Number(bill.paidAmount || 0)) {
      throw new BadRequestException("调整后的应收金额不能小于已收金额");
    }

    const beforeAmount = Number(bill.receivableAmount || 0);
    bill.receivableAmount = receivableAmount;
    bill.debtAmount = Math.max(
      receivableAmount - Number(bill.paidAmount || 0),
      0,
    );
    bill.adjustReason = reason;
    bill.adjustedAt = this.nowText();
    bill.adjustedBy = operator;
    bill.adjustmentLogs = bill.adjustmentLogs ?? [];
    bill.adjustmentLogs.unshift({
      beforeAmount,
      afterAmount: receivableAmount,
      reason,
      operator,
      adjustedAt: bill.adjustedAt,
    });
    this.normalizeBillStatus(bill);
    this.appendBillLog(bill, "调整账单", operator, reason, {
      beforeAmount,
      afterAmount: receivableAmount,
    });
    this.syncOrderFinance(bill.orderNo);
    this.persistMockState();
    return this.enrichBill(bill);
  }

  registerPayment(
    id: string,
    body: {
      amount: number;
      paidAt?: string;
      method?: string;
      remark?: string;
      operator?: string;
      voucherNo?: string;
      payerName?: string;
      payerAccount?: string;
      bankName?: string;
      attachmentName?: string;
      attachmentUrl?: string;
      attachmentSize?: number;
    },
  ) {
    const bill = this.findBill(id);
    const amount = Number(body.amount);
    const operator = body.operator || "赵财务";
    this.assertPermission({ ...body, operator }, "bill.payment", operator);

    if (bill.status === BillStatus.PendingConfirm) {
      throw new BadRequestException("待确认账单不能登记回款");
    }
    if (bill.status === BillStatus.Voided) {
      throw new BadRequestException("已作废账单不能登记回款");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("回款金额必须大于 0");
    }
    if (amount > Number(bill.debtAmount || 0)) {
      throw new BadRequestException("回款金额不能大于当前欠款");
    }

    const payment: Record<string, any> = {
      paymentNo: `PAY${Date.now()}`,
      amount,
      paidAt: body.paidAt || this.nowText(),
      method: body.method || "银行转账",
      remark: body.remark || "财务登记回款",
      operator,
      voucherNo: body.voucherNo || "",
      payerName: body.payerName || bill.customerName,
      payerAccount: body.payerAccount || "",
      bankName: body.bankName || "",
      attachmentName: body.attachmentName || "",
      attachmentUrl: body.attachmentUrl || "",
      attachmentSize: Number(body.attachmentSize || 0),
      reconciliationStatus: "VERIFIED",
      reconciledAt: this.nowText(),
      reconciledBy: operator,
    };
    const voucher = {
      id: `voucher-${Date.now()}`,
      voucherNo: payment.voucherNo || payment.paymentNo,
      amount,
      paidAt: payment.paidAt,
      method: payment.method,
      payerName: payment.payerName,
      payerAccount: payment.payerAccount,
      bankName: payment.bankName,
      attachmentName: payment.attachmentName || "财务登记付款凭证",
      attachmentUrl: payment.attachmentUrl,
      attachmentSize: payment.attachmentSize,
      remark: payment.remark,
      uploadedAt: this.nowText(),
      uploadedBy: operator,
      uploadedByType: "FINANCE",
      status: "VERIFIED",
      reconciliationStatus: "VERIFIED",
      reconciledAt: payment.reconciledAt,
      reconciledBy: operator,
      reconciliationRemark: "财务登记回款时同步对账入账",
      paymentNo: payment.paymentNo,
    };
    payment.voucherId = voucher.id;
    bill.payments = bill.payments ?? [];
    bill.paymentVouchers = bill.paymentVouchers ?? [];
    bill.payments.push(payment);
    bill.paymentVouchers.unshift(voucher);
    bill.paidAmount = Number(bill.paidAmount || 0) + amount;
    bill.debtAmount = Math.max(
      Number(bill.receivableAmount || 0) - Number(bill.paidAmount || 0),
      0,
    );
    this.normalizeBillStatus(bill);
    this.appendBillLog(
      bill,
      "登记回款",
      operator,
      `${payment.method}回款 ${amount} 元`,
      payment,
    );
    this.syncOrderFinance(bill.orderNo);
    this.persistMockState();
    return this.enrichBill(bill);
  }

  submitPaymentVoucher(
    id: string,
    body: {
      amount: number;
      paidAt?: string;
      method?: string;
      voucherNo?: string;
      payerName?: string;
      payerAccount?: string;
      bankName?: string;
      attachmentName?: string;
      attachmentUrl?: string;
      attachmentSize?: number;
      remark?: string;
      operator?: string;
    },
    auth?: MockAuthContext,
  ) {
    const bill = this.findBill(id);
    const order = this.orders.find((item) => item.orderNo === bill.orderNo);
    const amount = Number(body.amount);
    const operator = auth?.name || body.operator || "客户";

    if (auth?.accountType === "CUSTOMER") {
      if (order?.customerName !== auth.customerName) {
        throw new ForbiddenException("只能提交本公司账单的付款凭证");
      }
    } else {
      this.assertPermission(
        { ...body, actorId: auth?.accountId, operator },
        "bill.voucher",
        operator,
      );
    }

    if (bill.status === BillStatus.PendingConfirm) {
      throw new BadRequestException("待确认账单不能提交付款凭证");
    }
    if (bill.status === BillStatus.Settled || Number(bill.debtAmount || 0) <= 0) {
      throw new BadRequestException("已结清账单不需要提交付款凭证");
    }
    if (bill.status === BillStatus.Voided) {
      throw new BadRequestException("已作废账单不能提交付款凭证");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("凭证金额必须大于 0");
    }
    if (amount > Number(bill.debtAmount || 0)) {
      throw new BadRequestException("凭证金额不能大于当前欠款");
    }

    const voucher = {
      id: `voucher-${Date.now()}`,
      voucherNo: body.voucherNo || `VOU${Date.now()}`,
      amount,
      paidAt: body.paidAt || this.nowText(),
      method: body.method || "银行转账",
      payerName: body.payerName || order?.customerName || bill.customerName,
      payerAccount: body.payerAccount || "",
      bankName: body.bankName || "",
      attachmentName: body.attachmentName || "",
      attachmentUrl: body.attachmentUrl || "",
      attachmentSize: Number(body.attachmentSize || 0),
      remark: body.remark || "",
      uploadedAt: this.nowText(),
      uploadedBy: operator,
      uploadedByType: auth?.accountType === "CUSTOMER" ? "CUSTOMER" : "FINANCE",
      status: "PENDING",
      reconciliationStatus: "PENDING",
      reconciledAt: "",
      reconciledBy: "",
      reconciliationRemark: "",
      paymentNo: "",
    };

    bill.paymentVouchers = bill.paymentVouchers ?? [];
    bill.paymentVouchers.unshift(voucher);
    bill.collectionStatus = "待对账";
    this.appendBillLog(
      bill,
      "提交付款凭证",
      operator,
      `${voucher.voucherNo} 金额 ${amount} 元，待财务对账。`,
      voucher,
    );
    this.persistMockState();
    return this.enrichBill(bill);
  }

  reconcilePaymentVoucher(
    id: string,
    voucherId: string,
    body: {
      action?: "APPROVE" | "REJECT";
      remark?: string;
      operator?: string;
    } = {},
    auth?: MockAuthContext,
  ) {
    const bill = this.findBill(id);
    const operator = auth?.name || body.operator || "财务";
    this.assertPermission(
      { ...body, actorId: auth?.accountId, operator },
      "bill.reconcile",
      operator,
    );
    const voucher = (bill.paymentVouchers ?? []).find(
      (item: Record<string, any>) => item.id === voucherId,
    );
    if (!voucher) throw new NotFoundException("付款凭证不存在");
    if (voucher.status === "VERIFIED" && voucher.paymentNo) {
      return this.enrichBill(bill);
    }

    if (body.action === "REJECT") {
      voucher.status = "REJECTED";
      voucher.reconciliationStatus = "REJECTED";
      voucher.reconciledAt = this.nowText();
      voucher.reconciledBy = operator;
      voucher.reconciliationRemark = body.remark || "凭证未通过对账";
      this.appendBillLog(
        bill,
        "驳回付款凭证",
        operator,
        voucher.reconciliationRemark,
        voucher,
      );
      this.persistMockState();
      return this.enrichBill(bill);
    }

    const amount = Number(voucher.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("凭证金额无效，不能入账");
    }
    if (amount > Number(bill.debtAmount || 0)) {
      throw new BadRequestException("凭证金额不能大于当前欠款");
    }

    const payment: Record<string, any> = {
      paymentNo: `PAY${Date.now()}`,
      amount,
      paidAt: voucher.paidAt || this.nowText(),
      method: voucher.method || "银行转账",
      remark: body.remark || voucher.remark || "付款凭证对账入账",
      operator,
      voucherId: voucher.id,
      voucherNo: voucher.voucherNo,
      payerName: voucher.payerName,
      payerAccount: voucher.payerAccount,
      bankName: voucher.bankName,
      attachmentName: voucher.attachmentName,
      attachmentUrl: voucher.attachmentUrl,
      attachmentSize: Number(voucher.attachmentSize || 0),
      reconciliationStatus: "VERIFIED",
      reconciledAt: this.nowText(),
      reconciledBy: operator,
    };
    voucher.status = "VERIFIED";
    voucher.reconciliationStatus = "VERIFIED";
    voucher.reconciledAt = payment.reconciledAt;
    voucher.reconciledBy = operator;
    voucher.reconciliationRemark = payment.remark;
    voucher.paymentNo = payment.paymentNo;

    bill.payments = bill.payments ?? [];
    bill.payments.push(payment);
    bill.paidAmount = Number(bill.paidAmount || 0) + amount;
    bill.debtAmount = Math.max(
      Number(bill.receivableAmount || 0) - Number(bill.paidAmount || 0),
      0,
    );
    this.normalizeBillStatus(bill);
    this.appendBillLog(
      bill,
      "付款凭证对账入账",
      operator,
      `${voucher.voucherNo} 已对账，通过后入账 ${amount} 元。`,
      { voucher, payment },
    );
    this.syncOrderFinance(bill.orderNo);
    this.persistMockState();
    return this.enrichBill(bill);
  }

  followUpBill(
    id: string,
    body: {
      method?: string;
      result?: string;
      promisedPayAt?: string;
      nextFollowUpAt?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    const bill = this.findBill(id);
    const operator = body.operator || "赵财务";
    this.assertPermission({ ...body, operator }, "bill.payment", operator);

    if (bill.status === BillStatus.PendingConfirm) {
      throw new BadRequestException("待确认账单不能登记催收跟进");
    }
    if (bill.status === BillStatus.Settled) {
      throw new BadRequestException("已结清账单不需要催收跟进");
    }
    if (bill.status === BillStatus.Voided) {
      throw new BadRequestException("已作废账单不能登记催收跟进");
    }

    const method = String(body.method ?? "").trim() || "电话";
    const result = String(body.result ?? "").trim() || "已联系客户";
    const now = this.nowText();
    const followUp = {
      id: `follow-${Date.now()}`,
      createdAt: now,
      method,
      result,
      promisedPayAt: body.promisedPayAt || "",
      nextFollowUpAt:
        body.nextFollowUpAt || this.addDaysText(this.dateText(), 2),
      remark: body.remark || "",
      operator,
    };

    bill.followUpLogs = bill.followUpLogs ?? [];
    bill.followUpLogs.unshift(followUp);
    bill.collectionStatus = followUp.promisedPayAt ? "已承诺付款" : "已跟进";
    bill.lastFollowUpAt = now;
    bill.nextFollowUpAt = followUp.nextFollowUpAt;
    bill.promisedPayAt = followUp.promisedPayAt;
    this.appendBillLog(
      bill,
      "催收跟进",
      operator,
      `${method}：${result}${followUp.promisedPayAt ? `，承诺 ${followUp.promisedPayAt} 付款` : ""}`,
      followUp,
    );
    this.persistMockState();
    return this.enrichBill(bill);
  }

  generateDueBills(
    body: { asOfDate?: string; operator?: string } = {},
    options: {
      skipPermission?: boolean;
      skipOverdueMark?: boolean;
      skipPersist?: boolean;
    } = {},
  ) {
    const asOfDate = body.asOfDate || this.dateText();
    const operator = body.operator || "赵财务";
    if (!options.skipPermission) {
      this.assertPermission(
        { ...(body as Record<string, any>), operator },
        "bill.confirm",
        operator,
      );
    }
    const activeStatuses = [
      OrderStatus.Leasing,
      OrderStatus.PendingOutbound,
      OrderStatus.PartiallyOutbound,
      OrderStatus.PendingReceipt,
    ];
    const generatedBills: Record<string, any>[] = [];
    const skippedOrders: Array<{ orderNo: string; reason: string }> = [];

    this.orders
      .filter((order) => activeStatuses.includes(order.status as any))
      .forEach((order) => {
        const nextBillingDate = String(order.nextBillingDate || "");
        if (!nextBillingDate) {
          skippedOrders.push({
            orderNo: order.orderNo,
            reason: "未配置下次账单日",
          });
          return;
        }
        if (nextBillingDate > asOfDate) {
          skippedOrders.push({ orderNo: order.orderNo, reason: "未到账单日" });
          return;
        }

        const period = this.monthText(nextBillingDate);
        const duplicated = this.bills.some(
          (bill) => bill.orderNo === order.orderNo && bill.period === period,
        );
        if (duplicated) {
          skippedOrders.push({
            orderNo: order.orderNo,
            reason: `${period} 账期已存在`,
          });
          return;
        }

        const suffix = `${String(Date.now()).slice(-8)}${String(
          generatedBills.length + 1,
        ).padStart(2, "0")}`;
        const receivableAmount = Number(order.monthlyRent || 0);
        const bill: Record<string, any> = {
          id: `bill-${suffix}`,
          billNo: `BILL${suffix}`,
          customerName: order.customerName,
          orderNo: order.orderNo,
          period,
          receivableAmount,
          paidAmount: 0,
          debtAmount: receivableAmount,
          status: BillStatus.PendingConfirm,
          generatedAt: nextBillingDate,
          dueDate: this.addDaysText(nextBillingDate, 7),
          confirmedAt: "",
          adjustReason: "",
          payments: [],
          operationLogs: [
            {
              time: this.nowText(),
              operator,
              action: "自动生成账单",
              remark: "按订单账单日批量生成月度应收账单。",
            },
          ],
        };

        this.bills.push(bill);
        order.nextBillingDate = this.billingDateFrom(
          nextBillingDate,
          order.billingDay,
          1,
        );
        order.updatedAt = this.nowText();
        this.appendOrderEvent(
          order,
          "自动生成月度账单",
          `${period} 账期应收 ${receivableAmount} 元，待财务确认。`,
        );
        this.syncOrderFinance(order.orderNo, false);
        generatedBills.push(this.enrichBill(bill));
      });

    const overdue = options.skipOverdueMark
      ? { markedCount: 0, markedBills: [] as Record<string, any>[] }
      : this.markOverdueBills(asOfDate, operator);

    if ((generatedBills.length || overdue.markedCount) && !options.skipPersist) {
      this.persistMockState();
    }

    return {
      asOfDate,
      generatedCount: generatedBills.length,
      skippedCount: skippedOrders.length,
      markedOverdueCount: overdue.markedCount,
      generatedBills,
      skippedOrders,
      markedOverdueBills: overdue.markedBills,
    };
  }

  private appendSystemOperationLog(
    log: Omit<SystemOperationLog, "id" | "createdAt" | "ip" | "result"> & {
      ip?: string;
      result?: "成功" | "失败";
    },
  ) {
    this.systemOperationLogs.unshift({
      id: `sys-log-${Date.now()}`,
      module: log.module,
      action: log.action,
      operator: log.operator,
      target: log.target,
      result: log.result ?? "成功",
      ip: log.ip ?? "10.0.0.11",
      createdAt: this.nowText(),
      detail: log.detail,
    });
    if (this.systemOperationLogs.length > 300) {
      this.systemOperationLogs.splice(300);
    }
    this.persistMockState();
  }

  private encodeBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private decodeBase64Url(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  private signAuthPayload(encodedPayload: string) {
    return createHmac("sha256", this.authSecret)
      .update(encodedPayload)
      .digest("base64url");
  }

  private assertAuthSignature(encodedPayload: string, signature: string) {
    const expected = Buffer.from(this.signAuthPayload(encodedPayload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }
  }

  private findSystemRole(id: string) {
    const role = this.systemRoles.find((item) => item.id === id);
    if (!role) throw new UnauthorizedException("账号角色不存在");
    return role;
  }

  private buildAuthContext(account: SystemAccount, tokenPayload?: any) {
    const role = this.findSystemRole(account.roleId);
    const permissions = role.permissions
      .filter((permission) => permission.enabled)
      .map((permission) => permission.code);
    const now = Math.floor(Date.now() / 1000);
    return {
      accountId: account.id,
      accountType: account.type,
      username: account.username,
      name: account.name,
      roleId: account.roleId,
      roleName: role.name,
      customerName: account.customerName,
      permissions,
      issuedAt: Number(tokenPayload?.iat ?? now),
      expiresAt: Number(tokenPayload?.exp ?? now + 8 * 60 * 60),
    } satisfies MockAuthContext;
  }

  private publicAuthProfile(auth: MockAuthContext) {
    return {
      accountId: auth.accountId,
      type: auth.accountType,
      username: auth.username,
      name: auth.name,
      roleId: auth.roleId,
      roleName: auth.roleName,
      customerName: auth.customerName,
      permissions: auth.permissions,
      isSystemAdmin: auth.accountType === "INTERNAL" && auth.roleId === "role-admin",
      expiresAt: auth.expiresAt * 1000,
    };
  }

  private issueAuthToken(account: SystemAccount) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + 8 * 60 * 60;
    const payload = {
      sub: account.id,
      type: account.type,
      iat: issuedAt,
      exp: expiresAt,
    };
    const encodedPayload = this.encodeBase64Url(JSON.stringify(payload));
    const token = `${encodedPayload}.${this.signAuthPayload(encodedPayload)}`;
    const auth = this.buildAuthContext(account, payload);
    return {
      token,
      tokenType: "Bearer",
      expiresAt: expiresAt * 1000,
      profile: this.publicAuthProfile(auth),
    };
  }

  private isInternalPasswordValid(account: SystemAccount, password: string) {
    if (password === this.internalDefaultPassword) return true;
    const temporary = this.temporaryAccountPasswords.get(account.id);
    if (!temporary) return false;
    if (temporary.expiresAt < Date.now()) {
      this.temporaryAccountPasswords.delete(account.id);
      return false;
    }
    return temporary.password === password;
  }

  loginInternalAccount(body: { username?: string; password?: string }) {
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const account = this.systemAccounts.find(
      (item) => item.type === "INTERNAL" && item.username === username,
    );

    if (
      !account ||
      account.status !== "ENABLED" ||
      !this.isInternalPasswordValid(account, password)
    ) {
      this.appendSystemOperationLog({
        module: "登录鉴权",
        action: "后台登录",
        operator: username || "未知账号",
        target: username || "内部后台",
        result: "失败",
        detail: "账号不存在、已停用或密码错误",
      });
      throw new UnauthorizedException("账号或密码不正确");
    }

    account.lastLoginAt = this.nowText();
    this.appendSystemOperationLog({
      module: "登录鉴权",
      action: "后台登录",
      operator: account.name,
      target: account.username,
      detail: `${account.roleName}登录后台成功`,
    });
    this.persistMockState();
    return this.issueAuthToken(account);
  }

  loginCustomerAccount(body: {
    phone?: string;
    username?: string;
    code?: string;
    role?: "admin" | "staff";
  }) {
    const accountKey = String(body.phone || body.username || "").trim();
    const code = String(body.code ?? "");
    const roleId =
      body.role === "staff" ? "role-customer-staff" : "role-customer-admin";
    const account = this.systemAccounts.find(
      (item) =>
        item.type === "CUSTOMER" &&
        item.roleId === roleId &&
        (item.phone === accountKey || item.username === accountKey),
    );

    if (!account || account.status !== "ENABLED" || code !== this.customerDefaultCode) {
      this.appendSystemOperationLog({
        module: "登录鉴权",
        action: "客户登录",
        operator: accountKey || "未知客户",
        target: accountKey || "客户移动端",
        result: "失败",
        detail: "客户账号不存在、已停用或验证码错误",
      });
      throw new UnauthorizedException("手机号或验证码不正确");
    }

    account.lastLoginAt = this.nowText();
    this.appendSystemOperationLog({
      module: "登录鉴权",
      action: "客户登录",
      operator: account.name,
      target: account.customerName || account.username,
      detail: `${account.roleName}登录客户移动端成功`,
    });
    this.persistMockState();
    return this.issueAuthToken(account);
  }

  verifyAuthToken(token?: string) {
    if (!token) throw new UnauthorizedException("请先登录");
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }
    this.assertAuthSignature(encodedPayload, signature);

    let payload: any;
    try {
      payload = JSON.parse(this.decodeBase64Url(encodedPayload));
    } catch {
      throw new UnauthorizedException("登录已失效，请重新登录");
    }
    if (Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("登录已过期，请重新登录");
    }

    const account = this.systemAccounts.find((item) => item.id === payload.sub);
    if (!account || account.status !== "ENABLED") {
      throw new UnauthorizedException("账号已停用或不存在");
    }
    if (payload.type !== account.type) {
      throw new UnauthorizedException("登录上下文不匹配");
    }
    return this.buildAuthContext(account, payload);
  }

  getAuthMe(auth: MockAuthContext) {
    return { profile: this.publicAuthProfile(auth) };
  }

  logoutAuth(auth: MockAuthContext) {
    this.appendSystemOperationLog({
      module: "登录鉴权",
      action: "退出登录",
      operator: auth.name,
      target: auth.username,
      detail: `${auth.roleName}退出系统`,
    });
    return { success: true };
  }

  private hasAnyPermission(auth: MockAuthContext, permissions: string[]) {
    return permissions.some((permission) => auth.permissions.includes(permission));
  }

  private normaliseMockRequestPath(path: string) {
    const withoutQuery = path.split("?")[0] || "/";
    return withoutQuery.replace(/^\/api\/mock/, "") || "/";
  }

  private resolveMockPermission(method: string, requestPath: string) {
    const path = this.normaliseMockRequestPath(requestPath);
    if (path.startsWith("/auth/")) return [];
    if (path === "/dashboard" || path === "/batteries") return [];

    if (path.startsWith("/customer")) {
      if (path === "/customer/home") return ["customer.order.read"];
      if (path.includes("/bills/") && path.includes("/payment-vouchers")) {
        return ["customer.bill.voucher"];
      }
      if (path.includes("/outbounds/") && method !== "GET") {
        return ["customer.receipt.confirm"];
      }
      if (path.includes("/repairs") || path === "/customer/repair") {
        return method === "GET"
          ? ["customer.order.read", "customer.repair.write"]
          : ["customer.repair.write"];
      }
      return ["customer.order.read"];
    }

    if (path.startsWith("/system/accounts")) return ["system.account.write"];
    if (path.startsWith("/system/roles")) return ["system.role.write"];
    if (path.startsWith("/system/interfaces")) return ["system.interface.write"];
    if (
      path.startsWith("/system/dictionaries") ||
      path.startsWith("/system/approval-flows") ||
      path.startsWith("/system/parameters") ||
      path.startsWith("/system/snapshot")
    ) {
      return ["system.role.write", "system.account.write"];
    }
    if (path === "/system") {
      return [
        "system.account.write",
        "system.role.write",
        "system.interface.write",
        "audit.read",
      ];
    }

    if (path.startsWith("/assets")) {
      if (path.includes("/outbound")) return ["asset.outbound"];
      if (path.includes("/dispose")) return ["asset.dispose"];
      if (path.includes("/repair-inbound")) return ["asset.repair_inbound"];
      return ["asset.write", "asset.outbound", "asset.repair_inbound", "asset.dispose"];
    }
    if (path.startsWith("/alarms")) return ["alarm.write"];
    if (path.startsWith("/repairs")) return ["repair.write"];
    if (path.startsWith("/orders")) {
      if (path.includes("/outbounds")) return ["asset.outbound"];
      if (path.includes("/bills")) return ["bill.confirm"];
      if (path.includes("/return-lease") || path.includes("/complete")) {
        return ["asset.outbound"];
      }
      if (path.includes("/settle-return")) return ["bill.payment"];
      if (path.includes("/approve-contract")) {
        return ["order.write", "bill.confirm", "asset.write", "system.role.write"];
      }
      return ["order.write", "contract.read"];
    }
    if (path.startsWith("/outbounds")) return ["asset.outbound", "customer.receipt.confirm"];
    if (path.startsWith("/files")) {
      return ["order.write", "bill.confirm", "asset.write", "repair.write"];
    }
    if (path.startsWith("/automation")) {
      return method === "GET" ? ["bill.read"] : ["bill.generate"];
    }
    if (path.startsWith("/finance") || path.startsWith("/bills")) {
      if (path.includes("/scheduler/run") || path.includes("/generate-due-bills")) {
        return ["bill.generate"];
      }
      if (path.includes("/reconciliation") || path.includes("/reconcile")) {
        return ["bill.reconcile"];
      }
      if (path.includes("/payment-vouchers") || path.includes("/vouchers")) {
        return method === "GET" ? ["bill.read", "bill.reconcile"] : ["bill.voucher", "bill.reconcile"];
      }
      if (path.includes("/confirm")) return ["bill.confirm"];
      if (path.includes("/payments")) {
        return ["bill.payment"];
      }
      if (path.includes("/follow-ups")) return ["bill.follow"];
      if (path.includes("/adjust")) return ["bill.adjust"];
      return ["bill.read"];
    }
    if (path.startsWith("/approvals")) {
      return [
        "order.write",
        "asset.write",
        "repair.write",
        "bill.confirm",
        "system.role.write",
      ];
    }
    return [];
  }

  assertMockAccess(auth: MockAuthContext, method: string, requestPath: string) {
    const path = this.normaliseMockRequestPath(requestPath);
    const isCustomerPath = path.startsWith("/customer");
    const isFilePath = path.startsWith("/files");
    if (isCustomerPath && auth.accountType !== "CUSTOMER") {
      throw new ForbiddenException("内部账号不能访问客户移动端 API");
    }
    if (
      !isCustomerPath &&
      !isFilePath &&
      !path.startsWith("/auth/") &&
      auth.accountType !== "INTERNAL"
    ) {
      throw new ForbiddenException("客户账号不能访问内部后台 API");
    }

    if (auth.accountType === "CUSTOMER" && isFilePath) return;
    if (auth.accountType === "INTERNAL" && auth.roleId === "role-admin") return;
    const requiredPermissions = this.resolveMockPermission(method, path);
    if (!requiredPermissions.length) return;
    if (!this.hasAnyPermission(auth, requiredPermissions)) {
      throw new ForbiddenException("当前角色没有访问该功能的权限");
    }
  }

  private findSystemAccount(id: string) {
    const account = this.systemAccounts.find(
      (item) => item.id === id || item.username === id,
    );
    if (!account) throw new NotFoundException("账号不存在");
    return account;
  }

  private assertRoleMatchesAccountType(
    role: SystemRole,
    type: SystemAccountType,
  ) {
    const expectedScope = type === "INTERNAL" ? "内部后台" : "客户移动端";
    if (role.scope !== expectedScope) {
      throw new BadRequestException(
        type === "INTERNAL"
          ? "内部账号只能选择内部后台角色"
          : "客户账号只能选择客户移动端角色",
      );
    }
  }

  private assertValidSystemRoleScope(
    scope: unknown,
  ): asserts scope is SystemRole["scope"] {
    if (scope !== "内部后台" && scope !== "客户移动端") {
      throw new BadRequestException("角色范围不正确");
    }
  }

  private normaliseRiskNotes(notes: unknown, fallback: string[]) {
    if (!Array.isArray(notes)) return fallback;
    const nextNotes = notes
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return nextNotes.length ? nextNotes : fallback;
  }

  private buildRolePermissions(
    scope: SystemRole["scope"],
    templateRole?: SystemRole,
    permissionCodes?: string[],
  ): SystemRole["permissions"] {
    const enabledCodes =
      permissionCodes !== undefined
        ? new Set(permissionCodes)
        : new Set(
            templateRole?.permissions
              .filter((permission) => permission.enabled)
              .map((permission) => permission.code) ?? [],
          );
    const seen = new Set<string>();
    const catalog = [
      ...(templateRole?.permissions ?? []),
      ...this.systemRoles
        .filter((role) => role.scope === scope)
        .flatMap((role) => role.permissions),
    ];

    return catalog
      .filter((permission) => {
        if (seen.has(permission.code)) return false;
        seen.add(permission.code);
        return true;
      })
      .map((permission) => ({
        ...permission,
        enabled: enabledCodes.has(permission.code),
      }));
  }

  private refreshRolePermissionSummary(role: SystemRole) {
    role.permissionSummary = role.permissions
      .filter((permission) => permission.enabled)
      .map((permission) => permission.name);
  }

  private findDictionaryItem(groupCode: string, itemCode: string) {
    const group = this.dictionaries.find((item) => item.code === groupCode);
    if (!group) throw new NotFoundException("字典分组不存在");
    const item = group.items.find((entry) => entry.code === itemCode);
    if (!item) throw new NotFoundException("字典项不存在");
    return { group, item };
  }

  getSystemConfigSnapshot() {
    return {
      version: 1,
      exportedAt: this.nowText(),
      ...this.cloneValue(this.getSystemConfigState()),
    };
  }

  restoreSystemConfigSnapshot(body: unknown) {
    const snapshot =
      body && typeof body === "object" && "systemManagement" in body
        ? (body as { systemManagement?: unknown }).systemManagement
        : body;

    this.restoreSystemConfigState(snapshot, true);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "恢复系统配置",
      operator: "系统管理员",
      target: "系统管理配置快照",
      detail:
        "账号、角色权限、字典、接口、审批流、系统参数和审计日志已从快照恢复",
    });
    return this.getSystemManagement();
  }

  resetSystemConfigDefaults() {
    this.restoreSystemConfigState(
      this.cloneValue(this.defaultSystemConfigState),
      true,
    );
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "恢复默认配置",
      operator: "系统管理员",
      target: "系统管理配置",
      detail:
        "账号、角色权限、字典、接口、审批流、系统参数和审计日志已恢复为系统默认配置",
    });
    return this.getSystemManagement();
  }

  getSystemManagement() {
    const roleUserCounts = this.systemAccounts.reduce<Record<string, number>>(
      (acc, account) => {
        acc[account.roleId] = (acc[account.roleId] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const dictionaryItemCount = this.dictionaries.reduce(
      (total, group) => total + group.items.length,
      0,
    );

    return {
      stats: {
        accountTotal: this.systemAccounts.length,
        enabledAccountCount: this.systemAccounts.filter(
          (account) => account.status === "ENABLED",
        ).length,
        disabledAccountCount: this.systemAccounts.filter(
          (account) => account.status === "DISABLED",
        ).length,
        roleCount: this.systemRoles.length,
        dictionaryGroupCount: this.dictionaries.length,
        dictionaryItemCount,
        enabledInterfaceCount: this.platformInterfaces.filter(
          (item) => item.enabled,
        ).length,
        interfaceErrorCount: this.platformInterfaces.filter(
          (item) => item.status === "ERROR",
        ).length,
        enabledApprovalFlowCount: this.approvalFlows.filter(
          (flow) => flow.enabled,
        ).length,
        parameterCount: this.systemParameters.length,
        auditLogCount: this.systemOperationLogs.length,
      },
      accounts: this.systemAccounts,
      roles: this.systemRoles.map((role) => ({
        ...role,
        userCount: roleUserCounts[role.id] ?? 0,
      })),
      dictionaries: this.dictionaries,
      interfaces: this.platformInterfaces,
      approvalFlows: this.approvalFlows,
      parameters: this.systemParameters,
      operationLogs: this.systemOperationLogs,
    };
  }

  createSystemAccount(body: {
    type: SystemAccountType;
    username: string;
    name: string;
    roleId: string;
    department?: string;
    customerName?: string;
    phone?: string;
  }) {
    const username = body.username?.trim();
    const name = body.name?.trim();
    const role = this.systemRoles.find((item) => item.id === body.roleId);

    if (!username || !name) {
      throw new BadRequestException("账号和姓名不能为空");
    }
    if (!role) throw new BadRequestException("请选择有效角色");
    this.assertRoleMatchesAccountType(role, body.type);
    if (this.systemAccounts.some((account) => account.username === username)) {
      throw new BadRequestException("账号已存在");
    }
    if (body.type === "CUSTOMER" && !body.customerName?.trim()) {
      throw new BadRequestException("客户账号必须选择所属客户");
    }

    const account: SystemAccount = {
      id: `acc-${Date.now()}`,
      type: body.type,
      username,
      name,
      roleId: role.id,
      roleName: role.name,
      department:
        body.type === "INTERNAL" ? body.department?.trim() || "未分配" : "",
      customerName:
        body.type === "CUSTOMER" ? body.customerName?.trim() || "" : "",
      phone: body.phone?.trim() || "",
      status: "ENABLED",
      lastLoginAt: "",
      createdAt: this.nowText(),
    };

    this.systemAccounts.push(account);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "创建账号",
      operator: "系统管理员",
      target: username,
      detail: `创建${body.type === "INTERNAL" ? "内部" : "客户"}账号，角色为${role.name}`,
    });
    return account;
  }

  updateSystemAccount(
    id: string,
    body: {
      type?: SystemAccountType;
      name?: string;
      roleId?: string;
      department?: string;
      customerName?: string;
      phone?: string;
    },
  ) {
    const account = this.findSystemAccount(id);
    const nextType = body.type ?? account.type;
    const role =
      body.roleId !== undefined
        ? this.systemRoles.find((item) => item.id === body.roleId)
        : this.systemRoles.find((item) => item.id === account.roleId);

    if (nextType !== "INTERNAL" && nextType !== "CUSTOMER") {
      throw new BadRequestException("账号类型不正确");
    }
    if (!role) throw new BadRequestException("请选择有效角色");
    this.assertRoleMatchesAccountType(role, nextType);

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("姓名不能为空");
      account.name = name;
    }

    const nextCustomerName =
      body.customerName !== undefined
        ? body.customerName.trim()
        : account.customerName;
    if (nextType === "CUSTOMER" && !nextCustomerName) {
      throw new BadRequestException("客户账号必须选择所属客户");
    }

    account.type = nextType;
    account.roleId = role.id;
    account.roleName = role.name;
    account.department =
      nextType === "INTERNAL"
        ? body.department?.trim() || account.department || "未分配"
        : "";
    account.customerName = nextType === "CUSTOMER" ? nextCustomerName : "";
    if (body.phone !== undefined) account.phone = body.phone.trim();

    this.appendSystemOperationLog({
      module: "系统管理",
      action: "编辑账号",
      operator: "系统管理员",
      target: account.username,
      detail: `${account.name}账号信息已更新，角色为${account.roleName}`,
    });
    return account;
  }

  deleteSystemAccount(id: string) {
    const index = this.systemAccounts.findIndex(
      (item) => item.id === id || item.username === id,
    );
    if (index < 0) throw new NotFoundException("账号不存在");
    const account = this.systemAccounts[index];
    const enabledAdminCount = this.systemAccounts.filter(
      (item) => item.roleId === "role-admin" && item.status === "ENABLED",
    ).length;

    if (
      account.roleId === "role-admin" &&
      account.status === "ENABLED" &&
      enabledAdminCount <= 1
    ) {
      throw new BadRequestException("至少保留一个启用的系统管理员账号");
    }

    this.systemAccounts.splice(index, 1);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "删除账号",
      operator: "系统管理员",
      target: account.username,
      detail: `${account.name}账号已删除`,
    });
    return { id: account.id, username: account.username, deleted: true };
  }

  updateSystemAccountStatus(id: string, body: { enabled?: boolean }) {
    const account = this.findSystemAccount(id);
    const enabled = body.enabled ?? account.status !== "ENABLED";
    account.status = enabled ? "ENABLED" : "DISABLED";
    this.appendSystemOperationLog({
      module: "系统管理",
      action: enabled ? "启用账号" : "停用账号",
      operator: "系统管理员",
      target: account.username,
      detail: `${account.name}账号状态变更为${enabled ? "启用" : "停用"}`,
    });
    return account;
  }

  resetSystemAccountPassword(id: string) {
    const account = this.findSystemAccount(id);
    const temporaryPassword = `YCKX@${String(Date.now()).slice(-6)}`;
    this.temporaryAccountPasswords.set(account.id, {
      password: temporaryPassword,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "重置密码",
      operator: "系统管理员",
      target: account.username,
      detail: "生成一次性临时密码，首次登录后必须修改",
    });
    return {
      accountId: account.id,
      username: account.username,
      temporaryPassword,
      expiredAt: "24小时后过期",
    };
  }

  createSystemRole(body: {
    name: string;
    scope?: SystemRole["scope"];
    dataScope?: string;
    description?: string;
    permissionCodes?: string[];
    copyFromRoleId?: string;
    riskNotes?: string[];
  }) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("角色名称不能为空");
    if (
      this.systemRoles.some(
        (role) => role.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new BadRequestException("角色名称已存在");
    }

    const templateRole = body.copyFromRoleId
      ? this.systemRoles.find((role) => role.id === body.copyFromRoleId)
      : undefined;
    if (body.copyFromRoleId && !templateRole) {
      throw new BadRequestException("复制模板角色不存在");
    }

    const scope = body.scope ?? templateRole?.scope ?? "内部后台";
    this.assertValidSystemRoleScope(scope);
    if (templateRole && templateRole.scope !== scope) {
      throw new BadRequestException("复制模板和角色范围不一致");
    }

    const dataScope =
      body.dataScope?.trim() ||
      templateRole?.dataScope ||
      "按角色配置的数据范围";
    const description =
      body.description?.trim() ||
      templateRole?.description ||
      "按业务岗位自定义的系统角色。";
    const role: SystemRole = {
      id: `role-${Date.now()}`,
      name,
      scope,
      userCount: 0,
      dataScope,
      description,
      permissionSummary: [],
      permissions: this.buildRolePermissions(
        scope,
        templateRole,
        body.permissionCodes,
      ),
      riskNotes: this.normaliseRiskNotes(
        body.riskNotes,
        templateRole?.riskNotes ?? ["自定义角色，请定期复核权限"],
      ),
    };
    this.refreshRolePermissionSummary(role);

    this.systemRoles.push(role);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "创建角色",
      operator: "系统管理员",
      target: role.name,
      detail: `${role.name}角色已创建，范围为${role.scope}`,
    });
    return role;
  }

  updateSystemRole(
    id: string,
    body: {
      name?: string;
      dataScope?: string;
      description?: string;
      permissionCodes?: string[];
      riskNotes?: string[];
    },
  ) {
    const role = this.systemRoles.find((item) => item.id === id);
    if (!role) throw new NotFoundException("角色不存在");
    const previousName = role.name;

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException("角色名称不能为空");
      if (
        this.systemRoles.some(
          (item) =>
            item.id !== role.id &&
            item.name.trim().toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw new BadRequestException("角色名称已存在");
      }
      role.name = name;
      this.systemAccounts
        .filter((account) => account.roleId === role.id)
        .forEach((account) => {
          account.roleName = name;
        });
    }

    if (body.dataScope !== undefined) {
      const dataScope = body.dataScope.trim();
      if (!dataScope) throw new BadRequestException("数据范围不能为空");
      role.dataScope = dataScope;
    }
    if (body.description !== undefined) {
      const description = body.description.trim();
      if (!description) throw new BadRequestException("角色说明不能为空");
      role.description = description;
    }
    if (body.permissionCodes) {
      role.permissions = this.buildRolePermissions(
        role.scope,
        role,
        body.permissionCodes,
      );
      this.refreshRolePermissionSummary(role);
    }
    if (body.riskNotes !== undefined) {
      role.riskNotes = this.normaliseRiskNotes(body.riskNotes, role.riskNotes);
    }

    this.appendSystemOperationLog({
      module: "系统管理",
      action: "更新角色权限",
      operator: "系统管理员",
      target: role.name,
      detail: `${previousName}的数据范围、说明或权限点已更新`,
    });
    return role;
  }

  deleteSystemRole(id: string) {
    const index = this.systemRoles.findIndex((role) => role.id === id);
    if (index < 0) throw new NotFoundException("角色不存在");
    const role = this.systemRoles[index];
    const boundAccountCount = this.systemAccounts.filter(
      (account) => account.roleId === role.id,
    ).length;
    if (boundAccountCount > 0) {
      throw new BadRequestException("该角色已绑定账号，不能删除");
    }
    const sameScopeRoleCount = this.systemRoles.filter(
      (item) => item.scope === role.scope,
    ).length;
    if (sameScopeRoleCount <= 1) {
      throw new BadRequestException("至少保留一个同范围角色");
    }

    this.systemRoles.splice(index, 1);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "删除角色",
      operator: "系统管理员",
      target: role.name,
      detail: `${role.name}角色已删除`,
    });
    return { id: role.id, name: role.name, deleted: true };
  }

  updateDictionaryItem(
    groupCode: string,
    itemCode: string,
    body: { label?: string; enabled?: boolean; businessRule?: string },
  ) {
    const { group, item } = this.findDictionaryItem(groupCode, itemCode);
    if (body.label !== undefined) {
      const label = body.label.trim();
      if (!label) throw new BadRequestException("字典名称不能为空");
      item.label = label;
    }
    if (body.businessRule !== undefined) {
      item.businessRule = body.businessRule.trim();
    }
    if (body.enabled !== undefined) {
      item.enabled = body.enabled;
    }
    group.updatedAt = this.nowText();
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "更新字典",
      operator: "系统管理员",
      target: `${group.name}/${item.code}`,
      detail: `${item.label}配置已更新`,
    });
    return item;
  }

  private hydrateSystemInterfaceConfig() {
    const defaults = new Map(
      this.defaultSystemConfigState.interfaces.map((item) => [item.id, item]),
    );
    this.platformInterfaces.forEach((item) => {
      const fallback = defaults.get(item.id);
      item.requestMethod =
        item.requestMethod === "POST" || fallback?.requestMethod === "POST"
          ? "POST"
          : "GET";
      item.credential =
        typeof item.credential === "string"
          ? item.credential
          : fallback?.credential || "";
      item.authMode = item.authMode || fallback?.authMode || "无鉴权";
      item.timeoutMs = Math.max(Number(item.timeoutMs || fallback?.timeoutMs), 1000);
      item.lastLatencyMs =
        Number.isFinite(Number(item.lastLatencyMs)) && Number(item.lastLatencyMs) > 0
          ? Number(item.lastLatencyMs)
          : undefined;
    });
  }

  private maskCredential(value: string) {
    if (!value) return "";
    if (value.length <= 8) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  }

  private sanitizePlatformInterface(item: PlatformInterface): PlatformInterface {
    return {
      ...item,
      credential: "",
      credentialConfigured: Boolean(item.credential),
      credentialHint: this.maskCredential(item.credential),
    };
  }

  private isExampleEndpoint(endpoint: string) {
    try {
      const url = new URL(endpoint);
      return url.hostname.endsWith(".example") || url.hostname === "example.com";
    } catch {
      return false;
    }
  }

  private buildInterfaceRequest(item: PlatformInterface) {
    let url: URL;
    try {
      url = new URL(item.endpoint);
    } catch {
      throw new BadRequestException("接口地址格式不正确");
    }

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
    };
    const credential = item.credential.trim();
    if (item.authMode !== "无鉴权" && !credential) {
      throw new BadRequestException("接口未配置鉴权凭据，不能发起真实请求");
    }
    if (item.authMode === "Bearer Token") {
      headers.Authorization = `Bearer ${credential}`;
    } else if (item.authMode === "API Key") {
      headers["X-API-Key"] = credential;
      if (!url.searchParams.has("key")) url.searchParams.set("key", credential);
    } else if (item.authMode === "AccessKey") {
      headers["X-Access-Key"] = credential;
    }

    const init: RequestInit = {
      method: item.requestMethod,
      headers,
    };
    if (item.requestMethod === "POST") {
      headers["Content-Type"] = "application/json";
      init.body = "{}";
    }
    return { url, init };
  }

  updateSystemInterface(
    id: string,
    body: {
      endpoint?: string;
      requestMethod?: SystemInterfaceMethod;
      syncInterval?: string;
      owner?: string;
      authMode?: string;
      credential?: string;
      timeoutMs?: number;
      enabled?: boolean;
    },
  ) {
    const item = this.platformInterfaces.find((entry) => entry.id === id);
    if (!item) throw new NotFoundException("接口配置不存在");

    if (body.endpoint !== undefined) {
      const endpoint = body.endpoint.trim();
      if (!endpoint) throw new BadRequestException("接口地址不能为空");
      item.endpoint = endpoint;
    }
    if (body.requestMethod !== undefined) {
      if (body.requestMethod !== "GET" && body.requestMethod !== "POST") {
        throw new BadRequestException("请求方式仅支持 GET 或 POST");
      }
      item.requestMethod = body.requestMethod;
    }
    if (body.syncInterval !== undefined) {
      item.syncInterval = body.syncInterval.trim() || item.syncInterval;
    }
    if (body.owner !== undefined) {
      item.owner = body.owner.trim() || item.owner;
    }
    if (body.authMode !== undefined) {
      item.authMode = body.authMode.trim() || item.authMode;
    }
    if (body.credential !== undefined) {
      item.credential = body.credential.trim();
    }
    if (body.timeoutMs !== undefined) {
      const timeoutMs = Number(body.timeoutMs);
      if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
        throw new BadRequestException("超时时间不能小于 1000ms");
      }
      item.timeoutMs = timeoutMs;
    }
    if (body.enabled !== undefined) {
      item.enabled = body.enabled;
      item.status = body.enabled ? "ONLINE" : "DISABLED";
      item.lastResult = body.enabled
        ? "接口已启用，等待下一次同步"
        : "接口已停用";
    }

    this.appendSystemOperationLog({
      module: "系统管理",
      action: "更新接口配置",
      operator: "系统管理员",
      target: item.name,
      detail: `${item.name}接口配置已保存`,
    });
    return this.sanitizePlatformInterface(item);
  }

  async testSystemInterface(id: string) {
    const item = this.platformInterfaces.find((entry) => entry.id === id);
    if (!item) throw new NotFoundException("接口配置不存在");

    item.lastSyncAt = this.nowText();
    item.lastLatencyMs = 0;
    if (!item.enabled) {
      item.status = "DISABLED";
      item.lastResult = "接口未启用，未发起连接测试";
      this.appendSystemOperationLog({
        module: "系统管理",
        action: "测试接口",
        operator: "系统管理员",
        target: item.name,
        result: "失败",
        detail: "接口未启用",
      });
      return this.sanitizePlatformInterface(item);
    }

    if (this.isExampleEndpoint(item.endpoint)) {
      item.status = "ERROR";
      item.lastResult = "示例地址不能发起真实测试，请配置第三方真实地址";
      this.appendSystemOperationLog({
        module: "系统管理",
        action: "测试接口",
        operator: "系统管理员",
        target: item.name,
        result: "失败",
        detail: item.lastResult,
      });
      return this.sanitizePlatformInterface(item);
    }

    const startedAt = Date.now();
    let result: "成功" | "失败" = "失败";
    try {
      const { url, init } = this.buildInterfaceRequest(item);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), item.timeoutMs);
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      item.lastLatencyMs = Date.now() - startedAt;
      const responseText = await response.text();
      if (response.ok) {
        item.status = "ONLINE";
        item.lastResult = `真实请求成功，HTTP ${response.status}，响应 ${item.lastLatencyMs}ms`;
        result = "成功";
      } else {
        item.status = "ERROR";
        item.lastResult = `真实请求失败，HTTP ${response.status}，${responseText.slice(0, 80) || "无响应正文"}`;
      }
    } catch (error) {
      item.lastLatencyMs = Date.now() - startedAt;
      item.status = "ERROR";
      item.lastResult = `真实请求失败：${error instanceof Error ? error.message : String(error)}`;
    }

    this.appendSystemOperationLog({
      module: "系统管理",
      action: "测试接口",
      operator: "系统管理员",
      target: item.name,
      result,
      detail: item.lastResult,
    });
    return this.sanitizePlatformInterface(item);
  }

  createApprovalFlow(body: {
    name?: string;
    businessType?: string;
    enabled?: boolean;
    slaHours?: number;
    approvers?: string[];
  }) {
    const name = String(body.name ?? "").trim();
    const businessType = String(body.businessType ?? "").trim();
    const approvers = Array.isArray(body.approvers)
      ? body.approvers.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const slaHours = Number(body.slaHours ?? 24);

    if (!name) throw new BadRequestException("流程名称不能为空");
    if (!businessType) throw new BadRequestException("业务类型不能为空");
    if (this.approvalFlows.some((item) => item.name === name)) {
      throw new BadRequestException("审批流程名称已存在");
    }
    if (!Number.isFinite(slaHours) || slaHours < 1) {
      throw new BadRequestException("审批时限必须大于 0");
    }
    if (approvers.length < 2) {
      throw new BadRequestException("审批流至少需要两个节点");
    }

    const flow: ApprovalFlowConfig = {
      id: `flow-custom-${Date.now()}`,
      name,
      businessType,
      enabled: body.enabled ?? true,
      nodeCount: approvers.length,
      approvers,
      slaHours,
      updatedAt: this.nowText(),
    };
    this.approvalFlows.unshift(flow);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "创建审批流",
      operator: "系统管理员",
      target: flow.name,
      detail: `${flow.name}已创建，业务类型为${flow.businessType}，共${flow.nodeCount}个节点`,
    });
    return flow;
  }

  updateApprovalFlow(
    id: string,
    body: {
      name?: string;
      businessType?: string;
      enabled?: boolean;
      slaHours?: number;
      approvers?: string[];
    },
  ) {
    const flow = this.approvalFlows.find((item) => item.id === id);
    if (!flow) throw new NotFoundException("审批流不存在");

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new BadRequestException("流程名称不能为空");
      if (
        this.approvalFlows.some((item) => item.id !== id && item.name === name)
      ) {
        throw new BadRequestException("审批流程名称已存在");
      }
      flow.name = name;
    }
    if (body.businessType !== undefined) {
      const businessType = String(body.businessType).trim();
      if (!businessType) throw new BadRequestException("业务类型不能为空");
      flow.businessType = businessType;
    }
    if (body.enabled !== undefined) {
      flow.enabled = body.enabled;
    }
    if (body.slaHours !== undefined) {
      const slaHours = Number(body.slaHours);
      if (!Number.isFinite(slaHours) || slaHours < 1) {
        throw new BadRequestException("审批时限必须大于 0");
      }
      flow.slaHours = slaHours;
    }
    if (body.approvers) {
      const approvers = body.approvers
        .map((item) => item.trim())
        .filter(Boolean);
      if (approvers.length < 2) {
        throw new BadRequestException("审批流至少需要两个节点");
      }
      flow.approvers = approvers;
      flow.nodeCount = approvers.length;
    }
    flow.updatedAt = this.nowText();
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "更新审批流",
      operator: "系统管理员",
      target: flow.name,
      detail: `${flow.name}审批节点或时限已更新`,
    });
    this.persistMockState();
    return flow;
  }

  deleteApprovalFlow(id: string) {
    const index = this.approvalFlows.findIndex((item) => item.id === id);
    if (index < 0) throw new NotFoundException("审批流不存在");
    const [flow] = this.approvalFlows.splice(index, 1);
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "删除审批流",
      operator: "系统管理员",
      target: flow.name,
      detail: `${flow.name}审批流已删除`,
    });
    return { id: flow.id, deleted: true };
  }

  updateSystemParameter(
    code: string,
    body: { value?: number | string | boolean },
  ) {
    const parameter = this.systemParameters.find((item) => item.code === code);
    if (!parameter) throw new NotFoundException("系统参数不存在");
    if (body.value === undefined || body.value === "") {
      throw new BadRequestException("参数值不能为空");
    }

    const nextValue =
      typeof parameter.value === "number" ? Number(body.value) : body.value;
    if (
      typeof parameter.value === "number" &&
      (!Number.isFinite(nextValue) || Number(nextValue) < 0)
    ) {
      throw new BadRequestException("数字参数必须大于等于 0");
    }
    parameter.value = nextValue;
    parameter.updatedAt = this.nowText();
    this.appendSystemOperationLog({
      module: "系统管理",
      action: "更新系统参数",
      operator: "系统管理员",
      target: parameter.name,
      detail: `${parameter.name}调整为${String(parameter.value)}${parameter.unit}`,
    });
    return parameter;
  }

  getCustomerHome(_query: { role?: string } = {}, auth?: MockAuthContext) {
    const canViewAmount = Boolean(
      auth?.permissions.includes("customer.bill.read"),
    );
    const customerOrders = this.orders.filter(
      (order) => order.customerId === customerId,
    );
    const customerOrderIds = new Set(customerOrders.map((order) => order.id));
    const customerOrderNos = new Set(
      customerOrders.map((order) => order.orderNo),
    );
    const customerBills = this.getBills().filter(
      (bill) =>
        customerOrderNos.has(bill.orderNo) &&
        ![BillStatus.PendingConfirm, BillStatus.Voided].includes(
          bill.status as any,
        ),
    );
    const customerOutbounds = this.outbounds.filter((outbound) =>
      customerOrderIds.has(outbound.orderId),
    );
    const customerRepairs = this.repairs
      .filter((repair) => customerOrderIds.has(repair.orderId))
      .map((repair, index) => this.enrichRepair(repair, index));
    const visibleBills = canViewAmount ? customerBills : [];
    const visibleOrders = customerOrders.map((order) => {
      if (canViewAmount) return order;
      const {
        monthlyRent,
        depositAmount,
        receivableAmount,
        paidAmount,
        debtAmount,
        overdueAmount,
        ...safeOrder
      } = order;
      return safeOrder;
    });

    return {
      customerName: auth?.customerName || "河南示例物流有限公司",
      role: auth?.roleName || "客户移动端",
      canViewAmount,
      orderCount: customerOrders.length,
      batteryCount: this.batteries.filter(
        (battery) => battery.customerId === customerId,
      ).length,
      pendingReceiptCount: customerOutbounds.filter(
        (outbound) => outbound.status === OutboundStatus.PendingReceipt,
      ).length,
      repairingCount: customerRepairs.filter(
        (repair) =>
          repair.status !== RepairStatus.Completed ||
          (repair.source === RepairSource.Customer &&
            !repair.customerConfirmed),
      ).length,
      debtAmount: canViewAmount
        ? customerBills.reduce(
            (total, bill) => total + Number(bill.debtAmount || 0),
            0,
          )
        : 0,
      overdueAmount: canViewAmount
        ? customerBills
            .filter((bill) => bill.status === BillStatus.Overdue)
            .reduce((total, bill) => total + Number(bill.debtAmount || 0), 0)
        : 0,
      billsNeedPayCount: canViewAmount
        ? customerBills.filter((bill) => bill.debtAmount > 0).length
        : 0,
      orders: visibleOrders,
      batteries: this.batteries.filter(
        (battery) => battery.customerId === customerId,
      ),
      bills: visibleBills,
      outbounds: customerOutbounds,
      repairs: customerRepairs,
    };
  }

  getCustomerRepair(id: string) {
    const repair = this.findCustomerRepairTicket(id);
    return this.getRepair(repair.id);
  }

  addCustomerRepairSupplement(
    id: string,
    body: {
      message?: string;
      images?: unknown[];
    },
  ) {
    const repair = this.findCustomerRepairTicket(id);
    if (repair.status === RepairStatus.Closed) {
      throw new BadRequestException("已关闭报修单不能继续补充资料。");
    }

    const message = String(body.message ?? "").trim();
    const images = this.normalizeApprovalAttachments(body.images ?? []);
    if (!message && !images.length) {
      throw new BadRequestException("请填写补充说明或上传图片。");
    }

    repair.images = this.normalizeApprovalAttachments([
      ...(repair.images ?? []),
      ...images,
    ]);
    this.bindUploadedFilesToRepair(repair);
    const imageNames = images.map((item) => this.attachmentDisplayName(item));
    this.appendRepairLog(repair, {
      action: "客户补充说明",
      result: message || `客户补充 ${images.length} 张图片`,
      remark: images.length ? `补充附件：${imageNames.join("、")}` : "",
      operator: "客户移动端",
    });
    repair.updatedAt = this.nowText();
    this.persistMockState();
    return this.getCustomerRepair(repair.id);
  }

  confirmCustomerRepair(id: string, body: { remark?: string } = {}) {
    const repair = this.findCustomerRepairTicket(id);
    if (repair.status !== RepairStatus.Completed) {
      throw new BadRequestException("报修单完成后才能由客户确认。");
    }

    if (!repair.customerConfirmed) {
      repair.customerConfirmed = true;
      repair.customerConfirmedAt = this.nowText();
      this.appendRepairLog(repair, {
        action: "客户确认完成",
        result: "客户已确认维修结果",
        remark: body.remark?.trim() || "客户移动端确认工单已完成。",
        operator: "客户移动端",
      });
      repair.updatedAt = this.nowText();
      this.persistMockState();
    }

    return this.getCustomerRepair(repair.id);
  }

  createCustomerRepair(body: {
    btCode: string;
    description: string;
    address: string;
    images?: unknown[];
  }) {
    const battery = this.batteries.find((item) => item.btCode === body.btCode);
    if (!battery || battery.customerId !== customerId) {
      throw new BadRequestException("该电池不属于您的订单，无法提交报修。");
    }
    if (!body.description?.trim() || !body.address?.trim()) {
      throw new BadRequestException("客户报修必须填写故障描述和地址。");
    }
    const images = this.normalizeApprovalAttachments(body.images ?? []);
    if (!images.length) {
      throw new BadRequestException("客户报修必须上传故障图片。");
    }
    this.ensureNoActiveRepair(body.btCode);

    const order = battery.orderId
      ? this.orders.find((item) => item.id === battery.orderId)
      : undefined;
    const identity = this.createRepairIdentity();
    const now = this.nowText();
    const priority =
      battery.runningStatus === DeviceRunningStatus.Abnormal ? "紧急" : "普通";
    const slaHours = priority === "紧急" ? 24 : 48;
    const slaDueAt = this.addMinutesText(now, slaHours * 60);
    const repair = {
      ...identity,
      source: RepairSource.Customer,
      customerName: "河南示例物流有限公司",
      customerShortName: "河南物流",
      orderId: battery.orderId,
      btCode: body.btCode,
      status: RepairStatus.PendingAccept,
      priority,
      description: body.description.trim(),
      address: body.address.trim(),
      contactName: order?.customerContact ?? "客户联系人",
      contactPhone: order?.contactPhone ?? "",
      createdAt: now,
      acceptedAt: "",
      expectedFinishAt: slaDueAt,
      completedAt: "",
      handler: "待分配",
      technician: "",
      faultType:
        battery.runningStatus === DeviceRunningStatus.Abnormal
          ? "设备异常"
          : "客户反馈故障",
      responsibility: "待判定",
      repairMethod: "待受理",
      costAmount: 0,
      slaHours,
      slaDueAt,
      customerConfirmed: false,
      customerConfirmedAt: "",
      sourceAlarmNo: "",
      images,
      materials: [],
      costItems: [],
    };
    this.repairs.unshift(repair);
    this.repairLogs[repair.id] = [
      {
        time: repair.createdAt,
        operator: "客户移动端",
        action: "提交报修",
        status: "待受理",
        result: "已生成报修单",
        remark: `客户上传 ${images.length} 张故障图片。`,
      },
    ];
    this.syncRepairAsset(
      repair,
      "客户提交报修",
      "客户移动端",
      "客户提交故障描述和现场图片。",
    );
    this.persistMockState();
    return this.getRepair(repair.id);
  }

  confirmReceipt(id: string) {
    const outbound = this.outbounds.find((item) => item.id === id) as
      | Record<string, any>
      | undefined;
    if (!outbound) throw new NotFoundException("出库单不存在");
    if (outbound.status !== OutboundStatus.Received) {
      outbound.status = OutboundStatus.Received;
      outbound.receivedAt = this.nowText();
      const order = this.orders.find((item) => item.id === outbound.orderId) as
        | Record<string, any>
        | undefined;
      if (order) {
        order.updatedAt = outbound.receivedAt;
        this.appendOrderEvent(
          order,
          "客户确认收货",
          `${outbound.outboundNo} 已确认收货，包含 ${outbound.btCodes?.length ?? 0} 组电池。`,
        );
        outbound.btCodes?.forEach((btCode: string) => {
          const battery = this.batteries.find(
            (item) => item.btCode === btCode,
          ) as Record<string, any> | undefined;
          if (battery) {
            battery.customStatus = "正常运营";
            battery.updatedAt = outbound.receivedAt;
          }
        });
        this.syncOrderOperationalState(order);
      }
    }
    this.persistMockState();
    return outbound;
  }
}
