<template>
  <div class="alarm-page">
    <section class="alarm-kpis">
      <div class="alarm-kpi">
        <span>当前告警</span>
        <strong>{{ summary.active }}</strong>
        <em>待处理和处理中</em>
      </div>
      <div class="alarm-kpi danger">
        <span>严重告警</span>
        <strong>{{ summary.severe }}</strong>
        <em>建议优先处理</em>
      </div>
      <div class="alarm-kpi warning">
        <span>待处理</span>
        <strong>{{ summary.pending }}</strong>
        <em>未形成处理记录</em>
      </div>
      <div class="alarm-kpi success">
        <span>已转报修</span>
        <strong>{{ summary.repairLinked }}</strong>
        <em>售后继续跟进</em>
      </div>
      <div class="alarm-kpi notice">
        <span>未确认推送</span>
        <strong>{{ summary.unconfirmedPushes }}</strong>
        <em>需要值班复核</em>
      </div>
      <div class="alarm-kpi overdue">
        <span>SLA超时</span>
        <strong>{{ summary.overdue }}</strong>
        <em>需要升级处置</em>
      </div>
      <div class="alarm-kpi silent">
        <span>静默中</span>
        <strong>{{ summary.silenced }}</strong>
        <em>暂停推送与升级</em>
      </div>
    </section>

    <section class="alarm-toolbar">
      <div class="toolbar-left">
        <el-select v-model="query.alarmIndex" clearable placeholder="告警类型">
          <el-option
            v-for="item in alarmTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select v-model="query.level" clearable placeholder="告警等级">
          <el-option
            v-for="item in levelOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select v-model="query.status" clearable placeholder="处理状态">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="query.silenceStatus"
          clearable
          placeholder="静默状态"
        >
          <el-option label="静默中" value="silenced" />
          <el-option label="未静默" value="normal" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="告警开始时间"
          end-placeholder="告警结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
        <el-input
          v-model.trim="query.keyword"
          clearable
          placeholder="BT码 / 客户 / 订单"
          @keyup.enter="handleQuery"
        >
          <template #append>
            <el-button :icon="Search" @click="handleQuery" />
          </template>
        </el-input>
      </div>
      <div class="toolbar-right">
        <el-button @click="resetQuery">重置</el-button>
        <el-button :icon="Setting" @click="openRules">规则</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="loadAlarms"
          >刷新</el-button
        >
        <el-button :icon="Download" @click="exportCsv">导出</el-button>
      </div>
    </section>

    <section v-if="selectedRows.length" class="alarm-batchbar">
      <span>
        已选 {{ selectedRows.length }} 条，可处理
        {{ selectedProcessableRows.length }} 条，需升级
        {{ selectedEscalatableRows.length }} 条，可静默
        {{ selectedSilenceableRows.length }} 条
      </span>
      <div>
        <el-button size="small" @click="openBatchProcess('PROCESSING')"
          >批量处理中</el-button
        >
        <el-button
          size="small"
          type="success"
          @click="openBatchProcess('RESOLVED')"
        >
          批量已处理
        </el-button>
        <el-button
          size="small"
          type="warning"
          :icon="Warning"
          @click="batchEscalate"
        >
          批量升级
        </el-button>
        <el-button size="small" :icon="Mute" @click="openSilence()"
          >批量静默</el-button
        >
        <el-button size="small" :icon="Unlock" @click="batchUnsilence"
          >解除静默</el-button
        >
        <el-button size="small" :icon="Bell" @click="openPush()"
          >重新推送</el-button
        >
      </div>
    </section>

    <section class="alarm-table-wrap">
      <el-table
        v-loading="loading"
        :data="pagedRows"
        border
        stripe
        height="100%"
        class="alarm-table"
        :row-class-name="rowClassName"
        @selection-change="handleSelectionChange"
        @row-dblclick="openDetail"
      >
        <el-table-column type="selection" width="46" align="center" fixed />
        <el-table-column
          type="index"
          label="序号"
          width="64"
          align="center"
          fixed
        />
        <el-table-column
          prop="alarmNo"
          label="告警编号"
          width="154"
          fixed
          show-overflow-tooltip
        />
        <el-table-column label="等级" width="86" align="center">
          <template #default="{ row }">
            <span class="alarm-level" :class="levelClass(row.level)">{{
              row.levelLabel
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="92" align="center">
          <template #default="{ row }">
            <span class="alarm-status" :class="statusClass(row.status)">{{
              row.statusLabel
            }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="type"
          label="告警类型"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="btCode"
          label="BT码"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          prop="customerName"
          label="客户/仓库"
          min-width="170"
          show-overflow-tooltip
        />
        <el-table-column
          prop="orderNo"
          label="订单号"
          width="150"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{
            row.orderNo || "内部/库存"
          }}</template>
        </el-table-column>
        <el-table-column prop="sourcePlatform" label="来源平台" width="104" />
        <el-table-column
          prop="alarmTime"
          label="告警时间"
          width="154"
          sortable
        />
        <el-table-column prop="duration" label="持续时长" width="118" />
        <el-table-column label="响应SLA" width="154">
          <template #default="{ row }">
            <div class="sla-cell">
              <span class="sla-tag" :class="slaClass(row.slaStatus)">
                {{ slaStatusLabel(row.slaStatus) }}
              </span>
              <small>{{
                row.nextEscalationDueAt || row.slaDueAt || "--"
              }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="静默" width="150">
          <template #default="{ row }">
            <div v-if="row.isSilenced" class="silence-cell">
              <span class="silence-tag">静默中</span>
              <small>{{ row.silenceUntil }}</small>
            </div>
            <span v-else class="muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="推送" width="76" align="center">
          <template #default="{ row }">
            <span class="push-count">{{ row.pushCount }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="repairNo"
          label="报修单"
          width="152"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span v-if="row.repairNo" class="repair-link">{{
              row.repairNo
            }}</span>
            <span v-else class="muted">未转报修</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="360" fixed="right" align="center">
          <template #default="{ row }">
            <el-button text type="primary" @click.stop="openDetail(row)"
              >详情</el-button
            >
            <el-button
              text
              type="primary"
              :disabled="!row.canProcess"
              @click.stop="openProcess(row)"
            >
              处理
            </el-button>
            <el-button
              text
              type="warning"
              :disabled="!row.canEscalate"
              @click.stop="escalateAlarm(row)"
            >
              升级
            </el-button>
            <el-button
              text
              type="primary"
              :disabled="!row.canPush"
              @click.stop="openPush(row)"
            >
              重推
            </el-button>
            <el-button
              v-if="row.isSilenced"
              text
              type="warning"
              :disabled="!row.canUnsilence"
              @click.stop="unsilenceAlarm(row)"
            >
              解除
            </el-button>
            <el-button
              v-else
              text
              type="info"
              :disabled="!row.canSilence"
              @click.stop="openSilence(row)"
            >
              静默
            </el-button>
            <el-button
              text
              type="danger"
              :disabled="!row.canCreateRepair"
              @click.stop="openRepair(row)"
            >
              转报修
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <div class="pagination-line">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :page-sizes="[10, 20, 30, 50]"
        :total="filteredRows.length"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>

    <el-drawer
      v-model="detailVisible"
      size="560px"
      class="alarm-detail-drawer"
      title="告警详情"
    >
      <template v-if="selectedAlarm">
        <div class="detail-head">
          <div>
            <strong>{{ selectedAlarm.type }}</strong>
            <span>{{ selectedAlarm.alarmNo }}</span>
          </div>
          <div class="detail-tags">
            <span class="alarm-level" :class="levelClass(selectedAlarm.level)">
              {{ selectedAlarm.levelLabel }}
            </span>
            <span
              class="alarm-status"
              :class="statusClass(selectedAlarm.status)"
            >
              {{ selectedAlarm.statusLabel }}
            </span>
          </div>
        </div>

        <div class="device-card">
          <div class="battery-meter">
            <div
              class="battery-fill"
              :style="{
                height: `${Math.max(selectedAlarm.powerPercent ?? 0, 6)}%`,
              }"
            >
              {{ selectedAlarm.powerPercent ?? "--" }}%
            </div>
          </div>
          <div class="device-info">
            <div>
              <span>BT码</span><strong>{{ selectedAlarm.btCode }}</strong>
            </div>
            <div>
              <span>设备编号</span
              ><strong>{{ selectedAlarm.deviceNum || "--" }}</strong>
            </div>
            <div>
              <span>客户/仓库</span
              ><strong>{{ selectedAlarm.customerName || "--" }}</strong>
            </div>
            <div>
              <span>订单号</span
              ><strong>{{ selectedAlarm.orderNo || "内部/库存" }}</strong>
            </div>
            <div>
              <span>电压</span
              ><strong>{{ metricText(selectedAlarm.voltage, "V") }}</strong>
            </div>
            <div>
              <span>温度</span
              ><strong>{{ metricText(selectedAlarm.temperature, "℃") }}</strong>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">
            <strong>异常说明</strong>
            <span>{{ selectedAlarm.alarmTime }}</span>
          </div>
          <div class="description-box">
            <p>{{ selectedAlarm.description }}</p>
            <div>
              <span>当前值</span>
              <strong>{{ selectedAlarm.currentValue || "--" }}</strong>
            </div>
            <div>
              <span>触发阈值</span>
              <strong>{{ selectedAlarm.threshold || "--" }}</strong>
            </div>
            <div>
              <span>位置</span>
              <strong>{{ selectedAlarm.location || "--" }}</strong>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">
            <strong>响应策略</strong>
            <span>{{ selectedAlarm.ruleName }}</span>
          </div>
          <div class="policy-grid">
            <div>
              <span>响应时限</span>
              <strong>{{ selectedAlarm.responseMinutes }} 分钟</strong>
            </div>
            <div>
              <span>SLA状态</span>
              <strong :class="{ danger: selectedAlarm.isSlaOverdue }">
                {{ slaStatusLabel(selectedAlarm.slaStatus) }}
              </strong>
            </div>
            <div>
              <span>下次升级时间</span>
              <strong>{{
                selectedAlarm.nextEscalationDueAt ||
                selectedAlarm.slaDueAt ||
                "--"
              }}</strong>
            </div>
            <div>
              <span>静默截止</span>
              <strong>{{
                selectedAlarm.isSilenced ? selectedAlarm.silenceUntil : "--"
              }}</strong>
            </div>
            <div>
              <span>升级层级</span>
              <strong>第 {{ selectedAlarm.escalationLevel }} 级</strong>
            </div>
            <div>
              <span>下一接收人</span>
              <strong>{{ selectedAlarm.escalationTarget || "--" }}</strong>
            </div>
            <div>
              <span>静默原因</span>
              <strong>{{ selectedAlarm.silenceReason || "--" }}</strong>
            </div>
            <div>
              <span>建议转报修</span>
              <strong>{{
                selectedAlarm.autoRepairSuggested ? "是" : "否"
              }}</strong>
            </div>
          </div>
        </div>

        <div class="detail-actions">
          <el-button
            :disabled="!selectedAlarm.canProcess"
            @click="openProcess(selectedAlarm, 'PROCESSING')"
          >
            开始处理
          </el-button>
          <el-button
            :disabled="!selectedAlarm.canProcess"
            @click="openProcess(selectedAlarm, 'RESOLVED')"
          >
            标记已处理
          </el-button>
          <el-button
            :disabled="!selectedAlarm.canProcess"
            @click="openProcess(selectedAlarm, 'FALSE_ALARM')"
          >
            标记误报
          </el-button>
          <el-button
            :icon="Bell"
            :disabled="!selectedAlarm.canPush"
            @click="openPush(selectedAlarm)"
          >
            重新推送
          </el-button>
          <el-button
            v-if="selectedAlarm.isSilenced"
            :icon="Unlock"
            :disabled="!selectedAlarm.canUnsilence"
            @click="unsilenceAlarm(selectedAlarm)"
          >
            解除静默
          </el-button>
          <el-button
            v-else
            :icon="Mute"
            :disabled="!selectedAlarm.canSilence"
            @click="openSilence(selectedAlarm)"
          >
            静默告警
          </el-button>
          <el-button
            type="warning"
            :disabled="!selectedAlarm.canEscalate"
            @click="escalateAlarm(selectedAlarm)"
          >
            超时升级
          </el-button>
          <el-button
            type="danger"
            :disabled="!selectedAlarm.canCreateRepair"
            @click="openRepair(selectedAlarm)"
          >
            严重告警转报修
          </el-button>
        </div>

        <div class="detail-section">
          <div class="section-title">
            <strong>处理记录</strong>
            <span>{{ selectedAlarm.logCount }} 条</span>
          </div>
          <el-timeline class="alarm-timeline">
            <el-timeline-item
              v-for="log in selectedAlarm.logs"
              :key="`${log.time}-${log.action}-${log.operator}`"
              :timestamp="log.time"
              placement="top"
            >
              <div class="timeline-card">
                <div>
                  <strong>{{ log.action }}</strong>
                  <span>{{ log.status }}</span>
                </div>
                <p>{{ log.remark }}</p>
                <em>{{ log.operator }}</em>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="detail-section">
          <div class="section-title">
            <strong>推送记录</strong>
            <span>{{ selectedAlarm.pushCount }} 条</span>
          </div>
          <el-table :data="selectedAlarm.pushes" border class="push-table">
            <el-table-column prop="pushType" label="类型" width="70">
              <template #default="{ row }">{{
                pushTypeLabel(row.pushType)
              }}</template>
            </el-table-column>
            <el-table-column prop="userName" label="接收人" min-width="90" />
            <el-table-column prop="userPhone" label="号码" width="118" />
            <el-table-column prop="sendStatus" label="发送" width="78">
              <template #default="{ row }">{{
                sendStatusLabel(row.sendStatus)
              }}</template>
            </el-table-column>
            <el-table-column prop="receiveStatus" label="接收" width="78">
              <template #default="{ row }">{{
                receiveStatusLabel(row.receiveStatus)
              }}</template>
            </el-table-column>
            <el-table-column label="确认" width="88" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.receiveStatus !== 'answered'"
                  text
                  type="primary"
                  :loading="submitting"
                  @click="acknowledgePush(row)"
                >
                  确认
                </el-button>
                <span v-else class="muted">已确认</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="processDialogVisible" title="处理告警" width="520px">
      <el-form label-position="top">
        <el-form-item label="处理状态">
          <el-select v-model="processForm.status" style="width: 100%">
            <el-option label="处理中" value="PROCESSING" />
            <el-option label="已处理" value="RESOLVED" />
            <el-option label="误报" value="FALSE_ALARM" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理人/小组">
          <el-select
            v-model="processForm.handler"
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option
              v-for="item in handlerOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input
            v-model.trim="processForm.remark"
            type="textarea"
            :rows="4"
            placeholder="记录原因、处置动作或误报判断依据"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProcess"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <el-dialog v-model="pushDialogVisible" title="重新推送告警" width="520px">
      <el-form label-position="top">
        <el-form-item label="推送方式">
          <el-select v-model="pushForm.pushType" style="width: 100%">
            <el-option label="公众号" value="mp" />
            <el-option label="短信" value="sms" />
            <el-option label="电话" value="phone" />
          </el-select>
        </el-form-item>
        <el-form-item label="接收人">
          <el-input v-model.trim="pushForm.userName" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model.trim="pushForm.userPhone" />
        </el-form-item>
        <el-form-item label="推送说明">
          <el-input
            v-model.trim="pushForm.remark"
            type="textarea"
            :rows="3"
            placeholder="记录本次重推原因和跟进要求"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pushDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPush"
          >推送</el-button
        >
      </template>
    </el-dialog>

    <el-dialog v-model="silenceDialogVisible" title="静默告警" width="520px">
      <el-form label-position="top">
        <el-form-item label="静默时长">
          <el-radio-group
            v-model="silenceForm.minutes"
            class="silence-duration-group"
          >
            <el-radio-button :label="30">30分钟</el-radio-button>
            <el-radio-button :label="120">2小时</el-radio-button>
            <el-radio-button :label="480">8小时</el-radio-button>
            <el-radio-button :label="1440">1天</el-radio-button>
          </el-radio-group>
          <el-input-number
            v-model="silenceForm.minutes"
            :min="5"
            :max="10080"
            :step="5"
            controls-position="right"
            class="silence-duration-input"
          />
        </el-form-item>
        <el-form-item label="操作人">
          <el-select
            v-model="silenceForm.operator"
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option
              v-for="item in handlerOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="静默原因">
          <el-input
            v-model.trim="silenceForm.reason"
            type="textarea"
            :rows="3"
            placeholder="例如现场检修、仓库停用、客户已确认短时离线"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="silenceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitSilence"
          >确认静默</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="repairDialogVisible"
      title="严重告警转报修"
      width="560px"
    >
      <el-form label-position="top">
        <el-form-item label="故障描述">
          <el-input
            v-model.trim="repairForm.description"
            type="textarea"
            :rows="4"
          />
        </el-form-item>
        <el-form-item label="所在位置">
          <el-input v-model.trim="repairForm.address" />
        </el-form-item>
        <el-form-item label="处理组">
          <el-select v-model="repairForm.handler" style="width: 100%">
            <el-option
              v-for="item in handlerOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="repairDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitRepair"
          >生成报修单</el-button
        >
      </template>
    </el-dialog>

    <el-drawer
      v-model="ruleVisible"
      size="720px"
      class="alarm-rule-drawer"
      title="告警规则配置"
    >
      <div class="rule-actions">
        <span>配置告警等级、响应时限、通知渠道和升级接收人。</span>
        <el-button
          :icon="Refresh"
          :loading="ruleLoading"
          @click="loadAlarmRules"
          >刷新</el-button
        >
      </div>
      <el-table
        v-loading="ruleLoading"
        :data="ruleRows"
        border
        class="rule-table"
      >
        <el-table-column
          prop="name"
          label="规则"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column label="启用" width="78" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" />
          </template>
        </el-table-column>
        <el-table-column label="等级" width="112">
          <template #default="{ row }">
            <el-select v-model="row.level" size="small">
              <el-option
                v-for="item in levelOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="响应分钟" width="116">
          <template #default="{ row }">
            <el-input-number
              v-model="row.responseMinutes"
              :min="5"
              :step="5"
              size="small"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column label="通知渠道" min-width="170">
          <template #default="{ row }">
            <el-checkbox-group v-model="row.channels" class="channel-checks">
              <el-checkbox label="mp">公众号</el-checkbox>
              <el-checkbox label="sms">短信</el-checkbox>
              <el-checkbox label="phone">电话</el-checkbox>
            </el-checkbox-group>
          </template>
        </el-table-column>
        <el-table-column label="默认处理组" min-width="128">
          <template #default="{ row }">
            <el-select
              v-model="row.defaultHandler"
              size="small"
              filterable
              allow-create
            >
              <el-option
                v-for="item in handlerOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="升级接收人" min-width="168">
          <template #default="{ row }">
            <el-input
              size="small"
              :model-value="row.escalationReceivers.join('、')"
              @update:model-value="updateRuleReceivers(row, $event)"
            />
          </template>
        </el-table-column>
        <el-table-column label="自动报修" width="90" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.autoRepair" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="86" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              :loading="ruleSavingId === row.id"
              @click="saveRule(row)"
            >
              保存
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  Bell,
  Download,
  Mute,
  Refresh,
  Search,
  Setting,
  Unlock,
  Warning,
} from "@element-plus/icons-vue";
import { getMock, patchMock, postMock } from "../api/http";

