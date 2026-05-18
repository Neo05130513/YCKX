<template>
  <div class="order-page" :class="{ 'is-detail': viewMode === 'detail' }">
    <template v-if="viewMode === 'list'">
      <aside class="order-left">
        <div class="tree-panel">
          <el-input v-model="customerKeyword" clearable placeholder="请输入客户名称" />
          <div class="customer-tree">
            <button :class="{ active: selectedCustomer === 'all' }" @click="selectedCustomer = 'all'">
              全部客户
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
            <span>订单筛选</span>
            <div class="scope-tabs">
              <button :class="{ active: ownerScope === 'all' }" @click="ownerScope = 'all'">全部</button>
              <button :class="{ active: ownerScope === 'mine' }" @click="ownerScope = 'mine'">本人</button>
            </div>
          </div>

          <button class="status-group" @click="leftFilter = 'all'">
            <span>订单状态({{ countByFilter("all") }})</span>
            <el-icon><ArrowUp /></el-icon>
          </button>

          <button
            v-for="item in statusFilters"
            :key="item.key"
            class="side-item"
            :class="{ active: leftFilter === item.key }"
            @click="leftFilter = item.key"
          >
            <span class="side-left">
              <el-icon><component :is="item.icon" /></el-icon>
              {{ item.label }}({{ countByFilter(item.key) }})
            </span>
          </button>

          <button class="side-item" :class="{ active: leftFilter === 'overdue' }" @click="leftFilter = 'overdue'">
            <span class="side-left">
              <el-icon><Warning /></el-icon>
              逾期({{ countByFilter("overdue") }})
            </span>
            <el-icon class="right-icon"><ArrowDown /></el-icon>
          </button>
          <button class="side-item" @click="openContractArchiveQueue">
            <span class="side-left">
              <el-icon><Document /></el-icon>
              合同归档
            </span>
          </button>
          <button class="side-item" @click="openReserved('分组管理')">
            <span class="side-left">
              <el-icon><Operation /></el-icon>
              分组管理
            </span>
          </button>
        </div>
      </aside>

      <main class="order-main">
        <div class="target-tabs">
          <button :class="{ active: activeListTab === 'orders' }" @click="activeListTab = 'orders'">
            订单列表
          </button>
          <button :class="{ active: activeListTab === 'outbound' }" @click="activeListTab = 'outbound'">
            出库进度
          </button>
          <button :class="{ active: activeListTab === 'finance' }" @click="activeListTab = 'finance'">
            账单回款
          </button>
        </div>

        <div class="list-toolbar">
          <div class="toolbar-left">
            <el-select v-model="queryField" class="field-select">
              <el-option label="订单号" value="orderNo" />
              <el-option label="客户" value="customerName" />
              <el-option label="合同号" value="contractNo" />
              <el-option label="销售" value="salesOwner" />
            </el-select>
            <el-input v-model="keyword" clearable placeholder="请输入内容">
              <template #append>
                <el-button :icon="Search" @click="noopSearch" />
              </template>
            </el-input>
            <el-button type="primary" @click="openReserved('分组查询')">分组查询</el-button>
            <el-button type="primary" @click="openReserved('更多筛选')">更多</el-button>
            <el-button type="primary" @click="resetQuery">重置</el-button>
          </div>
          <div class="toolbar-right">
            <el-button type="primary" @click="openCreate">
              <el-icon><Plus /></el-icon>
              新建订单
            </el-button>
            <el-button @click="openOutbound()">创建出库</el-button>
            <el-button :loading="submitting" @click="runAutoReceive">执行自动收货</el-button>
            <el-button @click="exportCsv">导出</el-button>
            <el-dropdown trigger="click" @command="openReserved">
              <el-button>
                批量操作
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="批量生成账单">批量生成账单</el-dropdown-item>
                  <el-dropdown-item command="批量催收">批量催收</el-dropdown-item>
                  <el-dropdown-item command="批量合同归档">批量合同归档</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div class="order-summary-line">
          <div>
            <span>订单总数</span>
            <strong>{{ filteredRows.length }}</strong>
          </div>
          <div>
            <span>租赁中</span>
            <strong>{{ summary.leasing }}</strong>
          </div>
          <div>
            <span>待出库</span>
            <strong>{{ summary.pendingOutbound }}</strong>
          </div>
          <div class="danger">
            <span>逾期欠款</span>
            <strong>{{ money(summary.overdueAmount) }}</strong>
          </div>
        </div>

        <el-table
          :data="filteredRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          :row-class-name="tableRowClassName"
          @row-dblclick="openDetail"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column prop="orderNo" label="订单号" width="154" fixed show-overflow-tooltip />
          <el-table-column prop="customerShortName" label="客户" min-width="130" fixed show-overflow-tooltip />
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <span class="order-status" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="合同" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="contract-text">{{ row.contractNo }}</span>
              <em class="contract-state">{{ row.contractStatus }}</em>
            </template>
          </el-table-column>
          <el-table-column label="租期" width="174">
            <template #default="{ row }">{{ row.leaseStart }} 至 {{ row.leaseEnd }}</template>
          </el-table-column>
          <el-table-column label="月租" width="96" align="right">
            <template #default="{ row }">{{ money(row.monthlyRent) }}</template>
          </el-table-column>
          <el-table-column label="账单日" width="80" align="center">
            <template #default="{ row }">每月{{ row.billingDay }}日</template>
          </el-table-column>
          <el-table-column label="出库进度" width="140">
            <template #default="{ row }">
              <div class="progress-cell">
                <span>{{ row.outboundProgress }}</span>
                <i><em :style="{ width: progressPercent(row) + '%' }"></em></i>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="pendingReceiptCount" label="待收货" width="76" align="right" />
          <el-table-column label="应收" width="100" align="right">
            <template #default="{ row }">{{ money(row.receivableAmount) }}</template>
          </el-table-column>
          <el-table-column label="已收" width="100" align="right">
            <template #default="{ row }">{{ money(row.paidAmount) }}</template>
          </el-table-column>
          <el-table-column label="欠款" width="100" align="right">
            <template #default="{ row }">
              <span :class="{ 'danger-text': row.debtAmount > 0 }">{{ money(row.debtAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="下次出账" width="110" prop="nextBillingDate" />
          <el-table-column prop="salesOwner" label="销售" width="86" />
          <el-table-column prop="updatedAt" label="更新时间" width="150" />
          <el-table-column label="操作" width="128" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
                <el-button text type="primary" @click.stop="openReserved('订单操作')">更多</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </template>

    <template v-else>
      <div class="order-detail-page">
        <div class="panel-top">
          <div class="nav-box">
            <button
              v-for="tab in detailTabs"
              :key="tab.value"
              class="item"
              :class="{ active: activeDetailTab === tab.value }"
              @click="activeDetailTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
          <div v-if="detail && detail.overdueAmount > 0" class="order-tips">
            当前订单存在逾期欠款 {{ money(detail.overdueAmount) }}
          </div>
          <div class="tools-box">
            <el-button size="small" @click="backToList">
              <el-icon><Back /></el-icon>
              返回列表
            </el-button>
            <el-button size="small" :icon="Refresh" @click="refreshDetail">刷新</el-button>
            <el-button v-if="detail && detail.status === 'DRAFT'" size="small" @click="submitApproval">
              发起会签
            </el-button>
            <el-button v-if="detail && detail.status === 'APPROVING'" size="small" type="primary" @click="approveContract">
              会签通过
            </el-button>
            <el-button v-if="detail && canArchiveContract(detail)" size="small" @click="archiveContract">
              <el-icon><Upload /></el-icon>
              归档合同
            </el-button>
            <el-button v-if="detail && canRenewOrder(detail)" size="small" @click="openRenewOrder">
              续租
            </el-button>
            <el-button v-if="detail && canReturnLease(detail)" size="small" type="warning" plain @click="openReturnLease">
              退租
            </el-button>
            <el-button v-if="detail && canSettleReturn(detail)" size="small" type="success" @click="openSettleReturn">
              退租结清
            </el-button>
            <el-button v-if="detail && canCompleteOrder(detail)" size="small" type="success" @click="completeOrder">
              完成订单
            </el-button>
            <el-button v-if="detail && canCancelOrder(detail)" size="small" type="danger" plain @click="cancelOrder">
              取消订单
            </el-button>
            <el-button v-if="detail && canCreateOutbound(detail)" size="small" type="primary" @click="openOutbound(detail)">
              <el-icon><Box /></el-icon>
              出库
            </el-button>
          </div>
        </div>

        <div v-if="detail" class="panel-content">
          <section v-if="activeDetailTab === 'summary'" class="order-bms-content">
            <div class="content-l">
              <div class="order-card">
                <div class="order-first">
                  <div>
                    <span class="order-no">{{ detail.orderNo }}</span>
                    <span class="order-status big" :class="statusClass(detail.status)">
                      {{ statusLabel(detail.status) }}
                    </span>
                    <span class="signal-bars">
                      <i></i><i></i><i></i>
                      {{ detail.pendingReceiptCount }} 待收货
                    </span>
                  </div>
                  <div class="order-belong">
                    <el-icon><UserFilled /></el-icon>
                    {{ detail.customerShortName || detail.customerName }}
                  </div>
                </div>

                <div class="order-second">
                  <div class="second-l">{{ detail.contractName }}</div>
                  <div class="second-r">更新时间：{{ detail.updatedAt }}</div>
                </div>

                <div class="order-third">
                  <div class="third-l">
                    <div class="delivery-battery">
                      <div class="battery-top"></div>
                      <div class="fill-bg" :style="{ height: `${progressPercent(detail)}%` }"></div>
                      <div class="value">
                        {{ detail.outboundCount }}<small>/{{ detail.orderedBatteryCount }}</small>
                      </div>
                    </div>
                    <div class="delivery-status">已出库电池</div>
                  </div>

                  <div class="third-r">
                    <div v-for="metric in detailMetrics" :key="metric.label" class="third-r-item">
                      <div class="wrap">
                        <div class="item-t">
                          <el-icon><component :is="metric.icon" /></el-icon>
                          <span class="label">{{ metric.label }}</span>
                        </div>
                        <div class="item-b">{{ metric.value }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="order-fourth">
                  <div class="fourth-t">
                    <div v-for="item in processCards" :key="item.label" class="process-item">
                      <span class="icon-box" :class="item.tone">
                        <el-icon><component :is="item.icon" /></el-icon>
                      </span>
                      <div>
                        <div class="fourth-label">{{ item.label }}</div>
                        <strong>{{ item.value }}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="fourth-line"></div>
                  <div class="fourth-b">
                    <div v-for="item in financeCards" :key="item.label" class="fourth-b-item">
                      <div class="item-val" :class="item.tone">{{ item.value }}</div>
                      <div class="item-label">{{ item.label }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="timeline-panel">
                <div class="panel-title">订单履约记录</div>
                <div class="timeline-list">
                  <div v-for="item in detail.timeline || []" :key="`${item.time}-${item.title}`" class="timeline-item">
                    <span></span>
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p>{{ item.content }}</p>
                      <em>{{ item.time }}</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="content-r">
              <div class="chart-panel">
                <div v-for="card in financeCards" :key="card.label" class="chart-item">
                  <div class="chart-title">{{ card.label }}</div>
                  <div class="chart-val" :class="card.tone">{{ card.value }}</div>
                  <div class="mini-line-chart">
                    <span style="top: 34%"></span>
                    <span style="top: 60%"></span>
                    <em style="left: 12%"></em>
                    <em style="left: 42%"></em>
                    <em style="left: 72%"></em>
                  </div>
                </div>
              </div>

              <div class="right-b">
                <div class="mini-panel">
                  <div class="panel-title">已绑定电池</div>
                  <el-table :data="detail.batteries || []" height="calc(100% - 32px)" class="mini-table">
                    <el-table-column prop="btCode" label="BT码" min-width="140" />
                    <el-table-column prop="runningStatus" label="状态" width="100">
                      <template #default="{ row }">{{ runningStatusLabel(row.runningStatus) }}</template>
                    </el-table-column>
                    <el-table-column label="电量" width="70" align="right">
                      <template #default="{ row }">{{ row.powerPercent }}%</template>
                    </el-table-column>
                    <el-table-column prop="updatedAt" label="更新" width="130" />
                  </el-table>
                </div>

                <div class="mini-panel">
                  <div class="panel-title">出库与收货</div>
                  <div class="receipt-map">
                    <div class="receipt-node done">合同</div>
                    <div class="receipt-line done"></div>
                    <div class="receipt-node" :class="{ done: detail.outboundCount > 0 }">出库</div>
                    <div class="receipt-line" :class="{ done: detail.receivedCount > 0 }"></div>
                    <div class="receipt-node" :class="{ done: detail.pendingReceiptCount === 0 && detail.outboundCount > 0 }">
                      收货
                    </div>
                  </div>
                  <div class="receipt-stats">
                    <div>
                      <span>应出库</span>
                      <strong>{{ detail.orderedBatteryCount }}</strong>
                    </div>
                    <div>
                      <span>已出库</span>
                      <strong>{{ detail.outboundCount }}</strong>
                    </div>
                    <div>
                      <span>已收货</span>
                      <strong>{{ detail.receivedCount }}</strong>
                    </div>
                    <div>
                      <span>待收货</span>
                      <strong>{{ detail.pendingReceiptCount }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeDetailTab === 'contract'" class="record-page">
            <div class="record-head">
              <strong>合同信息</strong>
              <div class="record-actions">
                <el-button v-if="detail.status === 'DRAFT'" type="primary" @click="submitApproval">发起合同会签</el-button>
                <el-button v-if="detail.status === 'APPROVING'" type="success" @click="approveContract">模拟会签通过</el-button>
                <el-button v-if="canArchiveContract(detail)" @click="archiveContract">
                  <el-icon><Upload /></el-icon>
                  归档合同
                </el-button>
              </div>
            </div>
            <div class="record-content">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="合同名称">{{ detail.contract?.name || detail.contractName }}</el-descriptions-item>
                <el-descriptions-item label="合同编号">{{ detail.contract?.contractNo || detail.contractNo }}</el-descriptions-item>
                <el-descriptions-item label="合同状态">{{ detail.contract?.status || detail.contractStatus }}</el-descriptions-item>
                <el-descriptions-item label="会签单号">{{ detail.contract?.approvalNo || "--" }}</el-descriptions-item>
                <el-descriptions-item label="签署日期">{{ detail.contract?.signDate || "--" }}</el-descriptions-item>
                <el-descriptions-item label="附件">{{ detail.contract?.fileName || "--" }}</el-descriptions-item>
              </el-descriptions>
              <el-table :data="detail.approvals || []" border class="record-table inner">
                <el-table-column prop="node" label="审批节点" width="140" />
                <el-table-column prop="operator" label="处理人" width="120" />
                <el-table-column prop="result" label="结果" width="100" />
                <el-table-column prop="time" label="处理时间" width="170" />
                <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
              </el-table>
            </div>
          </section>

          <section v-else-if="activeDetailTab === 'batteries'" class="record-page">
            <div class="record-head">
              <strong>电池明细</strong>
              <el-button v-if="canCreateOutbound(detail)" class="right-action" @click="openOutbound(detail)">出库绑定BT码</el-button>
            </div>
            <el-table :data="detail.batteries || []" border stripe height="calc(100% - 58px)" class="record-table">
              <el-table-column prop="btCode" label="BT码" width="150" />
              <el-table-column prop="deviceNum" label="设备编号" width="150" />
              <el-table-column prop="model" label="型号" width="110" />
              <el-table-column prop="sourcePlatform" label="平台" width="100" />
              <el-table-column label="运行状态" width="110">
                <template #default="{ row }">{{ runningStatusLabel(row.runningStatus) }}</template>
              </el-table-column>
              <el-table-column prop="assetStatus" label="资产状态" width="110" />
              <el-table-column label="电量" width="80" align="right">
                <template #default="{ row }">{{ row.powerPercent }}%</template>
              </el-table-column>
              <el-table-column prop="location" label="位置" min-width="120" />
              <el-table-column prop="updatedAt" label="更新时间" width="160" />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'outbounds'" class="record-page">
            <div class="record-head">
              <strong>出库单</strong>
              <el-button v-if="canCreateOutbound(detail)" class="right-action" type="primary" @click="openOutbound(detail)">创建出库</el-button>
            </div>
            <el-table :data="detail.outbounds || []" border stripe height="calc(100% - 58px)" class="record-table">
              <el-table-column prop="outboundNo" label="出库单号" width="160" />
              <el-table-column label="状态" width="110">
                <template #default="{ row }">{{ outboundStatusLabel(row.status) }}</template>
              </el-table-column>
              <el-table-column prop="warehouse" label="仓库" width="120" />
              <el-table-column prop="operator" label="经办人" width="100" />
              <el-table-column prop="outboundAt" label="出库日期" width="120" />
              <el-table-column prop="autoReceiveAt" label="自动收货日" width="120" />
              <el-table-column prop="receivedAt" label="收货时间" width="160" />
              <el-table-column label="BT码" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">{{ row.btCodes?.join("、") }}</template>
              </el-table-column>
              <el-table-column label="操作" width="116" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="row.status === 'PENDING_RECEIPT'"
                    text
                    type="primary"
                    @click="confirmOutboundReceipt(row)"
                  >
                    确认收货
                  </el-button>
                  <span v-else class="muted-text">已完成</span>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'bills'" class="record-page">
            <div class="record-head">
              <strong>账单回款</strong>
              <div class="record-actions">
                <el-button v-if="canGenerateOrderBill(detail)" type="primary" @click="generateOrderBill">生成下期账单</el-button>
                <el-button @click="openPayment()">登记回款</el-button>
              </div>
            </div>
            <el-table :data="detail.bills || []" border stripe height="calc(100% - 58px)" class="record-table">
              <el-table-column prop="billNo" label="账单号" width="150" />
              <el-table-column prop="period" label="账期" width="90" />
              <el-table-column label="应收" width="110" align="right">
                <template #default="{ row }">{{ money(row.receivableAmount) }}</template>
              </el-table-column>
              <el-table-column label="已收" width="110" align="right">
                <template #default="{ row }">{{ money(row.paidAmount) }}</template>
              </el-table-column>
              <el-table-column label="欠款" width="110" align="right">
                <template #default="{ row }">
                  <span :class="{ 'danger-text': row.debtAmount > 0 }">{{ money(row.debtAmount) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">{{ billStatusLabel(row.status) }}</template>
              </el-table-column>
              <el-table-column prop="generatedAt" label="生成日期" width="120" />
              <el-table-column prop="dueDate" label="最晚付款日" width="120" />
              <el-table-column label="回款记录" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">
                  <span v-if="row.payments?.length">{{ formatPayments(row.payments) }}</span>
                  <span v-else>--</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="168" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button v-if="row.canConfirm" text type="primary" @click.stop="confirmBill(row)">确认</el-button>
                    <el-button
                      text
                      type="primary"
                      :disabled="!row.canRegisterPayment"
                      @click.stop="openPayment(row)"
                    >
                      回款
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section v-else class="record-page">
            <div class="record-head">
              <strong>报修记录</strong>
              <el-button class="right-action" @click="openReserved('新增报修')">新增报修</el-button>
            </div>
            <el-table :data="detail.repairs || []" border stripe height="calc(100% - 58px)" class="record-table">
              <el-table-column prop="repairNo" label="报修单号" width="160" />
              <el-table-column prop="btCode" label="BT码" width="150" />
              <el-table-column label="状态" width="110">
                <template #default="{ row }">{{ repairStatusLabel(row.status) }}</template>
              </el-table-column>
              <el-table-column prop="handler" label="处理人" width="110" />
              <el-table-column prop="description" label="故障描述" min-width="260" show-overflow-tooltip />
              <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
              <el-table-column prop="createdAt" label="提交时间" width="160" />
            </el-table>
          </section>
        </div>
      </div>
    </template>

    <el-dialog v-model="createVisible" title="新建租赁订单" width="760px" class="create-dialog">
      <el-form :model="createForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户名称">
              <el-input v-model="createForm.customerName" placeholder="请输入客户名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="createForm.customerContact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="createForm.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所在区域">
              <el-input v-model="createForm.region" placeholder="例如 郑州高新区" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租期开始">
              <el-date-picker v-model="createForm.leaseStart" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租期结束">
              <el-date-picker v-model="createForm.leaseEnd" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="电池数量">
              <el-input-number v-model="createForm.orderedBatteryCount" :min="1" :max="999" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="月租">
              <el-input-number v-model="createForm.monthlyRent" :min="0" :step="100" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="押金">
              <el-input-number v-model="createForm.depositAmount" :min="0" :step="500" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="账单日">
              <el-input-number v-model="createForm.billingDay" :min="1" :max="28" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="销售负责人">
              <el-input v-model="createForm.salesOwner" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同名称">
              <el-input v-model="createForm.contractName" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="createForm.remark" type="textarea" :rows="3" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="createOrder">创建订单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="outboundVisible" title="创建出库单并绑定 BT 码" width="720px" class="outbound-dialog">
      <el-form :model="outboundForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="租赁订单">
              <el-select v-model="outboundForm.orderId" filterable placeholder="请选择已会签订单">
                <el-option
                  v-for="item in outboundCandidateRows"
                  :key="item.id"
                  :label="`${item.orderNo} / ${item.customerShortName || item.customerName}`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库仓库">
              <el-input v-model="outboundForm.warehouse" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经办人">
              <el-input v-model="outboundForm.operator" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收货人">
              <el-input v-model="outboundForm.receiver" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库日期">
              <el-date-picker v-model="outboundForm.outboundAt" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="收货地址">
              <el-input v-model="outboundForm.address" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="BT码">
              <el-input
                v-model="outboundForm.btCodes"
                type="textarea"
                :rows="4"
                placeholder="一行一个 BT 码，或用逗号分隔"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <div class="dialog-hint">
              <strong>剩余可出库：</strong>{{ selectedOutboundOrder ? remainingOutboundCount(selectedOutboundOrder) : 0 }} 组；
              当前样例库存可用 BT 码：BT202605170003。
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="outboundVisible = false">取消</el-button>
        <el-button type="primary" @click="createOutbound">确认出库</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="renewVisible" title="办理订单续租" width="620px">
      <el-form :model="renewForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="新租期结束">
              <el-date-picker v-model="renewForm.leaseEnd" value-format="YYYY-MM-DD" type="date" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月租">
              <el-input-number v-model="renewForm.monthlyRent" :min="1" :step="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="押金">
              <el-input-number v-model="renewForm.depositAmount" :min="0" :step="500" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="账单日">
              <el-input-number v-model="renewForm.billingDay" :min="1" :max="28" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经办人">
              <el-input v-model="renewForm.operator" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="续租说明">
              <el-input v-model="renewForm.remark" type="textarea" :rows="3" placeholder="填写续租原因、价格调整或补充协议说明" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <div class="dialog-hint">
              续租会更新订单租期、月租和合同状态，并在履约记录中生成续租节点。
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="renewVisible = false">取消</el-button>
        <el-button type="primary" @click="renewOrder">确认续租</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="returnVisible" title="办理退租入库" width="660px">
      <el-form :model="returnForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="退回仓库">
              <el-input v-model="returnForm.warehouse" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经办人">
              <el-input v-model="returnForm.operator" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="退租范围">
              <el-checkbox v-model="returnForm.returnAll">退回当前全部在租电池</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="BT码">
              <el-input
                v-model="returnForm.btCodes"
                type="textarea"
                :rows="4"
                :disabled="returnForm.returnAll"
                placeholder="退回部分电池时填写，一行一个 BT 码"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="退租说明">
              <el-input v-model="returnForm.remark" type="textarea" :rows="3" placeholder="填写退租原因、现场交接或结算说明" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <div class="dialog-hint">
              全部退租会先退回资产；若存在欠款，订单进入退租结算中，结清后可完成订单。
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="returnVisible = false">取消</el-button>
        <el-button type="warning" @click="returnLease">确认退租</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="settlementVisible" title="退租结清" width="560px">
      <el-form :model="settlementForm" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="dialog-metric">
              <span>当前欠款</span>
              <strong>{{ money(detail?.debtAmount || 0) }}</strong>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="dialog-metric">
              <span>退回仓库</span>
              <strong>{{ detail?.returnWarehouse || "--" }}</strong>
            </div>
          </el-col>
          <el-col :span="24">
            <el-form-item label="同步回款">
              <el-checkbox v-model="settlementForm.collectOutstanding" :disabled="!detail || detail.debtAmount <= 0">
                将当前未结清账单按本次收款方式一次性结清
              </el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收款方式">
              <el-select v-model="settlementForm.method">
                <el-option label="银行转账" value="银行转账" />
                <el-option label="微信转账" value="微信转账" />
                <el-option label="支付宝" value="支付宝" />
                <el-option label="现金" value="现金" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="到账时间">
              <el-date-picker v-model="settlementForm.paidAt" type="datetime" value-format="YYYY-MM-DD HH:mm" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结清经办人">
              <el-input v-model="settlementForm.operator" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="结算说明">
              <el-input v-model="settlementForm.remark" type="textarea" :rows="3" placeholder="填写退租尾款、对账流水或合同终止说明" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <div class="dialog-hint">
              退租结清会校验资产已全部退回；若勾选同步回款，系统会自动确认未确认账单并登记剩余欠款回款。
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="settlementVisible = false">取消</el-button>
        <el-button type="success" :loading="submitting" @click="settleReturnOrder">确认结清</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="paymentVisible" title="登记订单回款" width="480px">
      <el-form label-position="top">
        <el-form-item label="账单">
          <el-input :model-value="selectedBill?.billNo || '--'" disabled />
        </el-form-item>
        <el-form-item label="回款金额">
          <el-input-number
            v-model="paymentForm.amount"
            :min="0"
            :max="selectedBill?.debtAmount || 0"
            :precision="2"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="到账时间">
          <el-date-picker v-model="paymentForm.paidAt" type="datetime" value-format="YYYY-MM-DD HH:mm" />
        </el-form-item>
        <el-form-item label="收款方式">
          <el-select v-model="paymentForm.method">
            <el-option label="银行转账" value="银行转账" />
            <el-option label="微信转账" value="微信转账" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="现金" value="现金" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="paymentForm.remark" type="textarea" :rows="3" placeholder="填写付款流水、对账说明等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPayment">保存回款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowDown,
  ArrowUp,
  Back,
  Box,
  CircleCheck,
  Document,
  Money,
  Operation,
  Plus,
  Refresh,
  Search,
  Tickets,
  Timer,
  Upload,
  UserFilled,
  Warning,
} from "@element-plus/icons-vue";
import { getMock, patchMock, postMock } from "../api/http";

type PaymentRow = {
  paymentNo: string;
  amount: number;
  paidAt: string;
  method: string;
  remark: string;
};

type BillRow = {
  id: string;
  billNo: string;
  period: string;
  receivableAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: string;
  generatedAt: string;
  dueDate?: string;
  confirmedAt?: string;
  statusLabel?: string;
  canConfirm?: boolean;
  canRegisterPayment?: boolean;
  payments?: PaymentRow[];
};

type OrderRow = {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerShortName?: string;
  customerContact?: string;
  contactPhone?: string;
  region?: string;
  status: string;
  leaseStart: string;
  leaseEnd: string;
  billingDay: number;
  monthlyRent: number;
  depositAmount?: number;
  orderedBatteryCount: number;
  batteryCount: number;
  outboundProgress: string;
  outboundCount: number;
  receivedCount: number;
  pendingReceiptCount: number;
  receivableAmount: number;
  paidAmount: number;
  debtAmount: number;
  overdueAmount: number;
  currentPeriod?: string;
  nextBillingDate?: string;
  salesOwner?: string;
  assetOwner?: string;
  financeOwner?: string;
  renewalCount?: number;
  renewalDesc?: string;
  returnedAt?: string;
  returnWarehouse?: string;
  returnSettlementAt?: string;
  returnSettlementAmount?: number;
  contractName: string;
  contractNo?: string;
  contractStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  remark?: string;
};

type OrderDetail = OrderRow & {
  contract?: Record<string, string>;
  approvals?: Array<Record<string, string>>;
  timeline?: Array<{ time: string; title: string; content: string }>;
  leaseChanges?: Array<Record<string, any>>;
  batteries?: Array<Record<string, any>>;
  outbounds?: Array<Record<string, any>>;
  bills?: BillRow[];
  repairs?: Array<Record<string, any>>;
};

const rows = ref<OrderRow[]>([]);
const detail = ref<OrderDetail | null>(null);
const viewMode = ref<"list" | "detail">("list");
const activeListTab = ref<"orders" | "outbound" | "finance">("orders");
const activeDetailTab = ref("summary");
const selectedCustomer = ref("all");
const customerKeyword = ref("");
const ownerScope = ref<"all" | "mine">("all");
const leftFilter = ref("all");
const queryField = ref<keyof OrderRow>("orderNo");
const keyword = ref("");
const createVisible = ref(false);
const paymentVisible = ref(false);
const renewVisible = ref(false);
const returnVisible = ref(false);
const settlementVisible = ref(false);
const selectedBill = ref<BillRow | null>(null);
const submitting = ref(false);

const createForm = ref({
  customerName: "",
  customerContact: "",
  contactPhone: "",
  region: "",
  leaseStart: "2026-06-01",
  leaseEnd: "2027-05-31",
  orderedBatteryCount: 5,
  monthlyRent: 8000,
  depositAmount: 12000,
  billingDay: 5,
  salesOwner: "刘销售",
  contractName: "",
  remark: "",
});

const outboundVisible = ref(false);
const outboundForm = ref({
  orderId: "",
  warehouse: "郑州总仓",
  operator: "王库管",
  receiver: "",
  address: "",
  outboundAt: "2026-05-18",
  btCodes: "BT202605170003",
});

const paymentForm = ref({
  amount: 0,
  paidAt: "",
  method: "银行转账",
  remark: "",
});

const renewForm = ref({
  leaseEnd: "",
  monthlyRent: 0,
  depositAmount: 0,
  billingDay: 5,
  operator: "刘销售",
  remark: "",
});

const returnForm = ref({
  returnAll: true,
  btCodes: "",
  warehouse: "郑州总仓",
  operator: "王库管",
  remark: "",
});

const settlementForm = ref({
  collectOutstanding: true,
  method: "银行转账",
  paidAt: "",
  operator: "赵财务",
  remark: "",
});

const statusMap: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "neutral" },
  APPROVING: { label: "会签中", className: "warning" },
  PENDING_OUTBOUND: { label: "待出库", className: "primary" },
  PARTIALLY_OUTBOUND: { label: "部分出库", className: "purple" },
  PENDING_RECEIPT: { label: "待收货", className: "warning" },
  LEASING: { label: "租赁中", className: "success" },
  RETURNING: { label: "退租结算", className: "warning" },
  COMPLETED: { label: "已完成", className: "neutral" },
  CANCELLED: { label: "已取消", className: "danger" },
};

const statusFilters = [
  { key: "PENDING_OUTBOUND", label: "待出库", icon: Box },
  { key: "PARTIALLY_OUTBOUND", label: "部分出库", icon: Tickets },
  { key: "PENDING_RECEIPT", label: "待收货", icon: Timer },
  { key: "LEASING", label: "租赁中", icon: CircleCheck },
  { key: "RETURNING", label: "退租结算", icon: Warning },
];

const detailTabs = [
  { value: "summary", label: "订单概览" },
  { value: "contract", label: "合同信息" },
  { value: "batteries", label: "电池明细" },
  { value: "outbounds", label: "出库单" },
  { value: "bills", label: "账单回款" },
  { value: "repairs", label: "报修记录" },
];

const customers = computed(() =>
  Array.from(new Set(rows.value.map((item) => item.customerShortName || item.customerName))),
);

const filteredCustomers = computed(() => {
  const text = customerKeyword.value.trim();
  if (!text) return customers.value;
  return customers.value.filter((item) => item.includes(text));
});

const visibleRows = computed(() => {
  return rows.value.filter((row) => {
    if (selectedCustomer.value !== "all" && (row.customerShortName || row.customerName) !== selectedCustomer.value) {
      return false;
    }
    if (ownerScope.value === "mine" && row.salesOwner !== "刘销售") return false;
    return true;
  });
});

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return visibleRows.value.filter((row) => {
    if (leftFilter.value === "overdue" && row.overdueAmount <= 0) return false;
    if (leftFilter.value !== "all" && leftFilter.value !== "overdue" && row.status !== leftFilter.value) return false;
    if (activeListTab.value === "outbound" && row.outboundCount >= row.orderedBatteryCount && row.pendingReceiptCount === 0) {
      return false;
    }
    if (activeListTab.value === "finance" && row.receivableAmount <= 0 && row.debtAmount <= 0) return false;
    if (!text) return true;
    const value = String(row[queryField.value] ?? "").toLowerCase();
    return value.includes(text);
  });
});

const summary = computed(() => ({
  leasing: filteredRows.value.filter((row) => row.status === "LEASING").length,
  pendingOutbound: filteredRows.value.filter((row) => ["PENDING_OUTBOUND", "PARTIALLY_OUTBOUND"].includes(row.status)).length,
  overdueAmount: filteredRows.value.reduce((sum, row) => sum + (row.overdueAmount || 0), 0),
}));

const outboundCandidateRows = computed(() =>
  rows.value.filter((row) => canCreateOutbound(row)),
);

const selectedOutboundOrder = computed(() =>
  rows.value.find((row) => row.id === outboundForm.value.orderId) || detail.value,
);

const detailMetrics = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "月租金额", value: money(detail.value.monthlyRent), icon: Money },
    { label: "账单日", value: `每月${detail.value.billingDay}日`, icon: Timer },
    { label: "租赁数量", value: `${detail.value.orderedBatteryCount}组`, icon: Box },
    { label: "销售人员", value: detail.value.salesOwner || "--", icon: UserFilled },
  ];
});

