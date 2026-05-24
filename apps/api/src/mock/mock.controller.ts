import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { MockAuthGuard } from "./mock-auth.guard";
import { MockService, type MockAuthContext } from "./mock.service";

@Controller("mock")
@UseGuards(MockAuthGuard)
export class MockController {
  constructor(private readonly mockService: MockService) {}

  @Post("auth/login")
  loginInternal(@Body() body: { username?: string; password?: string }) {
    return this.mockService.loginInternalAccount(body);
  }

  @Post("auth/customer-login")
  loginCustomer(
    @Body()
    body: {
      phone?: string;
      username?: string;
      code?: string;
      role?: "admin" | "staff";
    },
  ) {
    return this.mockService.loginCustomerAccount(body);
  }

  @Get("auth/me")
  getAuthMe(@Req() request: { mockAuth: MockAuthContext }) {
    return this.mockService.getAuthMe(request.mockAuth);
  }

  @Post("auth/logout")
  logoutAuth(@Req() request: { mockAuth: MockAuthContext }) {
    return this.mockService.logoutAuth(request.mockAuth);
  }

  @Get("dashboard")
  getDashboard() {
    return this.mockService.getDashboard();
  }

  @Get("batteries")
  getBatteries() {
    return this.mockService.getBatteries();
  }

  @Get("assets")
  getAssets() {
    return this.mockService.getAssets();
  }

  @Get("assets/:id")
  getAsset(@Param("id") id: string) {
    return this.mockService.getAsset(id);
  }

  @Post("assets/inbound")
  createAssetInbound(@Body() body: Record<string, any>) {
    return this.mockService.createAssetInbound(body);
  }

  @Post("assets/import")
  importAssetInbounds(@Body() body: Record<string, any>) {
    return this.mockService.importAssetInbounds(body);
  }

  @Post("assets/batch/outbound")
  createAssetBatchOutbound(@Body() body: Record<string, any>) {
    return this.mockService.createAssetBatchOutbound(body);
  }

  @Post("assets/:id/outbound")
  createAssetOutbound(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.createAssetOutbound(id, body);
  }

  @Post("assets/batch/return-inbound")
  batchReturnAssetInbound(@Body() body: Record<string, any>) {
    return this.mockService.batchReturnAssetInbound(body);
  }

  @Post("assets/:id/return-inbound")
  returnAssetInbound(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.returnAssetInbound(id, body);
  }

  @Post("assets/batch/transfer")
  batchTransferAssets(@Body() body: Record<string, any>) {
    return this.mockService.batchTransferAssets(body);
  }

  @Post("assets/:id/transfer")
  transferAsset(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.transferAsset(id, body);
  }

  @Post("assets/batch/check")
  batchCheckAssetInventory(@Body() body: Record<string, any>) {
    return this.mockService.batchCheckAssetInventory(body);
  }

  @Post("assets/:id/check")
  checkAssetInventory(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.checkAssetInventory(id, body);
  }

  @Post("assets/batch/depreciation")
  batchDepreciateAssets(@Body() body: Record<string, any>) {
    return this.mockService.batchDepreciateAssets(body);
  }

  @Post("assets/:id/depreciation")
  depreciateAsset(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.depreciateAsset(id, body);
  }

  @Post("assets/:id/valuation")
  updateAssetValuation(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.updateAssetValuation(id, body);
  }

  @Post("assets/:id/repair-inbound")
  repairInboundAsset(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.repairInboundAsset(id, body);
  }

  @Post("assets/batch/dispose")
  batchDisposeAssets(@Body() body: Record<string, any>) {
    return this.mockService.batchDisposeAssets(body);
  }

  @Post("assets/:id/dispose")
  disposeAsset(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.disposeAsset(id, body);
  }