type AlarmLevel = "SEVERE" | "WARNING" | "INFO";
type AlarmStatus = "PENDING" | "PROCESSING" | "RESOLVED" | "FALSE_ALARM";
type AlarmIndex =
  | "low_power"
  | "single_undervoltage"
  | "temperature"
  | "mos"
  | "gps"
  | "offline";
type PushType = "mp" | "sms" | "phone";
type SendStatus = "success" | "failed" | "sending";
type ReceiveStatus = "answered" | "unanswered" | "unread";

interface AlarmLog {
  time: string;
  operator: string;
  action: string;
  status: string;
  remark: string;
}

interface PushRow {
  id: string;
  pushType: PushType;
  userName: string;
  userType: string;
  userPhone: string;
  firstPushTime: string;
  lastPushTime: string;
  answerTime: string;
  pushCount: number;
  sendStatus: SendStatus;
  receiveStatus: ReceiveStatus;
  failReason: string;
  remark: string;
}

interface AlarmRow {
  id: string;
  index?: number;
  alarmNo: string;
  alarmIndex: AlarmIndex;
  level: AlarmLevel;
  levelLabel: string;
  status: AlarmStatus;
  statusLabel: string;
  type: string;
  btCode: string;
  deviceNum: string;
  qrCode: string;
  batterySn: string;
  customerName: string;
  customerShortName?: string;
  orderId?: string;
  orderNo: string;
  sourcePlatform: string;
  bmsManufacturers: string;
  alarmTime: string;
  recoveredAt?: string;
  duration: string;
  description: string;
  currentValue?: string;
  threshold?: string;
  location?: string;
  handler?: string;
  powerPercent?: number | null;
  voltage?: number | null;
  temperature?: number | null;
  mpPush: boolean;
  repairNo?: string;
  repairId?: string;
  ruleId?: string;
  ruleName: string;
  responseMinutes: number;
  slaDueAt: string;
  nextEscalationDueAt: string;
  slaStatus: "normal" | "overdue" | "closed" | "silenced";
  isSlaOverdue: boolean;
  isSilenced: boolean;
  silenceUntil: string;
  silenceReason: string;
  silenceOperator: string;
  silencedAt: string;
  silenceRemaining: string;
  escalationLevel: number;
  escalationTarget: string;
  notificationChannels: PushType[];
  autoRepairSuggested: boolean;
  pushes: PushRow[];
  logs: AlarmLog[];
  pushCount: number;
  logCount: number;
  canProcess: boolean;
  canPush: boolean;
  canSilence: boolean;
  canUnsilence: boolean;
  canEscalate: boolean;
  canCreateRepair: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AlarmStats {
  total: number;
  active: number;
  severe: number;
  pending: number;
  processing: number;
  resolved: number;
  falseAlarm: number;
  repairLinked: number;
  unconfirmedPushes: number;
  overdue: number;
  silenced: number;
}

interface AlarmRule {
  id: string;
  index?: number;
  alarmIndex: AlarmIndex;
  name: string;
  level: AlarmLevel;
  enabled: boolean;
  responseMinutes: number;
  autoRepair: boolean;
  defaultHandler: string;
  escalationReceivers: string[];
  channels: PushType[];
  remark: string;
  updatedAt: string;
}

const loading = ref(false);
const submitting = ref(false);
const ruleLoading = ref(false);
const rows = ref<AlarmRow[]>([]);
const stats = ref<AlarmStats | null>(null);
const ruleRows = ref<AlarmRule[]>([]);
const selectedAlarm = ref<AlarmRow | null>(null);
const detailVisible = ref(false);
const ruleVisible = ref(false);
const processDialogVisible = ref(false);
const repairDialogVisible = ref(false);
const pushDialogVisible = ref(false);
const silenceDialogVisible = ref(false);
const ruleSavingId = ref("");
const activeAlarmId = ref("");
const activeAlarmIds = ref<string[]>([]);
const selectedRows = ref<AlarmRow[]>([]);
const dateRange = ref<[string, string] | []>([]);

const query = reactive({
  alarmIndex: "" as AlarmIndex | "",
  level: "" as AlarmLevel | "",
  status: "" as AlarmStatus | "",
  silenceStatus: "" as "" | "silenced" | "normal",
  keyword: "",
  pageNum: 1,
  pageSize: 10,
});

const processForm = reactive({
  status: "PROCESSING" as AlarmStatus,
  handler: "售后一组",
  remark: "",
});

const repairForm = reactive({
  description: "",
  address: "",
  handler: "售后一组",
});

const pushForm = reactive({
  pushType: "sms" as PushType,
  userName: "值班人员",
  userPhone: "13900139002",
  remark: "告警仍未确认，重新推送值班提醒。",
});

const silenceForm = reactive({
  minutes: 120,
  operator: "值班人员",
  reason: "",
});

const alarmTypeOptions: Array<{ label: string; value: AlarmIndex }> = [
  { label: "低电量", value: "low_power" },
  { label: "单体欠压", value: "single_undervoltage" },
  { label: "温度异常", value: "temperature" },
  { label: "MOS异常", value: "mos" },
  { label: "GPS异常", value: "gps" },
  { label: "设备离线", value: "offline" },
];

const levelOptions: Array<{ label: string; value: AlarmLevel }> = [
  { label: "严重", value: "SEVERE" },
  { label: "一般", value: "WARNING" },
  { label: "提示", value: "INFO" },
];

const statusOptions: Array<{ label: string; value: AlarmStatus }> = [
  { label: "待处理", value: "PENDING" },
  { label: "处理中", value: "PROCESSING" },
  { label: "已处理", value: "RESOLVED" },
  { label: "误报", value: "FALSE_ALARM" },
];

const handlerOptions = ["售后一组", "技术二组", "资产管理部", "值班人员"];

const filteredRows = computed(() => {
  const keyword = query.keyword.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (query.alarmIndex && row.alarmIndex !== query.alarmIndex) return false;
    if (query.level && row.level !== query.level) return false;
    if (query.status && row.status !== query.status) return false;
    if (query.silenceStatus === "silenced" && !row.isSilenced) return false;
    if (query.silenceStatus === "normal" && row.isSilenced) return false;
    if (dateRange.value.length === 2) {
      const [start, end] = dateRange.value;
      const time = toTime(row.alarmTime);
      if (time < toTime(start) || time > toTime(end)) return false;
    }
    if (!keyword) return true;
    return [
      row.btCode,
      row.deviceNum,
      row.customerName,
      row.orderNo,
      row.alarmNo,
      row.type,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });
});

