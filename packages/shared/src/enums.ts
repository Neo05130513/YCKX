export enum BatteryAssetStatus {
  InStock = "IN_STOCK",
  Repairing = "REPAIRING",
  Leasing = "LEASING",
  Scrapped = "SCRAPPED",
  BoughtOut = "BOUGHT_OUT",
}

export enum DeviceRunningStatus {
  Online = "ONLINE",
  Offline = "OFFLINE",
  Abnormal = "ABNORMAL",
  Unknown = "UNKNOWN",
}

export enum OrderStatus {
  Draft = "DRAFT",
  Approving = "APPROVING",
  PendingOutbound = "PENDING_OUTBOUND",
  PartiallyOutbound = "PARTIALLY_OUTBOUND",
  PendingReceipt = "PENDING_RECEIPT",
  Leasing = "LEASING",
  Returning = "RETURNING",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED",
}

export enum OutboundStatus {
  PendingReceipt = "PENDING_RECEIPT",
  Received = "RECEIVED",
  AutoReceived = "AUTO_RECEIVED",
}

export enum BillStatus {
  PendingConfirm = "PENDING_CONFIRM",
  PendingPayment = "PENDING_PAYMENT",
  PartiallyPaid = "PARTIALLY_PAID",
  Settled = "SETTLED",
  Overdue = "OVERDUE",
  Adjusted = "ADJUSTED",
  Voided = "VOIDED",
}

export enum RepairStatus {
  PendingAccept = "PENDING_ACCEPT",
  Processing = "PROCESSING",
  Repairing = "REPAIRING",
  PendingInbound = "PENDING_INBOUND",
  Completed = "COMPLETED",
  Closed = "CLOSED",
}

export enum RepairSource {
  Customer = "CUSTOMER",
  Internal = "INTERNAL",
}

export enum AlarmLevel {
  Severe = "SEVERE",
  Warning = "WARNING",
  Info = "INFO",
}

export enum AlarmStatus {
  Pending = "PENDING",
  Processing = "PROCESSING",
  Resolved = "RESOLVED",
  FalseAlarm = "FALSE_ALARM",
}

export enum InternalRole {
  Admin = "ADMIN",
  Sales = "SALES",
  AssetManager = "ASSET_MANAGER",
  Technician = "TECHNICIAN",
  AfterSales = "AFTER_SALES",
  Finance = "FINANCE",
  Manager = "MANAGER",
}

export enum CustomerAccountRole {
  Admin = "CUSTOMER_ADMIN",
  Staff = "CUSTOMER_STAFF",
}

export enum ApprovalStatus {
  Draft = "DRAFT",
  Processing = "PROCESSING",
  Approved = "APPROVED",
  Rejected = "REJECTED",
  Cancelled = "CANCELLED",
}