const processCards = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "合同", value: detail.value.contractStatus || "--", tone: "blue", icon: Document },
    { label: "出库", value: detail.value.outboundProgress, tone: "mint", icon: Box },
    { label: "收货", value: `${detail.value.receivedCount}已收/${detail.value.pendingReceiptCount}待收`, tone: "yellow", icon: CircleCheck },
  ];
});

const financeCards = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "累计应收", value: money(detail.value.receivableAmount), tone: "blue" },
    { label: "累计已收", value: money(detail.value.paidAmount), tone: "green" },
    { label: "当前欠款", value: money(detail.value.debtAmount), tone: detail.value.debtAmount > 0 ? "red" : "green" },
  ];
});

function normalizeOrder(row: Partial<OrderRow>): OrderRow {
  const orderedBatteryCount = Number(row.orderedBatteryCount ?? row.batteryCount ?? 0);
  const outboundCount = Number(row.outboundCount ?? row.batteryCount ?? 0);
  const receivedCount = Number(row.receivedCount ?? 0);
  const pendingReceiptCount = Number(row.pendingReceiptCount ?? Math.max(0, outboundCount - receivedCount));
  return {
    id: row.id || `local-${Date.now()}`,
    orderNo: row.orderNo || "",
    customerId: row.customerId || "",
    customerName: row.customerName || "",
    customerShortName: row.customerShortName || row.customerName || "",
    customerContact: row.customerContact || "",
    contactPhone: row.contactPhone || "",
    region: row.region || "",
    status: row.status || "DRAFT",
    leaseStart: row.leaseStart || "",
    leaseEnd: row.leaseEnd || "",
    billingDay: Number(row.billingDay ?? 5),
    monthlyRent: Number(row.monthlyRent ?? 0),
    depositAmount: Number(row.depositAmount ?? 0),
    orderedBatteryCount,
    batteryCount: Number(row.batteryCount ?? outboundCount),
    outboundProgress: row.outboundProgress || `${outboundCount}/${orderedBatteryCount}`,
    outboundCount,
    receivedCount,
    pendingReceiptCount,
    receivableAmount: Number(row.receivableAmount ?? 0),
    paidAmount: Number(row.paidAmount ?? 0),
    debtAmount: Number(row.debtAmount ?? 0),
    overdueAmount: Number(row.overdueAmount ?? 0),
    currentPeriod: row.currentPeriod || "",
    nextBillingDate: row.nextBillingDate || "",
    salesOwner: row.salesOwner || "刘销售",
    assetOwner: row.assetOwner || "王库管",
    financeOwner: row.financeOwner || "赵财务",
    renewalCount: Number(row.renewalCount ?? 0),
    renewalDesc: row.renewalDesc || "",
    returnedAt: row.returnedAt || "",
    returnWarehouse: row.returnWarehouse || "",
    returnSettlementAt: row.returnSettlementAt || "",
    returnSettlementAmount: Number(row.returnSettlementAmount ?? 0),
    contractName: row.contractName || "",
    contractNo: row.contractNo || "",
    contractStatus: row.contractStatus || "待会签",
    createdAt: row.createdAt || "",
    updatedAt: row.updatedAt || "",
    remark: row.remark || "",
  };
}