const pagedRows = computed(() => {
  const start = (query.pageNum - 1) * query.pageSize;
  return filteredRows.value.slice(start, start + query.pageSize);
});

const summary = computed(() => {
  const active = rows.value.filter(
    (row) => !["RESOLVED", "FALSE_ALARM"].includes(row.status),
  );
  return {
    active: stats.value?.active ?? active.length,
    severe:
      stats.value?.severe ??
      active.filter((row) => row.level === "SEVERE").length,
    pending:
      stats.value?.pending ??
      rows.value.filter((row) => row.status === "PENDING").length,
    repairLinked:
      stats.value?.repairLinked ??
      rows.value.filter((row) => Boolean(row.repairNo)).length,
    unconfirmedPushes:
      stats.value?.unconfirmedPushes ??
      rows.value.reduce(
        (count, row) =>
          count +
          row.pushes.filter(
            (push) =>
              push.sendStatus !== "success" ||
              push.receiveStatus !== "answered",
          ).length,
        0,
      ),
    overdue:
      stats.value?.overdue ?? active.filter((row) => row.isSlaOverdue).length,
    silenced:
      stats.value?.silenced ?? active.filter((row) => row.isSilenced).length,
  };
});

const selectedProcessableRows = computed(() =>
  selectedRows.value.filter((row) => row.canProcess),
);

