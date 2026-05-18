<template>
  <div class="finance-page" :class="{ 'is-detail': viewMode === 'detail' }">
    <template v-if="viewMode === 'list'">
      <aside class="finance-left">
        <div class="tree-panel">
          <el-input v-model="customerTreeKeyword" clearable placeholder="请输入客户名称" />
          <div class="customer-tree">
            <button :class="{ active: selectedCustomerId === 'all' }" @click="selectedCustomerId = 'all'">
              全部客户
            </button>
            <button
              v-for="customer in filteredCustomerTree"
              :key="customer.customerId"
              :class="{ active: selectedCustomerId === customer.customerId }"
              @click="selectedCustomerId = customer.customerId"
            >
              <span>{{ customer.customerShortName || customer.customerName }}</span>
              <em v-if="customer.debtTotal > 0">{{ money(customer.debtTotal) }}</em>
            </button>
          </div>
        </div>

        <div class="left-line"></div>

        <div class="filter-block">
          <div class="filter-title">
            <span>财务筛选</span>
            <div class="scope-tabs">
              <button :class="{ active: ownerScope === 'all' }" @click="ownerScope = 'all'">全部</button>
              <button :class="{ active: ownerScope === 'mine' }" @click="ownerScope = 'mine'">本人</button>
            </div>
          </div>

          <button class="status-group" @click="setLeftFilter('all')">
            <span>全部应收({{ countByFilter("all") }})</span>
            <el-icon><ArrowUp /></el-icon>
          </button>

          <button
            v-for="item in financeFilters"
            :key="item.key"
            class="side-item"
            :class="{ active: leftFilter === item.key }"
            @click="setLeftFilter(item.key)"
          >
            <span class="side-left">
              <el-icon><component :is="item.icon" /></el-icon>
              {{ item.label }}({{ countByFilter(item.key) }})
            </span>
            <el-icon v-if="item.key === 'overdue'" class="right-icon"><ArrowDown /></el-icon>
          </button>

          <button class="side-item" @click="activePage = 'screen'">
            <span class="side-left">
              <el-icon><DataAnalysis /></el-icon>
              经营大屏
            </span>
          </button>
          <button class="side-item" @click="activePage = 'reconciliation'">
            <span class="side-left">
              <el-icon><Document /></el-icon>
              对账凭证
            </span>
          </button>
          <button class="side-item" @click="exportCsv">
            <span class="side-left">
              <el-icon><Download /></el-icon>
              导出台账
            </span>
          </button>
        </div>
      </aside>

      <main class="finance-main">
        <div class="target-tabs">
          <button :class="{ active: activePage === 'customers' }" @click="activePage = 'customers'">
            客户应收
          </button>
          <button :class="{ active: activePage === 'overdue' }" @click="activePage = 'overdue'">
            逾期催收
          </button>
          <button :class="{ active: activePage === 'bills' }" @click="activePage = 'bills'">
            账单流水
          </button>
          <button :class="{ active: activePage === 'reconciliation' }" @click="activePage = 'reconciliation'">
            对账凭证
          </button>
          <button :class="{ active: activePage === 'screen' }" @click="activePage = 'screen'">
            经营大屏
          </button>
        </div>

        <div class="list-toolbar">
          <div class="toolbar-left">
            <el-select v-model="queryField" class="field-select">
              <el-option label="客户" value="customerName" />
              <el-option label="账单号" value="billNo" />
              <el-option label="订单号" value="orderNo" />
              <el-option label="手机号" value="contactPhone" />
            </el-select>
            <el-input v-model="keyword" clearable placeholder="请输入内容">
              <template #append>
                <el-button :icon="Search" />
              </template>
            </el-input>
            <el-select v-if="activePage === 'bills'" v-model="statusFilter" clearable placeholder="账单状态">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-if="activePage !== 'customers'" v-model="ageingFilter" clearable placeholder="账龄">
              <el-option v-for="item in overview.agingBuckets" :key="item.key" :label="item.label" :value="item.key" />
            </el-select>
            <el-button type="primary" @click="resetQuery">重置</el-button>
          </div>
          <div class="toolbar-right">
            <el-button :icon="Refresh" :loading="loading" @click="loadFinance">刷新</el-button>
            <el-button type="primary" :disabled="!hasPermission('bill.generate')" @click="generateDueBills">
              <el-icon><Plus /></el-icon>
              生成到期账单
            </el-button>
            <el-button @click="exportCsv">导出</el-button>
          </div>
        </div>

        <div class="finance-summary-line">
          <button v-for="metric in summaryMetrics" :key="metric.label" :class="metric.tone" @click="metric.action">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </button>
        </div>

        <el-table
          v-if="activePage === 'customers'"
          v-loading="loading"
          :data="filteredCustomers"
          border
          height="calc(100% - 130px)"
          class="target-table"
          :row-class-name="customerRowClassName"
          @row-dblclick="openCustomerDetail"
        >
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column label="客户" min-width="220" fixed show-overflow-tooltip>
            <template #default="{ row }">
              <div class="customer-cell">
                <strong>{{ row.customerName }}</strong>
                <span>{{ row.customerContact || "--" }} / {{ row.contactPhone || "--" }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="风险状态" width="96" align="center">
            <template #default="{ row }">
              <span class="finance-status" :class="riskClass(row.riskLevel)">{{ row.riskLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column label="订单/电池" width="108" align="center">
            <template #default="{ row }">{{ row.activeOrderCount }} / {{ row.batteryCount }}</template>
          </el-table-column>
          <el-table-column label="应收" width="116" align="right">
            <template #default="{ row }">{{ money(row.receivableTotal) }}</template>
          </el-table-column>
          <el-table-column label="已收" width="116" align="right">
            <template #default="{ row }">{{ money(row.paidTotal) }}</template>
          </el-table-column>
          <el-table-column label="欠款" width="116" align="right">
            <template #default="{ row }">
              <span :class="{ 'amount-danger': row.debtTotal > 0 }">{{ money(row.debtTotal) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="逾期" width="116" align="right">
            <template #default="{ row }">
              <span :class="{ 'amount-danger': row.overdueTotal > 0 }">{{ money(row.overdueTotal) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="未结清" width="86" align="center" prop="unsettledBillCount" />
          <el-table-column label="待确认" width="86" align="center" prop="pendingConfirmCount" />
          <el-table-column label="回款率" width="92" align="center">
            <template #default="{ row }">{{ row.collectionRate }}%</template>
          </el-table-column>
          <el-table-column label="下一动作" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.collectionAction || "正常维护" }}</template>
          </el-table-column>
          <el-table-column label="操作" width="128" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openCustomerDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activePage === 'overdue'"
          v-loading="loading"
          :data="filteredOverdueBills"
          border
          height="calc(100% - 130px)"
          class="target-table"
          :row-class-name="billRowClassName"
          @row-dblclick="openDetail"
        >
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column prop="customerName" label="客户" min-width="190" fixed show-overflow-tooltip />
          <el-table-column prop="billNo" label="账单号" width="148" show-overflow-tooltip />
          <el-table-column prop="orderNo" label="订单号" width="150" show-overflow-tooltip />
          <el-table-column prop="period" label="账期" width="96" />
          <el-table-column prop="dueDate" label="到期日" width="112" />
          <el-table-column label="逾期" width="84" align="center">
            <template #default="{ row }">
              <span class="amount-danger">{{ row.daysOverdue || 0 }}天</span>
            </template>
          </el-table-column>
          <el-table-column label="欠款" width="116" align="right">
            <template #default="{ row }"><span class="amount-danger">{{ money(row.debtAmount) }}</span></template>
          </el-table-column>
          <el-table-column prop="collectionStatus" label="催收状态" width="110" />
          <el-table-column prop="nextFollowUpAt" label="下次跟进" width="112">
            <template #default="{ row }">{{ row.nextFollowUpAt || "--" }}</template>
          </el-table-column>
          <el-table-column label="建议动作" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ row.collectionAction }}</template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button v-if="row.canFollowUp && hasPermission('bill.follow')" text type="primary" @click.stop="openFollowUp(row)">跟进</el-button>
                <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activePage === 'bills'"
          v-loading="loading"
          :data="filteredBills"
          border
          height="calc(100% - 130px)"
          class="target-table"
          :row-class-name="billRowClassName"
          @row-dblclick="openDetail"
        >
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column prop="billNo" label="账单号" width="148" fixed show-overflow-tooltip />
          <el-table-column prop="customerName" label="客户" min-width="180" fixed show-overflow-tooltip />
          <el-table-column prop="orderNo" label="订单号" width="150" show-overflow-tooltip />
          <el-table-column label="来源" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.repairNo ? "维修费用" : "租赁账单" }}</template>
          </el-table-column>
          <el-table-column prop="repairNo" label="维修单" width="150" show-overflow-tooltip />
          <el-table-column prop="period" label="账期" width="96" />
          <el-table-column label="应收" width="112" align="right">
            <template #default="{ row }">{{ money(row.receivableAmount) }}</template>
          </el-table-column>
          <el-table-column label="已收" width="112" align="right">
            <template #default="{ row }">{{ money(row.paidAmount) }}</template>
          </el-table-column>
          <el-table-column label="欠款" width="112" align="right">
            <template #default="{ row }">
              <span :class="{ 'amount-danger': row.debtAmount > 0 }">{{ money(row.debtAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <span class="finance-status" :class="statusClass(row.status)">{{ row.statusLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="dueDate" label="到期日" width="112" />
          <el-table-column label="账龄" width="112">
            <template #default="{ row }">{{ row.ageingBucketLabel || row.ageingBucket }}</template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button v-if="row.canConfirm && hasPermission('bill.confirm')" text type="primary" @click.stop="confirmBill(row)">确认</el-button>
                <el-button v-if="row.canRegisterPayment && hasPermission('bill.payment')" text type="primary" @click.stop="openPayment(row)">回款</el-button>
                <el-button v-if="row.canFollowUp && hasPermission('bill.follow')" text type="primary" @click.stop="openFollowUp(row)">跟进</el-button>
                <el-button v-if="row.status !== 'VOIDED' && hasPermission('bill.adjust')" text type="primary" @click.stop="openAdjust(row)">调整</el-button>
                <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activePage === 'reconciliation'"
          v-loading="loading"
          :data="filteredReconciliationRecords"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openReconciliationBill"
        >
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column prop="uploadedAt" label="提交时间" width="160" fixed />
          <el-table-column prop="customerName" label="客户" min-width="190" fixed show-overflow-tooltip />
          <el-table-column prop="billNo" label="账单号" width="150" show-overflow-tooltip />
          <el-table-column prop="period" label="账期" width="92" />
          <el-table-column label="凭证金额" width="120" align="right">
            <template #default="{ row }">{{ money(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="method" label="方式" width="110" />
          <el-table-column prop="voucherNo" label="凭证号" width="150" show-overflow-tooltip />
          <el-table-column prop="attachmentName" label="凭证文件" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <a v-if="row.attachmentUrl" :href="mockFileUrl(row.attachmentUrl)" target="_blank">{{ row.attachmentName || "查看凭证" }}</a>
              <span v-else>{{ row.attachmentName || "--" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <span class="finance-status" :class="voucherStatusClass(row.status)">{{ row.statusLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="reconciledBy" label="对账人" width="100">
            <template #default="{ row }">{{ row.reconciledBy || "--" }}</template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button
                  v-if="row.canReconcile && hasPermission('bill.reconcile')"
                  text
                  type="primary"
                  @click.stop="reconcileVoucher(row, 'APPROVE')"
                >
                  通过
                </el-button>
                <el-button
                  v-if="row.canReconcile && hasPermission('bill.reconcile')"
                  text
                  type="danger"
                  @click.stop="reconcileVoucher(row, 'REJECT')"
                >
                  驳回
                </el-button>
                <el-button text type="primary" @click.stop="openReconciliationBill(row)">详情</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-else class="screen-workbench">
          <section class="screen-main-card">
            <div class="screen-head">
              <div>
                <span>应收经营大屏</span>
                <strong>{{ money(overview.receivableTotal) }}</strong>
              </div>
              <div class="screen-rate">
                <em>{{ overview.collectionRate }}%</em>
                <span>回款率</span>
              </div>
            </div>

            <div class="screen-finance-grid">
              <button v-for="bucket in overview.agingBuckets" :key="bucket.key" @click="openAgingBucket(bucket.key)">
                <span>{{ bucket.label }}</span>
                <strong :class="{ danger: bucket.key.startsWith('DUE_') }">{{ money(bucket.amount) }}</strong>
                <em>{{ bucket.count }} 张账单</em>
                <i :style="{ width: barWidth(bucket.amount, overview.debtTotal || overview.receivableTotal) }"></i>
              </button>
            </div>
          </section>

          <section class="screen-side-card">
            <div class="panel-title">客户风险排行</div>
            <div class="risk-list">
              <button v-for="customer in topRiskCustomers" :key="customer.customerId" @click="openCustomerDetail(customer)">
                <span>
                  <strong>{{ customer.customerShortName || customer.customerName }}</strong>
                  <em>{{ customer.unsettledBillCount }} 张未结清</em>
                </span>
                <span>
                  <strong :class="{ 'amount-danger': customer.overdueTotal > 0 }">{{ money(customer.debtTotal) }}</strong>
                  <small>{{ customer.riskLabel }}</small>
                </span>
              </button>
            </div>
          </section>

          <section class="screen-side-card">
            <div class="panel-title">账期趋势</div>
            <div class="period-list">
              <div v-for="period in overview.periodSummary" :key="period.period" class="period-row">
                <span>{{ period.period }}</span>
                <div>
                  <i class="paid" :style="{ width: barWidth(period.paid, period.receivable) }"></i>
                  <i class="debt" :style="{ width: barWidth(period.debt, period.receivable) }"></i>
                </div>
                <strong>{{ money(period.receivable) }}</strong>
                <em>{{ money(period.debt) }}</em>
              </div>
            </div>
          </section>

          <section class="screen-side-card">
            <div class="panel-title">催收队列</div>
            <div class="risk-list">
              <button v-for="task in overview.collectionTasks" :key="task.id" @click="openDetail(task)">
                <span>
                  <strong>{{ task.customerName }}</strong>
                  <em>{{ task.billNo }} / {{ task.dueDate }}</em>
                </span>
                <span>
                  <strong class="amount-danger">{{ money(task.debtAmount) }}</strong>
                  <small>{{ task.collectionAction }}</small>
                </span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </template>

    <template v-else>
      <div class="finance-detail-page">
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
          <div v-if="activeCustomer?.overdueTotal" class="finance-tips">
            当前客户逾期 {{ money(activeCustomer.overdueTotal) }}
          </div>
          <div class="tools-box">
            <el-button size="small" @click="backToList">
              <el-icon><Back /></el-icon>
              返回列表
            </el-button>
            <el-button size="small" :icon="Refresh" @click="refreshCustomerDetail">刷新</el-button>
            <el-button v-if="hasPermission('bill.payment')" size="small" type="primary" @click="openFirstReceivablePayment">登记回款</el-button>
            <el-button v-if="hasPermission('bill.follow')" size="small" @click="openFirstReceivableFollowUp">催收跟进</el-button>
          </div>
        </div>

        <div v-if="activeCustomer" class="panel-content">
          <section v-if="activeDetailTab === 'overview'" class="finance-customer-content">
            <div class="content-l">
              <div class="customer-card">
                <div class="customer-first">
                  <div>
                    <span class="customer-name">{{ activeCustomer.customerName }}</span>
                    <span class="finance-status big" :class="riskClass(activeCustomer.riskLevel)">
                      {{ activeCustomer.riskLabel }}
                    </span>
                  </div>
                  <div class="customer-belong">
                    <el-icon><UserFilled /></el-icon>
                    {{ activeCustomer.customerContact || "--" }} / {{ activeCustomer.contactPhone || "--" }}
                  </div>
                </div>

                <div class="customer-second">
                  <div class="second-l">{{ activeCustomer.region || "未配置区域" }}</div>
                  <div class="second-r">财务负责人：{{ activeCustomer.financeOwner || "赵财务" }}</div>
                </div>

                <div class="customer-third">
                  <div class="third-l">
                    <div class="rate-ring">
                      <div>
                        <strong>{{ activeCustomer.collectionRate }}</strong>
                        <small>%</small>
                      </div>
                    </div>
                    <div class="rate-label">客户回款率</div>
                  </div>

                  <div class="third-r">
                    <div v-for="metric in detailMetrics" :key="metric.label" class="third-r-item">
                      <div class="wrap">
                        <div class="item-t">
                          <el-icon><component :is="metric.icon" /></el-icon>
                          <span class="label">{{ metric.label }}</span>
                        </div>
                        <div class="item-b" :class="metric.tone">{{ metric.value }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="customer-fourth">
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
                    <div v-for="item in lifecycleStats" :key="item.label" class="fourth-b-item">
                      <div class="item-val" :class="item.tone">{{ item.value }}</div>
                      <div class="item-label">{{ item.label }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="timeline-panel">
                <div class="panel-title">催收跟进</div>
                <div class="timeline-list">
                  <div v-for="log in activeCustomer.followUpLogs || []" :key="log.id" class="timeline-item">
                    <span></span>
                    <div>
                      <strong>{{ log.billNo }} / {{ log.method }}</strong>
                      <p>{{ log.result }}{{ log.promisedPayAt ? `，承诺 ${log.promisedPayAt} 付款` : "" }}</p>
                      <em>{{ log.createdAt }} / {{ log.operator || "--" }}</em>
                    </div>
                  </div>
                  <el-empty v-if="!activeCustomer.followUpLogs?.length" description="暂无催收跟进" />
                </div>
              </div>
            </div>

            <div class="content-r">
              <div class="chart-panel">
                <div v-for="card in overviewCards" :key="card.label" class="chart-item">
                  <div class="chart-title">{{ card.label }}</div>
                  <div class="chart-val" :class="card.tone">{{ card.value }}</div>
                  <div class="mini-line-chart">
                    <span style="top: 34%"></span>
                    <span style="top: 62%"></span>
                    <em style="left: 12%"></em>
                    <em style="left: 42%"></em>
                    <em style="left: 72%"></em>
                  </div>
                </div>
              </div>

              <div class="right-b">
                <div class="mini-panel">
                  <div class="panel-title">客户账务</div>
                  <el-descriptions :column="1" border class="detail-desc">
                    <el-descriptions-item label="最新账期">{{ activeCustomer.latestBillPeriod || "--" }}</el-descriptions-item>
                    <el-descriptions-item label="最晚到期">{{ activeCustomer.latestDueDate || "--" }}</el-descriptions-item>
                    <el-descriptions-item label="下一跟进">{{ activeCustomer.nextFollowUpAt || "--" }}</el-descriptions-item>
                    <el-descriptions-item label="下一动作">{{ activeCustomer.collectionAction || "正常维护" }}</el-descriptions-item>
                  </el-descriptions>
                </div>

                <div class="mini-panel">
                  <div class="panel-title">回款链路</div>
                  <div class="flow-map">
                    <div class="flow-node done">出账</div>
                    <div class="flow-line" :class="{ done: activeCustomer.pendingConfirmCount === 0 }"></div>
                    <div class="flow-node" :class="{ done: activeCustomer.pendingConfirmCount === 0 }">确认</div>
                    <div class="flow-line" :class="{ done: activeCustomer.debtTotal <= 0 }"></div>
                    <div class="flow-node" :class="{ done: activeCustomer.debtTotal <= 0 }">结清</div>
                  </div>
                  <div class="rule-box">
                    <div>
                      <span>账单数</span>
                      <strong>{{ activeCustomer.billCount }}</strong>
                    </div>
                    <div>
                      <span>订单数</span>
                      <strong>{{ activeCustomer.orderCount }}</strong>
                    </div>
                    <div>
                      <span>未结清</span>
                      <strong>{{ activeCustomer.unsettledBillCount }}</strong>
                    </div>
                    <div>
                      <span>逾期最长</span>
                      <strong>{{ activeCustomer.maxDaysOverdue }}天</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeDetailTab === 'bills'" class="record-page">
            <div class="record-head">
              <strong>客户账单</strong>
              <el-button v-if="hasPermission('bill.payment')" class="right-action" @click="openFirstReceivablePayment">登记回款</el-button>
            </div>
            <el-table :data="activeCustomer.bills || []" border class="record-table">
              <el-table-column prop="billNo" label="账单号" width="150" />
              <el-table-column prop="period" label="账期" width="100" />
              <el-table-column label="应收" width="118" align="right">
                <template #default="{ row }">{{ money(row.receivableAmount) }}</template>
              </el-table-column>
              <el-table-column label="欠款" width="118" align="right">
                <template #default="{ row }">{{ money(row.debtAmount) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <span class="finance-status" :class="statusClass(row.status)">{{ row.statusLabel }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="dueDate" label="到期日" width="120" />
              <el-table-column label="操作" min-width="220">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button v-if="row.canRegisterPayment && hasPermission('bill.payment')" text type="primary" @click="openPayment(row)">回款</el-button>
                    <el-button v-if="row.canFollowUp && hasPermission('bill.follow')" text type="primary" @click="openFollowUp(row)">跟进</el-button>
                    <el-button text type="primary" @click="openDetail(row)">详情</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'orders'" class="record-page">
            <div class="record-head">
              <strong>关联订单</strong>
            </div>
            <el-table :data="activeCustomer.orders || []" border class="record-table">
              <el-table-column prop="orderNo" label="订单号" width="150" />
              <el-table-column label="状态" width="110">
                <template #default="{ row }">{{ orderStatusLabel(row.status) }}</template>
              </el-table-column>
              <el-table-column label="月租" width="118" align="right">
                <template #default="{ row }">{{ money(row.monthlyRent) }}</template>
              </el-table-column>
              <el-table-column prop="billingDay" label="账单日" width="90" />
              <el-table-column prop="nextBillingDate" label="下次账单" width="120" />
              <el-table-column label="电池" width="90">
                <template #default="{ row }">{{ row.batteryCount }}/{{ row.orderedBatteryCount }}</template>
              </el-table-column>
              <el-table-column prop="contractNo" label="合同号" min-width="160" show-overflow-tooltip />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'payments'" class="record-page">
            <div class="record-head">
              <strong>回款记录</strong>
            </div>
            <el-table :data="activeCustomer.payments || []" border class="record-table">
              <el-table-column prop="billNo" label="账单号" width="150" />
              <el-table-column prop="period" label="账期" width="100" />
              <el-table-column label="金额" width="120" align="right">
                <template #default="{ row }">{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="method" label="方式" width="110" />
              <el-table-column prop="paidAt" label="回款时间" width="160" />
              <el-table-column prop="remark" label="备注" min-width="260" show-overflow-tooltip />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'vouchers'" class="record-page">
            <div class="record-head">
              <strong>付款凭证</strong>
            </div>
            <el-table :data="activeCustomer.paymentVouchers || []" border class="record-table">
              <el-table-column prop="billNo" label="账单号" width="150" />
              <el-table-column prop="period" label="账期" width="100" />
              <el-table-column label="金额" width="120" align="right">
                <template #default="{ row }">{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="voucherNo" label="凭证号" width="150" show-overflow-tooltip />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <span class="finance-status" :class="voucherStatusClass(row.status)">{{ voucherStatusLabel(row.status) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="uploadedAt" label="提交时间" width="160" />
              <el-table-column prop="reconciledBy" label="对账人" width="100" />
              <el-table-column prop="reconciliationRemark" label="对账备注" min-width="220" show-overflow-tooltip />
            </el-table>
          </section>

          <section v-else class="record-page">
            <div class="record-head">
              <strong>催收记录</strong>
              <el-button v-if="hasPermission('bill.follow')" class="right-action" @click="openFirstReceivableFollowUp">新增跟进</el-button>
            </div>
            <el-table :data="activeCustomer.followUpLogs || []" border class="record-table">
              <el-table-column prop="billNo" label="账单号" width="150" />
              <el-table-column prop="method" label="方式" width="100" />
              <el-table-column prop="result" label="结果" min-width="220" show-overflow-tooltip />
              <el-table-column prop="promisedPayAt" label="承诺付款" width="120" />
              <el-table-column prop="nextFollowUpAt" label="下次跟进" width="120" />
              <el-table-column prop="operator" label="操作人" width="100" />
              <el-table-column prop="createdAt" label="登记时间" width="160" />
            </el-table>
          </section>
        </div>
      </div>
    </template>

    <el-drawer v-model="detailVisible" title="账单详情" size="600px">
      <template v-if="activeBill">
        <div class="bill-detail-head">
          <div>
            <strong>{{ activeBill.billNo }}</strong>
            <span>{{ activeBill.customerName }} / {{ activeBill.period }}</span>
          </div>
          <span class="finance-status big" :class="statusClass(activeBill.status)">{{ activeBill.statusLabel }}</span>
        </div>

        <div class="drawer-summary">
          <div>
            <span>应收</span>
            <strong>{{ money(activeBill.receivableAmount) }}</strong>
          </div>
          <div>
            <span>已收</span>
            <strong class="amount-success">{{ money(activeBill.paidAmount) }}</strong>
          </div>
          <div>
            <span>欠款</span>
            <strong class="amount-danger">{{ money(activeBill.debtAmount) }}</strong>
          </div>
        </div>

        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ activeBill.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="业务来源">
            {{ activeBill.repairNo ? `维修费用 / ${activeBill.repairNo}` : "租赁账单" }}
          </el-descriptions-item>
          <el-descriptions-item label="OA审批">{{ activeBill.approvalNo || "--" }}</el-descriptions-item>
          <el-descriptions-item label="合同号">{{ activeBill.contractNo || "--" }}</el-descriptions-item>
          <el-descriptions-item label="生成日期">{{ activeBill.generatedAt || "--" }}</el-descriptions-item>
          <el-descriptions-item label="最晚付款日">{{ activeBill.dueDate }}</el-descriptions-item>
          <el-descriptions-item label="账龄">{{ activeBill.ageingBucketLabel || activeBill.ageingBucket }}</el-descriptions-item>
          <el-descriptions-item label="催收建议">{{ activeBill.collectionAction || "--" }}</el-descriptions-item>
          <el-descriptions-item label="调整原因">{{ activeBill.adjustReason || "--" }}</el-descriptions-item>
        </el-descriptions>

        <section class="detail-section">
          <h3>回款记录</h3>
          <el-empty v-if="!activeBill.payments?.length" description="暂无回款" />
          <div v-for="payment in activeBill.payments" :key="payment.paymentNo" class="detail-line">
            <div>
              <strong>{{ money(payment.amount) }}</strong>
              <span>{{ payment.method }} / {{ payment.paidAt }}</span>
            </div>
            <em>{{ payment.remark || "财务登记回款" }}</em>
          </div>
        </section>

        <section class="detail-section">
          <h3>付款凭证</h3>
          <el-empty v-if="!activeBill.paymentVouchers?.length" description="暂无付款凭证" />
          <div v-for="voucher in activeBill.paymentVouchers" :key="voucher.id" class="detail-line">
            <div>
              <strong>{{ money(voucher.amount) }} / {{ voucherStatusLabel(voucher.status) }}</strong>
              <span>{{ voucher.voucherNo || "--" }} / {{ voucher.uploadedAt || "--" }}</span>
            </div>
            <em>
              <a v-if="voucher.attachmentUrl" :href="mockFileUrl(voucher.attachmentUrl)" target="_blank">
                {{ voucher.attachmentName || "查看凭证" }}
              </a>
              <span v-else>{{ voucher.attachmentName || voucher.reconciliationRemark || "待对账" }}</span>
            </em>
          </div>
        </section>

        <section class="detail-section">
          <h3>催收跟进</h3>
          <el-empty v-if="!activeBill.followUpLogs?.length" description="暂无跟进" />
          <div v-for="log in activeBill.followUpLogs" :key="log.id" class="detail-line">
            <div>
              <strong>{{ log.method }} / {{ log.result }}</strong>
              <span>{{ log.operator || "--" }} / {{ log.createdAt }}</span>
            </div>
            <em>{{ log.promisedPayAt ? `承诺 ${log.promisedPayAt}` : log.remark || "已记录" }}</em>
          </div>
        </section>

        <section class="detail-section">
          <h3>操作留痕</h3>
          <el-empty v-if="!activeBill.operationLogs?.length" description="暂无操作记录" />
          <div v-for="log in activeBill.operationLogs" :key="`${log.time}-${log.action}`" class="detail-line">
            <div>
              <strong>{{ log.action }}</strong>
              <span>{{ log.operator }} / {{ log.time }}</span>
            </div>
            <em>{{ log.remark }}</em>
          </div>
        </section>
      </template>
    </el-drawer>

    <el-dialog v-model="paymentVisible" title="登记回款" width="520px">
      <el-form label-width="92px">
        <el-form-item label="账单">
          <el-input :model-value="activeBill?.billNo || '--'" disabled />
        </el-form-item>
        <el-form-item label="回款金额">
          <el-input-number v-model="paymentForm.amount" :min="1" :max="activeBill?.debtAmount || 1" />
        </el-form-item>
        <el-form-item label="回款时间">
          <el-date-picker v-model="paymentForm.paidAt" type="datetime" value-format="YYYY-MM-DD HH:mm" />
        </el-form-item>
        <el-form-item label="回款方式">
          <el-select v-model="paymentForm.method" class="full-input">
            <el-option label="银行转账" value="银行转账" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="现金" value="现金" />
          </el-select>
        </el-form-item>
        <el-form-item label="付款凭证号">
          <el-input v-model.trim="paymentForm.voucherNo" placeholder="银行流水号、回单号或平台交易号" />
        </el-form-item>
        <el-form-item label="付款方">
          <el-input v-model.trim="paymentForm.payerName" placeholder="付款单位或付款人" />
        </el-form-item>
        <el-form-item label="凭证文件">
          <el-input v-model.trim="paymentForm.attachmentName" placeholder="付款截图、银行回单或对账单文件名" />
        </el-form-item>
        <el-form-item label="凭证链接">
          <el-input v-model.trim="paymentForm.attachmentUrl" placeholder="可粘贴已上传文件链接，留空则只登记凭证信息" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="paymentForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paymentVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPayment">保存回款</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="followUpVisible" title="催收跟进" width="560px">
      <el-form label-width="104px">
        <el-form-item label="账单">
          <el-input :model-value="activeBill?.billNo || '--'" disabled />
        </el-form-item>
        <el-form-item label="跟进方式">
          <el-select v-model="followUpForm.method" class="full-input">
            <el-option label="电话" value="电话" />
            <el-option label="微信" value="微信" />
            <el-option label="线下拜访" value="线下拜访" />
            <el-option label="系统通知" value="系统通知" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进结果">
          <el-input v-model.trim="followUpForm.result" />
        </el-form-item>
        <el-form-item label="承诺付款日">
          <el-date-picker v-model="followUpForm.promisedPayAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="下次跟进">
          <el-date-picker v-model="followUpForm.nextFollowUpAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="followUpForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followUpVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollowUp">保存跟进</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="adjustVisible" title="调整账单" width="520px">
      <el-form label-width="104px">
        <el-form-item label="账单">
          <el-input :model-value="activeBill?.billNo || '--'" disabled />
        </el-form-item>
        <el-form-item label="调整后应收">
          <el-input-number v-model="adjustForm.receivableAmount" :min="1" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model.trim="adjustForm.reason" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">保存调整</el-button>
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
  Coin,
  DataAnalysis,
  Document,
  Download,
  Money,
  Operation,
  Plus,
  Refresh,
  Search,
  Tickets,
  User,
  UserFilled,
  Warning,
} from "@element-plus/icons-vue";
import { getMock, mockFileUrl, patchMock, postMock } from "../api/http";
import { hasAnyAdminPermission } from "../api/session";

type ViewMode = "list" | "detail";
type PageKey = "screen" | "customers" | "overdue" | "bills" | "reconciliation";
type DetailTab = "overview" | "bills" | "orders" | "payments" | "vouchers" | "followups";
type LeftFilter = "all" | "debt" | "overdue" | "pending" | "dueSoon" | "settled";
type QueryField = "customerName" | "billNo" | "orderNo" | "contactPhone";
type BillStatus =
  | "PENDING_CONFIRM"
  | "PENDING_PAYMENT"
  | "PARTIALLY_PAID"
  | "SETTLED"
  | "OVERDUE"
  | "ADJUSTED"
  | "VOIDED";

interface PaymentRecord {
  paymentNo: string;
  amount: number;
  paidAt: string;
  method: string;
  remark?: string;
  voucherId?: string;
  voucherNo?: string;
  payerName?: string;
  payerAccount?: string;
  bankName?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  reconciliationStatus?: string;
  billNo?: string;
  period?: string;
}

interface PaymentVoucherRecord {
  id: string;
  voucherId?: string;
  billId?: string;
  billNo?: string;
  orderNo?: string;
  customerName?: string;
  period?: string;
  amount: number;
  paidAt?: string;
  method?: string;
  payerName?: string;
  payerAccount?: string;
  bankName?: string;
  voucherNo?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  uploadedByType?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  statusLabel?: string;
  reconciledAt?: string;
  reconciledBy?: string;
  reconciliationRemark?: string;
  paymentNo?: string;
  billDebtAmount?: number;
  billStatus?: BillStatus;
  billStatusLabel?: string;
  canReconcile?: boolean;
}

interface FollowUpRecord {
  id: string;
  createdAt: string;
  method: string;
  result: string;
  promisedPayAt?: string;
  nextFollowUpAt?: string;
  remark?: string;
  operator?: string;
  billNo?: string;
  period?: string;
  debtAmount?: number;
}

interface BillRow {
  id: string;
  billNo: string;
  orderNo: string;
  customerName: string;
  customerShortName?: string;
  customerContact?: string;
  contactPhone?: string;
  financeOwner?: string;
  period: string;
  receivableAmount: number;
  paidAmount: number;
  debtAmount: number;
  status: BillStatus;
  statusLabel: string;
  dueDate: string;
  generatedAt?: string;
  confirmedAt?: string;
  contractNo?: string;
  sourceType?: string;
  sourceId?: string;
  sourceNo?: string;
  repairNo?: string;
  btCode?: string;
  approvalNo?: string;
  approvalStatus?: string;
  approvalStatusLabel?: string;
  costItem?: string;
  costItemId?: string;
  adjustReason?: string;
  ageingBucket: string;
  ageingBucketLabel?: string;
  collectionStatus?: string;
  collectionAction: string;
  daysOverdue?: number;
  daysUntilDue?: number;
  nextFollowUpAt?: string;
  lastFollowUpAt?: string;
  canConfirm: boolean;
  canRegisterPayment: boolean;
  canFollowUp: boolean;
  payments?: PaymentRecord[];
  paymentVouchers?: PaymentVoucherRecord[];
  voucherCount?: number;
  pendingVoucherCount?: number;
  canSubmitVoucher?: boolean;
  canReconcile?: boolean;
  followUpLogs?: FollowUpRecord[];
  operationLogs?: Array<{
    time: string;
    operator: string;
    action: string;
    remark: string;
  }>;
}

interface PeriodSummary {
  period: string;
  receivable: number;
  paid: number;
  debt: number;
}

interface FinanceOverview {
  receivableTotal: number;
  paidTotal: number;
  debtTotal: number;
  overdueTotal: number;
  collectionRate: number;
  pendingConfirmCount: number;
  pendingPaymentCount: number;
  overdueCount: number;
  dueSoonCount: number;
  dueSoonTotal: number;
  unpaidCustomerCount: number;
  agingBuckets: Array<{ key: string; label: string; amount: number; count: number }>;
  periodSummary: PeriodSummary[];
  collectionTasks: BillRow[];
}

interface FinanceOrder {
  id: string;
  orderNo: string;
  status: string;
  leaseStart?: string;
  leaseEnd?: string;
  billingDay?: number;
  monthlyRent: number;
  depositAmount?: number;
  orderedBatteryCount?: number;
  batteryCount?: number;
  receivableAmount?: number;
  paidAmount?: number;
  debtAmount?: number;
  overdueAmount?: number;
  nextBillingDate?: string;
  contractNo?: string;
}

interface FinanceCustomer {
  customerId: string;
  customerName: string;
  customerShortName?: string;
  customerContact?: string;
  contactPhone?: string;
  region?: string;
  salesOwner?: string;
  financeOwner?: string;
  receivableTotal: number;
  paidTotal: number;
  debtTotal: number;
  overdueTotal: number;
  billCount: number;
  orderCount: number;
  activeOrderCount: number;
  batteryCount: number;
  pendingConfirmCount: number;
  unsettledBillCount: number;
  overdueBillCount: number;
  maxDaysOverdue: number;
  collectionRate: number;
  latestBillPeriod?: string;
  latestDueDate?: string;
  nextFollowUpAt?: string;
  collectionAction?: string;
  riskLevel: "HIGH" | "OVERDUE" | "WATCH" | "NORMAL";
  riskLabel: string;
  bills?: BillRow[];
  orders?: FinanceOrder[];
  payments?: PaymentRecord[];
  paymentVouchers?: PaymentVoucherRecord[];
  pendingVoucherCount?: number;
  followUpLogs?: FollowUpRecord[];
}

interface FinanceReconciliation {
  summary: {
    totalCount: number;
    pendingCount: number;
    verifiedCount: number;
    rejectedCount: number;
    pendingAmount: number;
    verifiedAmount: number;
  };
  records: PaymentVoucherRecord[];
}

interface FinanceScheduler {
  enabled: boolean;
  intervalMs: number;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount?: number;
  lastResult?: {
    generatedCount?: number;
    markedOverdueCount?: number;
  } | null;
}

const emptyOverview: FinanceOverview = {
  receivableTotal: 0,
  paidTotal: 0,
  debtTotal: 0,
  overdueTotal: 0,
  collectionRate: 0,
  pendingConfirmCount: 0,
  pendingPaymentCount: 0,
  overdueCount: 0,
  dueSoonCount: 0,
  dueSoonTotal: 0,
  unpaidCustomerCount: 0,
  agingBuckets: [],
  periodSummary: [],
  collectionTasks: [],
};

const viewMode = ref<ViewMode>("list");
const activePage = ref<PageKey>("customers");
const activeDetailTab = ref<DetailTab>("overview");
const loading = ref(false);

function hasPermission(code: string) {
  return hasAnyAdminPermission([code]);
}

const bills = ref<BillRow[]>([]);
const customers = ref<FinanceCustomer[]>([]);
const overview = ref<FinanceOverview>(emptyOverview);
const reconciliation = ref<FinanceReconciliation>({
  summary: {
    totalCount: 0,
    pendingCount: 0,
    verifiedCount: 0,
    rejectedCount: 0,
    pendingAmount: 0,
    verifiedAmount: 0,
  },
  records: [],
});
const scheduler = ref<FinanceScheduler>({
  enabled: false,
  intervalMs: 0,
});
const selectedCustomerId = ref("all");
const customerTreeKeyword = ref("");
const ownerScope = ref<"all" | "mine">("all");
const leftFilter = ref<LeftFilter>("all");
const queryField = ref<QueryField>("customerName");
const keyword = ref("");
const statusFilter = ref<BillStatus | "">("");
const ageingFilter = ref("");
const activeBill = ref<BillRow | null>(null);
const activeCustomer = ref<FinanceCustomer | null>(null);
const detailVisible = ref(false);
const paymentVisible = ref(false);
const followUpVisible = ref(false);
const adjustVisible = ref(false);

const paymentForm = ref({
  amount: 0,
  paidAt: dateTimeText(),
  method: "银行转账",
  voucherNo: "",
  payerName: "",
  payerAccount: "",
  bankName: "",
  attachmentName: "",
  attachmentUrl: "",
  attachmentSize: 0,
  remark: "客户回款到账，财务登记。",
});

const followUpForm = ref({
  method: "电话",
  result: "客户已确认付款计划",
  promisedPayAt: dateText(2),
  nextFollowUpAt: dateText(3),
  remark: "",
});

const adjustForm = ref({
  receivableAmount: 0,
  reason: "",
});

const financeFilters = [
  { key: "debt" as const, label: "欠款客户", icon: Money },
  { key: "overdue" as const, label: "逾期催收", icon: Warning },
  { key: "pending" as const, label: "待确认", icon: Document },
  { key: "dueSoon" as const, label: "临近到期", icon: Operation },
  { key: "settled" as const, label: "已结清", icon: Coin },
];

const detailTabs = [
  { value: "overview" as const, label: "客户总览" },
  { value: "bills" as const, label: "客户账单" },
  { value: "orders" as const, label: "关联订单" },
  { value: "payments" as const, label: "回款记录" },
  { value: "vouchers" as const, label: "付款凭证" },
  { value: "followups" as const, label: "催收记录" },
];

const statusOptions = [
  { label: "待确认", value: "PENDING_CONFIRM" },
  { label: "待付款", value: "PENDING_PAYMENT" },
  { label: "部分回款", value: "PARTIALLY_PAID" },
  { label: "已结清", value: "SETTLED" },
  { label: "已逾期", value: "OVERDUE" },
  { label: "已作废", value: "VOIDED" },
] as const;

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

const filteredCustomerTree = computed(() => {
  const key = customerTreeKeyword.value.trim().toLowerCase();
  return customers.value.filter((customer) => {
    if (!matchesOwner(customer)) return false;
    if (!key) return true;
    return [customer.customerName, customer.customerShortName, customer.customerContact, customer.contactPhone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(key);
  });
});

const selectedCustomer = computed(() =>
  selectedCustomerId.value === "all"
    ? null
    : customers.value.find((customer) => customer.customerId === selectedCustomerId.value) ?? null,
);

const filteredCustomers = computed(() =>
  customers.value.filter((customer) => {
    if (!matchesOwner(customer)) return false;
    if (selectedCustomer.value && customer.customerId !== selectedCustomer.value.customerId) return false;
    if (!matchesLeftFilter(customer)) return false;
    if (!matchesKeyword(customer)) return false;
    return true;
  }),
);

const scopedBills = computed(() =>
  bills.value.filter((bill) => {
    if (selectedCustomer.value && bill.customerName !== selectedCustomer.value.customerName) return false;
    if (ownerScope.value === "mine" && bill.financeOwner !== "赵财务") return false;
    return true;
  }),
);

const filteredBills = computed(() =>
  scopedBills.value.filter((bill) => {
    if (!matchesBillKeyword(bill)) return false;
    if (statusFilter.value && bill.status !== statusFilter.value) return false;
    if (ageingFilter.value && bill.ageingBucket !== ageingFilter.value) return false;
    return true;
  }),
);

const overdueBills = computed(() =>
  scopedBills.value.filter((bill) => bill.debtAmount > 0 && (bill.status === "OVERDUE" || Number(bill.daysOverdue || 0) > 0)),
);

const filteredOverdueBills = computed(() =>
  overdueBills.value.filter((bill) => {
    if (!matchesBillKeyword(bill)) return false;
    if (ageingFilter.value && bill.ageingBucket !== ageingFilter.value) return false;
    return true;
  }),
);

const filteredReconciliationRecords = computed(() =>
  reconciliation.value.records.filter((record) => {
    const key = keyword.value.trim().toLowerCase();
    if (!key) return true;
    return [
      record.customerName,
      record.billNo,
      record.orderNo,
      record.voucherNo,
      record.attachmentName,
      record.payerName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(key);
  }),
);

const topRiskCustomers = computed(() => filteredCustomers.value.filter((item) => item.debtTotal > 0).slice(0, 8));

const summaryMetrics = computed(() => [
  {
    label: "客户数",
    value: filteredCustomers.value.length,
    tone: "",
    action: () => {
      activePage.value = "customers";
      setLeftFilter("all");
    },
  },
  {
    label: "总应收",
    value: money(sumCustomers("receivableTotal")),
    tone: "",
    action: () => {
      activePage.value = "screen";
    },
  },
  {
    label: "已收",
    value: money(sumCustomers("paidTotal")),
    tone: "success",
    action: () => {
      activePage.value = "screen";
    },
  },
  {
    label: "欠款",
    value: money(sumCustomers("debtTotal")),
    tone: "warning",
    action: () => {
      activePage.value = "customers";
      setLeftFilter("debt");
    },
  },
  {
    label: "逾期",
    value: money(sumCustomers("overdueTotal")),
    tone: "danger",
    action: () => {
      activePage.value = "overdue";
      setLeftFilter("overdue");
    },
  },
  {
    label: "待确认",
    value: overview.value.pendingConfirmCount,
    tone: "",
    action: () => {
      activePage.value = "bills";
      statusFilter.value = "PENDING_CONFIRM";
    },
  },
  {
    label: "临近到期",
    value: overview.value.dueSoonCount,
    tone: "",
    action: () => {
      activePage.value = "bills";
      ageingFilter.value = "NOT_DUE";
      setLeftFilter("dueSoon");
    },
  },
  {
    label: "待对账",
    value: reconciliation.value.summary.pendingCount,
    tone: "warning",
    action: () => {
      activePage.value = "reconciliation";
    },
  },
  {
    label: "回款率",
    value: `${overview.value.collectionRate}%`,
    tone: "success",
    action: () => {
      activePage.value = "screen";
    },
  },
]);

const detailMetrics = computed(() => {
  const customer = activeCustomer.value;
  return [
    { label: "应收", value: money(customer?.receivableTotal ?? 0), icon: Money, tone: "" },
    { label: "欠款", value: money(customer?.debtTotal ?? 0), icon: Warning, tone: customer?.debtTotal ? "red" : "" },
    { label: "逾期", value: money(customer?.overdueTotal ?? 0), icon: Operation, tone: customer?.overdueTotal ? "red" : "" },
    { label: "账单", value: `${customer?.billCount ?? 0}张`, icon: Tickets, tone: "" },
  ];
});

const processCards = computed(() => {
  const customer = activeCustomer.value;
  return [
    { label: "活跃订单", value: `${customer?.activeOrderCount ?? 0}单`, icon: Tickets, tone: "blue" },
    { label: "在租电池", value: `${customer?.batteryCount ?? 0}组`, icon: DataAnalysis, tone: "mint" },
    { label: "待确认", value: `${customer?.pendingConfirmCount ?? 0}张`, icon: Document, tone: "yellow" },
  ];
});

const lifecycleStats = computed(() => {
  const customer = activeCustomer.value;
  return [
    { label: "未结清", value: customer?.unsettledBillCount ?? 0, tone: "yellow" },
    { label: "逾期账单", value: customer?.overdueBillCount ?? 0, tone: customer?.overdueBillCount ? "red" : "green" },
    { label: "最长逾期", value: `${customer?.maxDaysOverdue ?? 0}天`, tone: customer?.maxDaysOverdue ? "red" : "green" },
    { label: "回款率", value: `${customer?.collectionRate ?? 0}%`, tone: "blue" },
  ];
});

const overviewCards = computed(() => {
  const customer = activeCustomer.value;
  return [
    { label: "总应收", value: money(customer?.receivableTotal ?? 0), tone: "blue" },
    { label: "已回款", value: money(customer?.paidTotal ?? 0), tone: "green" },
    { label: "逾期风险", value: money(customer?.overdueTotal ?? 0), tone: customer?.overdueTotal ? "red" : "green" },
  ];
});

function dateText(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateTimeText() {
  const date = new Date();
  return `${dateText()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function money(value: number) {
  return currency.format(Number(value || 0));
}

function barWidth(value: number, total: number) {
  if (!total || total <= 0) return "0%";
  return `${Math.max(Math.round((Number(value || 0) / total) * 100), value > 0 ? 4 : 0)}%`;
}

function sumCustomers(field: "receivableTotal" | "paidTotal" | "debtTotal" | "overdueTotal") {
  return filteredCustomers.value.reduce((total, customer) => total + Number(customer[field] || 0), 0);
}

function matchesOwner(customer: FinanceCustomer) {
  return ownerScope.value === "all" || customer.financeOwner === "赵财务";
}

function customerDueSoonCount(customer: FinanceCustomer) {
  return bills.value.filter(
    (bill) =>
      bill.customerName === customer.customerName &&
      bill.debtAmount > 0 &&
      Number(bill.daysUntilDue || 0) > 0 &&
      Number(bill.daysUntilDue || 0) <= 2,
  ).length;
}

function matchesLeftFilter(customer: FinanceCustomer, filter = leftFilter.value) {
  if (filter === "all") return true;
  if (filter === "debt") return customer.debtTotal > 0;
  if (filter === "overdue") return customer.overdueTotal > 0;
  if (filter === "pending") return customer.pendingConfirmCount > 0;
  if (filter === "dueSoon") return customerDueSoonCount(customer) > 0;
  return customer.debtTotal <= 0 && customer.pendingConfirmCount <= 0;
}

function matchesKeyword(customer: FinanceCustomer) {
  const key = keyword.value.trim().toLowerCase();
  if (!key) return true;
  const fields = {
    customerName: [customer.customerName, customer.customerShortName],
    contactPhone: [customer.contactPhone, customer.customerContact],
    billNo: bills.value.filter((bill) => bill.customerName === customer.customerName).map((bill) => bill.billNo),
    orderNo: bills.value.filter((bill) => bill.customerName === customer.customerName).map((bill) => bill.orderNo),
  }[queryField.value];
  return fields.filter(Boolean).join(" ").toLowerCase().includes(key);
}

function matchesBillKeyword(bill: BillRow) {
  const key = keyword.value.trim().toLowerCase();
  if (!key) return true;
  const fields = {
    customerName: [bill.customerName, bill.customerShortName],
    contactPhone: [bill.contactPhone, bill.customerContact],
    billNo: [bill.billNo],
    orderNo: [bill.orderNo],
  }[queryField.value];
  return fields.filter(Boolean).join(" ").toLowerCase().includes(key);
}

function setLeftFilter(filter: LeftFilter) {
  leftFilter.value = filter;
  if (filter === "overdue") activePage.value = "overdue";
  if (filter === "pending") {
    activePage.value = "bills";
    statusFilter.value = "PENDING_CONFIRM";
  }
  if (filter === "settled") activePage.value = "customers";
}

function countByFilter(filter: LeftFilter) {
  return customers.value.filter((customer) => {
    if (!matchesOwner(customer)) return false;
    return matchesLeftFilter(customer, filter);
  }).length;
}

function resetQuery() {
  keyword.value = "";
  statusFilter.value = "";
  ageingFilter.value = "";
  leftFilter.value = "all";
  selectedCustomerId.value = "all";
}

function openAgingBucket(bucket: string) {
  activePage.value = bucket.startsWith("DUE_") ? "overdue" : "bills";
  ageingFilter.value = bucket;
  statusFilter.value = "";
}

function statusClass(status: BillStatus) {
  return {
    warning: ["PENDING_CONFIRM", "PARTIALLY_PAID", "ADJUSTED"].includes(status),
    primary: status === "PENDING_PAYMENT",
    success: status === "SETTLED",
    danger: status === "OVERDUE",
    info: status === "VOIDED",
  };
}

function voucherStatusLabel(status: PaymentVoucherRecord["status"]) {
  return (
    {
      PENDING: "待对账",
      VERIFIED: "已对账",
      REJECTED: "已驳回",
    }[status] ?? status
  );
}

function voucherStatusClass(status: PaymentVoucherRecord["status"]) {
  return {
    warning: status === "PENDING",
    success: status === "VERIFIED",
    danger: status === "REJECTED",
  };
}

function riskClass(level: FinanceCustomer["riskLevel"]) {
  return {
    danger: ["HIGH", "OVERDUE"].includes(level),
    warning: level === "WATCH",
    success: level === "NORMAL",
  };
}

function orderStatusLabel(status: string) {
  return (
    {
      DRAFT: "草稿",
      APPROVING: "审批中",
      PENDING_OUTBOUND: "待出库",
      PARTIALLY_OUTBOUND: "部分出库",
      PENDING_RECEIPT: "待收货",
      LEASING: "租赁中",
      RETURNING: "退租中",
      COMPLETED: "已完成",
      CANCELLED: "已取消",
    }[status] ?? status
  );
}

function customerRowClassName({ row }: { row: FinanceCustomer }) {
  if (row.overdueTotal > 0) return "warning-row";
  if (row.debtTotal <= 0 && row.pendingConfirmCount <= 0) return "settled-row";
  return "";
}

function billRowClassName({ row }: { row: BillRow }) {
  if (row.status === "OVERDUE") return "warning-row";
  if (row.status === "SETTLED") return "settled-row";
  return "";
}

async function loadFinance() {
  loading.value = true;
  try {
    const [overviewData, customerRows, billRows, reconciliationData, schedulerData] = await Promise.all([
      getMock<FinanceOverview>("/finance/overview"),
      getMock<FinanceCustomer[]>("/finance/customers"),
      getMock<BillRow[]>("/bills"),
      getMock<FinanceReconciliation>("/finance/reconciliation"),
      getMock<FinanceScheduler>("/finance/scheduler"),
    ]);
    overview.value = overviewData;
    customers.value = customerRows;
    bills.value = billRows;
    reconciliation.value = reconciliationData;
    scheduler.value = schedulerData;
  } finally {
    loading.value = false;
  }
}

async function reloadAfterMutation() {
  const customerId = activeCustomer.value?.customerId;
  const billId = activeBill.value?.id;
  await loadFinance();
  if (viewMode.value === "detail" && customerId) {
    activeCustomer.value = await getMock<FinanceCustomer>(`/finance/customers/${encodeURIComponent(customerId)}`);
  }
  if (detailVisible.value && billId) {
    activeBill.value = await getMock<BillRow>(`/bills/${billId}`);
  }
}

async function openCustomerDetail(row: FinanceCustomer) {
  activeCustomer.value = row;
  activeDetailTab.value = "overview";
  viewMode.value = "detail";
  activeCustomer.value = await getMock<FinanceCustomer>(`/finance/customers/${encodeURIComponent(row.customerId || row.customerName)}`);
}

function backToList() {
  viewMode.value = "list";
}

async function refreshCustomerDetail() {
  if (!activeCustomer.value) return;
  activeCustomer.value = await getMock<FinanceCustomer>(`/finance/customers/${encodeURIComponent(activeCustomer.value.customerId)}`);
}

function firstReceivableBill() {
  return activeCustomer.value?.bills?.find((bill) => bill.debtAmount > 0 && bill.status !== "PENDING_CONFIRM" && bill.status !== "VOIDED");
}

function openFirstReceivablePayment() {
  const bill = firstReceivableBill();
  if (!bill) {
    ElMessage.warning("当前客户暂无可登记回款的账单");
    return;
  }
  openPayment(bill);
}

function openFirstReceivableFollowUp() {
  const bill = firstReceivableBill();
  if (!bill) {
    ElMessage.warning("当前客户暂无需要催收跟进的账单");
    return;
  }
  openFollowUp(bill);
}

async function openDetail(row: BillRow) {
  activeBill.value = row;
  detailVisible.value = true;
  activeBill.value = await getMock<BillRow>(`/bills/${row.id}`);
}

async function openReconciliationBill(row: PaymentVoucherRecord) {
  activeBill.value = null;
  detailVisible.value = true;
  activeBill.value = await getMock<BillRow>(`/bills/${row.billId}`);
}

async function reconcileVoucher(row: PaymentVoucherRecord, action: "APPROVE" | "REJECT") {
  if (!hasPermission("bill.reconcile")) {
    ElMessage.warning("当前账号没有付款凭证对账权限");
    return;
  }
  const message =
    action === "APPROVE"
      ? `确认 ${row.voucherNo || row.billNo} 对账通过并入账？`
      : `确认驳回 ${row.voucherNo || row.billNo}？`;
  await ElMessageBox.confirm(message, action === "APPROVE" ? "对账通过" : "驳回凭证", {
    confirmButtonText: action === "APPROVE" ? "通过并入账" : "驳回",
    cancelButtonText: "取消",
    type: action === "APPROVE" ? "warning" : "error",
  });
  await patchMock(`/bills/${row.billId}/vouchers/${row.voucherId || row.id}/reconcile`, {
    action,
    remark: action === "APPROVE" ? "凭证与到账金额一致" : "凭证信息与到账记录不一致",
    operator: "赵财务",
  });
  ElMessage.success(action === "APPROVE" ? "凭证已对账入账" : "凭证已驳回");
  await reloadAfterMutation();
}

async function confirmBill(row: BillRow) {
  await ElMessageBox.confirm(`确认 ${row.billNo} 后客户可见并进入回款流程。`, "确认账单", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    type: "warning",
  });
  await patchMock(`/bills/${row.id}/confirm`, { operator: "赵财务" });
  ElMessage.success("账单已确认");
  await reloadAfterMutation();
}

function openPayment(row: BillRow) {
  activeBill.value = row;
  paymentForm.value = {
    amount: Number(row.debtAmount || 0),
    paidAt: dateTimeText(),
    method: "银行转账",
    voucherNo: "",
    payerName: row.customerName,
    payerAccount: "",
    bankName: "",
    attachmentName: "",
    attachmentUrl: "",
    attachmentSize: 0,
    remark: "客户回款到账，财务登记。",
  };
  paymentVisible.value = true;
}

async function submitPayment() {
  if (!activeBill.value) return;
  if (paymentForm.value.amount <= 0) {
    ElMessage.warning("请填写有效回款金额");
    return;
  }
  if (!paymentForm.value.voucherNo && !paymentForm.value.attachmentName && !paymentForm.value.attachmentUrl) {
    ElMessage.warning("请填写付款凭证号或凭证文件信息");
    return;
  }
  await postMock(`/bills/${activeBill.value.id}/payments`, {
    ...paymentForm.value,
    operator: "赵财务",
  });
  paymentVisible.value = false;
  ElMessage.success("回款已登记");
  await reloadAfterMutation();
}

function openFollowUp(row: BillRow) {
  activeBill.value = row;
  followUpForm.value = {
    method: "电话",
    result: "客户已确认付款计划",
    promisedPayAt: dateText(2),
    nextFollowUpAt: dateText(3),
    remark: "",
  };
  followUpVisible.value = true;
}

async function submitFollowUp() {
  if (!activeBill.value) return;
  await postMock(`/bills/${activeBill.value.id}/follow-ups`, {
    ...followUpForm.value,
    operator: "赵财务",
  });
  followUpVisible.value = false;
  ElMessage.success("催收跟进已保存");
  await reloadAfterMutation();
}

function openAdjust(row: BillRow) {
  activeBill.value = row;
  adjustForm.value = {
    receivableAmount: Number(row.receivableAmount || 0),
    reason: "",
  };
  adjustVisible.value = true;
}

async function submitAdjust() {
  if (!activeBill.value) return;
  if (!adjustForm.value.reason.trim()) {
    ElMessage.warning("请填写调整原因");
    return;
  }
  await patchMock(`/bills/${activeBill.value.id}/adjust`, {
    ...adjustForm.value,
    operator: "赵财务",
  });
  adjustVisible.value = false;
  ElMessage.success("账单已调整");
  await reloadAfterMutation();
}

async function generateDueBills() {
  if (!hasPermission("bill.generate")) {
    ElMessage.warning("当前账号没有生成月度账单权限");
    return;
  }
  const result = await postMock<{ generatedCount: number; markedOverdueCount: number }>("/finance/scheduler/run", {
    asOfDate: dateText(),
    operator: "赵财务",
    trigger: "MANUAL",
  });
  ElMessage.success(`已生成 ${result.generatedCount} 张账单，标记 ${result.markedOverdueCount} 张逾期`);
  await reloadAfterMutation();
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv() {
  const exportingCustomers = activePage.value === "customers";
  const exportingOverdue = activePage.value === "overdue";
  const exportingReconciliation = activePage.value === "reconciliation";
  const header = exportingCustomers
    ? ["客户", "联系人", "手机号", "应收", "已收", "欠款", "逾期", "未结清账单", "状态", "下一动作"]
    : exportingReconciliation
      ? ["提交时间", "客户", "账单号", "账期", "凭证金额", "方式", "凭证号", "状态", "对账人", "备注"]
      : ["账单号", "客户", "订单号", "账期", "应收", "已收", "欠款", "状态", "账龄", "到期日", "催收动作"];
  const rows = exportingCustomers
    ? filteredCustomers.value.map((customer) =>
        [
          customer.customerName,
          customer.customerContact,
          customer.contactPhone,
          customer.receivableTotal,
          customer.paidTotal,
          customer.debtTotal,
          customer.overdueTotal,
          customer.unsettledBillCount,
          customer.riskLabel,
          customer.collectionAction,
        ]
          .map(csvCell)
          .join(","),
      )
    : exportingReconciliation
      ? filteredReconciliationRecords.value.map((record) =>
          [
            record.uploadedAt,
            record.customerName,
            record.billNo,
            record.period,
            record.amount,
            record.method,
            record.voucherNo,
            record.statusLabel || voucherStatusLabel(record.status),
            record.reconciledBy,
            record.reconciliationRemark,
          ]
            .map(csvCell)
            .join(","),
        )
    : (exportingOverdue ? filteredOverdueBills.value : filteredBills.value).map((bill) =>
        [
          bill.billNo,
          bill.customerName,
          bill.orderNo,
          bill.period,
          bill.receivableAmount,
          bill.paidAmount,
          bill.debtAmount,
          bill.statusLabel,
          bill.ageingBucketLabel || bill.ageingBucket,
          bill.dueDate,
          bill.collectionAction,
        ]
          .map(csvCell)
          .join(","),
      );
  const blob = new Blob([`\uFEFF${[header.map(csvCell).join(","), ...rows].join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `财务中心_${activePage.value}_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(loadFinance);
</script>

<style scoped>
.finance-page {
  height: calc(100vh - 70px);
  display: flex;
  gap: 16px;
  margin: -16px;
  padding: 16px;
  overflow: hidden;
  color: #3a374c;
  background: #eef0f3;
}

.finance-page.is-detail {
  display: block;
  padding: 0;
}

.finance-page :deep(.el-button--primary) {
  --el-button-bg-color: #4e5afe;
  --el-button-border-color: #4e5afe;
  --el-button-hover-bg-color: #626cff;
  --el-button-hover-border-color: #626cff;
}

.finance-left {
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
.status-group,
.finance-summary-line button,
.risk-list button,
.screen-finance-grid button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.customer-tree button {
  width: 100%;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 10px;
  color: #222;
  border-radius: 6px;
  text-align: left;
}

.customer-tree button span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.customer-tree button em {
  flex: 0 0 auto;
  color: #f14949;
  font-size: 12px;
  font-style: normal;
}

.customer-tree button.active {
  color: #fff;
  background: #4e5afe;
}

.customer-tree button.active em {
  color: #fff;
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

.finance-main {
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

.toolbar-left :deep(.el-select) {
  width: 136px;
}

.toolbar-left :deep(.el-input-group__append) {
  width: 60px;
  padding: 0;
  color: #fff;
  border-color: #4e5afe;
  background: #4e5afe;
}

.finance-summary-line {
  height: 44px;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.finance-summary-line button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 0 14px;
  border-radius: 8px;
  background: #f7f8ff;
}

.finance-summary-line span {
  color: #868395;
  font-size: 12px;
}

.finance-summary-line strong {
  min-width: 0;
  overflow: hidden;
  color: #4e5afe;
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.finance-summary-line .danger strong,
.amount-danger {
  color: #f14949;
  font-weight: 600;
}

.finance-summary-line .warning strong {
  color: #d78b00;
}

.finance-summary-line .success strong,
.amount-success {
  color: #42bf79;
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

.target-table :deep(.warning-row) {
  background: #fff9ef;
}

.target-table :deep(.settled-row) {
  color: #909399;
  background: #f7f7f7;
}

.customer-cell {
  display: grid;
  gap: 3px;
}

.customer-cell span {
  color: #868395;
  font-size: 12px;
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

.finance-status {
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

.finance-status.big {
  height: 24px;
  min-width: 64px;
  margin-left: 8px;
  font-size: 14px;
}

.finance-status.success {
  color: #16a364;
  border-color: #6add9f;
  background: #effbf4;
}

.finance-status.warning {
  color: #d48806;
  border-color: #ffe58f;
  background: #fffbe6;
}

.finance-status.danger {
  color: #ff385c;
  border-color: #ff8ca1;
  background: #fff1f3;
}

.finance-status.primary {
  color: #4e5afe;
  border-color: #aeb4ff;
  background: #eef0ff;
}

.finance-status.info {
  color: #7f7f89;
  border-color: #d5d9e2;
  background: #f7f8fa;
}

.screen-workbench {
  height: calc(100% - 130px);
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.8fr);
  grid-template-rows: minmax(260px, 1.1fr) minmax(220px, 0.9fr);
  gap: 15px;
  overflow: hidden;
}

.screen-main-card,
.screen-side-card {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 20px;
  background: #fbfbfb;
}

.screen-main-card {
  grid-row: span 2;
  padding: 24px;
  background: #f7f8ff;
}

.screen-side-card {
  padding: 20px;
}

.screen-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 22px;
}

.screen-head div {
  display: grid;
  gap: 8px;
}

.screen-head span {
  color: #868395;
}

.screen-head strong {
  color: #23253c;
  font-size: 34px;
}

.screen-rate {
  width: 120px;
  height: 120px;
  place-items: center;
  border-radius: 50%;
  background: #fff;
}

.screen-rate em {
  color: #4e5afe;
  font-size: 30px;
  font-style: normal;
  font-weight: 700;
}

.screen-finance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.screen-finance-grid button {
  position: relative;
  min-height: 124px;
  display: grid;
  gap: 8px;
  padding: 18px;
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
  text-align: left;
}

.screen-finance-grid span,
.screen-finance-grid em {
  color: #868395;
  font-size: 13px;
  font-style: normal;
}

.screen-finance-grid strong {
  color: #23253c;
  font-size: 24px;
}

.screen-finance-grid strong.danger {
  color: #f14949;
}

.screen-finance-grid i {
  height: 4px;
  display: block;
  border-radius: 999px;
  background: #4e5afe;
}

.panel-title {
  color: #23253c;
  font-size: 18px;
  font-weight: 600;
}

.risk-list,
.period-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.risk-list button {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 10px 0;
  border-bottom: 1px solid #edf0f4;
  text-align: left;
}

.risk-list span {
  display: grid;
  gap: 4px;
}

.risk-list em,
.risk-list small,
.period-row em {
  color: #868395;
  font-size: 12px;
  font-style: normal;
}

.period-row {
  display: grid;
  grid-template-columns: 76px minmax(120px, 1fr) 108px 96px;
  gap: 10px;
  align-items: center;
}

.period-row div {
  height: 10px;
  display: flex;
  overflow: hidden;
  border-radius: 999px;
  background: #eef0f3;
}

.period-row i {
  height: 100%;
  border-radius: 999px;
}

.period-row .paid {
  background: #42bf79;
}

.period-row .debt {
  background: #f14949;
}

.finance-detail-page {
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

.finance-tips {
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

.finance-customer-content {
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

.customer-card {
  flex-shrink: 0;
  color: #3a374c;
  padding: clamp(16px, 1.04167vw, 22px) clamp(22px, 1.5625vw, 32px);
  border-radius: 20px;
  background: #fff;
}

.customer-first,
.customer-second,
.customer-third {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.customer-name {
  color: #23253c;
  font-size: 18px;
}

.customer-belong {
  display: flex;
  align-items: center;
  color: #4e5afe;
  font-size: 12px;
}

.customer-second {
  margin: 8px 0 20px;
}

.second-l {
  color: #23253c;
  font-size: 16px;
}

.second-r {
  color: #7f7f89;
  font-size: 12px;
}

.customer-third {
  margin-bottom: 32px;
}

.third-l {
  width: 40%;
  text-align: center;
}

.rate-ring {
  width: 128px;
  height: 128px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  border: 12px solid #e2e4ff;
  border-top-color: #4e5afe;
  border-radius: 50%;
  background: #fff;
}

.rate-ring strong {
  color: #23253c;
  font-size: 28px;
}

.rate-ring small,
.rate-label {
  color: #868395;
  font-size: 12px;
}

.rate-label {
  margin-top: 10px;
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
  font-size: 20px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.item-b.red {
  color: #f14949;
}

.customer-fourth {
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

.fourth-b-item .item-val.yellow {
  color: #d78b00;
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

.timeline-list {
  margin-top: 14px;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
}

.timeline-item > span {
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
  overflow: hidden;
  color: #23253c;
  font-size: 26px;
  white-space: nowrap;
  text-overflow: ellipsis;
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

.detail-desc {
  margin-top: 16px;
}

.flow-map {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flow-node {
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  color: #868395;
  border: 2px solid #d8d8d8;
  border-radius: 50%;
  background: #fbfbfb;
}

.flow-node.done {
  color: #fff;
  border-color: #4e5afe;
  background: #4e5afe;
}

.flow-line {
  width: 80px;
  height: 4px;
  background: #d8d8d8;
}

.flow-line.done {
  background: #4e5afe;
}

.rule-box {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rule-box div {
  padding: 14px;
  border-radius: 10px;
  background: #f7f8ff;
}

.rule-box span {
  color: #868395;
  font-size: 13px;
}

.rule-box strong {
  display: block;
  margin-top: 6px;
  color: #4e5afe;
  font-size: 20px;
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

.record-table {
  padding: 16px;
  font-size: 13px;
}

.record-table :deep(.el-table__header th) {
  color: #868395;
  background: #f9f9f9;
  font-weight: 400;
}

.bill-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.bill-detail-head div {
  display: grid;
  gap: 4px;
}

.bill-detail-head strong {
  color: #23253c;
  font-size: 18px;
}

.bill-detail-head span {
  color: #868395;
}

.drawer-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.drawer-summary div {
  min-height: 82px;
  display: grid;
  gap: 8px;
  align-content: center;
  padding: 14px;
  border-radius: 10px;
  background: #f7f8ff;
}

.drawer-summary span {
  color: #868395;
  font-size: 13px;
}

.drawer-summary strong {
  color: #23253c;
  font-size: 22px;
}

.detail-section {
  margin-top: 18px;
}

.detail-section h3 {
  margin: 0 0 10px;
  color: #23253c;
  font-size: 15px;
}

.detail-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf0f4;
}

.detail-line div {
  display: grid;
  gap: 4px;
}

.detail-line span,
.detail-line em {
  color: #868395;
  font-size: 12px;
  font-style: normal;
}

.full-input {
  width: 100%;
}

@media (max-width: 1400px) {
  .finance-left {
    width: 240px;
    flex-basis: 240px;
  }

  .content-l {
    min-width: 390px;
  }

  .finance-summary-line {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    height: auto;
  }

  .finance-summary-line button {
    min-height: 44px;
  }
}

@media (max-width: 1180px) {
  .finance-page {
    height: auto;
    min-height: calc(100vh - 70px);
    flex-direction: column;
    overflow: visible;
  }

  .finance-left {
    width: 100%;
    flex-basis: auto;
  }

  .finance-main {
    min-height: 720px;
  }

  .finance-detail-page {
    height: auto;
    min-height: calc(100vh - 70px);
    overflow: visible;
  }

  .panel-content {
    height: auto;
  }

  .finance-customer-content,
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

  .screen-workbench {
    height: auto;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    overflow: visible;
  }

  .list-toolbar,
  .toolbar-left,
  .toolbar-right {
    flex-wrap: wrap;
  }
}
</style>