function countByFilter(key: string) {
  if (key === "all") return visibleRows.value.length;
  if (key === "overdue") return visibleRows.value.filter((row) => row.overdueAmount > 0).length;
  return visibleRows.value.filter((row) => row.status === key).length;
}

function statusLabel(status: string) {
  return statusMap[status]?.label || status;
}

function statusClass(status: string) {
  return statusMap[status]?.className || "neutral";
}

function progressPercent(row: OrderRow) {
  if (!row.orderedBatteryCount) return 0;
  return Math.min(100, Math.round((row.outboundCount / row.orderedBatteryCount) * 100));
}

function remainingOutboundCount(row: OrderRow) {
  return Math.max(Number(row.orderedBatteryCount || 0) - Number(row.outboundCount || 0), 0);
}

function canCreateOutbound(row?: OrderRow | null) {
  return Boolean(
    row &&
      !["DRAFT", "APPROVING", "RETURNING", "COMPLETED", "CANCELLED"].includes(row.status) &&
      remainingOutboundCount(row) > 0,
  );
}

function canArchiveContract(row?: OrderRow | null) {
  return Boolean(
    row &&
      !["DRAFT", "APPROVING", "CANCELLED"].includes(row.status) &&
      row.contractStatus !== "已归档",
  );
}

function canCancelOrder(row?: OrderRow | null) {
  return Boolean(row && !["RETURNING", "COMPLETED", "CANCELLED"].includes(row.status));
}

