<template>
  <div class="repair-page" :class="{ 'is-detail': viewMode === 'detail' }">
    <template v-if="viewMode === 'list'">
      <aside class="repair-left">
        <div class="tree-panel">
          <el-input v-model="customerKeyword" clearable placeholder="请输入客户或仓库名称" />
          <div class="customer-tree">
            <button :class="{ active: selectedCustomer === 'all' }" @click="selectedCustomer = 'all'">
              全部报修
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
            <span>报修筛选</span>
            <div class="scope-tabs">
              <button :class="{ active: ownerScope === 'all' }" @click="ownerScope = 'all'">全部</button>
              <button :class="{ active: ownerScope === 'mine' }" @click="ownerScope = 'mine'">本人</button>
            </div>
          </div>

          <button class="status-group" @click="leftFilter = 'all'">
            <span>工单状态({{ countByFilter("all") }})</span>
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

          <button class="side-item" :class="{ active: leftFilter === 'urgent' }" @click="leftFilter = 'urgent'">
            <span class="side-left">
              <el-icon><Warning /></el-icon>
              紧急工单({{ countByFilter("urgent") }})
            </span>
          </button>
          <button class="side-item" :class="{ active: leftFilter === 'slaRisk' }" @click="leftFilter = 'slaRisk'">
            <span class="side-left">
              <el-icon><Clock /></el-icon>
              SLA风险({{ countByFilter("slaRisk") }})
            </span>
          </button>
          <button class="side-item" :class="{ active: leftFilter === 'customer' }" @click="leftFilter = 'customer'">
            <span class="side-left">
              <el-icon><User /></el-icon>
              客户报修({{ countByFilter("customer") }})
            </span>
          </button>
          <button class="side-item" :class="{ active: leftFilter === 'internal' }" @click="leftFilter = 'internal'">
            <span class="side-left">
              <el-icon><Tools /></el-icon>
              内部报修({{ countByFilter("internal") }})
            </span>
          </button>
        </div>
      </aside>

      <main class="repair-main">
        <div class="target-tabs">
          <button :class="{ active: activeListTab === 'all' }" @click="activeListTab = 'all'">
            报修列表
          </button>
          <button :class="{ active: activeListTab === 'pending' }" @click="activeListTab = 'pending'">
            待受理
          </button>
          <button :class="{ active: activeListTab === 'processing' }" @click="activeListTab = 'processing'">
            维修跟进
          </button>
          <button :class="{ active: activeListTab === 'inbound' }" @click="activeListTab = 'inbound'">
            待入库
          </button>
          <button :class="{ active: activeListTab === 'closed' }" @click="activeListTab = 'closed'">
            已完结
          </button>
        </div>

        <div class="list-toolbar">
          <div class="toolbar-left">
            <el-select v-model="queryField" class="field-select">
              <el-option label="报修单号" value="repairNo" />
              <el-option label="BT码" value="btCode" />
              <el-option label="客户" value="customerName" />
              <el-option label="订单号" value="orderNo" />
              <el-option label="故障类型" value="faultType" />
            </el-select>
            <el-input v-model="keyword" clearable placeholder="请输入内容">
              <template #append>
                <el-button :icon="Search" @click="noopSearch" />
              </template>
            </el-input>
            <el-button type="primary" @click="groupDialogVisible = true">分组查询</el-button>
            <el-button type="primary" @click="advancedFilterVisible = true">更多</el-button>
            <el-button type="primary" @click="resetQuery">重置</el-button>
          </div>
          <div class="toolbar-right">
            <el-button type="primary" @click="openInternalDialog">
              <el-icon><Plus /></el-icon>
              内部报修
            </el-button>
            <el-button @click="openImportDialog">导入</el-button>
            <el-button @click="exportCsv">导出</el-button>
            <el-dropdown trigger="click" @command="handleBatchCommand">
              <el-button>
                批量操作
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="accept">批量受理</el-dropdown-item>
                  <el-dropdown-item command="repair">批量转维修</el-dropdown-item>
                  <el-dropdown-item command="close">批量关闭</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div class="repair-summary-line">
          <div>
            <span>报修总数</span>
            <strong>{{ summary.total }}</strong>
          </div>
          <div>
            <span>待受理</span>
            <strong>{{ summary.pending }}</strong>
          </div>
          <div>
            <span>处理中</span>
            <strong>{{ summary.processing }}</strong>
          </div>
          <div>
            <span>待入库</span>
            <strong>{{ summary.inbound }}</strong>
          </div>
          <div>
            <span>待客户确认</span>
            <strong>{{ summary.confirming }}</strong>
          </div>
          <div class="danger">
            <span>SLA风险</span>
            <strong>{{ summary.slaRisk }}</strong>
          </div>
          <div class="danger">
            <span>紧急</span>
            <strong>{{ summary.urgent }}</strong>
          </div>
        </div>

        <el-table
          v-loading="loading"
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
          <el-table-column prop="repairNo" label="报修单号" width="154" fixed show-overflow-tooltip />
          <el-table-column label="来源" width="92" align="center">
            <template #default="{ row }">
              <span class="source-tag" :class="{ internal: row.source === 'INTERNAL' }">{{ row.sourceLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="92" align="center">
            <template #default="{ row }">
              <span class="repair-status" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="客户确认" width="100" align="center">
            <template #default="{ row }">
              <span class="confirm-tag" :class="{ done: row.customerConfirmed, pending: isCustomerConfirmPending(row) }">
                {{ customerConfirmShortLabel(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="优先级" width="82" align="center">
            <template #default="{ row }">
              <span class="priority-tag" :class="{ urgent: row.priority === '紧急' }">{{ row.priority }}</span>
            </template>
          </el-table-column>
          <el-table-column label="SLA" width="138" align="center">
            <template #default="{ row }">
              <span class="sla-tag" :class="slaClass(row)">
                {{ row.slaStatusLabel || "未设置" }}
              </span>
              <small class="sla-mini">{{ row.slaRemainingText || row.slaDueAt || "--" }}</small>
            </template>
          </el-table-column>
          <el-table-column prop="customerName" label="客户/仓库" min-width="150" show-overflow-tooltip />
          <el-table-column prop="btCode" label="BT码" width="154" show-overflow-tooltip />
          <el-table-column prop="deviceNum" label="设备编号" width="130" show-overflow-tooltip />
          <el-table-column prop="faultType" label="故障类型" width="130" show-overflow-tooltip />
          <el-table-column prop="description" label="故障描述" min-width="220" show-overflow-tooltip />
          <el-table-column prop="address" label="地址" min-width="170" show-overflow-tooltip />
          <el-table-column prop="handler" label="处理组" width="108" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="提交时间" width="150" />
          <el-table-column label="操作" width="198" fixed="right" align="center">
            <template #default="{ row }">
              <el-button text type="primary" @click.stop="openDetail(row)">详情</el-button>
              <el-button text type="primary" :disabled="row.status === 'COMPLETED' || row.status === 'CLOSED'" @click.stop="openAssignmentDialog(row)">
                派工
              </el-button>
              <el-button text type="primary" :disabled="!row.canAccept" @click.stop="quickAccept(row)">
                受理
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </template>

    <template v-else>
      <div class="detail-topbar">
        <div>
          <button class="back-btn" @click="backToList">返回</button>
          <span class="detail-no">{{ detail?.repairNo }}</span>
          <span v-if="detail" class="repair-status" :class="statusClass(detail.status)">
            {{ statusLabel(detail.status) }}
          </span>
        </div>
        <div class="detail-actions">
          <el-button :disabled="!detail || detail.status === 'COMPLETED' || detail.status === 'CLOSED'" @click="detail && openAssignmentDialog(detail)">
            派工/SLA
          </el-button>
          <el-button :disabled="!detail?.canAccept" @click="transitionStatus('PROCESSING', '已受理并进入处理中')">
            受理
          </el-button>
          <el-button :disabled="detail?.status !== 'PROCESSING'" @click="transitionStatus('REPAIRING', '已转入维修中')">
            开始维修
          </el-button>
          <el-button :disabled="detail?.status !== 'REPAIRING'" @click="transitionStatus('PENDING_INBOUND', '维修完成，等待资产入库')">
            完成维修
          </el-button>
          <el-button type="primary" :disabled="detail?.status !== 'PENDING_INBOUND'" @click="transitionStatus('COMPLETED', '已完成入库并关闭报修')">
            入库完成
          </el-button>
        </div>
      </div>

      <section v-if="detail" class="repair-detail-layout">
        <aside class="ticket-panel">
          <div class="ticket-head">
            <div>
              <span>{{ detail.sourceLabel }}</span>
              <strong>{{ detail.faultType }}</strong>
            </div>
            <em :class="{ urgent: detail.priority === '紧急' }">{{ detail.priority }}</em>
          </div>
          <div class="ticket-bt">{{ detail.btCode }}</div>
          <div class="battery-meter">
            <div class="battery-fill" :style="{ height: `${Math.max(detail.powerPercent, 8)}%` }">
              {{ detail.powerPercent }}%
            </div>
          </div>
          <div class="ticket-grid">
            <div>
              <span>电压</span>
              <strong>{{ detail.voltage || "--" }}V</strong>
            </div>
            <div>
              <span>温度</span>
              <strong>{{ detail.temperature || "--" }}℃</strong>
            </div>
            <div>
              <span>平台</span>
              <strong>{{ detail.sourcePlatform || "--" }}</strong>
            </div>
            <div>
              <span>型号</span>
              <strong>{{ detail.model || "--" }}</strong>
            </div>
          </div>
          <div class="contact-box">
            <div><el-icon><User /></el-icon>{{ detail.contactName || "--" }}</div>
            <div><el-icon><Phone /></el-icon>{{ detail.contactPhone || "--" }}</div>
            <div><el-icon><Location /></el-icon>{{ detail.address || "--" }}</div>
          </div>
        </aside>

        <main class="detail-main">
          <div class="process-panel">
            <div
              v-for="(node, index) in progressNodes"
              :key="node.label"
              class="process-node"
              :class="{ done: node.done }"
            >
              <span>{{ index + 1 }}</span>
              <strong>{{ node.label }}</strong>
            </div>
          </div>

          <div class="detail-tabs">
            <button
              v-for="tab in detailTabs"
              :key="tab.value"
              :class="{ active: activeDetailTab === tab.value }"
              @click="activeDetailTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <section v-if="activeDetailTab === 'overview'" class="detail-section">
            <div class="overview-grid">
              <div class="info-panel">
                <h3>工单信息</h3>
                <div class="info-list">
                  <div><span>客户/仓库</span><strong>{{ detail.customerName }}</strong></div>
                  <div><span>订单号</span><strong>{{ detail.orderNo || "内部报修" }}</strong></div>
                  <div><span>提交时间</span><strong>{{ detail.createdAt }}</strong></div>
                  <div><span>处理组</span><strong>{{ detail.handler }}</strong></div>
                  <div><span>技术人员</span><strong>{{ detail.technician || "待分配" }}</strong></div>
                  <div><span>预计完成</span><strong>{{ detail.expectedFinishAt || "--" }}</strong></div>
                  <div><span>SLA状态</span><strong>{{ detail.slaStatusLabel || "--" }}</strong></div>
                  <div><span>剩余/超时</span><strong>{{ detail.slaRemainingText || "--" }}</strong></div>
                </div>
              </div>
              <div class="info-panel">
                <h3>处理要求</h3>
                <p>{{ detail.description }}</p>
                <div class="rule-row">
                  <span>维修完成后必须入库</span>
                  <strong>{{ detail.inboundRequired ? "待入库" : "按状态流转" }}</strong>
                </div>
                <div class="rule-row">
                  <span>责任判定</span>
                  <strong>{{ detail.responsibility }}</strong>
                </div>
                <div class="rule-row">
                  <span>处理方式</span>
                  <strong>{{ detail.repairMethod }}</strong>
                </div>
                <div class="rule-row">
                  <span>客户确认</span>
                  <strong>{{ customerConfirmLabel(detail) }}</strong>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeDetailTab === 'logs'" class="detail-section">
            <div class="section-title">
              <strong>维修过程记录</strong>
              <el-button type="primary" @click="openLogDialog">新增记录</el-button>
            </div>
            <el-timeline class="repair-timeline">
              <el-timeline-item
                v-for="log in detail.logs"
                :key="`${log.time}-${log.action}`"
                :timestamp="log.time"
                placement="top"
              >
                <div class="timeline-card">
                  <div><strong>{{ log.action }}</strong><span>{{ log.status }}</span></div>
                  <p>{{ log.result }}</p>
                  <em>{{ log.operator }}：{{ log.remark }}</em>
                </div>
              </el-timeline-item>
            </el-timeline>
          </section>

          <section v-else-if="activeDetailTab === 'materials'" class="detail-section">
            <div class="section-title">
              <strong>配件与检测</strong>
              <el-button @click="openMaterialDialog">新增配件</el-button>
            </div>
            <el-table :data="detail.materials || []" border class="record-table">
              <el-table-column prop="name" label="配件/项目" min-width="160" />
              <el-table-column prop="quantity" label="数量" width="90" align="right" />
              <el-table-column prop="amount" label="金额" width="120" align="right">
                <template #default="{ row }">{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="220" />
            </el-table>
          </section>

          <section v-else-if="activeDetailTab === 'photos'" class="detail-section">
            <div class="section-title">
              <strong>图片资料</strong>
              <el-button @click="openImageDialog">
                <el-icon><UploadFilled /></el-icon>
                上传
              </el-button>
            </div>
            <div class="image-list">
              <div v-for="image in detail.images || []" :key="image" class="image-item">
                <el-icon><Document /></el-icon>
                <span>{{ image }}</span>
              </div>
            </div>
          </section>

          <section v-else class="detail-section">
            <div class="section-title">
              <strong>费用与责任</strong>
              <el-button @click="openCostDialog">登记费用</el-button>
            </div>
            <div class="cost-board">
              <div>
                <span>维修费用</span>
                <strong>{{ money(detail.costAmount || 0) }}</strong>
              </div>
              <div>
                <span>责任归属</span>
                <strong>{{ detail.responsibility }}</strong>
              </div>
              <div>
                <span>客户确认</span>
                <strong>{{ detail.customerConfirmed ? "已确认" : "待确认" }}</strong>
              </div>
            </div>
            <el-table :data="detail.costItems || []" border class="record-table">
              <el-table-column prop="item" label="费用项目" min-width="160" />
              <el-table-column prop="amount" label="金额" width="120" align="right">
                <template #default="{ row }">{{ money(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="payer" label="承担方" width="120" />
            </el-table>
          </section>
        </main>
      </section>
    </template>

    <el-dialog v-model="internalDialogVisible" title="内部报修" width="520px">
      <el-form label-position="top">
        <el-form-item label="BT码">
          <el-input v-model.trim="internalForm.btCode" placeholder="请输入内部检测异常电池BT码" />
        </el-form-item>
        <el-form-item label="故障描述">
          <el-input v-model.trim="internalForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="所在位置">
          <el-input v-model.trim="internalForm.address" />
        </el-form-item>
        <el-form-item label="处理组">
          <el-select v-model="internalForm.handler" style="width: 100%">
            <el-option label="售后一组" value="售后一组" />
            <el-option label="技术二组" value="技术二组" />
            <el-option label="资产管理部" value="资产管理部" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="internalDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitInternalRepair">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logDialogVisible" title="新增维修记录" width="520px">
      <el-form label-position="top">
        <el-form-item label="动作">
          <el-input v-model.trim="logForm.action" />
        </el-form-item>
        <el-form-item label="结果">
          <el-input v-model.trim="logForm.result" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="logForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="logDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitLog">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="materialDialogVisible" title="新增配件/检测项目" width="520px">
      <el-form label-position="top">
        <el-form-item label="配件/项目">
          <el-input v-model.trim="materialForm.name" placeholder="例如：定位模块、BMS检测" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="materialForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="materialForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="materialForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="materialDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaterial">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imageDialogVisible" title="上传维修图片" width="520px">
      <el-form label-position="top">
        <el-form-item label="图片/附件名称">
          <el-input v-model.trim="imageForm.name" placeholder="例如：现场复核照片、返厂检测报告" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="imageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitImage">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="costDialogVisible" title="登记费用与责任" width="560px">
      <el-form label-position="top">
        <el-form-item label="费用项目">
          <el-input v-model.trim="costForm.item" />
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="costForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="承担方">
          <el-select v-model="costForm.payer" style="width: 100%">
            <el-option label="公司" value="公司" />
            <el-option label="客户" value="客户" />
            <el-option label="厂商" value="厂商" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任归属">
          <el-select v-model="costForm.responsibility" style="width: 100%">
            <el-option label="待判定" value="待判定" />
            <el-option label="公司责任" value="公司责任" />
            <el-option label="客户责任" value="客户责任" />
            <el-option label="厂商质保" value="厂商质保" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户确认">
          <el-switch v-model="costForm.customerConfirmed" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="costForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="costDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCost">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="advancedFilterVisible" title="更多筛选" width="520px">
      <el-form label-position="top">
        <el-form-item label="报修来源">
          <el-select v-model="advancedFilters.source" style="width: 100%">
            <el-option label="全部" value="all" />
            <el-option label="客户报修" value="CUSTOMER" />
            <el-option label="内部报修" value="INTERNAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="advancedFilters.priority" style="width: 100%">
            <el-option label="全部" value="all" />
            <el-option label="紧急" value="紧急" />
            <el-option label="普通" value="普通" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理组">
          <el-select v-model="advancedFilters.handler" filterable style="width: 100%">
            <el-option label="全部" value="all" />
            <el-option v-for="handler in handlerOptions" :key="handler" :label="handler" :value="handler" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户确认">
          <el-select v-model="advancedFilters.confirmation" style="width: 100%">
            <el-option label="全部" value="all" />
            <el-option label="待客户确认" value="pending" />
            <el-option label="已确认" value="confirmed" />
          </el-select>
        </el-form-item>
        <el-form-item label="SLA状态">
          <el-select v-model="advancedFilters.sla" style="width: 100%">
            <el-option label="全部" value="all" />
            <el-option label="逾期或临期" value="risk" />
            <el-option label="已超时" value="overdue" />
            <el-option label="正常" value="normal" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetAdvancedFilters">清空</el-button>
        <el-button type="primary" @click="advancedFilterVisible = false">应用</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="groupDialogVisible" title="分组查询" width="860px">
      <el-table :data="groupRows" border>
        <el-table-column prop="handler" label="处理组" min-width="140" />
        <el-table-column prop="total" label="总数" width="82" align="right" />
        <el-table-column prop="pending" label="待受理" width="92" align="right" />
        <el-table-column prop="processing" label="处理中" width="92" align="right" />
        <el-table-column prop="repairing" label="维修中" width="92" align="right" />
        <el-table-column prop="inbound" label="待入库" width="92" align="right" />
        <el-table-column prop="urgent" label="紧急" width="82" align="right" />
        <el-table-column prop="slaRisk" label="SLA风险" width="96" align="right" />
      </el-table>
    </el-dialog>

    <el-dialog v-model="assignmentDialogVisible" title="派工与SLA" width="560px">
      <el-form label-position="top">
        <el-form-item label="处理组">
          <el-select v-model="assignmentForm.handler" filterable style="width: 100%">
            <el-option v-for="team in teamOptions" :key="team" :label="team" :value="team" />
          </el-select>
        </el-form-item>
        <el-form-item label="技术人员">
          <el-select v-model="assignmentForm.technician" clearable filterable style="width: 100%">
            <el-option v-for="technician in technicianOptions" :key="technician" :label="technician" :value="technician" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-segmented v-model="assignmentForm.priority" :options="['普通', '紧急']" />
        </el-form-item>
        <el-form-item label="SLA时限（小时）">
          <el-input-number v-model="assignmentForm.slaHours" :min="1" :max="240" style="width: 100%" />
        </el-form-item>
        <el-form-item label="预计完成时间">
          <el-date-picker
            v-model="assignmentForm.expectedFinishAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="同时受理">
          <el-switch v-model="assignmentForm.acceptNow" active-text="待受理工单保存后转处理中" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model.trim="assignmentForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAssignment">保存派工</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="客户报修导入" width="640px">
      <el-form label-position="top">
        <el-form-item label="导入内容">
          <el-input
            v-model="importText"
            type="textarea"
            :rows="8"
            placeholder="每行：BT码,故障描述,地址,附件名"
          />
        </el-form-item>
      </el-form>
      <div v-if="importFailures.length" class="import-failures">
        <strong>未导入记录</strong>
        <p v-for="item in importFailures" :key="`${item.row}-${item.btCode}`">
          第 {{ item.row }} 行 {{ item.btCode || "--" }}：{{ item.reason }}
        </p>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  ArrowDown,
  ArrowUp,
  Box,
  CircleCheck,
  Clock,
  Document,
  Location,
  Operation,
  Phone,
  Plus,
  Search,
  Tools,
  UploadFilled,
  User,
  Warning,
} from "@element-plus/icons-vue";
import { getMock, patchMock, postMock } from "../api/http";

type RepairStatus =
  | "PENDING_ACCEPT"
  | "PROCESSING"
  | "REPAIRING"
  | "PENDING_INBOUND"
  | "COMPLETED"
  | "CLOSED";
type ListTab = "all" | "pending" | "processing" | "inbound" | "closed";
type DetailTab = "overview" | "logs" | "materials" | "photos" | "costs";
type LeftFilter = "all" | RepairStatus | "urgent" | "slaRisk" | "customer" | "internal";

interface RepairLog {
  time: string;
  operator: string;
  action: string;
  status: string;
  result: string;
  remark: string;
}

interface RepairRow {
  id: string;
  index?: number;
  repairNo: string;
  source: "CUSTOMER" | "INTERNAL";
  sourceLabel: string;
  customerName: string;
  customerShortName?: string;
  orderId?: string;
  orderNo?: string;
  contractNo?: string;
  btCode: string;
  deviceNum?: string;
  model?: string;
  specification?: string;
  sourcePlatform?: string;
  status: RepairStatus;
  statusLabel?: string;
  priority: string;
  faultType: string;
  description: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  acceptedAt?: string;
  expectedFinishAt?: string;
  completedAt?: string;
  handler: string;
  technician?: string;
  responsibility?: string;
  repairMethod?: string;
  costAmount?: number;
  slaHours?: number;
  slaDueAt?: string;
  slaStatus?: "NORMAL" | "DUE_SOON" | "OVERDUE" | "DONE" | "CLOSED" | "UNSET";
  slaStatusLabel?: string;
  slaRemainingText?: string;
  slaOverdue?: boolean;
  slaDueSoon?: boolean;
  servicePromise?: string;
  customerConfirmed?: boolean;
  customerConfirmedAt?: string;
  customerConfirmRequired?: boolean;
  sourceAlarmNo?: string;
  images?: string[];
  logs?: RepairLog[];
  materials?: Array<Record<string, any>>;
  costItems?: Array<Record<string, any>>;
  progressNodes?: Array<{ label: string; done: boolean }>;
  runningStatus?: string;
  assetStatus?: string;
  powerPercent: number;
  temperature?: number;
  voltage?: number;
  location?: string;
  latestLog?: string;
  latestLogAt?: string;
  logCount?: number;
  imageCount?: number;
  inboundRequired?: boolean;
  canAccept?: boolean;
  canStartRepair?: boolean;
  canCompleteRepair?: boolean;
  canInbound?: boolean;
  canCustomerConfirm?: boolean;
}

interface ImportFailure {
  row: number;
  btCode: string;
  reason: string;
}

const loading = ref(false);
const rows = ref<RepairRow[]>([]);
const selectedRows = ref<RepairRow[]>([]);
const detail = ref<RepairRow | null>(null);
const viewMode = ref<"list" | "detail">("list");
const activeListTab = ref<ListTab>("all");
const activeDetailTab = ref<DetailTab>("overview");
const selectedCustomer = ref("all");
const customerKeyword = ref("");
const ownerScope = ref<"all" | "mine">("all");
const leftFilter = ref<LeftFilter>("all");
const queryField = ref<keyof RepairRow>("repairNo");
const keyword = ref("");
const internalDialogVisible = ref(false);
const logDialogVisible = ref(false);
const materialDialogVisible = ref(false);
const imageDialogVisible = ref(false);
const costDialogVisible = ref(false);
const advancedFilterVisible = ref(false);
const groupDialogVisible = ref(false);
const importDialogVisible = ref(false);
const assignmentDialogVisible = ref(false);
const assignmentTarget = ref<RepairRow | null>(null);
const importText = ref("");
const importFailures = ref<ImportFailure[]>([]);

const teamOptions = ["售后一组", "技术二组", "资产管理部", "待分配"];
const technicianOptions = ["李工", "赵工", "王工", "陈工", "孙工"];

const internalForm = reactive({
  btCode: "",
  description: "",
  address: "郑州总仓",
  handler: "技术二组",
});

const logForm = reactive({
  action: "维修跟进",
  result: "",
  remark: "",
});

const materialForm = reactive({
  name: "",
  quantity: 1,
  amount: 0,
  remark: "",
});

const imageForm = reactive({
  name: "",
});

const costForm = reactive({
  item: "维修服务费",
  amount: 0,
  payer: "公司",
  responsibility: "待判定",
  customerConfirmed: false,
  remark: "",
});

const assignmentForm = reactive({
  handler: "售后一组",
  technician: "",
  priority: "普通",
  slaHours: 48,
  expectedFinishAt: "",
  acceptNow: true,
  remark: "",
});

const advancedFilters = reactive({
  source: "all",
  priority: "all",
  handler: "all",
  confirmation: "all",
  sla: "all",
});

const statusFilters = [
  { key: "PENDING_ACCEPT", label: "待受理", icon: Clock },
  { key: "PROCESSING", label: "处理中", icon: Operation },
  { key: "REPAIRING", label: "维修中", icon: Tools },
  { key: "PENDING_INBOUND", label: "待入库", icon: Box },
  { key: "COMPLETED", label: "已完成", icon: CircleCheck },
] as const;

const detailTabs = [
  { value: "overview", label: "工单概览" },
  { value: "logs", label: "维修记录" },
  { value: "materials", label: "配件检测" },
  { value: "photos", label: "图片资料" },
  { value: "costs", label: "费用责任" },
] as const;

const customers = computed(() => {
  const names = rows.value.map((row) => row.customerName).filter(Boolean);
  return Array.from(new Set(names));
});

const filteredCustomers = computed(() => {
  const key = customerKeyword.value.trim();
  if (!key) return customers.value;
  return customers.value.filter((item) => item.includes(key));
});

const filteredRows = computed(() => {
  const key = keyword.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (selectedCustomer.value !== "all" && row.customerName !== selectedCustomer.value) return false;
    if (ownerScope.value === "mine" && !["售后一组", "技术二组"].includes(row.handler)) return false;
    if (!matchesLeftFilter(row, leftFilter.value)) return false;
    if (!matchesListTab(row, activeListTab.value)) return false;
    if (advancedFilters.source !== "all" && row.source !== advancedFilters.source) return false;
    if (advancedFilters.priority !== "all" && row.priority !== advancedFilters.priority) return false;
    if (advancedFilters.handler !== "all" && row.handler !== advancedFilters.handler) return false;
    if (advancedFilters.confirmation === "pending" && !isCustomerConfirmPending(row)) return false;
    if (advancedFilters.confirmation === "confirmed" && !row.customerConfirmed) return false;
    if (advancedFilters.sla === "risk" && !isSlaRisk(row)) return false;
    if (advancedFilters.sla === "overdue" && row.slaStatus !== "OVERDUE") return false;
    if (advancedFilters.sla === "normal" && row.slaStatus !== "NORMAL") return false;
    if (!key) return true;
    const value = String(row[queryField.value] ?? "").toLowerCase();
    return value.includes(key);
  });
});

const handlerOptions = computed(() => {
  const names = [...teamOptions, ...rows.value.map((row) => row.handler).filter(Boolean)];
  return Array.from(new Set(names));
});

const summary = computed(() => ({
  total: filteredRows.value.length,
  pending: filteredRows.value.filter((row) => row.status === "PENDING_ACCEPT").length,
  processing: filteredRows.value.filter((row) => ["PROCESSING", "REPAIRING"].includes(row.status)).length,
  inbound: filteredRows.value.filter((row) => row.status === "PENDING_INBOUND").length,
  confirming: filteredRows.value.filter(isCustomerConfirmPending).length,
  slaRisk: filteredRows.value.filter(isSlaRisk).length,
  urgent: filteredRows.value.filter((row) => row.priority === "紧急").length,
}));

const groupRows = computed(() => {
  const groups = new Map<
    string,
    {
      handler: string;
      total: number;
      pending: number;
      processing: number;
      repairing: number;
      inbound: number;
      urgent: number;
      slaRisk: number;
    }
  >();
  filteredRows.value.forEach((row) => {
    const handler = row.handler || "待分配";
    const current =
      groups.get(handler) ??
      {
        handler,
        total: 0,
        pending: 0,
        processing: 0,
        repairing: 0,
        inbound: 0,
        urgent: 0,
        slaRisk: 0,
      };
    current.total += 1;
    if (row.status === "PENDING_ACCEPT") current.pending += 1;
    if (row.status === "PROCESSING") current.processing += 1;
    if (row.status === "REPAIRING") current.repairing += 1;
    if (row.status === "PENDING_INBOUND") current.inbound += 1;
    if (row.priority === "紧急") current.urgent += 1;
    if (isSlaRisk(row)) current.slaRisk += 1;
    groups.set(handler, current);
  });
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
});

const progressNodes = computed(() => {
  if (!detail.value) return [];
  return detail.value.progressNodes ?? [
    { label: "提交", done: true },
    { label: "受理", done: detail.value.status !== "PENDING_ACCEPT" },
    { label: "维修", done: ["REPAIRING", "PENDING_INBOUND", "COMPLETED", "CLOSED"].includes(detail.value.status) },
    { label: "入库", done: ["COMPLETED", "CLOSED"].includes(detail.value.status) },
  ];
});

function matchesLeftFilter(row: RepairRow, filter: LeftFilter) {
  if (filter === "all") return true;
  if (filter === "urgent") return row.priority === "紧急";
  if (filter === "slaRisk") return isSlaRisk(row);
  if (filter === "customer") return row.source === "CUSTOMER";
  if (filter === "internal") return row.source === "INTERNAL";
  return row.status === filter;
}

function matchesListTab(row: RepairRow, tab: ListTab) {
  if (tab === "all") return true;
  if (tab === "pending") return row.status === "PENDING_ACCEPT";
  if (tab === "processing") return ["PROCESSING", "REPAIRING"].includes(row.status);
  if (tab === "inbound") return row.status === "PENDING_INBOUND";
  return ["COMPLETED", "CLOSED"].includes(row.status);
}

function countByFilter(filter: LeftFilter) {
  return rows.value.filter((row) => {
    if (selectedCustomer.value !== "all" && row.customerName !== selectedCustomer.value) return false;
    return matchesLeftFilter(row, filter);
  }).length;
}

function statusLabel(status: RepairStatus) {
  return (
    {
      PENDING_ACCEPT: "待受理",
      PROCESSING: "处理中",
      REPAIRING: "维修中",
      PENDING_INBOUND: "待入库",
      COMPLETED: "已完成",
      CLOSED: "已关闭",
    }[status] ?? status
  );
}

function statusClass(status: RepairStatus) {
  return {
    pending: status === "PENDING_ACCEPT",
    processing: status === "PROCESSING",
    repairing: status === "REPAIRING",
    inbound: status === "PENDING_INBOUND",
    completed: status === "COMPLETED",
    closed: status === "CLOSED",
  };
}

function tableRowClassName({ row }: { row: RepairRow }) {
  if (row.slaStatus === "OVERDUE") return "urgent-row";
  if (row.priority === "紧急") return "urgent-row";
  if (row.status === "PENDING_INBOUND") return "inbound-row";
  return "";
}

function isSlaRisk(row: RepairRow) {
  return row.slaStatus === "OVERDUE" || row.slaStatus === "DUE_SOON";
}

function slaClass(row: RepairRow) {
  return {
    normal: row.slaStatus === "NORMAL",
    warning: row.slaStatus === "DUE_SOON",
    danger: row.slaStatus === "OVERDUE",
    done: row.slaStatus === "DONE" || row.slaStatus === "CLOSED",
    unset: row.slaStatus === "UNSET",
  };
}

function isCustomerConfirmPending(row: RepairRow) {
  return row.source === "CUSTOMER" && row.status === "COMPLETED" && !row.customerConfirmed;
}

function customerConfirmLabel(row: RepairRow) {
  if (row.source !== "CUSTOMER") return "无需确认";
  if (row.customerConfirmed) return row.customerConfirmedAt ? `已确认 ${row.customerConfirmedAt}` : "已确认";
  return row.status === "COMPLETED" ? "待确认" : "未完成";
}

function customerConfirmShortLabel(row: RepairRow) {
  if (row.source !== "CUSTOMER") return "无需";
  if (row.customerConfirmed) return "已确认";
  return row.status === "COMPLETED" ? "待确认" : "未完成";
}

function handleSelectionChange(selection: RepairRow[]) {
  selectedRows.value = selection;
}

async function loadRepairs() {
  loading.value = true;
  try {
    rows.value = await getMock<RepairRow[]>("/repairs");
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: RepairRow) {
  detail.value = await getMock<RepairRow>(`/repairs/${row.id}`);
  activeDetailTab.value = "overview";
  viewMode.value = "detail";
}

function syncRepair(updated: RepairRow) {
  const index = rows.value.findIndex((item) => item.id === updated.id);
  if (index >= 0) {
    rows.value[index] = { ...rows.value[index], ...updated };
  } else {
    rows.value = [updated, ...rows.value];
  }
  if (detail.value?.id === updated.id) {
    detail.value = updated;
  }
}

function backToList() {
  viewMode.value = "list";
  detail.value = null;
}

function resetQuery() {
  keyword.value = "";
  queryField.value = "repairNo";
  activeListTab.value = "all";
  leftFilter.value = "all";
  selectedCustomer.value = "all";
  resetAdvancedFilters();
}

function noopSearch() {
  ElMessage.success("已按当前条件查询");
}

function resetAdvancedFilters() {
  advancedFilters.source = "all";
  advancedFilters.priority = "all";
  advancedFilters.handler = "all";
  advancedFilters.confirmation = "all";
  advancedFilters.sla = "all";
}

function openInternalDialog() {
  internalForm.btCode = "";
  internalForm.description = "";
  internalForm.address = "郑州总仓";
  internalForm.handler = "技术二组";
  internalDialogVisible.value = true;
}

async function submitInternalRepair() {
  if (!internalForm.btCode || !internalForm.description || !internalForm.address) {
    ElMessage.warning("请填写BT码、故障描述和所在位置");
    return;
  }
  try {
    const created = await postMock<RepairRow>("/repairs/internal", internalForm);
    syncRepair(created);
    detail.value = created;
    activeDetailTab.value = "overview";
    viewMode.value = "detail";
    internalDialogVisible.value = false;
    ElMessage.success("内部报修已创建");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "创建内部报修失败");
  }
}

function formatDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultExpectedFinishAt(hours: number) {
  return formatDateTimeInput(new Date(Date.now() + hours * 60 * 60 * 1000));
}

function openAssignmentDialog(row: RepairRow) {
  assignmentTarget.value = row;
  const hours = Number(row.slaHours || (row.priority === "紧急" ? 24 : row.source === "CUSTOMER" ? 48 : 72));
  assignmentForm.handler = row.handler && row.handler !== "待分配" ? row.handler : "售后一组";
  assignmentForm.technician = row.technician || "";
  assignmentForm.priority = row.priority || "普通";
  assignmentForm.slaHours = hours;
  assignmentForm.expectedFinishAt = row.expectedFinishAt || row.slaDueAt || defaultExpectedFinishAt(hours);
  assignmentForm.acceptNow = row.status === "PENDING_ACCEPT";
  assignmentForm.remark = "";
  assignmentDialogVisible.value = true;
}

async function submitAssignment() {
  if (!assignmentTarget.value || !assignmentForm.handler) {
    ElMessage.warning("请选择处理组");
    return;
  }
  try {
    const updated = await patchMock<RepairRow>(`/repairs/${assignmentTarget.value.id}/assignment`, {
      ...assignmentForm,
      operator: "售后人员",
      remark: assignmentForm.remark || "后台派工并更新SLA承诺。",
    });
    syncRepair(updated);
    assignmentDialogVisible.value = false;
    ElMessage.success("派工与SLA已保存");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "保存派工失败");
  }
}

async function quickAccept(row: RepairRow) {
  await updateRepairStatus(row, "PROCESSING", "报修单已受理");
}

async function transitionStatus(status: RepairStatus, message: string) {
  if (!detail.value) return;
  await updateRepairStatus(detail.value, status, message);
}

async function updateRepairStatus(row: RepairRow, status: RepairStatus, message: string) {
  try {
    const updated = await patchMock<RepairRow>(`/repairs/${row.id}/status`, {
      status,
      operator: row.technician || row.handler || "售后人员",
      handler: row.handler === "待分配" ? "售后一组" : row.handler,
      technician: row.technician || (status === "REPAIRING" ? "李工" : ""),
      result: message,
      remark: "后台售后人员操作",
    });
    syncRepair(updated);
    ElMessage.success(message);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "更新报修状态失败");
  }
}

