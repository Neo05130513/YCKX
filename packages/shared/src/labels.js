"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalStatusLabels = exports.customerAccountRoleLabels = exports.internalRoleLabels = exports.alarmStatusLabels = exports.alarmLevelLabels = exports.repairSourceLabels = exports.repairStatusLabels = exports.billStatusLabels = exports.outboundStatusLabels = exports.orderStatusLabels = exports.deviceRunningStatusLabels = exports.batteryAssetStatusLabels = void 0;
const enums_1 = require("./enums");
exports.batteryAssetStatusLabels = {
    [enums_1.BatteryAssetStatus.InStock]: "在库",
    [enums_1.BatteryAssetStatus.Repairing]: "维修",
    [enums_1.BatteryAssetStatus.Leasing]: "租赁",
    [enums_1.BatteryAssetStatus.Scrapped]: "报废",
    [enums_1.BatteryAssetStatus.BoughtOut]: "买断",
};
exports.deviceRunningStatusLabels = {
    [enums_1.DeviceRunningStatus.Online]: "在线",
    [enums_1.DeviceRunningStatus.Offline]: "离线",
    [enums_1.DeviceRunningStatus.Abnormal]: "异常",
    [enums_1.DeviceRunningStatus.Unknown]: "未知",
};
exports.orderStatusLabels = {
    [enums_1.OrderStatus.Draft]: "草稿",
    [enums_1.OrderStatus.Approving]: "审批中",
    [enums_1.OrderStatus.PendingOutbound]: "待出库",
    [enums_1.OrderStatus.PartiallyOutbound]: "部分出库",
    [enums_1.OrderStatus.PendingReceipt]: "待客户收货",
    [enums_1.OrderStatus.Leasing]: "租赁中",
    [enums_1.OrderStatus.Returning]: "退租结算",
    [enums_1.OrderStatus.Completed]: "已完成",
    [enums_1.OrderStatus.Cancelled]: "已取消",
};
exports.outboundStatusLabels = {
    [enums_1.OutboundStatus.PendingReceipt]: "待收货",
    [enums_1.OutboundStatus.Received]: "已收货",
    [enums_1.OutboundStatus.AutoReceived]: "自动收货",
};
exports.billStatusLabels = {
    [enums_1.BillStatus.PendingConfirm]: "待确认",
    [enums_1.BillStatus.PendingPayment]: "待付款",
    [enums_1.BillStatus.PartiallyPaid]: "部分付款",
    [enums_1.BillStatus.Settled]: "已结清",
    [enums_1.BillStatus.Overdue]: "已逾期",
    [enums_1.BillStatus.Adjusted]: "已调整",
    [enums_1.BillStatus.Voided]: "已作废",
};
exports.repairStatusLabels = {
    [enums_1.RepairStatus.PendingAccept]: "待受理",
    [enums_1.RepairStatus.Processing]: "处理中",
    [enums_1.RepairStatus.Repairing]: "维修中",
    [enums_1.RepairStatus.PendingInbound]: "待入库",
    [enums_1.RepairStatus.Completed]: "已完成",
    [enums_1.RepairStatus.Closed]: "已关闭",
};
exports.repairSourceLabels = {
    [enums_1.RepairSource.Customer]: "客户报修",
    [enums_1.RepairSource.Internal]: "内部报修",
};
exports.alarmLevelLabels = {
    [enums_1.AlarmLevel.Severe]: "严重告警",
    [enums_1.AlarmLevel.Warning]: "一般告警",
    [enums_1.AlarmLevel.Info]: "提醒",
};
exports.alarmStatusLabels = {
    [enums_1.AlarmStatus.Pending]: "待处理",
    [enums_1.AlarmStatus.Processing]: "处理中",
    [enums_1.AlarmStatus.Resolved]: "已处理",
    [enums_1.AlarmStatus.FalseAlarm]: "误报",
};
exports.internalRoleLabels = {
    [enums_1.InternalRole.Admin]: "系统管理员",
    [enums_1.InternalRole.Sales]: "销售人员",
    [enums_1.InternalRole.AssetManager]: "资产管理人员",
    [enums_1.InternalRole.Technician]: "技术人员",
    [enums_1.InternalRole.AfterSales]: "售后人员",
    [enums_1.InternalRole.Finance]: "财务人员",
    [enums_1.InternalRole.Manager]: "管理层",
};
exports.customerAccountRoleLabels = {
    [enums_1.CustomerAccountRole.Admin]: "客户管理员",
    [enums_1.CustomerAccountRole.Staff]: "客户员工",
};
exports.approvalStatusLabels = {
    [enums_1.ApprovalStatus.Draft]: "草稿",
    [enums_1.ApprovalStatus.Processing]: "审批中",
    [enums_1.ApprovalStatus.Approved]: "已通过",
    [enums_1.ApprovalStatus.Rejected]: "已驳回",
    [enums_1.ApprovalStatus.Cancelled]: "已取消",
};