function canCompleteOrder(row?: OrderRow | null) {
  return Boolean(row && !["DRAFT", "APPROVING", "RETURNING", "COMPLETED", "CANCELLED"].includes(row.status));
}

function canRenewOrder(row?: OrderRow | null) {
  return Boolean(row && !["DRAFT", "APPROVING", "RETURNING", "COMPLETED", "CANCELLED"].includes(row.status));
}

function canReturnLease(row?: OrderRow | null) {
  return Boolean(
    row &&
      !["DRAFT", "APPROVING", "RETURNING", "COMPLETED", "CANCELLED"].includes(row.status) &&
      row.outboundCount > 0 &&
      row.pendingReceiptCount === 0,
  );
}

function canSettleReturn(row?: OrderRow | null) {
  return Boolean(row && row.status === "RETURNING");
}

function canGenerateOrderBill(row?: OrderRow | null) {
  return Boolean(row && !["DRAFT", "APPROVING", "RETURNING", "COMPLETED", "CANCELLED"].includes(row.status));
}

function money(value?: number) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function runningStatusLabel(value: string) {
  const map: Record<string, string> = {
    ONLINE: "在线",
    OFFLINE: "离线",
    ABNORMAL: "异常",
  };
  return map[value] || value || "--";
}

function outboundStatusLabel(value: string) {
  const map: Record<string, string> = {
    PENDING_RECEIPT: "待收货",
    RECEIVED: "已收货",
    AUTO_RECEIVED: "自动收货",
  };
  return map[value] || value || "--";
}