async function handleBatchCommand(command: string) {
  if (!selectedRows.value.length) {
    ElMessage.warning("请先选择报修单");
    return;
  }

  const config =
    command === "accept"
      ? {
          status: "PROCESSING" as RepairStatus,
          rows: selectedRows.value.filter((row) => row.status === "PENDING_ACCEPT"),
          result: "批量受理报修",
          remark: "后台批量受理并分配售后处理组。",
        }
      : command === "repair"
        ? {
            status: "REPAIRING" as RepairStatus,
            rows: selectedRows.value.filter((row) => row.status === "PROCESSING"),
            result: "批量转入维修",
            remark: "后台批量确认进入维修中。",
          }
        : {
            status: "CLOSED" as RepairStatus,
            rows: selectedRows.value.filter((row) => row.status !== "CLOSED"),
            result: "批量关闭报修",
            remark: "后台批量关闭报修单。",
          };

  if (!config.rows.length) {
    ElMessage.warning("所选报修单没有可执行的状态");
    return;
  }

  try {
    const result = await postMock<{
      updatedCount: number;
      failedCount: number;
      updated: RepairRow[];
      failed: Array<{ id: string; reason: string }>;
    }>("/repairs/batch/status", {
      ids: config.rows.map((row) => row.id),
      status: config.status,
      operator: "售后人员",
      handler: "售后一组",
      technician: config.status === "REPAIRING" ? "李工" : "",
      result: config.result,
      remark: config.remark,
    });
    result.updated.forEach(syncRepair);
    if (result.failedCount > 0) {
      ElMessage.warning(`已处理 ${result.updatedCount} 条，${result.failedCount} 条失败`);
    } else {
      ElMessage.success(`已处理 ${result.updatedCount} 条报修单`);
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "批量处理失败");
  }
}

