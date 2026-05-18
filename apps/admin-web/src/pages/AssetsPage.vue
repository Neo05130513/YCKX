<template>
  <div class="asset-page" :class="{ 'is-detail': viewMode === 'detail' }">
    <template v-if="viewMode === 'list'">
      <aside class="asset-left">
        <div class="tree-panel">
          <el-input v-model="warehouseKeyword" clearable placeholder="请输入仓库或客户名称" />
          <div class="warehouse-tree">
            <button :class="{ active: selectedWarehouse === 'all' }" @click="selectedWarehouse = 'all'">
              全部资产
            </button>
            <button
              v-for="warehouse in filteredWarehouses"
              :key="warehouse"
              :class="{ active: selectedWarehouse === warehouse }"
              @click="selectedWarehouse = warehouse"
            >
              {{ warehouse }}
            </button>
          </div>
        </div>

        <div class="left-line"></div>

        <div class="filter-block">
          <div class="filter-title">
            <span>资产筛选</span>
            <div class="scope-tabs">
              <button :class="{ active: ownerScope === 'all' }" @click="ownerScope = 'all'">全部</button>
              <button :class="{ active: ownerScope === 'mine' }" @click="ownerScope = 'mine'">本人</button>
            </div>
          </div>

          <button class="status-group" @click="leftFilter = 'all'">
            <span>资产状态({{ countByFilter("all") }})</span>
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

          <button class="side-item" :class="{ active: leftFilter === 'canOutbound' }" @click="leftFilter = 'canOutbound'">
            <span class="side-left">
              <el-icon><Van /></el-icon>
              可出库({{ countByFilter("canOutbound") }})
            </span>
          </button>
          <button class="side-item" :class="{ active: leftFilter === 'abnormal' }" @click="leftFilter = 'abnormal'">
            <span class="side-left">
              <el-icon><Warning /></el-icon>
              异常/维修({{ countByFilter("abnormal") }})
            </span>
            <el-icon class="right-icon"><ArrowDown /></el-icon>
          </button>
          <button class="side-item" @click="openImportDialog">
            <span class="side-left">
              <el-icon><Document /></el-icon>
              批量导入
            </span>
          </button>
          <button class="side-item" @click="activeListTab = 'history'">
            <span class="side-left">
              <el-icon><Operation /></el-icon>
              履历查询
            </span>
          </button>
        </div>
      </aside>

      <main class="asset-main">
        <div class="target-tabs">
          <button :class="{ active: activeListTab === 'ledger' }" @click="activeListTab = 'ledger'">
            资产台账
          </button>
          <button :class="{ active: activeListTab === 'value' }" @click="activeListTab = 'value'">
            资产价值
          </button>
          <button :class="{ active: activeListTab === 'inbound' }" @click="activeListTab = 'inbound'">
            入库管理
          </button>
          <button :class="{ active: activeListTab === 'outbound' }" @click="activeListTab = 'outbound'">
            出库管理
          </button>
          <button :class="{ active: activeListTab === 'transfer' }" @click="activeListTab = 'transfer'">
            调拨管理
          </button>
          <button :class="{ active: activeListTab === 'inventory' }" @click="activeListTab = 'inventory'">
            盘点管理
          </button>
          <button :class="{ active: activeListTab === 'history' }" @click="activeListTab = 'history'">
            资产履历
          </button>
        </div>

        <div class="list-toolbar">
          <div class="toolbar-left">
            <el-select v-model="queryField" class="field-select">
              <el-option label="BT码" value="btCode" />
              <el-option label="资产编号" value="assetNo" />
              <el-option label="订单号" value="orderNo" />
              <el-option label="客户" value="customerName" />
              <el-option label="仓库" value="warehouse" />
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
            <el-button type="primary" @click="openInboundDialog">
              <el-icon><Plus /></el-icon>
              新建入库
            </el-button>
            <el-button @click="openImportDialog">批量导入</el-button>
            <el-button @click="openOutbound()">创建出库</el-button>
            <el-button @click="openTransfer()">调拨</el-button>
            <el-button @click="openInventory()">盘点</el-button>
            <el-button @click="openDepreciation()">计提折旧</el-button>
            <el-button @click="exportCsv">导出</el-button>
            <el-dropdown trigger="click" @command="handleBatchCommand">
              <el-button>
                批量操作
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="批量出库">批量出库</el-dropdown-item>
                  <el-dropdown-item command="批量调拨">批量调拨</el-dropdown-item>
                  <el-dropdown-item command="批量退回入库">批量退回入库</el-dropdown-item>
                  <el-dropdown-item command="批量盘点">批量盘点</el-dropdown-item>
                  <el-dropdown-item command="批量计提折旧">批量计提折旧</el-dropdown-item>
                  <el-dropdown-item command="报废审批">报废审批</el-dropdown-item>
                  <el-dropdown-item command="买断审批">买断审批</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div class="asset-summary-line">
          <div>
            <span>资产总数</span>
            <strong>{{ summary.total }}</strong>
          </div>
          <div>
            <span>在库</span>
            <strong>{{ summary.inStock }}</strong>
          </div>
          <div>
            <span>租赁</span>
            <strong>{{ summary.leasing }}</strong>
          </div>
          <div>
            <span>可出库</span>
            <strong>{{ summary.canOutbound }}</strong>
          </div>
          <div class="danger">
            <span>异常/维修</span>
            <strong>{{ summary.abnormal }}</strong>
          </div>
          <div class="danger">
            <span>盘点异常</span>
            <strong>{{ summary.inventoryAbnormal }}</strong>
          </div>
          <div>
            <span>资产原值</span>
            <strong>{{ money(summary.originalValue) }}</strong>
          </div>
          <div>
            <span>账面净值</span>
            <strong>{{ money(summary.netValue) }}</strong>
          </div>
        </div>

        <el-table
          v-if="activeListTab === 'ledger'"
          :data="filteredRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          :row-class-name="tableRowClassName"
          @row-dblclick="openDetail"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column prop="assetNo" label="资产编号" width="128" fixed show-overflow-tooltip />
          <el-table-column prop="btCode" label="BT码" width="154" fixed show-overflow-tooltip />
          <el-table-column label="资产状态" width="94" align="center">
            <template #default="{ row }">
              <span class="asset-status" :class="statusClass(row.assetStatus)">{{ statusLabel(row.assetStatus) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="model" label="型号" width="110" />
          <el-table-column prop="warehouse" label="仓库/位置" min-width="130" show-overflow-tooltip />
          <el-table-column prop="customerShortName" label="当前客户" min-width="130" show-overflow-tooltip />
          <el-table-column prop="orderNo" label="当前订单" width="154" show-overflow-tooltip />
          <el-table-column label="电量" width="72" align="center">
            <template #default="{ row }">
              <span class="power-tag" :class="{ low: row.powerPercent < 30 }">{{ row.powerPercent }}%</span>
            </template>
          </el-table-column>
          <el-table-column prop="batchNum" label="批次" width="118" />
          <el-table-column prop="purchaseDate" label="采购日期" width="112" />
          <el-table-column prop="keeper" label="库管" width="82" />
          <el-table-column prop="latestAction" label="最近动作" min-width="140" show-overflow-tooltip />
          <el-table-column prop="latestActionAt" label="最近时间" width="150" />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
                <el-button text type="primary" :disabled="!row.canOutbound" @click.stop="openOutbound(row)">
                  出库
                </el-button>
                <el-button
                  text
                  type="primary"
                  :disabled="row.assetStatus !== 'LEASING'"
                  @click.stop="openReturnInbound(row)"
                >
                  退回
                </el-button>
                <el-button text type="primary" @click.stop="openDisposal(row)">更多</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activeListTab === 'value'"
          :data="valueRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openDetail"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column prop="assetNo" label="资产编号" width="128" fixed show-overflow-tooltip />
          <el-table-column prop="btCode" label="BT码" width="154" fixed show-overflow-tooltip />
          <el-table-column prop="model" label="型号" width="110" />
          <el-table-column label="原值" width="118" align="right">
            <template #default="{ row }">{{ money(row.originalValue) }}</template>
          </el-table-column>
          <el-table-column label="累计折旧" width="118" align="right">
            <template #default="{ row }">{{ money(row.accumulatedDepreciation) }}</template>
          </el-table-column>
          <el-table-column label="账面净值" width="118" align="right">
            <template #default="{ row }">
              <span :class="{ 'amount-danger': row.netValue <= row.salvageValue }">{{ money(row.netValue) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="月折旧" width="108" align="right">
            <template #default="{ row }">{{ money(row.monthlyDepreciation) }}</template>
          </el-table-column>
          <el-table-column prop="usefulLifeMonths" label="折旧月数" width="92" align="right" />
          <el-table-column prop="lastDepreciationPeriod" label="最近期间" width="110" />
          <el-table-column prop="latestVoucherNo" label="最新凭证" width="150" show-overflow-tooltip />
          <el-table-column label="计提状态" width="110" align="center">
            <template #default="{ row }">
              <span class="asset-status" :class="depreciationClass(row.depreciationStatus)">
                {{ row.depreciationStatus }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="depreciationStart" label="折旧起始" width="110" />
          <el-table-column prop="supplierName" label="供应商" min-width="140" show-overflow-tooltip />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button text type="primary" @click.stop="openDepreciation(row)">计提</el-button>
                <el-button text type="primary" @click.stop="openValuation(row)">参数</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activeListTab === 'inbound'"
          :data="filteredRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openDetail"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column prop="inboundNo" label="入库单号" width="150" fixed />
          <el-table-column prop="btCode" label="BT码" width="154" fixed />
          <el-table-column prop="model" label="型号" width="110" />
          <el-table-column prop="batchNum" label="批次" width="130" />
          <el-table-column prop="warehouse" label="入库仓库" min-width="130" />
          <el-table-column prop="inboundAt" label="入库日期" width="118" />
          <el-table-column prop="keeper" label="经办人" width="90" />
          <el-table-column prop="latestAction" label="最近业务动作" min-width="170" />
          <el-table-column prop="updatedAt" label="更新时间" width="150" />
          <el-table-column label="操作" width="128" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openDetail(row)">查看履历</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activeListTab === 'outbound'"
          :data="outboundRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openDetail"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column prop="outboundNo" label="出库单号" width="150" fixed />
          <el-table-column prop="btCode" label="BT码" width="154" fixed />
          <el-table-column prop="orderNo" label="订单号" width="154" />
          <el-table-column prop="customerShortName" label="客户" min-width="130" />
          <el-table-column prop="warehouse" label="出库仓库" width="120" />
          <el-table-column prop="outboundAt" label="出库日期" width="118" />
          <el-table-column prop="receivedAt" label="收货时间" width="150" />
          <el-table-column label="资产状态" width="94" align="center">
            <template #default="{ row }">
              <span class="asset-status" :class="statusClass(row.assetStatus)">{{ statusLabel(row.assetStatus) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="128" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activeListTab === 'transfer'"
          :data="transferRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openDetail"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column prop="transferNo" label="调拨单号" width="150" fixed />
          <el-table-column prop="btCode" label="BT码" width="154" fixed />
          <el-table-column prop="fromWarehouse" label="调出仓库" width="130" />
          <el-table-column prop="toWarehouse" label="调入仓库" width="130" />
          <el-table-column prop="status" label="状态" width="90" />
          <el-table-column prop="operator" label="经办人" width="90" />
          <el-table-column prop="createdAt" label="创建时间" width="150" />
          <el-table-column prop="remark" label="备注" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="128" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else-if="activeListTab === 'inventory'"
          :data="inventoryRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openDetail"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" fixed />
          <el-table-column prop="btCode" label="BT码" width="154" fixed show-overflow-tooltip />
          <el-table-column prop="assetNo" label="资产编号" width="128" />
          <el-table-column prop="warehouse" label="账面仓库/位置" min-width="140" show-overflow-tooltip />
          <el-table-column label="盘点结果" width="118" align="center">
            <template #default="{ row }">
              <span class="asset-status" :class="inventoryClass(row.inventoryResult)">
                {{ row.inventoryStatus }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="lastInventoryAt" label="最近盘点" width="150" />
          <el-table-column label="资产状态" width="94" align="center">
            <template #default="{ row }">
              <span class="asset-status" :class="statusClass(row.assetStatus)">{{ statusLabel(row.assetStatus) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="powerPercent" label="电量" width="80" align="center" />
          <el-table-column prop="keeper" label="负责人" width="90" />
          <el-table-column prop="latestAction" label="最近动作" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openInventory(row)">登记盘点</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-table
          v-else
          :data="filteredRows"
          border
          height="calc(100% - 130px)"
          class="target-table"
          @row-dblclick="openDetail"
        >
          <el-table-column type="index" label="序号" width="62" align="center" fixed />
          <el-table-column prop="btCode" label="BT码" width="154" fixed />
          <el-table-column prop="latestAction" label="最近动作" width="150" />
          <el-table-column prop="latestActionAt" label="动作时间" width="150" />
          <el-table-column prop="warehouse" label="仓库/位置" width="130" />
          <el-table-column prop="customerShortName" label="客户" min-width="130" />
          <el-table-column prop="orderNo" label="订单号" width="154" />
          <el-table-column label="资产状态" width="94" align="center">
            <template #default="{ row }">
              <span class="asset-status" :class="statusClass(row.assetStatus)">{{ statusLabel(row.assetStatus) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="150" />
          <el-table-column label="操作" width="128" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openDetail(row)">完整履历</el-button>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </template>

    <template v-else>
      <div class="asset-detail-page">
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
          <div v-if="detail && !detail.canOutbound" class="asset-tips">
            {{ detail.cannotOutboundReason || "当前状态不允许出库" }}
          </div>
          <div class="tools-box">
            <el-button size="small" @click="backToList">
              <el-icon><Back /></el-icon>
              返回列表
            </el-button>
            <el-button size="small" :icon="Refresh" @click="refreshDetail">刷新</el-button>
            <el-button size="small" @click="openValuation(detail)">价值参数</el-button>
            <el-button size="small" @click="openDepreciation(detail)">计提折旧</el-button>
            <el-button size="small" type="primary" :disabled="!detail?.canOutbound" @click="openOutbound(detail)">
              <el-icon><Van /></el-icon>
              出库
            </el-button>
            <el-button size="small" @click="openInventory(detail)">盘点</el-button>
            <el-button size="small" :disabled="detail?.assetStatus !== 'LEASING'" @click="openReturnInbound(detail)">
              退回入库
            </el-button>
          </div>
        </div>

        <div v-if="detail" class="panel-content">
          <section v-if="activeDetailTab === 'overview'" class="asset-bms-content">
            <div class="content-l">
              <div class="asset-card">
                <div class="asset-first">
                  <div>
                    <span class="asset-no">{{ detail.btCode }}</span>
                    <span class="asset-status big" :class="statusClass(detail.assetStatus)">
                      {{ statusLabel(detail.assetStatus) }}
                    </span>
                    <span class="signal-bars">
                      <i></i><i></i><i></i>
                      {{ runningStatusLabel(detail.runningStatus) }}
                    </span>
                  </div>
                  <div class="asset-belong">
                    <el-icon><UserFilled /></el-icon>
                    {{ detail.customerShortName || detail.customerName || detail.warehouse }}
                  </div>
                </div>

                <div class="asset-second">
                  <div class="second-l">{{ detail.assetNo }} / {{ detail.model }}</div>
                  <div class="second-r">更新时间：{{ detail.updatedAt }}</div>
                </div>

                <div class="asset-third">
                  <div class="third-l">
                    <div class="battery">
                      <div class="battery-top"></div>
                      <div class="fill-bg" :style="{ height: `${detail.powerPercent}%` }"></div>
                      <div class="value">{{ detail.powerPercent }}<small>%</small></div>
                    </div>
                    <div class="battery-status">{{ statusLabel(detail.assetStatus) }}</div>
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

                <div class="asset-fourth">
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
                <div class="panel-title">资产履历</div>
                <div class="timeline-list">
                  <div v-for="item in detail.movements || []" :key="`${item.time}-${item.title}`" class="timeline-item">
                    <span></span>
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p>{{ item.remark }}</p>
                      <em>{{ item.time }} / {{ item.operator }} / {{ item.status }}</em>
                    </div>
                  </div>
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
                  <div class="panel-title">关联订单</div>
                  <el-descriptions :column="1" border class="detail-desc">
                    <el-descriptions-item label="订单号">{{ detail.order?.orderNo || detail.orderNo || "--" }}</el-descriptions-item>
                    <el-descriptions-item label="客户">{{ detail.order?.customerName || detail.customerName || "--" }}</el-descriptions-item>
                    <el-descriptions-item label="租期">
                      {{ detail.order ? `${detail.order.leaseStart} 至 ${detail.order.leaseEnd}` : "--" }}
                    </el-descriptions-item>
                    <el-descriptions-item label="当前仓库">{{ detail.warehouse }}</el-descriptions-item>
                  </el-descriptions>
                </div>

                <div class="mini-panel">
                  <div class="panel-title">出入库链路</div>
                  <div class="flow-map">
                    <div class="flow-node done">入库</div>
                    <div class="flow-line" :class="{ done: detail.outboundNo }"></div>
                    <div class="flow-node" :class="{ done: detail.outboundNo }">出库</div>
                    <div class="flow-line" :class="{ done: detail.receivedAt }"></div>
                    <div class="flow-node" :class="{ done: detail.receivedAt }">收货</div>
                  </div>
                  <div class="rule-box">
                    <div>
                      <span>可出库</span>
                      <strong>{{ detail.canOutbound ? "是" : "否" }}</strong>
                    </div>
                    <div>
                      <span>终态限制</span>
                      <strong>{{ ["SCRAPPED", "BOUGHT_OUT"].includes(detail.assetStatus) ? "不可租赁" : "正常" }}</strong>
                    </div>
                    <div>
                      <span>履历数</span>
                      <strong>{{ detail.movements?.length || 0 }}</strong>
                    </div>
                    <div>
                      <span>报修数</span>
                      <strong>{{ detail.repairs?.length || 0 }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeDetailTab === 'history'" class="record-page">
            <div class="record-head">
              <strong>完整资产履历</strong>
              <el-button class="right-action" @click="openReserved('导出资产履历')">导出履历</el-button>
            </div>
            <el-table :data="detail.movements || []" border class="record-table">
              <el-table-column prop="type" label="动作类型" width="110" />
              <el-table-column prop="title" label="动作名称" width="150" />
              <el-table-column prop="time" label="发生时间" width="170" />
              <el-table-column prop="operator" label="操作人" width="110" />
              <el-table-column prop="target" label="对象/位置" min-width="160" />
              <el-table-column prop="status" label="结果" width="100" />
              <el-table-column prop="remark" label="备注" min-width="240" show-overflow-tooltip />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'inbound'" class="record-page">
            <div class="record-head">
              <strong>入库记录</strong>
              <el-button class="right-action" :disabled="detail.assetStatus !== 'LEASING'" @click="openReturnInbound(detail)">
                租赁退回入库
              </el-button>
              <el-button class="right-action" @click="openRepairInbound(detail)">维修完成入库</el-button>
            </div>
            <el-table :data="detail.inboundRecords || []" border class="record-table">
              <el-table-column prop="inboundNo" label="入库单号" width="150" />
              <el-table-column prop="source" label="入库来源" width="120" />
              <el-table-column prop="warehouse" label="仓库" width="130" />
              <el-table-column prop="operator" label="经办人" width="100" />
              <el-table-column prop="quantity" label="数量" width="80" align="right" />
              <el-table-column prop="inboundAt" label="入库时间" width="140" />
              <el-table-column prop="remark" label="备注" min-width="240" />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'outbound'" class="record-page">
            <div class="record-head">
              <strong>出库单</strong>
              <el-button class="right-action" :disabled="detail.assetStatus !== 'LEASING'" @click="openReturnInbound(detail)">
                退回入库
              </el-button>
              <el-button class="right-action" :disabled="!detail.canOutbound" @click="openOutbound(detail)">创建出库</el-button>
            </div>
            <el-table :data="detail.outbounds || []" border class="record-table">
              <el-table-column prop="outboundNo" label="出库单号" width="150" />
              <el-table-column prop="customerName" label="客户" min-width="160" />
              <el-table-column prop="warehouse" label="仓库" width="120" />
              <el-table-column prop="operator" label="经办人" width="100" />
              <el-table-column prop="outboundAt" label="出库时间" width="130" />
              <el-table-column prop="autoReceiveAt" label="自动收货日" width="130" />
              <el-table-column prop="receivedAt" label="收货时间" width="150" />
              <el-table-column label="BT码" min-width="220">
                <template #default="{ row }">{{ row.btCodes?.join("、") }}</template>
              </el-table-column>
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'transfer'" class="record-page">
            <div class="record-head">
              <strong>调拨记录</strong>
              <el-button class="right-action" @click="openTransfer(detail)">新建调拨</el-button>
            </div>
            <el-table :data="detail.transferRecords || []" border class="record-table">
              <el-table-column prop="transferNo" label="调拨单号" width="150" />
              <el-table-column prop="fromWarehouse" label="调出仓库" width="130" />
              <el-table-column prop="toWarehouse" label="调入仓库" width="130" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column prop="operator" label="经办人" width="100" />
              <el-table-column prop="createdAt" label="创建时间" width="150" />
              <el-table-column prop="remark" label="备注" min-width="260" />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'inventory'" class="record-page">
            <div class="record-head">
              <strong>盘点记录</strong>
              <el-button class="right-action" @click="openInventory(detail)">登记盘点</el-button>
            </div>
            <el-table :data="detail.inventoryRecords || []" border class="record-table">
              <el-table-column prop="checkNo" label="盘点单号" width="150" />
              <el-table-column prop="expectedWarehouse" label="账面仓库" width="130" />
              <el-table-column prop="actualWarehouse" label="实盘位置" width="130" />
              <el-table-column label="结果" width="110" align="center">
                <template #default="{ row }">
                  <span class="asset-status" :class="inventoryClass(row.result)">{{ row.resultLabel }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="operator" label="盘点人" width="100" />
              <el-table-column prop="checkedAt" label="盘点时间" width="160" />
              <el-table-column prop="powerPercent" label="电量" width="80" align="right" />
              <el-table-column prop="remark" label="备注" min-width="240" show-overflow-tooltip />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'finance'" class="record-page">
            <div class="record-head">
              <strong>价值折旧</strong>
              <el-button class="right-action" @click="openValuation(detail)">价值参数</el-button>
              <el-button @click="openDepreciation(detail)">计提折旧</el-button>
            </div>
            <div class="finance-grid">
              <div>
                <span>资产原值</span>
                <strong>{{ money(detail.originalValue) }}</strong>
              </div>
              <div>
                <span>预计残值</span>
                <strong>{{ money(detail.salvageValue) }}</strong>
              </div>
              <div>
                <span>累计折旧</span>
                <strong>{{ money(detail.accumulatedDepreciation) }}</strong>
              </div>
              <div>
                <span>账面净值</span>
                <strong>{{ money(detail.netValue) }}</strong>
              </div>
              <div>
                <span>月折旧</span>
                <strong>{{ money(detail.monthlyDepreciation) }}</strong>
              </div>
              <div>
                <span>计提状态</span>
                <strong>{{ detail.depreciationStatus }}</strong>
              </div>
            </div>
            <el-table :data="detail.depreciationRecords || []" border class="record-table">
              <el-table-column prop="depreciationNo" label="折旧单号" width="150" />
              <el-table-column prop="period" label="期间" width="100" />
              <el-table-column prop="method" label="方法" width="100" />
              <el-table-column label="本次计提" width="120" align="right">
                <template #default="{ row }">{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column label="累计折旧" width="120" align="right">
                <template #default="{ row }">{{ money(row.accumulatedAfter) }}</template>
              </el-table-column>
              <el-table-column label="计提后净值" width="120" align="right">
                <template #default="{ row }">{{ money(row.netValueAfter) }}</template>
              </el-table-column>
              <el-table-column prop="operator" label="经办人" width="100" />
              <el-table-column prop="postedAt" label="计提时间" width="160" />
              <el-table-column prop="remark" label="备注" min-width="240" show-overflow-tooltip />
            </el-table>

            <div class="record-head sub-head">
              <strong>财务凭证</strong>
              <span>{{ detail.financeRecords?.length || 0 }} 张</span>
            </div>
            <el-table :data="detail.financeRecords || []" border class="record-table voucher-table">
              <el-table-column prop="voucherNo" label="凭证号" width="160" />
              <el-table-column prop="typeLabel" label="业务类型" width="110" />
              <el-table-column prop="sourceNo" label="来源单号" width="150" />
              <el-table-column prop="approvalNo" label="审批单" width="130" />
              <el-table-column label="借方" width="110" align="right">
                <template #default="{ row }">{{ money(row.debitTotal) }}</template>
              </el-table-column>
              <el-table-column label="贷方" width="110" align="right">
                <template #default="{ row }">{{ money(row.creditTotal) }}</template>
              </el-table-column>
              <el-table-column prop="operator" label="入账人" width="100" />
              <el-table-column prop="postedAt" label="入账时间" width="160" />
              <el-table-column label="分录" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ voucherEntryText(row) }}
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'repair'" class="record-page">
            <div class="record-head">
              <strong>维修记录</strong>
              <el-button class="right-action" @click="openReserved('内部报修')">内部报修</el-button>
            </div>
            <el-table :data="detail.repairs || []" border class="record-table">
              <el-table-column prop="repairNo" label="报修单号" width="150" />
              <el-table-column prop="customerName" label="客户" min-width="160" />
              <el-table-column prop="description" label="故障描述" min-width="240" show-overflow-tooltip />
              <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
              <el-table-column prop="handler" label="处理人" width="110" />
              <el-table-column prop="createdAt" label="创建时间" width="160" />
            </el-table>
          </section>

          <section v-else class="record-page">
            <div class="record-head">
              <strong>报废 / 买断</strong>
              <el-button class="right-action" @click="openDisposal(detail, 'BOUGHT_OUT')">买断审批</el-button>
              <el-button @click="openDisposal(detail, 'SCRAPPED')">报废申请</el-button>
            </div>
            <el-table v-if="detail.disposalRecords?.length" :data="detail.disposalRecords" border class="record-table">
              <el-table-column prop="disposalNo" label="单号" width="150" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <span class="asset-status" :class="disposalClass(row.status)">{{ row.status }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="approvalNo" label="审批单" width="140" />
              <el-table-column prop="operator" label="经办人" width="100" />
              <el-table-column label="处置金额" width="110" align="right">
                <template #default="{ row }">{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column label="账面净值" width="110" align="right">
                <template #default="{ row }">{{ money(row.bookValue) }}</template>
              </el-table-column>
              <el-table-column label="损益" width="110" align="right">
                <template #default="{ row }">
                  <span :class="{ 'amount-danger': row.gainLossAmount < 0 }">{{ money(row.gainLossAmount) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="financeResult" label="财务结果" min-width="160" show-overflow-tooltip />
              <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
              <el-table-column prop="createdAt" label="登记时间" width="160" />
            </el-table>
            <div v-else class="empty-state">
              <el-empty description="暂无报废或买断记录" />
              <p>报废和买断属于资产终态，审批通过后资产不可再次出库或租赁。</p>
            </div>
          </section>
        </div>
      </div>
    </template>

    <el-dialog v-model="inboundDialogVisible" title="采购入库审批" width="640px">
      <el-form label-width="96px" class="asset-form">
        <div class="dialog-grid">
          <el-form-item label="BT码" required>
            <el-input v-model="inboundForm.btCode" placeholder="例如 BT202605180001" />
          </el-form-item>
          <el-form-item label="电池型号" required>
            <el-input v-model="inboundForm.model" placeholder="例如 72V 45AH" />
          </el-form-item>
          <el-form-item label="规格">
            <el-input v-model="inboundForm.specification" placeholder="电压 / 容量 / 串数" />
          </el-form-item>
          <el-form-item label="入库仓库" required>
            <el-input v-model="inboundForm.warehouse" />
          </el-form-item>
          <el-form-item label="批次">
            <el-input v-model="inboundForm.batchNum" />
          </el-form-item>
          <el-form-item label="采购日期">
            <el-input v-model="inboundForm.purchaseDate" placeholder="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="inboundForm.keeper" />
          </el-form-item>
          <el-form-item label="电量">
            <el-input v-model.number="inboundForm.powerPercent" />
          </el-form-item>
          <el-form-item label="资产原值">
            <el-input-number v-model="inboundForm.originalValue" :min="1" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="预计残值">
            <el-input-number v-model="inboundForm.salvageValue" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="供应商">
            <el-input v-model="inboundForm.supplierName" />
          </el-form-item>
          <el-form-item label="发票号">
            <el-input v-model="inboundForm.invoiceNo" />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="inboundForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inboundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitInbound">提交审批</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="资产批量导入审批" width="760px">
      <el-form label-width="96px" class="asset-form">
        <div class="dialog-grid">
          <el-form-item label="入库仓库">
            <el-input v-model="importForm.warehouse" />
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="importForm.operator" />
          </el-form-item>
          <el-form-item label="采购批次">
            <el-input v-model="importForm.batchNum" />
          </el-form-item>
          <el-form-item label="供应商">
            <el-input v-model="importForm.supplierName" />
          </el-form-item>
        </div>
        <el-form-item label="导入明细">
          <el-input
            v-model="importForm.recordsText"
            type="textarea"
            :rows="10"
            placeholder="每行一组：BT码, 型号, 规格, 原值, 残值, 发票号&#10;例如：BT202605180101,72V 45AH,72V/45AH,4800,480,FP2026051801"
          />
        </el-form-item>
        <div v-if="importFailures.length" class="import-failures">
          <strong>校验失败</strong>
          <p v-for="item in importFailures" :key="item">{{ item }}</p>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitAssetImport">提交导入审批</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="outboundDialogVisible" title="创建出库单" width="640px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="actionTargetText"
          :title="actionMode === 'batch' ? `批量出库：${actionTargetText}` : `出库资产：${actionTargetText}`"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="dialog-grid">
          <el-form-item label="关联订单" required>
            <el-select v-model="outboundForm.orderId" filterable placeholder="选择已会签订单">
              <el-option
                v-for="order in orderOptions"
                :key="order.id"
                :label="`${order.orderNo} / ${order.customerShortName || order.customerName}`"
                :value="order.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="出库仓库">
            <el-input v-model="outboundForm.warehouse" />
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="outboundForm.operator" />
          </el-form-item>
          <el-form-item label="收货人">
            <el-input v-model="outboundForm.receiver" placeholder="不填则取订单联系人" />
          </el-form-item>
          <el-form-item label="出库日期">
            <el-input v-model="outboundForm.outboundAt" placeholder="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="自动收货日">
            <el-input v-model="outboundForm.autoReceiveAt" placeholder="不填则默认 7 天后" />
          </el-form-item>
        </div>
        <el-form-item label="收货地址">
          <el-input v-model="outboundForm.address" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="outboundForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="outboundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitOutbound">确认出库</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="transferDialogVisible" title="资产调拨" width="560px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="actionTargetText"
          :title="actionMode === 'batch' ? `批量调拨：${actionTargetText}` : `调拨资产：${actionTargetText}`"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form-item label="调入仓库" required>
          <el-input v-model="transferForm.toWarehouse" />
        </el-form-item>
        <el-form-item label="经办人">
          <el-input v-model="transferForm.operator" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="transferForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitTransfer">确认调拨</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="inventoryDialogVisible" title="资产盘点登记" width="640px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="actionTargetText"
          :title="actionMode === 'batch' ? `批量盘点：${actionTargetText}` : `盘点资产：${actionTargetText}`"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="dialog-grid">
          <el-form-item label="盘点结果" required>
            <el-select v-model="inventoryForm.result">
              <el-option v-for="item in inventoryResults" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="实盘位置">
            <el-input v-model="inventoryForm.actualWarehouse" />
          </el-form-item>
          <el-form-item label="盘点人">
            <el-input v-model="inventoryForm.operator" />
          </el-form-item>
          <el-form-item label="盘点时间">
            <el-input v-model="inventoryForm.checkedAt" placeholder="不填则使用当前时间" />
          </el-form-item>
          <el-form-item label="电量">
            <el-input v-model.number="inventoryForm.powerPercent" placeholder="不填则沿用当前电量" />
          </el-form-item>
          <el-form-item label="运行状态">
            <el-select v-model="inventoryForm.runningStatus" clearable placeholder="沿用当前状态">
              <el-option label="在线" value="ONLINE" />
              <el-option label="离线" value="OFFLINE" />
              <el-option label="异常" value="ABNORMAL" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="同步库位">
          <el-switch v-model="inventoryForm.syncLocation" active-text="把实盘位置写回资产台账" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="inventoryForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inventoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitInventory">确认盘点</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="depreciationDialogVisible" title="资产折旧计提" width="600px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="actionTargetText"
          :title="actionMode === 'batch' ? `批量计提：${actionTargetText}` : `计提资产：${actionTargetText}`"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="dialog-grid">
          <el-form-item label="计提期间" required>
            <el-date-picker v-model="depreciationForm.period" type="month" value-format="YYYY-MM" />
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="depreciationForm.operator" />
          </el-form-item>
          <el-form-item label="折旧金额">
            <el-input-number
              v-model="depreciationForm.amount"
              :min="0"
              :precision="2"
              placeholder="不填按月折旧"
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="depreciationForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="depreciationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitDepreciation">确认计提</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="valuationDialogVisible" title="资产价值参数" width="640px">
      <el-form label-width="108px" class="asset-form">
        <el-alert
          v-if="selectedAsset"
          :title="`设置资产：${selectedAsset.btCode}`"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="dialog-grid">
          <el-form-item label="资产原值" required>
            <el-input-number v-model="valuationForm.originalValue" :min="1" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="预计残值" required>
            <el-input-number v-model="valuationForm.salvageValue" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="折旧月数" required>
            <el-input-number v-model="valuationForm.usefulLifeMonths" :min="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="折旧起始">
            <el-date-picker v-model="valuationForm.depreciationStart" type="date" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="供应商">
            <el-input v-model="valuationForm.supplierName" />
          </el-form-item>
          <el-form-item label="发票号">
            <el-input v-model="valuationForm.invoiceNo" />
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="valuationForm.operator" />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="valuationForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="valuationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitValuation">保存参数</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="returnInboundDialogVisible" title="租赁退回入库" width="560px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="actionTargetText"
          :title="actionMode === 'batch' ? `批量退回：${actionTargetText}` : `退回资产：${actionTargetText}`"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form-item label="退回仓库" required>
          <el-input v-model="returnInboundForm.warehouse" />
        </el-form-item>
        <el-form-item label="经办人">
          <el-input v-model="returnInboundForm.operator" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="returnInboundForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnInboundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitReturnInbound">确认退回</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="repairInboundDialogVisible" title="维修完成入库" width="560px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="selectedAsset"
          :title="`入库资产：${selectedAsset.btCode}`"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form-item label="入库仓库" required>
          <el-input v-model="repairInboundForm.warehouse" />
        </el-form-item>
        <el-form-item label="经办人">
          <el-input v-model="repairInboundForm.operator" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="repairInboundForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="repairInboundDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitRepairInbound">确认入库</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="disposalDialogVisible" title="报废 / 买断审批" width="560px">
      <el-form label-width="96px" class="asset-form">
        <el-alert
          v-if="actionTargetText"
          :title="actionMode === 'batch' ? `批量处理：${actionTargetText}` : `处理资产：${actionTargetText}`"
          type="warning"
          :closable="false"
          show-icon
        />
        <el-form-item label="处理类型" required>
          <el-radio-group v-model="disposalForm.action">
            <el-radio-button label="SCRAPPED">报废</el-radio-button>
            <el-radio-button label="BOUGHT_OUT">买断</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="经办人">
          <el-input v-model="disposalForm.operator" />
        </el-form-item>
        <el-form-item label="处置金额">
          <el-input v-model.number="disposalForm.amount" />
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="disposalForm.reason" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="disposalForm.remark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposalDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitDisposal">提交审批</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  ArrowDown,
  ArrowUp,
  Back,
  Box,
  Coin,
  Document,
  House,
  Location,
  Operation,
  Plus,
  Refresh,
  Search,
  Tickets,
  Tools,
  UserFilled,
  Van,
  Warning,
} from "@element-plus/icons-vue";
import { getMock, postMock } from "../api/http";

type AssetStatus = "IN_STOCK" | "REPAIRING" | "LEASING" | "SCRAPPED" | "BOUGHT_OUT";
type RunningStatus = "ONLINE" | "OFFLINE" | "ABNORMAL" | "UNKNOWN";
type ListTab = "ledger" | "value" | "inbound" | "outbound" | "transfer" | "inventory" | "history";
type DetailTab = "overview" | "history" | "inbound" | "outbound" | "transfer" | "inventory" | "finance" | "repair" | "disposal";
type ActionMode = "single" | "batch";
type InventoryResult = "MATCHED" | "LOCATION_MISMATCH" | "MISSING" | "DAMAGED";

interface AssetMovement {
  type: string;
  title: string;
  time: string;
  operator: string;
  target: string;
  status: string;
  remark: string;
}

interface AssetRow {
  id: string;
  assetNo: string;
  btCode: string;
  deviceNum: string;
  model: string;
  specification: string;
  assetStatus: AssetStatus;
  runningStatus: RunningStatus;
  powerPercent: number;
  warehouse: string;
  location: string;
  customerName: string;
  customerShortName: string;
  orderNo: string;
  outboundNo: string;
  inboundNo: string;
  batchNum: string;
  purchaseDate: string;
  inboundAt: string;
  outboundAt: string;
  receivedAt: string;
  repairNo: string;
  keeper: string;
  assetOwner: string;
  latestAction: string;
  latestActionAt: string;
  lastInventoryAt: string;
  inventoryResult: string;
  inventoryStatus: string;
  originalValue: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationStart: string;
  depreciationMethod: string;
  depreciableAmount: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  netValue: number;
  depreciationMonths: number;
  remainingDepreciationMonths: number;
  depreciationStatus: string;
  lastDepreciationPeriod: string;
  lastDepreciationAt: string;
  supplierName: string;
  invoiceNo: string;
  voucherCount: number;
  latestVoucherNo: string;
  hasPendingDisposal: boolean;
  pendingDisposalApprovalNo: string;
  pendingDisposalStatus: string;
  canOutbound: boolean;
  cannotOutboundReason: string;
  updatedAt: string;
}

interface TransferRow {
  transferNo: string;
  btCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  status: string;
  operator: string;
  createdAt: string;
  remark: string;
  id?: string;
}

interface InventoryRow {
  id: string;
  assetId: string;
  btCode: string;
  checkNo: string;
  expectedWarehouse: string;
  actualWarehouse: string;
  result: InventoryResult;
  resultLabel: string;
  operator: string;
  checkedAt: string;
  powerPercent: number;
  runningStatus: RunningStatus;
  syncLocation: boolean;
  remark: string;
}

interface DisposalRow {
  id: string;
  assetId: string;
  btCode: string;
  disposalNo: string;
  type: string;
  status: string;
  approvalNo: string;
  approvalStatus: string;
  operator: string;
  amount: number;
  bookValue: number;
  gainLossAmount: number;
  financeResult: string;
  reason: string;
  createdAt: string;
  approvedAt?: string;
  finalizedAt?: string;
  remark: string;
}

interface DepreciationRow {
  id: string;
  assetId: string;
  btCode: string;
  depreciationNo: string;
  period: string;
  method: string;
  originalValue: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciableAmount: number;
  monthlyAmount: number;
  accumulatedBefore: number;
  amount: number;
  accumulatedAfter: number;
  netValueAfter: number;
  operator: string;
  postedAt: string;
  remark: string;
  voucherNo?: string;
}

interface FinanceVoucherEntry {
  accountTitle: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  summary: string;
}

interface FinanceVoucher {
  id: string;
  voucherNo: string;
  voucherType: string;
  typeLabel: string;
  sourceNo: string;
  approvalNo: string;
  btCode: string;
  amount: number;
  debitTotal: number;
  creditTotal: number;
  balanced: boolean;
  entries: FinanceVoucherEntry[];
  operator: string;
  postedAt: string;
  statusLabel: string;
  remark: string;
}

interface AssetDetail extends AssetRow {
  order?: {
    orderNo: string;
    customerName: string;
    leaseStart: string;
    leaseEnd: string;
  };
  outbounds?: Array<Record<string, any>>;
  repairs?: Array<Record<string, any>>;
  inboundRecords?: Array<Record<string, any>>;
  transferRecords?: TransferRow[];
  disposalRecords?: DisposalRow[];
  inventoryRecords?: InventoryRow[];
  depreciationRecords?: DepreciationRow[];
  financeRecords?: FinanceVoucher[];
  movements?: AssetMovement[];
}

interface OrderOption {
  id: string;
  orderNo: string;
  customerName: string;
  customerShortName: string;
  customerContact?: string;
  region?: string;
  status?: string;
}

interface BatchActionResult {
  successCount: number;
  failedCount?: number;
  assets?: AssetDetail[];
  approval?: { id: string; approvalNo: string };
  records?: Array<Record<string, any>>;
}

const rows = ref<AssetRow[]>([]);
const detail = ref<AssetDetail | null>(null);
const orderOptions = ref<OrderOption[]>([]);
const selectedAssets = ref<AssetRow[]>([]);
const selectedAsset = ref<AssetRow | AssetDetail | null>(null);
const actionMode = ref<ActionMode>("single");
const actionTargetAssets = ref<AssetRow[]>([]);
const actionLoading = ref(false);
const viewMode = ref<"list" | "detail">("list");
const activeListTab = ref<ListTab>("ledger");
const activeDetailTab = ref<DetailTab>("overview");
const warehouseKeyword = ref("");
const selectedWarehouse = ref("all");
const ownerScope = ref<"all" | "mine">("all");
const leftFilter = ref("all");
const queryField = ref<keyof AssetRow>("btCode");
const keyword = ref("");
const inboundDialogVisible = ref(false);
const outboundDialogVisible = ref(false);
const transferDialogVisible = ref(false);
const inventoryDialogVisible = ref(false);
const depreciationDialogVisible = ref(false);
const valuationDialogVisible = ref(false);
const returnInboundDialogVisible = ref(false);
const repairInboundDialogVisible = ref(false);
const disposalDialogVisible = ref(false);
const importDialogVisible = ref(false);
const importFailures = ref<string[]>([]);

const inboundForm = ref({
  btCode: "",
  model: "72V 45AH",
  specification: "",
  warehouse: "郑州总仓",
  batchNum: "",
  purchaseDate: "",
  keeper: "王库管",
  powerPercent: 100,
  originalValue: 4800,
  salvageValue: 480,
  supplierName: "",
  invoiceNo: "",
  remark: "",
});

const importForm = ref({
  operator: "王库管",
  warehouse: "郑州总仓",
  batchNum: "",
  supplierName: "",
  recordsText: "",
});

const outboundForm = ref({
  orderId: "",
  warehouse: "郑州总仓",
  operator: "王库管",
  receiver: "",
  address: "",
  outboundAt: "",
  autoReceiveAt: "",
  remark: "",
});

const transferForm = ref({
  toWarehouse: "高新区前置仓",
  operator: "王库管",
  remark: "",
});

const returnInboundForm = ref({
  warehouse: "郑州总仓",
  operator: "王库管",
  remark: "",
});

const inventoryForm = ref<{
  result: InventoryResult;
  actualWarehouse: string;
  operator: string;
  checkedAt: string;
  powerPercent: number | "";
  runningStatus: RunningStatus | "";
  syncLocation: boolean;
  remark: string;
}>({
  result: "MATCHED",
  actualWarehouse: "郑州总仓",
  operator: "王库管",
  checkedAt: "",
  powerPercent: "",
  runningStatus: "",
  syncLocation: false,
  remark: "",
});

const depreciationForm = ref<{
  period: string;
  operator: string;
  amount: number | undefined;
  remark: string;
}>({
  period: "",
  operator: "赵财务",
  amount: undefined,
  remark: "",
});

const valuationForm = ref({
  originalValue: 0,
  salvageValue: 0,
  usefulLifeMonths: 36,
  depreciationStart: "",
  supplierName: "",
  invoiceNo: "",
  operator: "赵财务",
  remark: "",
});

const repairInboundForm = ref({
  warehouse: "郑州总仓",
  operator: "王库管",
  remark: "",
});

const disposalForm = ref<{
  action: "SCRAPPED" | "BOUGHT_OUT";
  operator: string;
  amount: number;
  reason: string;
  remark: string;
}>({
  action: "SCRAPPED",
  operator: "王库管",
  amount: 0,
  reason: "",
  remark: "",
});

const statusFilters = [
  { key: "IN_STOCK", label: "在库", icon: House },
  { key: "LEASING", label: "租赁", icon: Tickets },
  { key: "REPAIRING", label: "维修", icon: Tools },
  { key: "SCRAPPED", label: "报废", icon: Warning },
  { key: "BOUGHT_OUT", label: "买断", icon: Coin },
];

const inventoryResults: Array<{ value: InventoryResult; label: string }> = [
  { value: "MATCHED", label: "账实相符" },
  { value: "LOCATION_MISMATCH", label: "库位不一致" },
  { value: "MISSING", label: "盘亏待查" },
  { value: "DAMAGED", label: "发现损坏" },
];

const detailTabs: { value: DetailTab; label: string }[] = [
  { value: "overview", label: "资产概览" },
  { value: "history", label: "资产履历" },
  { value: "inbound", label: "入库记录" },
  { value: "outbound", label: "出库单" },
  { value: "transfer", label: "调拨记录" },
  { value: "inventory", label: "盘点记录" },
  { value: "finance", label: "价值折旧" },
  { value: "repair", label: "维修记录" },
  { value: "disposal", label: "报废买断" },
];

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

const warehouses = computed(() => {
  const values = rows.value.flatMap((row) => [row.warehouse, row.customerShortName || row.customerName]).filter(Boolean);
  return Array.from(new Set(values));
});

const filteredWarehouses = computed(() => {
  const key = warehouseKeyword.value.trim().toLowerCase();
  if (!key) return warehouses.value;
  return warehouses.value.filter((item) => item.toLowerCase().includes(key));
});

const visibleRows = computed(() => {
  return rows.value.filter((row) => {
    if (selectedWarehouse.value !== "all") {
      const matched =
        row.warehouse === selectedWarehouse.value ||
        row.customerName === selectedWarehouse.value ||
        row.customerShortName === selectedWarehouse.value;
      if (!matched) return false;
    }
    return ownerScope.value === "all" || row.keeper === "王库管";
  });
});

const filteredRows = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  return visibleRows.value.filter((row) => {
    if (!matchLeftFilter(row, leftFilter.value)) return false;
    if (!key) return true;
    const value = String(row[queryField.value] ?? "").toLowerCase();
    return value.includes(key);
  });
});

const outboundRows = computed(() => filteredRows.value.filter((row) => row.outboundNo));

const inventoryRows = computed(() =>
  filteredRows.value.map((row) => ({
    ...row,
    inventoryStatus: row.inventoryStatus || "未盘点",
  })),
);

const transferRows = computed<TransferRow[]>(() =>
  filteredRows.value
    .filter((row) => row.assetStatus === "IN_STOCK")
    .map((row) => ({
      id: row.id,
      transferNo: `TR${row.btCode.slice(-8)}`,
      btCode: row.btCode,
      fromWarehouse: row.warehouse,
      toWarehouse: "高新区前置仓",
      status: "待调拨",
      operator: row.keeper,
      createdAt: "2026-05-17 14:20",
      remark: "为待出库订单预留库存，可由资产管理人员确认调拨。",
    })),
);

const valueRows = computed(() =>
  filteredRows.value.map((row) => ({
    ...row,
    originalValue: Number(row.originalValue || 0),
    salvageValue: Number(row.salvageValue || 0),
    usefulLifeMonths: Number(row.usefulLifeMonths || 0),
    monthlyDepreciation: Number(row.monthlyDepreciation || 0),
    accumulatedDepreciation: Number(row.accumulatedDepreciation || 0),
    netValue: Number(row.netValue || 0),
    lastDepreciationPeriod: row.lastDepreciationPeriod || "",
    depreciationStatus: row.depreciationStatus || "待计提",
    depreciationStart: row.depreciationStart || row.purchaseDate || row.inboundAt,
    supplierName: row.supplierName || "",
  })),
);

const summary = computed(() => {
  const data = filteredRows.value;
  const valueData = valueRows.value;
  return {
    total: data.length,
    inStock: data.filter((row) => row.assetStatus === "IN_STOCK").length,
    leasing: data.filter((row) => row.assetStatus === "LEASING").length,
    canOutbound: data.filter((row) => row.canOutbound).length,
    abnormal: data.filter((row) => row.runningStatus === "ABNORMAL" || row.assetStatus === "REPAIRING").length,
    inventoryAbnormal: data.filter((row) => ["LOCATION_MISMATCH", "MISSING", "DAMAGED"].includes(row.inventoryResult)).length,
    originalValue: valueData.reduce((sum, row) => sum + row.originalValue, 0),
    netValue: valueData.reduce((sum, row) => sum + row.netValue, 0),
  };
});

const actionTargetText = computed(() => {
  const targets = actionTargetAssets.value;
  if (actionMode.value === "batch") {
    return `已选择 ${targets.length} 条资产：${targets.map((item) => item.btCode).join("、")}`;
  }
  const asset = selectedAsset.value;
  return asset ? `${asset.btCode} / ${asset.model}` : "";
});

const detailMetrics = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "仓库/位置", value: detail.value.warehouse || "--", icon: Location },
    { label: "当前客户", value: detail.value.customerShortName || detail.value.customerName || "未绑定", icon: UserFilled },
    { label: "当前订单", value: detail.value.orderNo || "未绑定", icon: Tickets },
    { label: "资产负责人", value: detail.value.keeper || "--", icon: Coin },
  ];
});

const processCards = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "入库状态", value: detail.value.inboundNo ? "已入库" : "未入库", icon: Box, tone: "blue" },
    { label: "出库状态", value: detail.value.outboundNo ? "已出库" : "未出库", icon: Van, tone: "mint" },
    { label: "收货状态", value: detail.value.receivedAt || "待确认", icon: Tickets, tone: "yellow" },
  ];
});

const lifecycleStats = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "入库次数", value: detail.value.inboundRecords?.length || 0, tone: "blue" },
    { label: "出库次数", value: detail.value.outbounds?.length || 0, tone: "green" },
    { label: "维修次数", value: detail.value.repairs?.length || 0, tone: "red" },
    { label: "盘点次数", value: detail.value.inventoryRecords?.length || 0, tone: "yellow" },
  ];
});