const selectedEscalatableRows = computed(() =>
  selectedRows.value.filter((row) => row.canEscalate && row.isSlaOverdue),
);

const selectedSilenceableRows = computed(() =>
  selectedRows.value.filter((row) => row.canSilence),
);

const selectedUnsilenceableRows = computed(() =>
  selectedRows.value.filter((row) => row.canUnsilence),
);

const selectedPushableRows = computed(() =>
  selectedRows.value.filter((row) => row.canPush),
);

watch(
  () =>
    [
      query.alarmIndex,
      query.level,
      query.status,
      query.silenceStatus,
      query.keyword,
      dateRange.value,
    ] as const,
  () => {
    query.pageNum = 1;
  },
);

watch(
  () => query.pageSize,
  () => {
    query.pageNum = 1;
  },
);

function buildAlarmSearchParams() {
  const params = new URLSearchParams();
  if (query.alarmIndex) params.set("alarmIndex", query.alarmIndex);
  if (query.level) params.set("level", query.level);
  if (query.status) params.set("status", query.status);
  if (query.silenceStatus) params.set("silenceStatus", query.silenceStatus);
  if (query.keyword) params.set("keyword", query.keyword);
  if (dateRange.value.length === 2) {
    params.set("startAt", dateRange.value[0]);
    params.set("endAt", dateRange.value[1]);
  }
  return params;
}

