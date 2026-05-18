"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalStatus = exports.CustomerAccountRole = exports.InternalRole = exports.AlarmStatus = exports.AlarmLevel = exports.RepairSource = exports.RepairStatus = exports.BillStatus = exports.OutboundStatus = exports.OrderStatus = exports.DeviceRunningStatus = exports.BatteryAssetStatus = void 0;
var BatteryAssetStatus;
(function (BatteryAssetStatus) {
    BatteryAssetStatus["InStock"] = "IN_STOCK";
    BatteryAssetStatus["Repairing"] = "REPAIRING";
    BatteryAssetStatus["Leasing"] = "LEASING";
    BatteryAssetStatus["Scrapped"] = "SCRAPPED";
    BatteryAssetStatus["BoughtOut"] = "BOUGHT_OUT";
})(BatteryAssetStatus || (exports.BatteryAssetStatus = BatteryAssetStatus = {}));
var DeviceRunningStatus;
(function (DeviceRunningStatus) {
    DeviceRunningStatus["Online"] = "ONLINE";
    DeviceRunningStatus["Offline"] = "OFFLINE";
    DeviceRunningStatus["Abnormal"] = "ABNORMAL";
    DeviceRunningStatus["Unknown"] = "UNKNOWN";
})(DeviceRunningStatus || (exports.DeviceRunningStatus = DeviceRunningStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Draft"] = "DRAFT";
    OrderStatus["Approving"] = "APPROVING";
    OrderStatus["PendingOutbound"] = "PENDING_OUTBOUND";
    OrderStatus["PartiallyOutbound"] = "PARTIALLY_OUTBOUND";
    OrderStatus["PendingReceipt"] = "PENDING_RECEIPT";
    OrderStatus["Leasing"] = "LEASING";
    OrderStatus["Returning"] = "RETURNING";
    OrderStatus["Completed"] = "COMPLETED";
    OrderStatus["Cancelled"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OutboundStatus;
(function (OutboundStatus) {
    OutboundStatus["PendingReceipt"] = "PENDING_RECEIPT";
    OutboundStatus["Received"] = "RECEIVED";
    OutboundStatus["AutoReceived"] = "AUTO_RECEIVED";
})(OutboundStatus || (exports.OutboundStatus = OutboundStatus = {}));
var BillStatus;
(function (BillStatus) {
    BillStatus["PendingConfirm"] = "PENDING_CONFIRM";
    BillStatus["PendingPayment"] = "PENDING_PAYMENT";
    BillStatus["PartiallyPaid"] = "PARTIALLY_PAID";
    BillStatus["Settled"] = "SETTLED";
    BillStatus["Overdue"] = "OVERDUE";
    BillStatus["Adjusted"] = "ADJUSTED";
    BillStatus["Voided"] = "VOIDED";
})(BillStatus || (exports.BillStatus = BillStatus = {}));
var RepairStatus;
(function (RepairStatus) {
    RepairStatus["PendingAccept"] = "PENDING_ACCEPT";
    RepairStatus["Processing"] = "PROCESSING";
    RepairStatus["Repairing"] = "REPAIRING";
    RepairStatus["PendingInbound"] = "PENDING_INBOUND";
    RepairStatus["Completed"] = "COMPLETED";
    RepairStatus["Closed"] = "CLOSED";
})(RepairStatus || (exports.RepairStatus = RepairStatus = {}));
var RepairSource;
(function (RepairSource) {
    RepairSource["Customer"] = "CUSTOMER";
    RepairSource["Internal"] = "INTERNAL";
})(RepairSource || (exports.RepairSource = RepairSource = {}));
var AlarmLevel;
(function (AlarmLevel) {
    AlarmLevel["Severe"] = "SEVERE";
    AlarmLevel["Warning"] = "WARNING";
    AlarmLevel["Info"] = "INFO";
})(AlarmLevel || (exports.AlarmLevel = AlarmLevel = {}));
var AlarmStatus;
(function (AlarmStatus) {
    AlarmStatus["Pending"] = "PENDING";
    AlarmStatus["Processing"] = "PROCESSING";
    AlarmStatus["Resolved"] = "RESOLVED";
    AlarmStatus["FalseAlarm"] = "FALSE_ALARM";
})(AlarmStatus || (exports.AlarmStatus = AlarmStatus = {}));
var InternalRole;
(function (InternalRole) {
    InternalRole["Admin"] = "ADMIN";
    InternalRole["Sales"] = "SALES";
    InternalRole["AssetManager"] = "ASSET_MANAGER";
    InternalRole["Technician"] = "TECHNICIAN";
    InternalRole["AfterSales"] = "AFTER_SALES";
    InternalRole["Finance"] = "FINANCE";
    InternalRole["Manager"] = "MANAGER";
})(InternalRole || (exports.InternalRole = InternalRole = {}));
var CustomerAccountRole;
(function (CustomerAccountRole) {
    CustomerAccountRole["Admin"] = "CUSTOMER_ADMIN";
    CustomerAccountRole["Staff"] = "CUSTOMER_STAFF";
})(CustomerAccountRole || (exports.CustomerAccountRole = CustomerAccountRole = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["Draft"] = "DRAFT";
    ApprovalStatus["Processing"] = "PROCESSING";
    ApprovalStatus["Approved"] = "APPROVED";
    ApprovalStatus["Rejected"] = "REJECTED";
    ApprovalStatus["Cancelled"] = "CANCELLED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