const overviewCards = computed(() => {
  if (!detail.value) return [];
  return [
    { label: "电量", value: `${detail.value.powerPercent}%`, tone: detail.value.powerPercent < 30 ? "red" : "green" },
    { label: "履历节点", value: detail.value.movements?.length || 0, tone: "blue" },
    { label: "批次", value: detail.value.batchNum || "--", tone: "" },
  ];
});

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    IN_STOCK: "在库",
    REPAIRING: "维修",
    LEASING: "租赁",
    SCRAPPED: "报废",
    BOUGHT_OUT: "买断",
  };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  return {
    success: status === "IN_STOCK",
    primary: status === "LEASING",
    warning: status === "REPAIRING",
    danger: status === "SCRAPPED",
    purple: status === "BOUGHT_OUT",
  };
}

function inventoryClass(result: string) {
  return {
    success: result === "MATCHED",
    warning: result === "LOCATION_MISMATCH",
    danger: result === "MISSING" || result === "DAMAGED",
  };
}

function depreciationClass(status: string) {
  return {
    success: status === "计提中" || status === "已足额",
    warning: status === "待计提",
    danger: status === "已终止",
  };
}

function disposalClass(status: string) {
  return {
    success: status === "已登记",
    warning: status === "审批中",
    danger: status === "已驳回",
    purple: status === "已撤销",
  };
}

