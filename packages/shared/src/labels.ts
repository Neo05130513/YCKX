import {
  AlarmLevel,
  AlarmStatus,
  ApprovalStatus,
  BatteryAssetStatus,
  BillStatus,
  CustomerAccountRole,
  DeviceRunningStatus,
  InternalRole,
  OrderStatus,
  OutboundStatus,
  RepairSource,
  RepairStatus,
} from "./enums";

export const batteryAssetStatusLabels: Record<BatteryAssetStatus, string> = {
  [BatteryAssetStatus.InStock]: "在库",
  [BatteryAssetStatus.Repairing]: "维修",
  [BatteryAssetStatus.Leasing]: "租赁",
  [BatteryAssetStatus.Scrapped]: "报废",
  [BatteryAssetStatus.BoughtOut]: "买断",
};

export const deviceRunningStatusLabels: Record<DeviceRunningStatus, string> = {
  [DeviceRunningStatus.Online]: "在线",
  [DeviceRunningStatus.Offline]: "离线",
  [DeviceRunningStatus.Abnormal]: "异常",
  [DeviceRunningStatus.Unknown]: "未知",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.Draft]: "草稿",
  [OrderStatus.Approving]: "审批中",
  [OrderStatus.PendingOutbound]: "待出库",
  [OrderStatus.PartiallyOutbound]: "部分出库",
  [OrderStatus.PendingReceipt]: "待客户收货",
  [OrderStatus.Leasing]: "租赁中",
  [OrderStatus.Returning]: "退租结算",
  [OrderStatus.Completed]: "已完成",
  [OrderStatus.Cancelled]: "已取消",
};

export const outboundStatusLabels: Record<OutboundStatus, string> = {
  [OutboundStatus.PendingReceipt]: "待收货",
  [OutboundStatus.Received]: "已收货",
  [OutboundStatus.AutoReceived]: "自动收货",
};

export const billStatusLabels: Record<BillStatus, string> = {
  [BillStatus.PendingConfirm]: "待确认",
  [BillStatus.PendingPayment]: "待付款",
  [BillStatus.PartiallyPaid]: "部分付款",
  [BillStatus.Settled]: "已结清",
  [BillStatus.Overdue]: "已逾期",
  [BillStatus.Adjusted]: "已调整",
  [BillStatus.Voided]: "已作废",
};

export const repairStatusLabels: Record<RepairStatus, string> = {
  [RepairStatus.PendingAccept]: "待受理",
  [RepairStatus.Processing]: "处理中",
  [RepairStatus.Repairing]: "维修中",
  [RepairStatus.PendingInbound]: "待入库",
  [RepairStatus.Completed]: "已完成",
  [RepairStatus.Closed]: "已关闭",
};

export const repairSourceLabels: Record<RepairSource, string> = {
  [RepairSource.Customer]: "客户报修",
  [RepairSource.Internal]: "内部报修",
};

export const alarmLevelLabels: Record<AlarmLevel, string> = {
  [AlarmLevel.Severe]: "严重告警",
  [AlarmLevel.Warning]: "一般告警",
  [AlarmLevel.Info]: "提醒",
};

export const alarmStatusLabels: Record<AlarmStatus, string> = {
  [AlarmStatus.Pending]: "待处理",
  [AlarmStatus.Processing]: "处理中",
  [AlarmStatus.Resolved]: "已处理",
  [AlarmStatus.FalseAlarm]: "误报",
};

export const internalRoleLabels: Record<InternalRole, string> = {
  [InternalRole.Admin]: "系统管理员",
  [InternalRole.Sales]: "销售人员",
  [InternalRole.AssetManager]: "资产管理人员",
  [InternalRole.Technician]: "技术人员",
  [InternalRole.AfterSales]: "售后人员",
  [InternalRole.Finance]: "财务人员",
  [InternalRole.Manager]: "管理层",
};

export const customerAccountRoleLabels: Record<CustomerAccountRole, string> = {
  [CustomerAccountRole.Admin]: "客户管理员",
  [CustomerAccountRole.Staff]: "客户员工",
};

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  [ApprovalStatus.Draft]: "草稿",
  [ApprovalStatus.Processing]: "审批中",
  [ApprovalStatus.Approved]: "已通过",
  [ApprovalStatus.Rejected]: "已驳回",
  [ApprovalStatus.Cancelled]: "已取消",
};