function openLogDialog() {
  logForm.action = "维修跟进";
  logForm.result = "";
  logForm.remark = "";
  logDialogVisible.value = true;
}

async function submitLog() {
  if (!detail.value || !logForm.result) {
    ElMessage.warning("请填写处理结果");
    return;
  }
  try {
    const updated = await postMock<RepairRow>(`/repairs/${detail.value.id}/logs`, {
      ...logForm,
      operator: detail.value.technician || detail.value.handler,
    });
    syncRepair(updated);
    logDialogVisible.value = false;
    ElMessage.success("维修记录已保存");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "保存维修记录失败");
  }
}

function openMaterialDialog() {
  materialForm.name = "";
  materialForm.quantity = 1;
  materialForm.amount = 0;
  materialForm.remark = "";
  materialDialogVisible.value = true;
}

async function submitMaterial() {
  if (!detail.value || !materialForm.name) {
    ElMessage.warning("请填写配件或检测项目");
    return;
  }
  try {
    const updated = await postMock<RepairRow>(`/repairs/${detail.value.id}/materials`, materialForm);
    syncRepair(updated);
    materialDialogVisible.value = false;
    ElMessage.success("配件/检测项目已保存");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "保存配件失败");
  }
}

function openImageDialog() {
  imageForm.name = "";
  imageDialogVisible.value = true;
}