function money(value?: number) {
  return currency.format(Number(value || 0));
}

function voucherEntryText(row: FinanceVoucher) {
  return (row.entries || [])
    .map((entry) => `${entry.direction === "DEBIT" ? "借" : "贷"} ${entry.accountTitle} ${money(entry.amount)}`)
    .join("；");
}

function runningStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ONLINE: "在线",
    OFFLINE: "离线",
    ABNORMAL: "异常",
    UNKNOWN: "未知",
  };
  return labels[status] ?? status;
}

function matchLeftFilter(row: AssetRow, filter: string) {
  if (filter === "all") return true;
  if (filter === "canOutbound") return row.canOutbound;
  if (filter === "abnormal") return row.runningStatus === "ABNORMAL" || row.assetStatus === "REPAIRING";
  return row.assetStatus === filter;
}

function countByFilter(filter: string) {
  return visibleRows.value.filter((row) => matchLeftFilter(row, filter)).length;
}

function tableRowClassName({ row }: { row: AssetRow }) {
  if (row.assetStatus === "SCRAPPED" || row.assetStatus === "BOUGHT_OUT") return "disabled-row";
  if (row.runningStatus === "ABNORMAL") return "warning-row";
  return "";
}

async function openDetail(row: AssetRow | TransferRow | AssetDetail | null | undefined) {
  if (!row) return;
  const id = "id" in row && row.id ? row.id : "btCode" in row ? row.btCode : "";
  if (!id) return;
  detail.value = await getMock<AssetDetail>(`/assets/${id}`);
  activeDetailTab.value = "overview";
  viewMode.value = "detail";
}