function buildAlarmQueryPath() {
  const params = buildAlarmSearchParams();
  const text = params.toString();
  return text ? `/alarms?${text}` : "/alarms";
}

function buildAlarmStatsPath() {
  const params = buildAlarmSearchParams();
  const text = params.toString();
  return text ? `/alarms/stats?${text}` : "/alarms/stats";
}

async function loadAlarmStats() {
  stats.value = await getMock<AlarmStats>(buildAlarmStatsPath());
}

async function loadAlarms() {
  loading.value = true;
  try {
    const [alarmRows, alarmStats] = await Promise.all([
      getMock<AlarmRow[]>(buildAlarmQueryPath()),
      getMock<AlarmStats>(buildAlarmStatsPath()),
    ]);
    rows.value = alarmRows;
    stats.value = alarmStats;
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function loadAlarmRules() {
  ruleLoading.value = true;
  try {
    ruleRows.value = await getMock<AlarmRule[]>("/alarms/rules");
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    ruleLoading.value = false;
  }
}

async function openRules() {
  ruleVisible.value = true;
  if (!ruleRows.value.length) await loadAlarmRules();
}

function updateRuleReceivers(row: AlarmRule, value: string) {
  row.escalationReceivers = value
    .split(/[\s,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function saveRule(row: AlarmRule) {
  ruleSavingId.value = row.id;
  try {
    const updated = await patchMock<AlarmRule>(`/alarms/rules/${row.id}`, {
      name: row.name,
      level: row.level,
      enabled: row.enabled,
      responseMinutes: row.responseMinutes,
      autoRepair: row.autoRepair,
      defaultHandler: row.defaultHandler,
      escalationReceivers: row.escalationReceivers,
      channels: row.channels,
      remark: row.remark,
    });
    const index = ruleRows.value.findIndex((item) => item.id === updated.id);
    if (index >= 0) ruleRows.value.splice(index, 1, updated);
    await loadAlarms();
    ElMessage.success("告警规则已保存");
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    ruleSavingId.value = "";
  }
}

async function openDetail(row: AlarmRow) {
  try {
    selectedAlarm.value = await getMock<AlarmRow>(`/alarms/${row.id}`);
    activeAlarmId.value = row.id;
    activeAlarmIds.value = [row.id];
    detailVisible.value = true;
  } catch (error) {
    ElMessage.error(errorMessage(error));
  }
}

function openProcess(row: AlarmRow, status: AlarmStatus = "PROCESSING") {
  activeAlarmId.value = row.id;
  activeAlarmIds.value = [row.id];
  processForm.status = status;
  processForm.handler = row.handler || "售后一组";
  processForm.remark =
    status === "RESOLVED"
      ? "已复核设备数据，异常已恢复。"
      : status === "FALSE_ALARM"
        ? "经核对为平台误报，不进入维修流程。"
        : "已安排处理人跟进。";
  processDialogVisible.value = true;
}

function openBatchProcess(status: AlarmStatus) {
  const rows = selectedProcessableRows.value;
  if (!rows.length) {
    ElMessage.warning("请选择未关闭的告警");
    return;
  }
  activeAlarmId.value = "";
  activeAlarmIds.value = rows.map((row) => row.id);
  processForm.status = status;
  processForm.handler = "值班人员";
  processForm.remark =
    status === "RESOLVED"
      ? `批量复核 ${rows.length} 条告警，确认已恢复。`
      : "批量分派值班人员跟进。";
  processDialogVisible.value = true;
}

async function submitProcess() {
  const ids = activeAlarmIds.value.length
    ? activeAlarmIds.value
    : activeAlarmId.value
      ? [activeAlarmId.value]
      : [];
  if (!ids.length) return;
  if (
    ["RESOLVED", "FALSE_ALARM"].includes(processForm.status) &&
    !processForm.remark
  ) {
    ElMessage.warning("关闭告警必须填写处理说明");
    return;
  }
  submitting.value = true;
  try {
    if (ids.length === 1) {
      const updated = await patchMock<AlarmRow>(`/alarms/${ids[0]}/status`, {
        ...processForm,
        operator: processForm.handler,
      });
      updateAlarm(updated);
      selectedAlarm.value = updated;
      await loadAlarmStats();
    } else {
      const result = await postMock<{ count: number; updated: AlarmRow[] }>(
        "/alarms/batch/status",
        {
          ids,
          ...processForm,
          operator: processForm.handler,
        },
      );
      result.updated.forEach(updateAlarm);
      selectedAlarm.value =
        result.updated.find((item) => item.id === selectedAlarm.value?.id) ??
        selectedAlarm.value;
      await loadAlarmStats();
      ElMessage.success(`已批量处理 ${result.count} 条告警`);
    }
    processDialogVisible.value = false;
    if (ids.length === 1) ElMessage.success("告警处理记录已保存");
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function openRepair(row: AlarmRow) {
  activeAlarmId.value = row.id;
  activeAlarmIds.value = [row.id];
  repairForm.description = `${row.type}：${row.description || "需要售后进一步检测。"}`;
  repairForm.address = row.location || "待确认";
  repairForm.handler = row.handler || "售后一组";
  repairDialogVisible.value = true;
}

async function submitRepair() {
  if (!activeAlarmId.value) return;
  if (!repairForm.description || !repairForm.address) {
    ElMessage.warning("请填写故障描述和所在位置");
    return;
  }
  submitting.value = true;
  try {
    const result = await postMock<{
      alarm: AlarmRow;
      repair: { repairNo: string };
    }>(`/alarms/${activeAlarmId.value}/repair`, {
      ...repairForm,
      operator: repairForm.handler,
    });
    updateAlarm(result.alarm);
    selectedAlarm.value = result.alarm;
    await loadAlarmStats();
    repairDialogVisible.value = false;
    ElMessage.success(`已生成报修单 ${result.repair.repairNo}`);
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function openPush(row?: AlarmRow) {
  const targets = row ? [row] : selectedPushableRows.value;
  if (!targets.length) {
    ElMessage.warning("请选择未关闭且未静默的告警");
    return;
  }
  activeAlarmId.value = row?.id ?? "";
  activeAlarmIds.value = targets.map((item) => item.id);
  pushForm.pushType = targets.some((item) => item.mpPush) ? "mp" : "sms";
  pushForm.userName =
    targets.length === 1 ? targets[0].handler || "值班人员" : "值班人员";
  pushForm.userPhone = "13900139002";
  pushForm.remark =
    targets.length === 1
      ? `${targets[0].alarmNo} 未确认，重新推送提醒。`
      : `批量重推 ${targets.length} 条未关闭告警。`;
  pushDialogVisible.value = true;
}

async function submitPush() {
  const ids = activeAlarmIds.value.length
    ? activeAlarmIds.value
    : activeAlarmId.value
      ? [activeAlarmId.value]
      : [];
  if (!ids.length) return;
  if (!pushForm.userName || !pushForm.userPhone) {
    ElMessage.warning("请填写接收人和联系方式");
    return;
  }
  submitting.value = true;
  try {
    if (ids.length === 1) {
      const updated = await postMock<AlarmRow>(`/alarms/${ids[0]}/pushes`, {
        ...pushForm,
        operator: pushForm.userName,
      });
      updateAlarm(updated);
      selectedAlarm.value = updated;
      await loadAlarmStats();
      ElMessage.success("告警提醒已重新推送");
    } else {
      const result = await postMock<{ count: number; updated: AlarmRow[] }>(
        "/alarms/batch/pushes",
        {
          ids,
          ...pushForm,
          operator: pushForm.userName,
        },
      );
      result.updated.forEach(updateAlarm);
      selectedAlarm.value =
        result.updated.find((item) => item.id === selectedAlarm.value?.id) ??
        selectedAlarm.value;
      await loadAlarmStats();
      ElMessage.success(`已批量重推 ${result.count} 条告警`);
    }
    pushDialogVisible.value = false;
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function openSilence(row?: AlarmRow) {
  const targets = row ? [row] : selectedSilenceableRows.value;
  if (!targets.length) {
    ElMessage.warning("请选择未关闭且未静默的告警");
    return;
  }
  activeAlarmId.value = row?.id ?? "";
  activeAlarmIds.value = targets.map((item) => item.id);
  silenceForm.minutes = targets.some((item) => item.level === "SEVERE")
    ? 30
    : 120;
  silenceForm.operator =
    targets.length === 1 ? targets[0].handler || "值班人员" : "值班人员";
  silenceForm.reason =
    targets.length === 1
      ? `${targets[0].alarmNo} 已确认短时不需要提醒，暂停推送与升级。`
      : `批量静默 ${targets.length} 条已确认可暂缓提醒的告警。`;
  silenceDialogVisible.value = true;
}

async function submitSilence() {
  const ids = activeAlarmIds.value.length
    ? activeAlarmIds.value
    : activeAlarmId.value
      ? [activeAlarmId.value]
      : [];
  if (!ids.length) return;
  if (!silenceForm.reason) {
    ElMessage.warning("请填写静默原因");
    return;
  }
  submitting.value = true;
  try {
    if (ids.length === 1) {
      const updated = await postMock<AlarmRow>(`/alarms/${ids[0]}/silence`, {
        ...silenceForm,
      });
      updateAlarm(updated);
      selectedAlarm.value =
        selectedAlarm.value?.id === updated.id ? updated : selectedAlarm.value;
      await loadAlarmStats();
      ElMessage.success("告警已静默");
    } else {
      const result = await postMock<{ count: number; updated: AlarmRow[] }>(
        "/alarms/batch/silence",
        {
          ids,
          ...silenceForm,
        },
      );
      result.updated.forEach(updateAlarm);
      selectedAlarm.value =
        result.updated.find((item) => item.id === selectedAlarm.value?.id) ??
        selectedAlarm.value;
      await loadAlarmStats();
      ElMessage.success(`已静默 ${result.count} 条告警`);
    }
    silenceDialogVisible.value = false;
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function unsilenceAlarm(row: AlarmRow) {
  if (!row.canUnsilence) return;
  submitting.value = true;
  try {
    const updated = await postMock<AlarmRow>(`/alarms/${row.id}/unsilence`, {
      operator: row.handler || "值班人员",
      remark: "已解除静默，恢复推送与升级规则。",
    });
    updateAlarm(updated);
    selectedAlarm.value =
      selectedAlarm.value?.id === updated.id ? updated : selectedAlarm.value;
    await loadAlarmStats();
    ElMessage.success("告警已解除静默");
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function batchUnsilence() {
  const ids = selectedUnsilenceableRows.value.map((row) => row.id);
  if (!ids.length) {
    ElMessage.warning("请选择静默中的告警");
    return;
  }
  submitting.value = true;
  try {
    const result = await postMock<{ count: number; updated: AlarmRow[] }>(
      "/alarms/batch/unsilence",
      {
        ids,
        operator: "值班人员",
        remark: `批量解除 ${ids.length} 条告警静默，恢复提醒。`,
      },
    );
    result.updated.forEach(updateAlarm);
    selectedAlarm.value =
      result.updated.find((item) => item.id === selectedAlarm.value?.id) ??
      selectedAlarm.value;
    await loadAlarmStats();
    ElMessage.success(`已解除 ${result.count} 条告警静默`);
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function escalateAlarm(row: AlarmRow) {
  if (!row.canEscalate) return;
  submitting.value = true;
  try {
    const updated = await postMock<AlarmRow>(`/alarms/${row.id}/escalations`, {
      operator: "告警值班",
      remark: row.isSlaOverdue
        ? `${row.alarmNo} 已超出响应时限，升级给 ${row.escalationTarget || "下一处理人"}。`
        : `${row.alarmNo} 主动升级给 ${row.escalationTarget || "下一处理人"}。`,
      receiverName: row.escalationTarget,
    });
    updateAlarm(updated);
    selectedAlarm.value =
      selectedAlarm.value?.id === updated.id ? updated : selectedAlarm.value;
    await loadAlarmStats();
    ElMessage.success("告警已升级并生成提醒");
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function batchEscalate() {
  const ids = selectedEscalatableRows.value.map((row) => row.id);
  if (!ids.length) {
    ElMessage.warning("请选择已超时且未关闭的告警");
    return;
  }
  submitting.value = true;
  try {
    const result = await postMock<{ count: number; updated: AlarmRow[] }>(
      "/alarms/batch/escalations",
      {
        ids,
        operator: "告警值班",
        remark: `批量升级 ${ids.length} 条 SLA 超时告警。`,
      },
    );
    result.updated.forEach(updateAlarm);
    selectedAlarm.value =
      result.updated.find((item) => item.id === selectedAlarm.value?.id) ??
      selectedAlarm.value;
    await loadAlarmStats();
    ElMessage.success(`已升级 ${result.count} 条告警`);
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

async function acknowledgePush(push: PushRow) {
  if (!selectedAlarm.value) return;
  submitting.value = true;
  try {
    const updated = await patchMock<AlarmRow>(
      `/alarms/${selectedAlarm.value.id}/pushes/${push.id}/ack`,
      {
        operator: "值班人员",
        remark: "已确认接收告警通知。",
      },
    );
    updateAlarm(updated);
    selectedAlarm.value = updated;
    await loadAlarmStats();
    ElMessage.success("推送接收状态已确认");
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function updateAlarm(alarm: AlarmRow) {
  const index = rows.value.findIndex((item) => item.id === alarm.id);
  if (index >= 0) {
    rows.value.splice(index, 1, alarm);
  } else {
    rows.value.unshift(alarm);
  }
}

function handleSelectionChange(selection: AlarmRow[]) {
  selectedRows.value = selection;
}

function handleQuery() {
  query.pageNum = 1;
  loadAlarms();
}

function resetQuery() {
  query.alarmIndex = "";
  query.level = "";
  query.status = "";
  query.silenceStatus = "";
  query.keyword = "";
  dateRange.value = [];
  query.pageNum = 1;
  loadAlarms();
}

function rowClassName({ row }: { row: AlarmRow }) {
  if (row.isSilenced) return "silenced-row";
  if (row.level === "SEVERE" && row.canProcess) return "severe-row";
  if (row.status === "RESOLVED") return "resolved-row";
  return "";
}

function levelClass(level: AlarmLevel) {
  return {
    severe: level === "SEVERE",
    warning: level === "WARNING",
    info: level === "INFO",
  };
}

function statusClass(status: AlarmStatus) {
  return {
    pending: status === "PENDING",
    processing: status === "PROCESSING",
    resolved: status === "RESOLVED",
    false: status === "FALSE_ALARM",
  };
}

function slaClass(status: AlarmRow["slaStatus"]) {
  return {
    normal: status === "normal",
    overdue: status === "overdue",
    closed: status === "closed",
    silenced: status === "silenced",
  };
}

function slaStatusLabel(status: AlarmRow["slaStatus"]) {
  return (
    {
      normal: "时限内",
      overdue: "已超时",
      closed: "已关闭",
      silenced: "静默中",
    }[status] ?? status
  );
}

function metricText(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) return "--";
  return `${value}${unit}`;
}

function pushTypeLabel(value: PushType) {
  return (
    {
      mp: "公众号",
      sms: "短信",
      phone: "电话",
    }[value] ?? value
  );
}

function sendStatusLabel(value: SendStatus) {
  return (
    {
      success: "成功",
      failed: "失败",
      sending: "发送中",
    }[value] ?? value
  );
}

function receiveStatusLabel(value: ReceiveStatus) {
  return (
    {
      answered: "已接收",
      unanswered: "未接收",
      unread: "未读",
    }[value] ?? value
  );
}

function toTime(value: string) {
  return new Date(value.replace(" ", "T")).getTime();
}

function exportCsv() {
  const headers = [
    "告警编号",
    "等级",
    "状态",
    "告警类型",
    "BT码",
    "客户/仓库",
    "订单号",
    "来源平台",
    "告警时间",
    "持续时长",
    "SLA状态",
    "下次升级时间",
    "静默截止",
    "静默原因",
    "报修单",
  ];
  const body = filteredRows.value.map((row) => [
    row.alarmNo,
    row.levelLabel,
    row.statusLabel,
    row.type,
    row.btCode,
    row.customerName,
    row.orderNo || "内部/库存",
    row.sourcePlatform,
    row.alarmTime,
    row.duration,
    slaStatusLabel(row.slaStatus),
    row.nextEscalationDueAt || row.slaDueAt || "",
    row.silenceUntil || "",
    row.silenceReason || "",
    row.repairNo || "",
  ]);
  const csv = [headers, ...body]
    .map((line) =>
      line
        .map((item) => `"${String(item ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `告警记录_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message ?? "操作失败，请稍后重试"
  );
}

onMounted(loadAlarms);
</script>

<style scoped>
.alarm-page {
  height: calc(100vh - 70px);
  min-height: 720px;
  display: flex;
  flex-direction: column;
  color: #20243d;
  background: #f4f5f7;
  overflow: hidden;
}

.alarm-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  padding: 0 0 12px;
}

.alarm-kpi {
  min-height: 86px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
}

.alarm-kpi span,
.alarm-kpi em {
  display: block;
  color: #747c92;
  font-size: 12px;
  font-style: normal;
}

.alarm-kpi strong {
  display: block;
  margin: 6px 0 4px;
  color: #3455ff;
  font-size: 28px;
  line-height: 32px;
}

.alarm-kpi.danger strong {
  color: #ff385c;
}

.alarm-kpi.warning strong {
  color: #f59a23;
}

.alarm-kpi.success strong {
  color: #42bf79;
}

.alarm-kpi.notice strong {
  color: #7a5cff;
}

.alarm-kpi.overdue strong {
  color: #d63a3a;
}

.alarm-kpi.silent strong {
  color: #5f6472;
}

.alarm-toolbar {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
}

.alarm-batchbar {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid #cdd7ff;
  border-radius: 8px;
  background: #f4f7ff;
  color: #3c4864;
  font-size: 13px;
}

.alarm-batchbar div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  flex-wrap: wrap;
}

.toolbar-left :deep(.el-select) {
  width: 124px;
}

.toolbar-left :deep(.el-date-editor) {
  width: 340px;
}

.toolbar-left :deep(.el-input) {
  width: 240px;
}

.alarm-table-wrap {
  min-height: 0;
  flex: 1;
  margin-top: 12px;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.alarm-table {
  width: 100%;
}

.alarm-table :deep(th.el-table__cell) {
  background: #f8f9fc;
  color: #687086;
  font-weight: 500;
}

.alarm-table :deep(.severe-row td) {
  background: #fff8f8;
}

.alarm-table :deep(.resolved-row td) {
  background: #fbfcff;
}

.alarm-table :deep(.silenced-row td) {
  background: #faf7f0;
}

.alarm-level,
.alarm-status,
.push-count,
.repair-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 23px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.alarm-level.severe {
  color: #ff385c;
  border-color: #ffb8c5;
  background: #fff1f3;
}

.alarm-level.warning {
  color: #d88418;
  border-color: #f5d29a;
  background: #fff7e8;
}

.alarm-level.info {
  color: #335fff;
  border-color: #b7c6ff;
  background: #eef2ff;
}

.alarm-status.pending {
  color: #d88418;
  background: #fff7e8;
}

.alarm-status.processing {
  color: #335fff;
  background: #eef2ff;
}

.alarm-status.resolved {
  color: #25a45a;
  background: #e9f8ef;
}

.alarm-status.false {
  color: #7d8493;
  background: #f1f2f5;
}

.push-count {
  color: #335fff;
  background: #eef2ff;
}

.sla-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sla-cell small {
  color: #7c8494;
  font-size: 11px;
  white-space: nowrap;
}

.sla-tag {
  width: fit-content;
  min-width: 54px;
  height: 23px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
}

.sla-tag.normal {
  color: #2461d6;
  background: #eef4ff;
}

.sla-tag.overdue {
  color: #c93131;
  background: #fff0f0;
}

.sla-tag.closed {
  color: #6f7787;
  background: #f1f2f5;
}

.sla-tag.silenced {
  color: #776032;
  background: #fff5df;
}

.silence-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.silence-cell small {
  color: #7c8494;
  font-size: 11px;
  white-space: nowrap;
}

.silence-tag {
  width: fit-content;
  min-width: 54px;
  height: 23px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 4px;
  color: #776032;
  background: #fff5df;
  font-size: 12px;
}

.repair-link {
  color: #25a45a;
  background: #e9f8ef;
}

.muted {
  color: #8a91a2;
}

.pagination-line {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 4px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8ebf2;
}

.detail-head strong,
.detail-head span {
  display: block;
}

.detail-head strong {
  font-size: 22px;
  line-height: 30px;
}

.detail-head > div:first-child span {
  margin-top: 4px;
  color: #747c92;
}

.detail-tags {
  display: flex;
  gap: 8px;
}

.device-card {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fbfcff;
}

.battery-meter {
  width: 86px;
  height: 132px;
  display: flex;
  align-items: flex-end;
  padding: 6px;
  border: 2px solid #cfd5df;
  border-radius: 22px;
  background: #fff;
}

.battery-fill {
  width: 100%;
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(180deg, #11e4d0, #0ccf86);
  color: #142f3b;
  font-weight: 700;
}

.device-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.device-info div,
.description-box div {
  min-width: 0;
}

.device-info span,
.description-box span,
.section-title span {
  display: block;
  color: #747c92;
  font-size: 12px;
}

.device-info strong,
.description-box strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #20243d;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.detail-section {
  margin-top: 18px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-title strong {
  font-size: 15px;
}

.description-box {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fff;
}

.description-box p {
  grid-column: 1 / -1;
  margin: 0;
  color: #3d455c;
  line-height: 1.8;
}

.policy-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  background: #fff;
}

.policy-grid span {
  display: block;
  color: #747c92;
  font-size: 12px;
}

.policy-grid strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #20243d;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.policy-grid strong.danger {
  color: #d63a3a;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.silence-duration-group {
  margin-right: 10px;
}

.silence-duration-input {
  width: 132px;
}

.alarm-timeline {
  padding: 4px 6px 0;
}

.timeline-card {
  border: 1px solid #e8ebf2;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fbfcff;
}

.timeline-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-card span {
  color: #335fff;
  font-size: 12px;
}

.timeline-card p {
  margin: 8px 0 4px;
  color: #30364d;
}

.timeline-card em {
  color: #747c92;
  font-style: normal;
}

.push-table :deep(th.el-table__cell) {
  background: #f8f9fc;
  color: #687086;
  font-weight: 500;
}

.alarm-detail-drawer :deep(.el-drawer__body) {
  padding-top: 8px;
}

.rule-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #687086;
  font-size: 13px;
}

.rule-table :deep(th.el-table__cell) {
  background: #f8f9fc;
  color: #687086;
  font-weight: 500;
}

.channel-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0 10px;
}

@media (max-width: 1180px) {
  .alarm-page {
    height: auto;
    min-height: calc(100vh - 70px);
    overflow: visible;
  }

  .alarm-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .alarm-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .alarm-batchbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-left :deep(.el-date-editor),
  .toolbar-left :deep(.el-input) {
    width: 100%;
  }

  .alarm-table-wrap {
    min-height: 620px;
  }
}

@media (max-width: 720px) {
  .alarm-kpis,
  .device-card,
  .device-info,
  .description-box,
  .policy-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-left,
  .toolbar-right,
  .toolbar-left :deep(.el-select),
  .toolbar-left :deep(.el-input),
  .toolbar-left :deep(.el-date-editor),
  .toolbar-right .el-button {
    width: 100%;
  }
}
</style>