async function submitImage() {
  if (!detail.value || !imageForm.name) {
    ElMessage.warning("请填写图片或附件名称");
    return;
  }
  try {
    const updated = await postMock<RepairRow>(`/repairs/${detail.value.id}/images`, imageForm);
    syncRepair(updated);
    imageDialogVisible.value = false;
    ElMessage.success("图片资料已保存");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "保存图片失败");
  }
}

function openCostDialog() {
  costForm.item = "维修服务费";
  costForm.amount = detail.value?.costAmount || 0;
  costForm.payer = "公司";
  costForm.responsibility = detail.value?.responsibility || "待判定";
  costForm.customerConfirmed = Boolean(detail.value?.customerConfirmed);
  costForm.remark = "";
  costDialogVisible.value = true;
}

async function submitCost() {
  if (!detail.value || !costForm.item) {
    ElMessage.warning("请填写费用项目");
    return;
  }
  try {
    const updated = await patchMock<RepairRow>(`/repairs/${detail.value.id}/costs`, costForm);
    syncRepair(updated);
    costDialogVisible.value = false;
    ElMessage.success("费用与责任已保存");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "保存费用失败");
  }
}

function openImportDialog() {
  importText.value = "";
  importFailures.value = [];
  importDialogVisible.value = true;
}

function parseImportRecords() {
  return importText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [btCode = "", description = "", address = "", imageText = ""] = line
        .split(/[,，]/)
        .map((part) => part.trim());
      return {
        btCode,
        description,
        address,
        images: imageText
          .split(/[|；;、]/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
    });
}