async function refreshDetail() {
  if (!detail.value) return;
  await openDetail(detail.value);
  ElMessage.success("资产详情已刷新");
}

function backToList() {
  viewMode.value = "list";
}

function resetQuery() {
  keyword.value = "";
  queryField.value = "btCode";
  leftFilter.value = "all";
  selectedWarehouse.value = "all";
  activeListTab.value = "ledger";
}

function noopSearch() {
  ElMessage.success("已按当前条件筛选");
}

function openReserved(title: string) {
  ElMessage.info(`${title}入口已放到页面，下一步可接真实业务接口`);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function openDepreciation(row?: AssetRow | AssetDetail | null, batch = false) {
  const targets = collectActionTargets(
    row,
    (asset) => !["SCRAPPED", "BOUGHT_OUT"].includes(asset.assetStatus),
    "请先选择需要计提折旧的资产",
    "以下资产已进入终态，不能继续计提折旧",
    batch,
  );
  if (!targets.length) return;
  const asset = targets[0];
  depreciationForm.value = {
    period: currentMonth(),
    operator: "赵财务",
    amount: undefined,
    remark: "",
  };
  selectedAsset.value = asset;
  activeListTab.value = "value";
  depreciationDialogVisible.value = true;
}

async function submitDepreciation() {
  const targets = actionTargetAssets.value;
  if (!targets.length) return;
  if (!depreciationForm.value.period) {
    ElMessage.warning("请选择计提期间");
    return;
  }
  actionLoading.value = true;
  try {
    let assetId = targets[0].id;
    if (actionMode.value === "batch") {
      const result = await postMock<BatchActionResult>("/assets/batch/depreciation", {
        ...depreciationForm.value,
        assetIds: actionAssetIds(),
      });
      assetId = result.assets?.[0]?.id ?? assetId;
      ElMessage.success(`已批量计提 ${result.successCount} 组资产折旧`);
    } else {
      const asset = await postMock<AssetDetail>(`/assets/${targets[0].id}/depreciation`, depreciationForm.value);
      assetId = asset.id;
      ElMessage.success("资产折旧已计提，履历已追加");
    }
    depreciationDialogVisible.value = false;
    activeListTab.value = "value";
    activeDetailTab.value = "finance";
    await refreshAssetState(assetId);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "折旧计提失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openValuation(row?: AssetRow | AssetDetail | null) {
  const asset = row ?? detail.value ?? selectedAssets.value[0] ?? filteredRows.value[0];
  if (!asset) {
    ElMessage.warning("请先选择需要设置价值参数的资产");
    return;
  }
  selectedAsset.value = asset;
  valuationForm.value = {
    originalValue: Number(asset.originalValue || 5800),
    salvageValue: Number(asset.salvageValue || 300),
    usefulLifeMonths: Number(asset.usefulLifeMonths || 36),
    depreciationStart: asset.depreciationStart || asset.purchaseDate || asset.inboundAt || "",
    supplierName: asset.supplierName || "",
    invoiceNo: asset.invoiceNo || "",
    operator: "赵财务",
    remark: "",
  };
  activeListTab.value = "value";
  valuationDialogVisible.value = true;
}

async function submitValuation() {
  if (!selectedAsset.value) return;
  actionLoading.value = true;
  try {
    const asset = await postMock<AssetDetail>(`/assets/${selectedAsset.value.id}/valuation`, valuationForm.value);
    valuationDialogVisible.value = false;
    activeListTab.value = "value";
    activeDetailTab.value = "finance";
    await loadAssets();
    ElMessage.success("资产价值参数已保存");
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "保存价值参数失败"));
  } finally {
    actionLoading.value = false;
  }
}