function billStatusLabel(value: string) {
  const map: Record<string, string> = {
    PENDING_CONFIRM: "待确认",
    PENDING_PAYMENT: "待付款",
    PARTIALLY_PAID: "部分回款",
    SETTLED: "已结清",
    OVERDUE: "已逾期",
  };
  return map[value] || value || "--";
}

function repairStatusLabel(value: string) {
  const map: Record<string, string> = {
    PENDING_ACCEPT: "待受理",
    PROCESSING: "处理中",
    REPAIRING: "维修中",
    COMPLETED: "已完成",
  };
  return map[value] || value || "--";
}

function formatPayments(payments: PaymentRow[]) {
  return payments.map((item) => `${item.paymentNo} ${money(item.amount)}`).join("；");
}

function tableRowClassName({ row }: { row: OrderRow }) {
  return row.overdueAmount > 0 ? "overdue-row" : "";
}

function errorText(error: unknown) {
  const data = (error as { response?: { data?: { message?: string | string[] } } }).response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join("；");
  return message || "操作失败，请检查输入。";
}

function setDetail(data: OrderDetail) {
  detail.value = {
    ...normalizeOrder(data),
    ...data,
    ...normalizeOrder(data),
    batteries: data.batteries || [],
    outbounds: data.outbounds || [],
    bills: data.bills || [],
    repairs: data.repairs || [],
    approvals: data.approvals || [],
    timeline: data.timeline || [],
    leaseChanges: data.leaseChanges || [],
    contract: data.contract,
  };
}

async function loadRows() {
  const data = await getMock<OrderRow[]>("/orders");
  rows.value = data.map((item) => normalizeOrder(item));
}

async function openDetail(row: OrderRow) {
  try {
    const data = await getMock<OrderDetail>(`/orders/${row.id}`);
    setDetail({
      ...normalizeOrder(row),
      ...data,
    });
  } catch {
    detail.value = {
      ...normalizeOrder(row),
      batteries: [],
      outbounds: [],
      bills: [],
      repairs: [],
      approvals: [],
      timeline: [],
    };
  }
  activeDetailTab.value = "summary";
  viewMode.value = "detail";
}

async function refreshDetail() {
  if (!detail.value) return;
  await openDetail(detail.value);
  ElMessage.success("订单详情已刷新");
}

async function reloadDetailSilently() {
  if (!detail.value) return;
  const data = await getMock<OrderDetail>(`/orders/${detail.value.id}`);
  setDetail({
    ...normalizeOrder(detail.value),
    ...data,
  });
}

function backToList() {
  viewMode.value = "list";
}

function resetQuery() {
  keyword.value = "";
  queryField.value = "orderNo";
  leftFilter.value = "all";
  activeListTab.value = "orders";
}

function noopSearch() {
  ElMessage.success("已按当前条件筛选");
}

function openReserved(title: string) {
  ElMessage.info(`${title}入口已放到页面，后续可接真实业务接口`);
}

async function openContractArchiveQueue() {
  const target = rows.value.find((row) => canArchiveContract(row));
  if (!target) {
    ElMessage.info("暂无待归档合同");
    return;
  }
  await openDetail(target);
  activeDetailTab.value = "contract";
}

function openCreate() {
  const suffix = String(Date.now()).slice(-6);
  createForm.value = {
    customerName: "",
    customerContact: "",
    contactPhone: "",
    region: "",
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    orderedBatteryCount: 5,
    monthlyRent: 8000,
    depositAmount: 12000,
    billingDay: 5,
    salesOwner: "刘销售",
    contractName: `锂电池租赁合同-${suffix}`,
    remark: "",
  };
  createVisible.value = true;
}