  @Get("orders")
  getOrders() {
    return this.mockService.getOrders();
  }

  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.mockService.getOrder(id);
  }

  @Post("orders")
  createOrder(@Body() body: Record<string, any>) {
    return this.mockService.createOrder(body);
  }

  @Patch("orders/:id/submit-approval")
  submitOrderApproval(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.submitOrderApproval(id, body);
  }

  @Patch("orders/:id/approve-contract")
  approveOrderContract(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.approveOrderContract(id, body);
  }

  @Patch("orders/:id/archive-contract")
  archiveOrderContract(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.archiveOrderContract(id, body);
  }

  @Patch("orders/:id/cancel")
  cancelOrder(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.cancelOrder(id, body);
  }

  @Patch("orders/:id/renew")
  renewOrder(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.renewOrder(id, body);
  }

  @Patch("orders/:id/return-lease")
  returnOrderLease(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.returnOrderLease(id, body);
  }

  @Patch("orders/:id/settle-return")
  settleReturnOrder(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.settleReturnOrder(id, body);
  }

  @Patch("orders/:id/complete")
  completeOrder(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.completeOrder(id, body);
  }

  @Post("orders/:id/outbounds")
  createOrderOutbound(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.createOrderOutbound(id, body);
  }

  @Post("orders/:id/bills")
  generateOrderBill(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.generateOrderBill(id, body);
  }

  @Patch("outbounds/:id/receipt")
  confirmOutboundReceipt(@Param("id") id: string) {
    return this.mockService.confirmReceipt(id);
  }

  @Post("outbounds/auto-receive")
  autoReceiveOutbounds(@Body() body: Record<string, any>) {
    return this.mockService.runAutoReceiveJob(body);
  }

  @Get("automation")
  getAutomationState() {
    return this.mockService.getAutomationState();
  }

  @Post("automation/run")
  runAutomationTasks(@Body() body: Record<string, any>) {
    return this.mockService.runAutomationTasks(body);
  }

  @Get("alarms")
  getAlarms(@Query() query: Record<string, string>) {
    return this.mockService.getAlarms(query);
  }

  @Get("alarms/stats")
  getAlarmStats(@Query() query: Record<string, string>) {
    return this.mockService.getAlarmStats(query);
  }

  @Get("alarms/rules")
  getAlarmRules() {
    return this.mockService.getAlarmRules();
  }

  @Patch("alarms/rules/:id")
  updateAlarmRule(
    @Param("id") id: string,
    @Body()
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
    return this.mockService.updateAlarmRule(id, body);
  }

  @Get("alarms/:id")
  getAlarm(@Param("id") id: string) {
    return this.mockService.getAlarm(id);
  }

  @Patch("alarms/:id/status")
  updateAlarmStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
      remark?: string;
      operator?: string;
      handler?: string;
    },
  ) {
    return this.mockService.updateAlarmStatus(id, body);
  }

  @Post("alarms/batch/status")
  batchUpdateAlarmStatus(
    @Body()
    body: {
      ids?: string[];
      status?: string;
      remark?: string;
      operator?: string;
      handler?: string;
    },
  ) {
    return this.mockService.batchUpdateAlarmStatus(body);
  }

  @Post("alarms/batch/pushes")
  batchPushAlarms(
    @Body()
    body: {
      ids?: string[];
      pushType?: string;
      userName?: string;
      userPhone?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.batchPushAlarms(body);
  }

  @Post("alarms/batch/silence")
  batchSilenceAlarms(
    @Body()
    body: {
      ids?: string[];
      minutes?: number;
      silenceMinutes?: number;
      until?: string;
      reason?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.batchSilenceAlarms(body);
  }

  @Post("alarms/batch/unsilence")
  batchUnsilenceAlarms(
    @Body()
    body: {
      ids?: string[];
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.batchUnsilenceAlarms(body);
  }

  @Post("alarms/batch/escalations")
  batchEscalateAlarms(
    @Body()
    body: {
      ids?: string[];
      operator?: string;
      remark?: string;
      receiverName?: string;
      receiverPhone?: string;
      pushType?: string;
    },
  ) {
    return this.mockService.batchEscalateAlarms(body);
  }

  @Post("alarms/:id/silence")
  silenceAlarm(
    @Param("id") id: string,
    @Body()
    body: {
      minutes?: number;
      silenceMinutes?: number;
      until?: string;
      reason?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.silenceAlarm(id, body);
  }

  @Post("alarms/:id/unsilence")
  unsilenceAlarm(
    @Param("id") id: string,
    @Body()
    body: {
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.unsilenceAlarm(id, body);
  }

  @Post("alarms/:id/pushes")
  pushAlarm(
    @Param("id") id: string,
    @Body()
    body: {
      pushType?: string;
      userName?: string;
      userPhone?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.pushAlarm(id, body);
  }

  @Patch("alarms/:id/pushes/:pushId/ack")
  acknowledgeAlarmPush(
    @Param("id") id: string,
    @Param("pushId") pushId: string,
    @Body()
    body: {
      operator?: string;
      remark?: string;
    },
  ) {
    return this.mockService.acknowledgeAlarmPush(id, pushId, body);
  }

  @Post("alarms/:id/escalations")
  escalateAlarm(
    @Param("id") id: string,
    @Body()
    body: {
      operator?: string;
      remark?: string;
      receiverName?: string;
      receiverPhone?: string;
      pushType?: string;
    },
  ) {
    return this.mockService.escalateAlarm(id, body);
  }

  @Post("alarms/:id/repair")
  createRepairFromAlarm(
    @Param("id") id: string,
    @Body()
    body: {
      description?: string;
      address?: string;
      handler?: string;
      operator?: string;
    },
  ) {
    return this.mockService.createRepairFromAlarm(id, body);
  }

  @Get("repairs")
  getRepairs() {
    return this.mockService.getRepairs();
  }

  @Post("repairs/import")
  importCustomerRepairs(
    @Body()
    body: {
      records?: Array<{
        btCode?: string;
        description?: string;
        address?: string;
        images?: string[];
      }>;
    },
  ) {
    return this.mockService.importCustomerRepairs(body);
  }

  @Post("repairs/batch/status")
  batchUpdateRepairStatus(
    @Body()
    body: {
      ids?: string[];
      status?: string;
      operator?: string;
      handler?: string;
      technician?: string;
      result?: string;
      remark?: string;
    },
  ) {
    return this.mockService.batchUpdateRepairStatus(body);
  }

  @Get("repairs/:id")
  getRepair(@Param("id") id: string) {
    return this.mockService.getRepair(id);
  }

  @Patch("repairs/:id/assignment")
  updateRepairAssignment(
    @Param("id") id: string,
    @Body()
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
    return this.mockService.updateRepairAssignment(id, body);
  }

  @Patch("repairs/:id/status")
  updateRepairStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status: string;
      operator?: string;
      handler?: string;
      technician?: string;
      result?: string;
      remark?: string;
    },
  ) {
    return this.mockService.updateRepairStatus(id, body);
  }

  @Post("repairs/:id/logs")
  addRepairLog(
    @Param("id") id: string,
    @Body()
    body: {
      action: string;
      result: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.addRepairLog(id, body);
  }

  @Post("repairs/:id/materials")
  addRepairMaterial(
    @Param("id") id: string,
    @Body()
    body: {
      name: string;
      quantity: number;
      amount?: number;
      remark?: string;
    },
  ) {
    return this.mockService.addRepairMaterial(id, body);
  }

  @Post("repairs/:id/images")
  addRepairImage(@Param("id") id: string, @Body() body: { name: string }) {
    return this.mockService.addRepairImage(id, body);
  }

  @Patch("repairs/:id/costs")
  updateRepairCost(
    @Param("id") id: string,
    @Body()
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
    return this.mockService.updateRepairCost(id, body);
  }

  @Post("files")
  @UseInterceptors(
    FilesInterceptor("files", 12, {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Array<Record<string, any>>,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.uploadFiles(files, body);
  }

  @Get("files/:id")
  getUploadedFile(@Param("id") id: string, @Res() res: any) {
    const { meta, buffer } = this.mockService.getUploadedFile(id);
    res.setHeader("Content-Type", meta.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(meta.fileName || meta.name)}`,
    );
    return res.send(buffer);
  }

  @Get("approvals")
  getApprovals() {
    return this.mockService.getApprovals();
  }

  @Get("approvals/:id")
  getApproval(@Param("id") id: string) {
    return this.mockService.getApproval(id);
  }

  @Post("approvals")
  createApproval(@Body() body: Record<string, any>) {
    return this.mockService.createApproval(body);
  }

  @Patch("approvals/:id")
  updateApproval(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.updateApproval(id, body);
  }

  @Patch("approvals/:id/action")
  actionApproval(@Param("id") id: string, @Body() body: Record<string, any>) {
    return this.mockService.actionApproval(id, body);
  }

  @Patch("approvals/:id/attachments")
  appendApprovalAttachments(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.mockService.appendApprovalAttachments(id, body);
  }

  @Delete("approvals/:id")
  deleteApproval(@Param("id") id: string) {
    return this.mockService.deleteApproval(id);
  }

  @Post("repairs/internal")
  createInternalRepair(
    @Body()
    body: {
      btCode: string;
      description: string;
      address: string;
      handler?: string;
    },
  ) {
    return this.mockService.createInternalRepair(body);
  }

  @Get("bills")
  getBills() {
    return this.mockService.getBills();
  }

  @Get("bills/:id")
  getBill(@Param("id") id: string) {
    return this.mockService.getBill(id);
  }

  @Get("finance/overview")
  getFinanceOverview() {
    return this.mockService.getFinanceOverview();
  }

  @Get("finance/customers")
  getFinanceCustomers() {
    return this.mockService.getFinanceCustomers();
  }

  @Get("finance/customers/:id")
  getFinanceCustomer(@Param("id") id: string) {
    return this.mockService.getFinanceCustomer(id);
  }

  @Post("finance/generate-due-bills")
  generateDueBills(@Body() body: { asOfDate?: string; operator?: string }) {
    return this.mockService.generateDueBills(body);
  }

  @Get("finance/scheduler")
  getFinanceScheduler() {
    return this.mockService.getFinanceScheduler();
  }

  @Post("finance/scheduler/run")
  runFinanceScheduler(
    @Body() body: { asOfDate?: string; operator?: string; trigger?: string },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.runFinanceScheduler({
      ...body,
      operator: body.operator || request.mockAuth.name,
      trigger: body.trigger || "MANUAL",
    });
  }

  @Get("finance/reconciliation")
  getFinanceReconciliation() {
    return this.mockService.getFinanceReconciliation();
  }

  @Get("automation")
  getAutomationStatus() {
    return this.mockService.getFinanceScheduler();
  }

  @Post("automation/run")
  runAutomation(@Body() body: Record<string, any>) {
    return this.mockService.runAutomationTasks(body);
  }

  @Patch("bills/:id/confirm")
  confirmBill(@Param("id") id: string, @Body() body: { operator?: string }) {
    return this.mockService.confirmBill(id, body);
  }

  @Patch("bills/:id/adjust")
  adjustBill(
    @Param("id") id: string,
    @Body()
    body: { receivableAmount: number; reason: string; operator?: string },
  ) {
    return this.mockService.adjustBill(id, body);
  }

  @Post("bills/:id/payments")
  registerPayment(
    @Param("id") id: string,
    @Body()
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
    return this.mockService.registerPayment(id, body);
  }

  @Post("bills/:id/payment-vouchers")
  submitPaymentVoucher(
    @Param("id") id: string,
    @Body()
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
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.submitPaymentVoucher(id, body, request.mockAuth);
  }

  @Patch("bills/:id/vouchers/:voucherId/reconcile")
  reconcilePaymentVoucher(
    @Param("id") id: string,
    @Param("voucherId") voucherId: string,
    @Body()
    body: {
      action?: "APPROVE" | "REJECT";
      remark?: string;
      operator?: string;
    },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.reconcilePaymentVoucher(
      id,
      voucherId,
      body,
      request.mockAuth,
    );
  }

  @Post("bills/:id/follow-ups")
  followUpBill(
    @Param("id") id: string,
    @Body()
    body: {
      method?: string;
      result?: string;
      promisedPayAt?: string;
      nextFollowUpAt?: string;
      remark?: string;
      operator?: string;
    },
  ) {
    return this.mockService.followUpBill(id, body);
  }

  @Get("system")
  getSystemManagement() {
    return this.mockService.getSystemManagement();
  }

  @Get("system/snapshot")
  getSystemConfigSnapshot() {
    return this.mockService.getSystemConfigSnapshot();
  }

  @Post("system/snapshot/restore")
  restoreSystemConfigSnapshot(@Body() body: unknown) {
    return this.mockService.restoreSystemConfigSnapshot(body);
  }

  @Post("system/snapshot/reset")
  resetSystemConfigDefaults() {
    return this.mockService.resetSystemConfigDefaults();
  }

  @Post("system/accounts")
  createSystemAccount(
    @Body()
    body: {
      type: "INTERNAL" | "CUSTOMER";
      username: string;
      name: string;
      roleId: string;
      department?: string;
      customerName?: string;
      phone?: string;
    },
  ) {
    return this.mockService.createSystemAccount(body);
  }

  @Patch("system/accounts/:id")
  updateSystemAccount(
    @Param("id") id: string,
    @Body()
    body: {
      type?: "INTERNAL" | "CUSTOMER";
      name?: string;
      roleId?: string;
      department?: string;
      customerName?: string;
      phone?: string;
    },
  ) {
    return this.mockService.updateSystemAccount(id, body);
  }

  @Delete("system/accounts/:id")
  deleteSystemAccount(@Param("id") id: string) {
    return this.mockService.deleteSystemAccount(id);
  }

  @Patch("system/accounts/:id/status")
  updateSystemAccountStatus(
    @Param("id") id: string,
    @Body() body: { enabled?: boolean },
  ) {
    return this.mockService.updateSystemAccountStatus(id, body);
  }

  @Post("system/accounts/:id/reset-password")
  resetSystemAccountPassword(@Param("id") id: string) {
    return this.mockService.resetSystemAccountPassword(id);
  }

  @Post("system/roles")
  createSystemRole(
    @Body()
    body: {
      name: string;
      scope?: "内部后台" | "客户移动端";
      dataScope?: string;
      description?: string;
      permissionCodes?: string[];
      copyFromRoleId?: string;
      riskNotes?: string[];
    },
  ) {
    return this.mockService.createSystemRole(body);
  }

  @Patch("system/roles/:id")
  updateSystemRole(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      dataScope?: string;
      description?: string;
      permissionCodes?: string[];
      riskNotes?: string[];
    },
  ) {
    return this.mockService.updateSystemRole(id, body);
  }

  @Delete("system/roles/:id")
  deleteSystemRole(@Param("id") id: string) {
    return this.mockService.deleteSystemRole(id);
  }

  @Patch("system/dictionaries/:groupCode/items/:itemCode")
  updateDictionaryItem(
    @Param("groupCode") groupCode: string,
    @Param("itemCode") itemCode: string,
    @Body()
    body: {
      label?: string;
      enabled?: boolean;
      businessRule?: string;
    },
  ) {
    return this.mockService.updateDictionaryItem(groupCode, itemCode, body);
  }

  @Post("system/interfaces/:id/test")
  testSystemInterface(@Param("id") id: string) {
    return this.mockService.testSystemInterface(id);
  }

  @Patch("system/interfaces/:id")
  updateSystemInterface(
    @Param("id") id: string,
    @Body()
    body: {
      endpoint?: string;
      requestMethod?: "GET" | "POST";
      syncInterval?: string;
      owner?: string;
      authMode?: string;
      credential?: string;
      timeoutMs?: number;
      enabled?: boolean;
    },
  ) {
    return this.mockService.updateSystemInterface(id, body);
  }

  @Post("system/approval-flows")
  createApprovalFlow(
    @Body()
    body: {
      name?: string;
      businessType?: string;
      enabled?: boolean;
      slaHours?: number;
      approvers?: string[];
    },
  ) {
    return this.mockService.createApprovalFlow(body);
  }

  @Patch("system/approval-flows/:id")
  updateApprovalFlow(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      businessType?: string;
      enabled?: boolean;
      slaHours?: number;
      approvers?: string[];
    },
  ) {
    return this.mockService.updateApprovalFlow(id, body);
  }

  @Delete("system/approval-flows/:id")
  deleteApprovalFlow(@Param("id") id: string) {
    return this.mockService.deleteApprovalFlow(id);
  }

  @Patch("system/parameters/:code")
  updateSystemParameter(
    @Param("code") code: string,
    @Body() body: { value?: number | string | boolean },
  ) {
    return this.mockService.updateSystemParameter(code, body);
  }

  @Get("customer/home")
  getCustomerHome(
    @Query() query: { role?: string },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.getCustomerHome(query, request.mockAuth);
  }

  @Post("customer/bills/:id/payment-vouchers")
  submitCustomerPaymentVoucher(
    @Param("id") id: string,
    @Body()
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
    },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.submitPaymentVoucher(id, body, request.mockAuth);
  }

  @Get("customer/repairs/:id")
  getCustomerRepair(
    @Param("id") id: string,
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.getCustomerRepair(id, request.mockAuth);
  }

  @Post("customer/repairs/:id/supplements")
  addCustomerRepairSupplement(
    @Param("id") id: string,
    @Body()
    body: {
      message?: string;
      images?: string[];
    },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.addCustomerRepairSupplement(id, body, request.mockAuth);
  }

  @Patch("customer/repairs/:id/confirm")
  confirmCustomerRepair(
    @Param("id") id: string,
    @Body() body: { remark?: string },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.confirmCustomerRepair(id, body, request.mockAuth);
  }

  @Post("customer/repair")
  createCustomerRepair(
    @Body()
    body: {
      btCode: string;
      description: string;
      address: string;
      images?: string[];
    },
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.createCustomerRepair(body, request.mockAuth);
  }

  @Patch("customer/outbounds/:id/receipt")
  confirmReceipt(
    @Param("id") id: string,
    @Req() request: { mockAuth: MockAuthContext },
  ) {
    return this.mockService.confirmReceipt(id, request.mockAuth);
  }
}