function exportCsv() {
  const header = ["资产编号", "BT码", "资产状态", "仓库", "客户", "订单号", "最近动作", "最近时间"];
  const lines = filteredRows.value.map((row) =>
    [
      row.assetNo,
      row.btCode,
      statusLabel(row.assetStatus),
      row.warehouse,
      row.customerName,
      row.orderNo,
      row.latestAction,
      row.latestActionAt,
    ].join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `固定资产台账_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function handleSelectionChange(selection: Array<AssetRow | TransferRow>) {
  selectedAssets.value = selection
    .map((item) => {
      if ("assetStatus" in item) return item;
      return rows.value.find((row) => row.id === item.id || row.btCode === item.btCode);
    })
    .filter(Boolean) as AssetRow[];
}

function requestErrorMessage(error: unknown, fallback: string) {
  const response = error as { response?: { data?: { message?: string | string[] } } };
  const message = response.response?.data?.message;
  if (Array.isArray(message)) return message.join("；");
  return message || fallback;
}

function resolveFirstActionAsset(
  row: AssetRow | AssetDetail | null | undefined,
  predicate: (asset: AssetRow | AssetDetail) => boolean,
) {
  if (row) return row;
  return selectedAssets.value[0] ?? filteredRows.value.find((item) => predicate(item)) ?? null;
}

function collectActionTargets(
  row: AssetRow | AssetDetail | null | undefined,
  predicate: (asset: AssetRow | AssetDetail) => boolean,
  emptyMessage: string,
  invalidMessage: string,
  batch = false,
) {
  const candidates = batch
    ? selectedAssets.value
    : ([resolveFirstActionAsset(row, predicate)].filter(Boolean) as Array<AssetRow | AssetDetail>);

  if (!candidates.length) {
    ElMessage.warning(emptyMessage);
    return [];
  }

  const invalid = candidates.filter((asset) => !predicate(asset));
  if (invalid.length) {
    ElMessage.warning(`${invalidMessage}：${invalid.map((asset) => asset.btCode).join("、")}`);
    return [];
  }

  actionMode.value = batch || candidates.length > 1 ? "batch" : "single";
  actionTargetAssets.value = candidates as AssetRow[];
  selectedAsset.value = candidates[0] ?? null;
  return candidates;
}

function actionAssetIds() {
  return actionTargetAssets.value.map((asset) => asset.id);
}

async function loadAssets() {
  rows.value = await getMock<AssetRow[]>("/assets");
}

async function loadOrders() {
  if (orderOptions.value.length) return;
  orderOptions.value = await getMock<OrderOption[]>("/orders");
}

async function refreshAssetState(assetId?: string) {
  await loadAssets();
  const id = assetId || detail.value?.id;
  if (detail.value && id) {
    detail.value = await getMock<AssetDetail>(`/assets/${id}`);
  }
}

function openInboundDialog() {
  inboundForm.value = {
    btCode: "",
    model: "72V 45AH",
    specification: "",
    warehouse: selectedWarehouse.value !== "all" ? selectedWarehouse.value : "郑州总仓",
    batchNum: "",
    purchaseDate: "",
    keeper: "王库管",
    powerPercent: 100,
    originalValue: 4800,
    salvageValue: 480,
    supplierName: "",
    invoiceNo: "",
    remark: "",
  };
  inboundDialogVisible.value = true;
}

async function submitInbound() {
  actionLoading.value = true;
  try {
    const result = await postMock<BatchActionResult>("/assets/inbound", inboundForm.value);
    inboundDialogVisible.value = false;
    activeListTab.value = "inbound";
    await loadAssets();
    ElMessage.success(`采购入库审批已提交：${result.approval?.approvalNo || ""}`);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "入库失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openImportDialog() {
  importFailures.value = [];
  importForm.value = {
    operator: "王库管",
    warehouse: selectedWarehouse.value !== "all" ? selectedWarehouse.value : "郑州总仓",
    batchNum: `BATCH${new Date().toISOString().slice(0, 7).replace("-", "")}`,
    supplierName: "",
    recordsText: "",
  };
  importDialogVisible.value = true;
}

function parseAssetImportRecords() {
  importFailures.value = [];
  const lines = importForm.value.recordsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    importFailures.value = ["请先粘贴需要导入的资产明细"];
    return [];
  }

  const records = lines.map((line, index) => {
    const parts = line.split(/[\t,，]/).map((part) => part.trim());
    if (parts.length < 2) {
      importFailures.value.push(`第 ${index + 1} 行至少需要 BT码 和 型号`);
    }
    return {
      btCode: parts[0] || "",
      model: parts[1] || "72V 45AH",
      specification: parts[2] || parts[1] || "",
      originalValue: Number(parts[3] || 4800),
      salvageValue: Number(parts[4] || 480),
      invoiceNo: parts[5] || "",
      warehouse: importForm.value.warehouse,
      batchNum: importForm.value.batchNum,
      supplierName: importForm.value.supplierName,
      keeper: importForm.value.operator,
      powerPercent: 100,
    };
  });

  const seen = new Set<string>();
  records.forEach((record, index) => {
    if (!record.btCode) importFailures.value.push(`第 ${index + 1} 行缺少 BT 码`);
    if (seen.has(record.btCode)) importFailures.value.push(`第 ${index + 1} 行 BT 码重复：${record.btCode}`);
    seen.add(record.btCode);
    if (!Number.isFinite(record.originalValue) || record.originalValue <= 0) {
      importFailures.value.push(`第 ${index + 1} 行原值必须大于 0`);
    }
  });
  return importFailures.value.length ? [] : records;
}

async function submitAssetImport() {
  const records = parseAssetImportRecords();
  if (!records.length) return;
  actionLoading.value = true;
  try {
    const result = await postMock<BatchActionResult>("/assets/import", {
      operator: importForm.value.operator,
      records,
    });
    importDialogVisible.value = false;
    activeListTab.value = "inbound";
    await loadAssets();
    ElMessage.success(`已提交 ${result.successCount} 组资产导入审批：${result.approval?.approvalNo || ""}`);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "资产批量导入失败"));
  } finally {
    actionLoading.value = false;
  }
}

async function openOutbound(row?: AssetRow | AssetDetail | null, batch = false) {
  const targets = collectActionTargets(
    row,
    (asset) => asset.canOutbound,
    "请先选择可出库资产",
    "以下资产不可出库",
    batch,
  );
  if (!targets.length) return;

  await loadOrders();
  const asset = targets[0];
  const defaultOrder =
    orderOptions.value.find((order) =>
      ["PENDING_OUTBOUND", "PARTIALLY_OUTBOUND", "PENDING_RECEIPT", "LEASING"].includes(order.status || ""),
    ) ?? orderOptions.value[0];
  outboundForm.value = {
    orderId: defaultOrder?.id ?? "",
    warehouse: asset.warehouse || "郑州总仓",
    operator: asset.keeper || "王库管",
    receiver: defaultOrder?.customerContact || "",
    address: defaultOrder?.region || "",
    outboundAt: "",
    autoReceiveAt: "",
    remark: "",
  };
  outboundDialogVisible.value = true;
}

async function submitOutbound() {
  const targets = actionTargetAssets.value;
  if (!targets.length) return;
  if (!outboundForm.value.orderId) {
    ElMessage.warning("请选择关联订单");
    return;
  }
  actionLoading.value = true;
  try {
    let assetId = targets[0].id;
    if (actionMode.value === "batch") {
      const result = await postMock<BatchActionResult>("/assets/batch/outbound", {
        ...outboundForm.value,
        assetIds: actionAssetIds(),
      });
      assetId = result.assets?.[0]?.id ?? assetId;
      ElMessage.success(`已批量出库 ${result.successCount} 组资产，资产状态已变为租赁`);
    } else {
      const asset = await postMock<AssetDetail>(`/assets/${targets[0].id}/outbound`, outboundForm.value);
      assetId = asset.id;
      ElMessage.success("出库单已创建，资产状态已变为租赁");
    }
    outboundDialogVisible.value = false;
    activeListTab.value = "outbound";
    await refreshAssetState(assetId);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "出库失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openTransfer(row?: AssetRow | AssetDetail | null, batch = false) {
  const targets = collectActionTargets(
    row,
    (asset) => asset.assetStatus === "IN_STOCK",
    "请先选择在库资产",
    "以下资产不是在库状态，不能调拨",
    batch,
  );
  if (!targets.length) return;
  const asset = targets[0];
  transferForm.value = {
    toWarehouse: asset.warehouse === "高新区前置仓" ? "郑州总仓" : "高新区前置仓",
    operator: asset.keeper || "王库管",
    remark: "",
  };
  transferDialogVisible.value = true;
}

async function submitTransfer() {
  const targets = actionTargetAssets.value;
  if (!targets.length) return;
  if (!transferForm.value.toWarehouse.trim()) {
    ElMessage.warning("请填写调入仓库");
    return;
  }
  actionLoading.value = true;
  try {
    let assetId = targets[0].id;
    if (actionMode.value === "batch") {
      const result = await postMock<BatchActionResult>("/assets/batch/transfer", {
        ...transferForm.value,
        assetIds: actionAssetIds(),
      });
      assetId = result.assets?.[0]?.id ?? assetId;
      ElMessage.success(`已批量调拨 ${result.successCount} 组资产，履历已追加`);
    } else {
      const asset = await postMock<AssetDetail>(`/assets/${targets[0].id}/transfer`, transferForm.value);
      assetId = asset.id;
      ElMessage.success("资产调拨已完成，履历已追加");
    }
    transferDialogVisible.value = false;
    activeListTab.value = "transfer";
    await refreshAssetState(assetId);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "调拨失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openInventory(row?: AssetRow | AssetDetail | null, batch = false) {
  const targets = collectActionTargets(
    row,
    (asset) => asset.assetStatus !== "BOUGHT_OUT",
    "请先选择要盘点的资产",
    "以下资产已买断，不能继续盘点",
    batch,
  );
  if (!targets.length) return;
  const asset = targets[0];
  inventoryForm.value = {
    result: "MATCHED",
    actualWarehouse: asset.warehouse || "郑州总仓",
    operator: asset.keeper || "王库管",
    checkedAt: "",
    powerPercent: "",
    runningStatus: "",
    syncLocation: false,
    remark: "",
  };
  inventoryDialogVisible.value = true;
}

async function submitInventory() {
  const targets = actionTargetAssets.value;
  if (!targets.length) return;
  if (!inventoryForm.value.actualWarehouse.trim()) {
    ElMessage.warning("请填写实盘位置");
    return;
  }
  actionLoading.value = true;
  try {
    let assetId = targets[0].id;
    if (actionMode.value === "batch") {
      const result = await postMock<BatchActionResult>("/assets/batch/check", {
        ...inventoryForm.value,
        assetIds: actionAssetIds(),
      });
      assetId = result.assets?.[0]?.id ?? assetId;
      ElMessage.success(`已批量登记 ${result.successCount} 组资产盘点结果`);
    } else {
      const asset = await postMock<AssetDetail>(`/assets/${targets[0].id}/check`, inventoryForm.value);
      assetId = asset.id;
      ElMessage.success("资产盘点已登记，履历已追加");
    }
    inventoryDialogVisible.value = false;
    activeListTab.value = "inventory";
    activeDetailTab.value = "inventory";
    await refreshAssetState(assetId);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "盘点登记失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openReturnInbound(row?: AssetRow | AssetDetail | null, batch = false) {
  const targets = collectActionTargets(
    row,
    (asset) => asset.assetStatus === "LEASING",
    "请先选择租赁中的资产",
    "以下资产不是租赁状态，不能退回入库",
    batch,
  );
  if (!targets.length) return;
  const asset = targets[0];
  returnInboundForm.value = {
    warehouse: "郑州总仓",
    operator: asset.keeper || "王库管",
    remark: "",
  };
  returnInboundDialogVisible.value = true;
}

async function submitReturnInbound() {
  const targets = actionTargetAssets.value;
  if (!targets.length) return;
  if (!returnInboundForm.value.warehouse.trim()) {
    ElMessage.warning("请填写退回仓库");
    return;
  }
  actionLoading.value = true;
  try {
    let assetId = targets[0].id;
    if (actionMode.value === "batch") {
      const result = await postMock<BatchActionResult>("/assets/batch/return-inbound", {
        ...returnInboundForm.value,
        assetIds: actionAssetIds(),
      });
      assetId = result.assets?.[0]?.id ?? assetId;
      ElMessage.success(`已批量退回入库 ${result.successCount} 组资产，状态恢复在库`);
    } else {
      const asset = await postMock<AssetDetail>(`/assets/${targets[0].id}/return-inbound`, returnInboundForm.value);
      assetId = asset.id;
      ElMessage.success("租赁资产已退回入库，状态恢复在库");
    }
    returnInboundDialogVisible.value = false;
    activeListTab.value = "inbound";
    activeDetailTab.value = "inbound";
    await refreshAssetState(assetId);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "退回入库失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openRepairInbound(row?: AssetDetail | null) {
  const asset = row ?? detail.value;
  if (!asset) return;
  const hasPendingInbound = asset.repairs?.some((repair) => repair.status === "PENDING_INBOUND");
  if (!hasPendingInbound && asset.assetStatus !== "REPAIRING") {
    ElMessage.warning("当前资产没有待入库维修单");
    return;
  }
  selectedAsset.value = asset;
  repairInboundForm.value = {
    warehouse: "郑州总仓",
    operator: asset.keeper || "王库管",
    remark: "",
  };
  repairInboundDialogVisible.value = true;
}

async function submitRepairInbound() {
  if (!selectedAsset.value) return;
  actionLoading.value = true;
  try {
    const asset = await postMock<AssetDetail>(
      `/assets/${selectedAsset.value.id}/repair-inbound`,
      repairInboundForm.value,
    );
    repairInboundDialogVisible.value = false;
    activeDetailTab.value = "inbound";
    await refreshAssetState(asset.id);
    ElMessage.success("维修完成入库已登记，资产恢复在库");
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "维修入库失败"));
  } finally {
    actionLoading.value = false;
  }
}

function openDisposal(
  row?: AssetRow | AssetDetail | null,
  action: "SCRAPPED" | "BOUGHT_OUT" = "SCRAPPED",
  batch = false,
) {
  const targets = collectActionTargets(
    row ?? detail.value,
    (asset) =>
      !["SCRAPPED", "BOUGHT_OUT"].includes(asset.assetStatus) &&
      !asset.hasPendingDisposal &&
      (action !== "SCRAPPED" || asset.assetStatus !== "LEASING"),
    "请先选择要处理的资产",
    action === "SCRAPPED" ? "以下资产不能直接报废或已有审批在处理" : "以下资产已经进入终态或已有审批在处理",
    batch,
  );
  if (!targets.length) return;
  const asset = targets[0];
  selectedAsset.value = asset;
  disposalForm.value = {
    action,
    operator: asset.keeper || "王库管",
    amount: 0,
    reason: "",
    remark: "",
  };
  disposalDialogVisible.value = true;
}

async function submitDisposal() {
  const targets = actionTargetAssets.value;
  if (!targets.length) return;
  if (!disposalForm.value.reason.trim()) {
    ElMessage.warning("请填写处理原因");
    return;
  }
  actionLoading.value = true;
  try {
    let assetId = targets[0].id;
    if (actionMode.value === "batch") {
      const result = await postMock<BatchActionResult>("/assets/batch/dispose", {
        ...disposalForm.value,
        assetIds: actionAssetIds(),
      });
      assetId = result.assets?.[0]?.id ?? assetId;
      ElMessage.success(`已提交 ${result.successCount} 组资产终态审批：${result.approval?.approvalNo || ""}`);
    } else {
      const asset = await postMock<AssetDetail>(`/assets/${targets[0].id}/dispose`, disposalForm.value);
      assetId = asset.id;
      ElMessage.success(asset.pendingDisposalApprovalNo ? `终态审批已提交：${asset.pendingDisposalApprovalNo}` : "终态审批已提交");
    }
    disposalDialogVisible.value = false;
    activeDetailTab.value = "disposal";
    await refreshAssetState(assetId);
  } catch (error) {
    ElMessage.error(requestErrorMessage(error, "提交终态审批失败"));
  } finally {
    actionLoading.value = false;
  }
}

function handleBatchCommand(command: string) {
  if (command === "批量出库") {
    openOutbound(undefined, true);
    return;
  }
  if (command === "批量调拨") {
    openTransfer(undefined, true);
    return;
  }
  if (command === "批量退回入库") {
    openReturnInbound(undefined, true);
    return;
  }
  if (command === "批量盘点") {
    openInventory(undefined, true);
    return;
  }
  if (command === "批量计提折旧") {
    openDepreciation(undefined, true);
    return;
  }
  if (command === "报废审批") {
    openDisposal(undefined, "SCRAPPED", true);
    return;
  }
  if (command === "买断审批") {
    openDisposal(undefined, "BOUGHT_OUT", true);
  }
}

onMounted(async () => {
  await Promise.all([loadAssets(), loadOrders()]);
});
</script>

<style scoped>
.asset-page {
  height: calc(100vh - 70px);
  display: flex;
  gap: 16px;
  margin: -16px;
  padding: 16px;
  overflow: hidden;
  color: #3a374c;
  background: #eef0f3;
}

.asset-page.is-detail {
  display: block;
  padding: 0;
}

.asset-page :deep(.el-button--primary) {
  --el-button-bg-color: #4e5afe;
  --el-button-border-color: #4e5afe;
  --el-button-hover-bg-color: #626cff;
  --el-button-hover-border-color: #626cff;
}

.asset-left {
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

.warehouse-tree {
  height: 310px;
  padding: 8px 15px;
  overflow-y: auto;
  border: 1px solid #d8d8d8;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

.warehouse-tree button,
.target-tabs button,
.nav-box button,
.side-item,
.status-group {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.warehouse-tree button {
  width: 100%;
  min-height: 26px;
  display: block;
  padding: 3px 10px;
  color: #222;
  border-radius: 6px;
  text-align: left;
}

.warehouse-tree button.active {
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

.asset-main {
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

.asset-summary-line {
  height: 44px;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.asset-summary-line div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-radius: 8px;
  background: #f7f8ff;
}

.asset-summary-line span {
  color: #868395;
  font-size: 12px;
}

.asset-summary-line strong {
  color: #4e5afe;
  font-size: 16px;
}

.asset-summary-line .danger strong {
  color: #f14949;
}

.amount-danger {
  color: #f14949;
  font-weight: 600;
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

.target-table :deep(.disabled-row) {
  color: #909399;
  background: #f7f7f7;
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

.asset-status {
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

.asset-status.big {
  height: 24px;
  min-width: 64px;
  margin-left: 8px;
  font-size: 14px;
}

.asset-status.success {
  color: #16a364;
  border-color: #6add9f;
  background: #effbf4;
}

.asset-status.warning {
  color: #d48806;
  border-color: #ffe58f;
  background: #fffbe6;
}

.asset-status.danger {
  color: #ff385c;
  border-color: #ff8ca1;
  background: #fff1f3;
}

.asset-status.primary {
  color: #4e5afe;
  border-color: #aeb4ff;
  background: #eef0ff;
}

.asset-status.purple {
  color: #7a4df3;
  border-color: #c8b6ff;
  background: #f4f0ff;
}

.power-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 34px;
  border: 1px solid #42bf79;
  border-radius: 4px;
  color: #168a4a;
  background: #effbf4;
  font-size: 12px;
}

.power-tag.low {
  color: #ff385c;
  border-color: #ff8ca1;
  background: #fff1f3;
}

.asset-detail-page {
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

.asset-tips {
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

.asset-bms-content {
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

.asset-card {
  flex-shrink: 0;
  color: #3a374c;
  padding: clamp(16px, 1.04167vw, 22px) clamp(22px, 1.5625vw, 32px);
  border-radius: 20px;
  background: #fff;
}

.asset-first,
.asset-second,
.asset-third {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.asset-first {
  margin-bottom: 5px;
}

.asset-no {
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

.asset-belong {
  display: flex;
  align-items: center;
  color: #4e5afe;
  font-size: 12px;
}

.asset-second {
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

.asset-third {
  margin-bottom: 32px;
}

.third-l {
  width: 40%;
  text-align: center;
}

.battery {
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

.battery .value {
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

.battery .value small {
  font-size: 12px;
}

.battery-status {
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

.asset-fourth {
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
  overflow: hidden;
  color: #23253c;
  font-size: 30px;
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

.finance-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  padding: 16px 16px 0;
}

.finance-grid div {
  min-height: 68px;
  padding: 12px;
  border-radius: 8px;
  background: #f7f8ff;
}

.finance-grid span {
  display: block;
  color: #868395;
  font-size: 12px;
}

.finance-grid strong {
  display: block;
  margin-top: 6px;
  color: #23253c;
  font-size: 18px;
}

.sub-head {
  margin-top: 14px;
}

.import-failures {
  max-height: 120px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid #f5c2c7;
  border-radius: 6px;
  background: #fff5f5;
  color: #b42318;
}

.import-failures p {
  margin: 4px 0 0;
}

.empty-state {
  height: calc(100% - 58px);
  display: grid;
  place-items: center;
  align-content: center;
  color: #868395;
}

.empty-state p {
  margin: 0;
  color: #868395;
  font-size: 13px;
}

.asset-form {
  padding-top: 4px;
}

.asset-form :deep(.el-alert) {
  margin-bottom: 16px;
}

.asset-form :deep(.el-alert__title) {
  line-height: 1.45;
  white-space: normal;
}

.asset-form :deep(.el-select) {
  width: 100%;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

@media (max-width: 1400px) {
  .asset-left {
    width: 240px;
    flex-basis: 240px;
  }

  .content-l {
    min-width: 390px;
  }
}

@media (max-width: 1180px) {
  .asset-page {
    height: auto;
    min-height: calc(100vh - 70px);
    flex-direction: column;
    overflow: visible;
  }

  .asset-left {
    width: 100%;
    flex-basis: auto;
  }

  .asset-main {
    min-height: 720px;
  }

  .asset-detail-page {
    height: auto;
    min-height: calc(100vh - 70px);
    overflow: visible;
  }

  .panel-content {
    height: auto;
  }

  .asset-bms-content,
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