async function createOrder() {
  if (!createForm.value.customerName.trim()) {
    ElMessage.warning("请填写客户名称");
    return;
  }
  try {
    const order = await postMock<OrderDetail>("/orders", createForm.value);
    createVisible.value = false;
    await loadRows();
    setDetail(order);
    viewMode.value = "detail";
    activeDetailTab.value = "contract";
    ElMessage.success("订单已创建，可继续发起合同会签");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

function openOutbound(row?: OrderRow | null) {
  const target =
    row && !["DRAFT", "APPROVING", "RETURNING", "COMPLETED", "CANCELLED"].includes(row.status)
      ? row
      : outboundCandidateRows.value[0];
  if (!target) {
    ElMessage.warning("暂无可出库订单，请先完成合同会签");
    return;
  }
  outboundForm.value = {
    orderId: target.id,
    warehouse: target.region ? `${target.region}前置仓` : "郑州总仓",
    operator: target.assetOwner || "王库管",
    receiver: target.customerContact || "客户联系人",
    address: target.region || "",
    outboundAt: "2026-05-18",
    btCodes: "BT202605170003",
  };
  outboundVisible.value = true;
}

async function submitApproval() {
  if (!detail.value) return;
  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/submit-approval`, {
      operator: detail.value.salesOwner || "刘销售",
    });
    setDetail(data);
    await loadRows();
    ElMessage.success("合同会签已发起");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function approveContract() {
  if (!detail.value) return;
  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/approve-contract`, {
      operator: detail.value.financeOwner || "赵财务",
    });
    setDetail(data);
    await loadRows();
    ElMessage.success("会签已通过，订单进入待出库");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function archiveContract() {
  if (!detail.value) return;
  let fileName = `${detail.value.contractNo || detail.value.orderNo}-签署版.pdf`;
  try {
    const result = await ElMessageBox.prompt("填写签署版合同附件名称", "合同归档", {
      inputValue: fileName,
      inputPattern: /\S+/,
      inputErrorMessage: "请输入附件名称",
      confirmButtonText: "归档",
      cancelButtonText: "取消",
    });
    fileName = String(result.value || fileName).trim();
  } catch {
    return;
  }

  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/archive-contract`, {
      fileName,
      operator: detail.value.salesOwner || "刘销售",
    });
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "contract";
    ElMessage.success("合同已归档");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

function nextYearDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "2027-05-31";
  return `${Number(match[1]) + 1}-${match[2]}-${match[3]}`;
}

function openRenewOrder() {
  if (!detail.value) return;
  renewForm.value = {
    leaseEnd: nextYearDate(detail.value.leaseEnd),
    monthlyRent: Number(detail.value.monthlyRent || 0),
    depositAmount: Number(detail.value.depositAmount || 0),
    billingDay: Number(detail.value.billingDay || 5),
    operator: detail.value.salesOwner || "刘销售",
    remark: "",
  };
  renewVisible.value = true;
}

async function renewOrder() {
  if (!detail.value) return;
  if (!renewForm.value.leaseEnd) {
    ElMessage.warning("请选择新的租期结束日期");
    return;
  }
  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/renew`, renewForm.value);
    renewVisible.value = false;
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "contract";
    ElMessage.success("续租已生效，合同状态已更新");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

function openReturnLease() {
  if (!detail.value) return;
  const btCodes = (detail.value.batteries || [])
    .map((item) => String(item.btCode || "").trim())
    .filter(Boolean);
  if (!btCodes.length) {
    ElMessage.warning("当前订单没有可退回的在租电池");
    return;
  }
  returnForm.value = {
    returnAll: true,
    btCodes: btCodes.join("\n"),
    warehouse: "郑州总仓",
    operator: detail.value.assetOwner || "王库管",
    remark: "",
  };
  returnVisible.value = true;
}

async function returnLease() {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm("退租会把所选电池退回仓库；如仍有欠款，订单会进入退租结算中。", "确认退租", {
      type: "warning",
      confirmButtonText: "确认退租",
      cancelButtonText: "返回",
    });
  } catch {
    return;
  }

  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/return-lease`, {
      ...returnForm.value,
      btCodes: returnForm.value.returnAll ? undefined : returnForm.value.btCodes,
    });
    returnVisible.value = false;
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "summary";
    ElMessage.success(data.status === "RETURNING" ? "资产已退回，订单进入退租结算" : "退租已完成");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

function openSettleReturn() {
  if (!detail.value) return;
  settlementForm.value = {
    collectOutstanding: Number(detail.value.debtAmount || 0) > 0,
    method: "银行转账",
    paidAt: nowText(),
    operator: detail.value.financeOwner || "赵财务",
    remark:
      Number(detail.value.debtAmount || 0) > 0
        ? `退租尾款 ${money(detail.value.debtAmount)} 已核对结清。`
        : "退租账款已核对无欠款，订单完结。",
  };
  settlementVisible.value = true;
}

async function settleReturnOrder() {
  if (!detail.value) return;
  if (Number(detail.value.debtAmount || 0) > 0 && !settlementForm.value.collectOutstanding) {
    ElMessage.warning("当前仍有欠款，请先登记回款或勾选同步回款");
    return;
  }

  submitting.value = true;
  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/settle-return`, settlementForm.value);
    settlementVisible.value = false;
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "summary";
    ElMessage.success("退租已结清，订单已完结");
  } catch (error) {
    ElMessage.error(errorText(error));
  } finally {
    submitting.value = false;
  }
}

async function cancelOrder() {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm("取消前会校验资产和账单，存在已出库资产或欠款时不能取消。", "取消订单", {
      type: "warning",
      confirmButtonText: "确认取消",
      cancelButtonText: "返回",
    });
  } catch {
    return;
  }

  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/cancel`, {
      operator: detail.value.salesOwner || "刘销售",
    });
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "summary";
    ElMessage.success("订单已取消");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function completeOrder() {
  if (!detail.value) return;
  try {
    await ElMessageBox.confirm("系统会先校验待收货和欠款，并将仍在租赁中的电池退回郑州总仓。", "完成订单", {
      type: "success",
      confirmButtonText: "确认完成",
      cancelButtonText: "返回",
    });
  } catch {
    return;
  }

  try {
    const data = await patchMock<OrderDetail>(`/orders/${detail.value.id}/complete`, {
      returnAssets: true,
      warehouse: "郑州总仓",
      operator: detail.value.assetOwner || "王库管",
    });
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "summary";
    ElMessage.success("订单已完结，资产状态已同步");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function createOutbound() {
  if (!outboundForm.value.orderId) {
    ElMessage.warning("请选择租赁订单");
    return;
  }
  try {
    const data = await postMock<OrderDetail>(`/orders/${outboundForm.value.orderId}/outbounds`, outboundForm.value);
    outboundVisible.value = false;
    setDetail(data);
    await loadRows();
    activeDetailTab.value = "outbounds";
    viewMode.value = "detail";
    ElMessage.success("出库单已创建，BT码已绑定到订单");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function confirmOutboundReceipt(row: Record<string, any>) {
  try {
    await patchMock(`/outbounds/${row.id}/receipt`);
    await loadRows();
    await refreshDetail();
    activeDetailTab.value = "outbounds";
    ElMessage.success("已确认收货并同步订单状态");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function runAutoReceive() {
  submitting.value = true;
  try {
    const result = await postMock<{ autoReceivedCount: number; receivedOutbounds?: Array<Record<string, any>> }>(
      "/outbounds/auto-receive",
      { operator: "系统自动任务" },
    );
    await loadRows();
    await refreshDetail();
    activeListTab.value = "outbound";
    ElMessage.success(`自动收货任务已执行，确认 ${result.autoReceivedCount} 张出库单`);
  } catch (error) {
    ElMessage.error(errorText(error));
  } finally {
    submitting.value = false;
  }
}

async function generateOrderBill() {
  if (!detail.value) return;
  try {
    const data = await postMock<OrderDetail>(`/orders/${detail.value.id}/bills`, {
      operator: detail.value.financeOwner || "赵财务",
    });
    setDetail(data);
    await loadRows();
    ElMessage.success("下期账单已生成，等待财务确认");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

function nowText() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function openPayment(row?: BillRow) {
  const target =
    row ||
    detail.value?.bills?.find((bill) => Boolean(bill.canRegisterPayment)) ||
    detail.value?.bills?.find(
      (bill) =>
        bill.status !== "PENDING_CONFIRM" &&
        bill.status !== "SETTLED" &&
        bill.status !== "VOIDED" &&
        bill.debtAmount > 0,
    );
  if (!target) {
    ElMessage.warning("暂无可登记回款的账单，请先确认账单或生成下期账单");
    return;
  }
  if (target.status === "PENDING_CONFIRM") {
    ElMessage.warning("待确认账单需先确认后才能登记回款");
    return;
  }
  selectedBill.value = target;
  paymentForm.value = {
    amount: Number(target.debtAmount || 0),
    paidAt: nowText(),
    method: "银行转账",
    remark: "",
  };
  paymentVisible.value = true;
}

async function confirmBill(row: BillRow) {
  if (!detail.value) return;
  try {
    await patchMock(`/bills/${row.id}/confirm`, {
      operator: detail.value.financeOwner || "赵财务",
    });
    await loadRows();
    await reloadDetailSilently();
    activeDetailTab.value = "bills";
    ElMessage.success("账单已确认，客户端可见");
  } catch (error) {
    ElMessage.error(errorText(error));
  }
}

async function submitPayment() {
  if (!detail.value || !selectedBill.value) return;
  if (
    paymentForm.value.amount <= 0 ||
    paymentForm.value.amount > Number(selectedBill.value.debtAmount || 0)
  ) {
    ElMessage.warning("回款金额必须大于 0 且不能超过当前欠款");
    return;
  }

  submitting.value = true;
  try {
    await postMock(`/bills/${selectedBill.value.id}/payments`, {
      ...paymentForm.value,
      operator: detail.value.financeOwner || "赵财务",
    });
    paymentVisible.value = false;
    await loadRows();
    await reloadDetailSilently();
    activeDetailTab.value = "bills";
    ElMessage.success("回款已登记并同步订单欠款");
  } catch (error) {
    ElMessage.error(errorText(error));
  } finally {
    submitting.value = false;
  }
}

function exportCsv() {
  const header = ["订单号", "客户", "状态", "租期开始", "租期结束", "月租", "出库进度", "应收", "已收", "欠款"];
  const lines = filteredRows.value.map((row) =>
    [
      row.orderNo,
      row.customerName,
      statusLabel(row.status),
      row.leaseStart,
      row.leaseEnd,
      row.monthlyRent,
      row.outboundProgress,
      row.receivableAmount,
      row.paidAmount,
      row.debtAmount,
    ].join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `租赁订单_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(async () => {
  await loadRows();
});
</script>