async function submitImport() {
  const records = parseImportRecords();
  if (!records.length) {
    ElMessage.warning("请粘贴需要导入的报修记录");
    return;
  }

  try {
    const result = await postMock<{
      createdCount: number;
      failedCount: number;
      created: RepairRow[];
      failed: ImportFailure[];
    }>("/repairs/import", { records });
    result.created.forEach(syncRepair);
    importFailures.value = result.failed;
    if (result.failedCount > 0) {
      ElMessage.warning(`已导入 ${result.createdCount} 条，${result.failedCount} 条失败`);
      return;
    }
    importDialogVisible.value = false;
    ElMessage.success(`已导入 ${result.createdCount} 条客户报修`);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? "导入失败");
  }
}

function money(value: number) {
  return `¥${Number(value || 0).toLocaleString("zh-CN")}`;
}

function exportCsv() {
  const headers = ["报修单号", "来源", "状态", "客户确认", "SLA", "预计完成", "客户/仓库", "BT码", "故障类型", "处理组", "提交时间"];
  const body = filteredRows.value.map((row) => [
    row.repairNo,
    row.sourceLabel,
    statusLabel(row.status),
    customerConfirmLabel(row),
    row.slaStatusLabel || "",
    row.slaDueAt || row.expectedFinishAt || "",
    row.customerName,
    row.btCode,
    row.faultType,
    row.handler,
    row.createdAt,
  ]);
  const csv = [headers, ...body]
    .map((line) => line.map((item) => `"${String(item ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `售后报修_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(loadRepairs);
</script>

<style scoped>
.repair-page {
  display: flex;
  height: calc(100vh - 56px);
  min-height: 720px;
  background: #f4f5f7;
  color: #20243d;
  overflow: hidden;
}

.repair-page.is-detail {
  display: block;
  padding: 0;
  overflow: auto;
}

.repair-left {
  width: 186px;
  flex: 0 0 186px;
  background: #fff;
  border-right: 1px solid #e7eaf2;
  padding: 10px 10px 16px;
}

.tree-panel {
  height: 196px;
  border: 1px solid #e1e5ee;
  border-radius: 8px;
  padding: 10px;
}

.customer-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}

.customer-tree button,
.side-item,
.status-group,
.target-tabs button,
.detail-tabs button,
.back-btn {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.customer-tree button {
  height: 25px;
  padding: 0 10px;
  border-radius: 5px;
  color: #3b4059;
  text-align: left;
}

.customer-tree button.active,
.customer-tree button:hover {
  background: #4d5cff;
  color: #fff;
}

.left-line {
  height: 1px;
  background: #e8ebf2;
  margin: 22px 0;
}

.filter-title,
.status-group,
.side-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-title {
  margin-bottom: 10px;
  color: #263047;
  font-size: 13px;
}

.scope-tabs {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid #c5eed2;
  border-radius: 4px;
}

.scope-tabs button {
  height: 22px;
  padding: 0 9px;
  border: 0;
  background: #fff;
  color: #49b56b;
  font-size: 12px;
}

.scope-tabs button.active {
  background: #58c878;
  color: #fff;
}

.status-group {
  width: 100%;
  height: 31px;
  padding: 0 12px;
  border-radius: 6px;
  background: #4d5cff;
  color: #fff;
}

.side-item {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  color: #2f3650;
  margin-top: 4px;
}

.side-item:hover,
.side-item.active {
  background: #eef1ff;
  color: #4d5cff;
}

.side-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.repair-main {
  flex: 1;
  min-width: 0;
  padding: 0 12px 12px;
  background: #fff;
}

.target-tabs {
  height: 41px;
  display: flex;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #e6e9f2;
}

.target-tabs button {
  height: 40px;
  color: #20243d;
  font-size: 14px;
  border-bottom: 2px solid transparent;
}

.target-tabs button.active {
  color: #3455ff;
  border-color: #3455ff;
  font-weight: 600;
}

.list-toolbar {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbar-left {
  flex: 1;
}

.field-select {
  width: 112px;
  flex: 0 0 112px;
}

.toolbar-left :deep(.el-input) {
  max-width: 280px;
}

.repair-summary-line {
  display: grid;
  grid-template-columns: repeat(7, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.repair-summary-line div {
  height: 50px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 8px 12px;
}

.repair-summary-line span {
  display: block;
  color: #7c8398;
  font-size: 12px;
}

.repair-summary-line strong {
  display: block;
  margin-top: 2px;
  font-size: 20px;
}

.repair-summary-line .danger strong {
  color: #ff4d6d;
}

.target-table {
  width: 100%;
}

.target-table :deep(th.el-table__cell) {
  background: #f8f9fc;
  color: #687086;
  font-weight: 500;
}

.target-table :deep(.urgent-row td) {
  background: #fff8f8;
}

.target-table :deep(.inbound-row td) {
  background: #f7fbff;
}

.repair-status,
.source-tag,
.priority-tag,
.confirm-tag,
.sla-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.sla-tag {
  background: #edf8f2;
  color: #2fa760;
}

.sla-tag.warning {
  background: #fff7e8;
  color: #d88418;
}

.sla-tag.danger {
  background: #fff1f3;
  color: #ff385c;
}

.sla-tag.done,
.sla-tag.unset {
  background: #f1f2f5;
  color: #7d8493;
}

.sla-mini {
  display: block;
  margin-top: 2px;
  color: #8a90a0;
  font-size: 11px;
  line-height: 1.15;
  white-space: nowrap;
}

.confirm-tag {
  background: #f1f2f5;
  color: #7d8493;
}

.confirm-tag.pending {
  background: #fff7e8;
  color: #d88418;
}

.confirm-tag.done {
  background: #e9f8ef;
  color: #25a45a;
}

.repair-status.pending {
  background: #fff7e8;
  color: #d88418;
}

.repair-status.processing,
.repair-status.repairing {
  background: #eef1ff;
  color: #3554ff;
}

.repair-status.inbound {
  background: #eaf8ff;
  color: #1685c7;
}

.repair-status.completed {
  background: #e9f8ef;
  color: #25a45a;
}

.repair-status.closed {
  background: #f1f2f5;
  color: #7d8493;
}

.source-tag {
  background: #eef7ff;
  color: #2671c9;
}

.source-tag.internal {
  background: #f0edff;
  color: #6652d9;
}

.priority-tag {
  background: #edf8f2;
  color: #2fa760;
}

.priority-tag.urgent,
.ticket-head em.urgent {
  background: #fff1f3;
  color: #ff385c;
}

.detail-topbar {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e6e9f2;
  position: sticky;
  top: 0;
  z-index: 4;
}

.back-btn {
  height: 30px;
  padding: 0 10px;
  margin-right: 10px;
  border-radius: 5px;
  background: #f0f2f7;
  color: #394056;
}

.detail-no {
  margin-right: 10px;
  font-size: 18px;
  font-weight: 700;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.repair-detail-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  min-height: calc(100vh - 108px);
  padding: 16px;
}

.ticket-panel,
.process-panel,
.detail-section {
  background: #fff;
  border-radius: 8px;
}

.ticket-panel {
  padding: 20px;
}

.ticket-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ticket-head span {
  display: block;
  color: #657089;
  font-size: 13px;
}

.ticket-head strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
}

.ticket-head em {
  height: 24px;
  padding: 3px 9px;
  border-radius: 4px;
  background: #edf8f2;
  color: #2fa760;
  font-style: normal;
}

.ticket-bt {
  margin-top: 10px;
  color: #2f3650;
}

.battery-meter {
  width: 92px;
  height: 150px;
  margin: 24px auto 18px;
  border: 2px solid #cfd5df;
  border-radius: 24px;
  padding: 6px;
  display: flex;
  align-items: flex-end;
  background: #fff;
}

.battery-fill {
  width: 100%;
  min-height: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #11e4d0, #0ccf86);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #143040;
  font-weight: 700;
}

.ticket-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.ticket-grid div,
.contact-box {
  background: #f8f9fc;
  border-radius: 8px;
  padding: 10px;
}

.ticket-grid span {
  display: block;
  color: #7c8398;
  font-size: 12px;
}

.ticket-grid strong {
  display: block;
  margin-top: 4px;
}

.contact-box {
  margin-top: 16px;
  display: grid;
  gap: 8px;
}

.contact-box div {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3d455c;
}

.detail-main {
  min-width: 0;
}

.process-panel {
  min-height: 86px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  padding: 16px;
}

.process-node {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.process-node span {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #edf0f6;
  color: #858ca0;
}

.process-node.done span {
  background: #4d5cff;
  color: #fff;
}

.process-node strong {
  font-size: 14px;
}

.detail-tabs {
  display: flex;
  gap: 22px;
  height: 42px;
  align-items: center;
  margin-top: 12px;
  border-bottom: 1px solid #e6e9f2;
}

.detail-tabs button {
  height: 42px;
  border-bottom: 2px solid transparent;
  color: #485069;
}

.detail-tabs button.active {
  color: #3455ff;
  border-color: #3455ff;
  font-weight: 600;
}

.detail-section {
  min-height: 430px;
  margin-top: 12px;
  padding: 18px;
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-panel {
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  padding: 16px;
}

.info-panel h3 {
  margin: 0 0 14px;
  font-size: 16px;
}

.info-panel p {
  margin: 0 0 14px;
  line-height: 1.8;
  color: #3d455c;
}

.info-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-list span,
.rule-row span,
.cost-board span {
  display: block;
  color: #7c8398;
  font-size: 12px;
}

.info-list strong,
.rule-row strong,
.cost-board strong {
  display: block;
  margin-top: 4px;
  color: #222842;
}

.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  border-top: 1px solid #eef0f5;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.repair-timeline {
  padding: 6px 8px 0;
}

.timeline-card {
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  padding: 12px;
  background: #fbfcff;
}

.timeline-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-card span {
  color: #3455ff;
}

.timeline-card p {
  margin: 8px 0;
  color: #30364d;
}

.timeline-card em {
  color: #778096;
  font-style: normal;
}

.record-table :deep(th.el-table__cell) {
  background: #f8f9fc;
  color: #687086;
  font-weight: 500;
}

.image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.image-item {
  height: 92px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #515a73;
}

.image-item .el-icon {
  font-size: 24px;
  color: #4d5cff;
}

.cost-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.cost-board div {
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  padding: 14px;
  background: #fbfcff;
}

.import-failures {
  display: grid;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
  padding: 12px;
  border: 1px solid #ffe1b8;
  border-radius: 8px;
  background: #fff8ef;
  color: #8a5a00;
}

.import-failures strong {
  color: #5f3d00;
}

.import-failures p {
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .repair-detail-layout {
    grid-template-columns: 1fr;
  }

  .repair-summary-line {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
  }
}
</style>