<style scoped>
.order-page {
  height: calc(100vh - 70px);
  display: flex;
  gap: 16px;
  margin: -16px;
  padding: 16px;
  overflow: hidden;
  color: #3a374c;
  background: #eef0f3;
}

.order-page.is-detail {
  display: block;
  padding: 0;
}

.order-page :deep(.el-button--primary) {
  --el-button-bg-color: #4e5afe;
  --el-button-border-color: #4e5afe;
  --el-button-hover-bg-color: #626cff;
  --el-button-hover-border-color: #626cff;
}

.order-left {
  width: 280px;
  flex: 0 0 280px;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
}

.tree-panel {
  padding: 20px;
}

.tree-panel :deep(.el-input__wrapper) {
  border-radius: 0;
  box-shadow: 0 0 0 1px #d8d8d8 inset;
}

.customer-tree {
  height: 310px;
  padding: 8px 15px;
  overflow-y: auto;
  border: 1px solid #d8d8d8;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

.customer-tree button,
.target-tabs button,
.nav-box button,
.side-item,
.status-group {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.customer-tree button {
  width: 100%;
  min-height: 26px;
  display: block;
  padding: 3px 10px;
  color: #222;
  border-radius: 6px;
  text-align: left;
}

.customer-tree button.active {
  color: #fff;
  background: #4e5afe;
}

.left-line {
  height: 1px;
  background: #e4e7ed;
}

.filter-block {
  height: calc(100% - 352px);
  padding: 20px;
  overflow-y: auto;
  user-select: none;
}

.filter-title {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.scope-tabs {
  overflow: hidden;
  color: #9e9e9e;
  border: 1px solid #d8d8d8;
  border-radius: 6px;
}

.scope-tabs button {
  height: 25px;
  padding: 0 10px;
  color: inherit;
  border: 0;
  background: transparent;
}

.scope-tabs button.active {
  color: #fff;
  background: #42bf79;
}

.status-group,
.side-item {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  color: #23253c;
  border-radius: 10px;
  font-size: 16px;
  text-align: left;
}

.status-group {
  color: #fff;
  background: #4e5afe;
}

.side-left {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.side-left .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

.side-item.active,
.side-item:hover {
  color: #4e5afe;
  background: #e2e4ff;
}

.right-icon {
  margin-left: auto;
}

.order-main {
  min-width: 0;
  flex: 1;
  padding: 20px;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
}

.target-tabs {
  height: 36px;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  border-bottom: 1px solid #e8ebf2;
}

.target-tabs button {
  position: relative;
  height: 36px;
  color: #20243a;
  font-size: 16px;
}

.target-tabs button.active {
  color: #4e5afe;
  font-weight: 600;
}

.target-tabs button.active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #4e5afe;
  content: "";
}

.list-toolbar {
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-select {
  width: 110px;
}

.toolbar-left :deep(.el-input) {
  width: 250px;
}

.toolbar-left :deep(.el-input-group__append) {
  width: 60px;
  padding: 0;
  color: #fff;
  border-color: #4e5afe;
  background: #4e5afe;
}

.order-summary-line {
  height: 44px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.order-summary-line div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-radius: 8px;
  background: #f7f8ff;
}

.order-summary-line span {
  color: #868395;
  font-size: 12px;
}

.order-summary-line strong {
  color: #4e5afe;
  font-size: 18px;
}

.order-summary-line .danger strong {
  color: #f14949;
}

.target-table {
  font-size: 13px;
}

.target-table :deep(.el-table__header th) {
  height: 34px;
  color: #868395;
  background: #f9f9f9;
  font-weight: 400;
}

.target-table :deep(.el-table__cell) {
  padding: 5px 0;
}

.target-table :deep(.cell) {
  white-space: nowrap;
}

.target-table :deep(.overdue-row) {
  background: #fff7f7;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.table-actions :deep(.el-button) {
  margin: 0;
  padding: 0;
  font-size: 12px;
}

.order-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 22px;
  padding: 0 6px;
  border: 1px solid #d5d9e2;
  border-radius: 4px;
  color: #7f7f89;
  background: #f7f8fa;
  font-size: 12px;
}

.order-status.big {
  height: 24px;
  min-width: 64px;
  margin-left: 8px;
  font-size: 14px;
}

.order-status.success {
  color: #16a364;
  border-color: #6add9f;
  background: #effbf4;
}

.order-status.warning {
  color: #d48806;
  border-color: #ffe58f;
  background: #fffbe6;
}

.order-status.danger {
  color: #ff385c;
  border-color: #ff8ca1;
  background: #fff1f3;
}

.order-status.primary {
  color: #4e5afe;
  border-color: #aeb4ff;
  background: #eef0ff;
}

.order-status.purple {
  color: #7a4df3;
  border-color: #c8b6ff;
  background: #f4f0ff;
}

.contract-text {
  margin-right: 8px;
  color: #23253c;
}

.contract-state {
  color: #42bf79;
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
  background: #4e5afe;
}

.danger-text {
  color: #f14949;
}

.order-detail-page {
  height: calc(100vh - 70px);
  padding: 0 0 16px;
  overflow: hidden;
  background: #eef0f3;
}

.panel-top {
  height: 57px;
  display: flex;
  align-items: flex-start;
  padding: 10px 8px 0;
}

.nav-box {
  padding: 5px;
  border-radius: 10px;
  background: #fff;
}

.nav-box .item {
  height: 34px;
  display: inline-flex;
  align-items: center;
  color: #868395;
  padding: 0 15px;
  border-radius: 10px;
  font-size: 14px;
  user-select: none;
}

.nav-box .item.active {
  color: #fff;
  background: #4e5afe;
}

.order-tips {
  margin-left: 10px;
  color: #f14949;
  font-size: 18px;
  line-height: 44px;
}

.tools-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  line-height: 42px;
}

.panel-content {
  height: calc(100% - 57px);
  padding: 0 4px;
}

.order-bms-content {
  height: 100%;
  display: flex;
}

.content-l {
  width: 29.79167vw;
  min-width: 430px;
  margin-right: 15px;
  display: flex;
  flex-direction: column;
}

.content-r {
  width: calc(100% - 29.79167vw - 15px);
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.order-card {
  flex-shrink: 0;
  color: #3a374c;
  padding: clamp(16px, 1.04167vw, 22px) clamp(22px, 1.5625vw, 32px);
  border-radius: 20px;
  background: #fff;
}

.order-first,
.order-second,
.order-third {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-first {
  margin-bottom: 5px;
}

.order-no {
  color: #23253c;
  font-size: 18px;
}

.signal-bars {
  margin-left: 8px;
  color: #23253c;
  font-size: 12px;
}

.signal-bars i {
  width: 2px;
  display: inline-block;
  margin-right: 1px;
  background: #4e5afe;
  vertical-align: baseline;
}

.signal-bars i:first-child {
  height: 4px;
}

.signal-bars i:nth-child(2) {
  height: 7px;
}

.signal-bars i:nth-child(3) {
  height: 10px;
}

.order-belong {
  display: flex;
  align-items: center;
  color: #4e5afe;
  font-size: 12px;
}

.order-second {
  margin-bottom: 20px;
}

.second-l {
  max-width: 58%;
  overflow: hidden;
  color: #23253c;
  font-size: 16px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.second-r {
  color: #7f7f89;
  font-size: 12px;
}

.order-third {
  margin-bottom: 32px;
}

.third-l {
  width: 40%;
  text-align: center;
}

.delivery-battery {
  position: relative;
  width: 110px;
  height: 140px;
  margin: 0 auto;
  overflow: hidden;
  border: 2px solid #d8d8d8;
  border-radius: 30px;
}

.battery-top {
  position: absolute;
  top: -2px;
  left: 50%;
  width: 66px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 10px 10px 0 0;
  background: #d8d8d8;
}

.fill-bg {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(124deg, #01f2cf 29%, #03da9a 69%, #03b3da 119%);
}

.delivery-battery .value {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: baseline;
  transform: translate(-50%, -50%);
  color: #23253c;
  font-size: 22px;
  font-weight: 700;
}

.delivery-battery .value small {
  font-size: 12px;
}

.delivery-status {
  margin-top: 10px;
  color: #23253c;
  font-size: 14px;
}

.third-r {
  position: relative;
  width: 60%;
  display: flex;
  flex-wrap: wrap;
}

.third-r::before,
.third-r::after {
  position: absolute;
  content: "";
  background: linear-gradient(90deg, rgba(251, 251, 251, 0), #d8d8d8 27%, rgba(216, 216, 216, 0.49) 70%, rgba(251, 251, 251, 0));
}

.third-r::before {
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
  transform: translateX(-50%);
}

.third-r::after {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  transform: translateY(-3px);
}

.third-r-item {
  width: 50%;
  padding: 10px 0;
}

.third-r-item .wrap {
  width: 106px;
  margin: 0 auto;
}

.item-t {
  color: #3a374c;
  font-size: 14px;
}

.item-t .el-icon {
  margin-right: 8px;
  color: #4e5afe;
  font-size: 20px;
  vertical-align: middle;
}

.item-b {
  margin-top: 10px;
  overflow: hidden;
  color: #23253c;
  font-size: 22px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.order-fourth {
  margin: 0 auto;
  padding: 20px 35px;
  border-radius: 20px;
  background: #fbfbfb;
}

.fourth-t,
.fourth-b {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.process-item {
  display: flex;
  align-items: center;
}

.icon-box {
  width: 50px;
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  border-radius: 15px;
}

.icon-box.blue {
  background: #dde8fa;
}

.icon-box.mint {
  background: #cefcf1;
}

.icon-box.yellow {
  background: #fff6c9;
}

.icon-box .el-icon {
  color: #23253c;
  font-size: 28px;
}

.fourth-label {
  color: #3a374c;
  font-size: 14px;
}

.fourth-t strong {
  display: block;
  margin-top: 4px;
  color: #23253c;
  font-size: 14px;
  font-weight: 500;
}

.fourth-line {
  height: 1px;
  margin: 20px 0;
  background: #d8d8d8;
}

.fourth-b-item {
  text-align: center;
}

.fourth-b-item .item-val {
  color: #23253c;
  font-size: 20px;
  line-height: 35px;
}

.fourth-b-item .item-val.green {
  color: #42bf79;
}

.fourth-b-item .item-val.red {
  color: #f14949;
}

.fourth-b-item .item-val.blue {
  color: #4e5afe;
}

.fourth-b-item .item-label {
  color: #3a374c;
  font-size: 14px;
}

.timeline-panel {
  min-height: 0;
  flex: 1;
  margin-top: 15px;
  padding: 20px;
  overflow-y: auto;
  border-radius: 20px;
  background: #fff;
}

.panel-title {
  color: #23253c;
  font-size: 18px;
  font-weight: 600;
}

.timeline-list {
  margin-top: 14px;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
}

.timeline-item span {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  margin-top: 5px;
  border-radius: 50%;
  background: #4e5afe;
}

.timeline-item:not(:last-child)::before {
  position: absolute;
  top: 18px;
  bottom: 2px;
  left: 4px;
  width: 1px;
  background: #d8d8d8;
  content: "";
}

.timeline-item strong {
  color: #23253c;
  font-size: 14px;
}

.timeline-item p {
  margin: 4px 0;
  color: #3a374c;
  font-size: 13px;
}

.timeline-item em {
  color: #868395;
  font-size: 12px;
  font-style: normal;
}

.chart-panel {
  height: min(26%, 210px);
  min-height: 164px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-radius: 20px;
  background: #fff;
}

.chart-item {
  width: 32%;
  height: 100%;
  padding: 15px;
  border-radius: 15px;
}

.chart-item:first-child {
  background: #f2f6f9;
}

.chart-item:nth-child(2) {
  background: #f3f9f7;
}

.chart-item:nth-child(3) {
  background: #f9f5f2;
}

.chart-title {
  height: 18px;
  font-size: 14px;
}

.chart-val {
  height: 40px;
  color: #23253c;
  font-size: 30px;
}

.chart-val.green {
  color: #42bf79;
}

.chart-val.red {
  color: #f14949;
}

.chart-val.blue {
  color: #4e5afe;
}

.mini-line-chart {
  position: relative;
  height: calc(100% - 58px);
  min-height: 80px;
}

.mini-line-chart span {
  position: absolute;
  right: 0;
  left: 0;
  height: 3px;
  display: block;
  background: #4f59e3;
}

.mini-line-chart span:first-child {
  background: #5bf048;
}

.mini-line-chart em {
  position: absolute;
  bottom: 0;
  width: 1px;
  height: 4px;
  background: #b7b4ca;
}

.right-b {
  min-height: 0;
  flex: 1;
  display: flex;
  margin-top: 15px;
}

.mini-panel {
  width: calc(50% - 7.5px);
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 20px;
  background: #fff;
}

.mini-panel:first-child {
  margin-right: 15px;
}

.mini-table {
  margin-top: 12px;
  font-size: 12px;
}

.receipt-map {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.receipt-node {
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  color: #868395;
  border: 2px solid #d8d8d8;
  border-radius: 50%;
  background: #fbfbfb;
}

.receipt-node.done {
  color: #fff;
  border-color: #4e5afe;
  background: #4e5afe;
}

.receipt-line {
  width: 80px;
  height: 4px;
  background: #d8d8d8;
}

.receipt-line.done {
  background: #4e5afe;
}

.receipt-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.receipt-stats div {
  padding: 14px;
  border-radius: 10px;
  background: #f7f8ff;
}

.receipt-stats span {
  color: #868395;
  font-size: 13px;
}

.receipt-stats strong {
  display: block;
  margin-top: 6px;
  color: #4e5afe;
  font-size: 24px;
}

.record-page {
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
}

.record-head {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #edf0f4;
}

.record-head strong {
  color: #23253c;
  font-size: 18px;
}

.right-action {
  margin-left: auto;
}

.record-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.record-content {
  height: calc(100% - 58px);
  padding: 16px;
  overflow: auto;
}

.record-table {
  padding: 0 16px 16px;
  font-size: 13px;
}

.record-table.inner {
  margin-top: 16px;
  padding: 0;
}

.record-table :deep(.el-table__header th),
.mini-table :deep(.el-table__header th) {
  color: #868395;
  background: #f9f9f9;
  font-weight: 400;
}

.create-dialog :deep(.el-date-editor.el-input) {
  width: 100%;
}

.outbound-dialog :deep(.el-select),
.outbound-dialog :deep(.el-date-editor.el-input) {
  width: 100%;
}

.dialog-hint {
  padding: 10px 12px;
  border-radius: 8px;
  color: #4b5563;
  background: #f7f8ff;
  font-size: 13px;
}

.dialog-metric {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.dialog-metric span {
  display: block;
  color: #868395;
  font-size: 12px;
  margin-bottom: 4px;
}

.dialog-metric strong {
  display: block;
  color: #20212a;
  font-size: 16px;
  line-height: 22px;
}

.muted-text {
  color: #868395;
  font-size: 12px;
}

@media (max-width: 1400px) {
  .order-left {
    width: 240px;
    flex-basis: 240px;
  }

  .content-l {
    min-width: 390px;
  }
}

@media (max-width: 1180px) {
  .order-page {
    height: auto;
    min-height: calc(100vh - 70px);
    flex-direction: column;
    overflow: visible;
  }

  .order-left {
    width: 100%;
    flex-basis: auto;
  }

  .order-main {
    min-height: 720px;
  }

  .order-detail-page {
    height: auto;
    min-height: calc(100vh - 70px);
    overflow: visible;
  }

  .panel-content {
    height: auto;
  }

  .order-bms-content,
  .right-b {
    flex-direction: column;
  }

  .content-l,
  .content-r,
  .mini-panel {
    width: 100%;
    min-width: 0;
    margin-right: 0;
  }

  .content-r,
  .mini-panel + .mini-panel {
    margin-top: 15px;
  }
}
</style>
