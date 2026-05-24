<template>
  <div class="system-page">
    <div class="page-title system-title">
      <div>
        <h1>系统管理</h1>
        <p>统一维护账号、权限、状态字典、第三方接口、审批配置和操作审计</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadSystem()">刷新</el-button>
        <el-button :icon="Download" @click="exportSystemSnapshot">导出配置</el-button>
        <el-button :icon="Refresh" :loading="snapshotImporting" @click="importSystemSnapshot">恢复配置</el-button>
        <el-button :icon="Document" @click="runDeliveryCheck">一键交付检查</el-button>
        <el-button :icon="Download" @click="exportAcceptanceChecklist">导出验收清单</el-button>
        <el-button :icon="Download" @click="exportAudit">导出审计</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateAccount()">新增账号</el-button>
      </div>
    </div>

    <div class="system-stats">
      <div v-for="metric in metrics" :key="metric.label" class="system-stat" :class="metric.tone">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <em>{{ metric.hint }}</em>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="system-tabs">
      <el-tab-pane label="总览" name="overview">
        <div class="overview-grid">
          <section class="system-panel panel-wide delivery-panel">
            <div class="panel-head">
              <div>
                <h3>交付健康度</h3>
                <p>上线前对账号、权限、接口、审批、审计、备份和参数风险做集中检查</p>
              </div>
              <div class="delivery-score" :class="{ pass: deliveryScore >= 95 }">
                <strong>{{ deliveryScore }}%</strong>
                <span>{{ deliveryScore >= 95 ? "达到交付线" : "需补齐" }}</span>
              </div>
            </div>
            <div class="delivery-check-grid">
              <div v-for="item in deliveryChecks" :key="item.label" :class="{ done: item.done }">
                <el-icon><CircleCheck /></el-icon>
                <strong>{{ item.label }}</strong>
                <span>{{ item.value }}</span>
                <em>{{ item.suggestion }}</em>
              </div>
            </div>
            <div class="delivery-actions">
              <el-button type="primary" :icon="Document" @click="runDeliveryCheck">重新检查</el-button>
              <el-button :icon="Download" @click="exportAcceptanceChecklist">导出系统验收清单</el-button>
            </div>
          </section>

          <section class="system-panel panel-wide">
            <div class="panel-head">
              <div>
                <h3>接口运行状态</h3>
                <p>第三方电池平台、定位和通知接口的最近同步结果</p>
              </div>
              <el-button :icon="Connection" @click="testAllEnabledInterfaces">批量测试</el-button>
            </div>
            <div class="interface-list">
              <div v-for="item in systemData.interfaces" :key="item.id" class="interface-row">
                <div class="interface-main">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.platform }} · {{ item.syncInterval }} · {{ item.owner }}</span>
                </div>
                <el-tag :type="interfaceStatusType(item.status)">{{ interfaceStatusLabel(item.status) }}</el-tag>
                <span class="last-result">{{ item.lastResult }}</span>
              </div>
            </div>
          </section>

          <section class="system-panel">
            <div class="panel-head compact">
              <h3>审批配置</h3>
              <el-tag type="success">{{ systemData.stats.enabledApprovalFlowCount }} 条启用</el-tag>
            </div>
            <div class="flow-list">
              <div v-for="flow in systemData.approvalFlows" :key="flow.id" class="flow-item">
                <strong>{{ flow.name }}</strong>
                <span>{{ flow.businessType }} · {{ flow.nodeCount }} 个节点 · {{ flow.slaHours }}小时</span>
                <small>{{ flow.approvers.join(" / ") }}</small>
              </div>
            </div>
          </section>

          <section class="system-panel">
            <div class="panel-head compact">
              <h3>风险提醒</h3>
              <el-tag :type="systemData.stats.interfaceErrorCount ? 'danger' : 'success'">
                {{ systemData.stats.interfaceErrorCount ? "需处理" : "正常" }}
              </el-tag>
            </div>
            <div class="risk-list">
              <div class="risk-item danger" v-if="systemData.stats.interfaceErrorCount">
                <el-icon><Warning /></el-icon>
                <span>{{ systemData.stats.interfaceErrorCount }} 个接口最近同步异常，请先处理鉴权或网络配置。</span>
              </div>
              <div class="risk-item warning" v-if="systemData.stats.disabledAccountCount">
                <el-icon><Lock /></el-icon>
                <span>{{ systemData.stats.disabledAccountCount }} 个账号处于停用状态，交接前确认是否需要释放角色。</span>
              </div>
              <div class="risk-item">
                <el-icon><Document /></el-icon>
                <span>账单调整、回款登记、出入库和权限变更均需要保留操作日志。</span>
              </div>
            </div>
          </section>

          <section class="system-panel">
            <div class="panel-head compact">
              <h3>配置快照</h3>
              <el-tag type="success">本地持久化</el-tag>
            </div>
            <div class="snapshot-summary">
              <span>账号 {{ systemData.stats.accountTotal }}</span>
              <span>角色 {{ systemData.stats.roleCount }}</span>
              <span>参数 {{ systemData.stats.parameterCount }}</span>
              <span>日志 {{ systemData.stats.auditLogCount }}</span>
            </div>
            <div class="snapshot-actions">
              <el-button :icon="Download" @click="exportSystemSnapshot">导出配置</el-button>
              <el-button :icon="Refresh" :loading="snapshotImporting" @click="importSystemSnapshot">恢复配置</el-button>
              <el-button :icon="Setting" @click="resetSystemDefaults">恢复默认</el-button>
            </div>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane label="账号管理" name="accounts">
        <section class="system-panel">
          <div class="table-toolbar">
            <el-input v-model="accountKeyword" clearable placeholder="搜索账号、姓名、客户或手机号" :prefix-icon="Search" />
            <el-select v-model="accountTypeFilter" clearable placeholder="账号类型">
              <el-option label="内部账号" value="INTERNAL" />
              <el-option label="客户账号" value="CUSTOMER" />
            </el-select>
            <el-select v-model="accountStatusFilter" clearable placeholder="账号状态">
              <el-option label="启用" value="ENABLED" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
            <el-button type="primary" :icon="Plus" @click="openCreateAccount()">新增账号</el-button>
          </div>

          <el-table v-loading="loading" :data="filteredAccounts" border height="520">
            <el-table-column type="index" label="序号" width="70" align="center" />
            <el-table-column label="账号类型" width="110">
              <template #default="{ row }">
                <el-tag :type="accountTypeTag(row.type)">{{ accountTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="username" label="登录账号" min-width="130" />
            <el-table-column prop="name" label="姓名" width="110" />
            <el-table-column prop="roleName" label="角色" width="130" />
            <el-table-column label="归属" min-width="180">
              <template #default="{ row }">{{ accountOwner(row) }}</template>
            </el-table-column>
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.status === 'ENABLED'"
                  inline-prompt
                  active-text="启"
                  inactive-text="停"
                  @change="toggleAccount(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="lastLoginAt" label="最近登录" min-width="150" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" :icon="Edit" @click="openEditAccount(row)">编辑</el-button>
                <el-button text type="primary" :icon="Lock" @click="resetPassword(row)">重置</el-button>
                <el-button text type="danger" :icon="DeleteIcon" @click="deleteAccount(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="角色权限" name="roles">
        <div class="role-toolbar">
          <div>
            <strong>角色建模</strong>
            <span>按内部后台和客户移动端分权，支持从现有角色复制后微调权限。</span>
          </div>
          <el-button type="primary" :icon="Plus" @click="openCreateRoleDialog()">新增角色</el-button>
        </div>
        <div class="role-grid">
          <article v-for="role in systemData.roles" :key="role.id" class="role-card">
            <div class="role-head">
              <div>
                <h3>{{ role.name }}</h3>
                <span>{{ role.scope }} · {{ role.dataScope }}</span>
              </div>
              <el-tag :type="role.scope === '内部后台' ? 'primary' : 'success'">{{ role.userCount }} 人</el-tag>
            </div>
            <p>{{ role.description }}</p>
            <div class="permission-tags">
              <el-tag v-for="item in role.permissionSummary" :key="item" effect="plain">{{ item }}</el-tag>
            </div>
            <div class="permission-matrix">
              <span
                v-for="permission in role.permissions"
                :key="permission.code"
                :class="{ disabled: !permission.enabled, sensitive: permission.sensitive }"
              >
                {{ permission.name }}
              </span>
            </div>
            <div class="role-risks">
              <span v-for="note in role.riskNotes" :key="note">{{ note }}</span>
            </div>
            <div class="role-card-actions">
              <el-button :icon="Setting" @click="openRoleDialog(role)">配置</el-button>
              <el-button :icon="Document" @click="openCreateRoleDialog(role)">复制</el-button>
              <el-button
                :icon="DeleteIcon"
                type="danger"
                :disabled="role.userCount > 0"
                @click="deleteRole(role)"
              >
                删除
              </el-button>
            </div>
          </article>
        </div>
      </el-tab-pane>

      <el-tab-pane label="状态字典" name="dictionaries">
        <div class="dictionary-layout">
          <aside class="dictionary-nav">
            <button
              v-for="group in systemData.dictionaries"
              :key="group.code"
              :class="{ active: activeDictionaryCode === group.code }"
              @click="activeDictionaryCode = group.code"
            >
              <strong>{{ group.name }}</strong>
              <span>{{ group.items.length }} 项 · {{ group.owner }}</span>
            </button>
          </aside>

          <section v-if="selectedDictionary" class="system-panel dictionary-panel">
            <div class="panel-head">
              <div>
                <h3>{{ selectedDictionary.name }}</h3>
                <p>{{ selectedDictionary.owner }}维护 · 最近更新 {{ selectedDictionary.updatedAt }}</p>
              </div>
              <el-tag>{{ selectedDictionary.code }}</el-tag>
            </div>
            <el-table :data="selectedDictionary.items" border height="430">
              <el-table-column prop="code" label="编码" width="150" />
              <el-table-column prop="label" label="显示名称" width="140" />
              <el-table-column prop="businessRule" label="业务规则" min-width="260" show-overflow-tooltip />
              <el-table-column prop="usedBy" label="使用模块" width="180" />
              <el-table-column label="启用" width="100" align="center">
                <template #default="{ row }">
                  <el-switch :model-value="row.enabled" @change="updateDictionaryEnabled(row, Boolean($event))" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="110" fixed="right">
                <template #default="{ row }">
                  <el-button text type="primary" :icon="Edit" @click="openDictionaryDialog(row)">编辑</el-button>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane label="接口配置" name="interfaces">
        <section class="system-panel">
          <el-table :data="systemData.interfaces" border height="520">
            <el-table-column prop="name" label="接口名称" min-width="170" />
            <el-table-column prop="platform" label="平台" width="150" />
            <el-table-column prop="endpoint" label="接口地址" min-width="260" show-overflow-tooltip />
            <el-table-column prop="requestMethod" label="方式" width="80" align="center" />
            <el-table-column prop="syncInterval" label="同步频率" width="110" />
            <el-table-column prop="authMode" label="鉴权方式" width="120" />
            <el-table-column label="凭据" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.credentialConfigured ? 'success' : 'warning'">
                  {{ row.credentialConfigured ? "已配置" : "未配置" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="超时" width="100" align="right">
              <template #default="{ row }">{{ row.timeoutMs }}ms</template>
            </el-table-column>
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" @change="toggleInterface(row, Boolean($event))" />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="interfaceStatusType(row.status)">{{ interfaceStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastSyncAt" label="最近同步" width="150" />
            <el-table-column prop="lastResult" label="最近结果" min-width="220" show-overflow-tooltip />
            <el-table-column prop="owner" label="负责人" width="120" />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button
                  text
                  type="primary"
                  :icon="Connection"
                  :loading="testingInterfaceId === row.id"
                  @click="testInterface(row)"
                >
                  测试连接
                </el-button>
                <el-button text type="primary" :icon="Edit" @click="openInterfaceDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="审批流程" name="flows">
        <section class="system-panel">
          <div class="flow-toolbar">
            <div>
              <strong>审批流程配置</strong>
              <span>维护可发起的业务审批流，支持从《延成公司业务流程》表单模板带入节点。</span>
            </div>
            <el-button type="primary" :icon="Plus" @click="openCreateFlow()">新增审批流程</el-button>
          </div>
          <el-table :data="systemData.approvalFlows" border height="520">
            <el-table-column prop="name" label="流程名称" min-width="170" />
            <el-table-column prop="businessType" label="业务类型" width="130" />
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }">
                <el-switch :model-value="row.enabled" @change="toggleFlow(row, Boolean($event))" />
              </template>
            </el-table-column>
            <el-table-column prop="nodeCount" label="节点数" width="90" align="right" />
            <el-table-column label="审批时限" width="110" align="right">
              <template #default="{ row }">{{ row.slaHours }}小时</template>
            </el-table-column>
            <el-table-column label="节点配置" min-width="320" show-overflow-tooltip>
              <template #default="{ row }">{{ row.approvers.join(" / ") }}</template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="最近更新" width="150" />
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" :icon="Edit" @click="openFlowDialog(row)">编辑流程</el-button>
                <el-button text type="danger" @click="deleteFlow(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="系统参数" name="parameters">
        <section class="system-panel">
          <el-table :data="systemData.parameters" border height="520">
            <el-table-column prop="name" label="参数名称" min-width="170" />
            <el-table-column prop="code" label="参数编码" width="180" />
            <el-table-column prop="module" label="业务模块" width="130" />
            <el-table-column label="当前值" width="130">
              <template #default="{ row }">{{ parameterValueText(row) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="280" show-overflow-tooltip />
            <el-table-column label="风险等级" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="parameterRiskType(row.riskLevel)">{{ row.riskLevel }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="最近更新" width="150" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" :icon="Edit" @click="openParameterDialog(row)">修改</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="操作日志" name="audit">
        <section class="system-panel">
          <div class="table-toolbar audit-toolbar">
            <el-select v-model="auditModuleFilter" clearable placeholder="操作模块">
              <el-option v-for="module in auditModules" :key="module" :label="module" :value="module" />
            </el-select>
            <el-select v-model="auditResultFilter" clearable placeholder="操作结果">
              <el-option label="成功" value="成功" />
              <el-option label="失败" value="失败" />
            </el-select>
            <el-button :icon="Download" @click="exportAudit">导出当前日志</el-button>
          </div>

          <el-table :data="filteredLogs" border height="520">
            <el-table-column prop="createdAt" label="时间" width="155" />
            <el-table-column prop="module" label="模块" width="120" />
            <el-table-column prop="action" label="动作" width="120" />
            <el-table-column prop="operator" label="操作人" width="110" />
            <el-table-column prop="target" label="对象" min-width="170" show-overflow-tooltip />
            <el-table-column label="结果" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.result === '成功' ? 'success' : 'danger'">{{ row.result }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP" width="120" />
            <el-table-column prop="detail" label="详情" min-width="240" show-overflow-tooltip />
          </el-table>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="createDialogVisible" :title="accountDialogTitle" width="560px">
      <el-form label-width="92px">
        <el-form-item label="账号类型">
          <el-radio-group v-model="createForm.type" @change="syncCreateRole">
            <el-radio-button label="INTERNAL">内部账号</el-radio-button>
            <el-radio-button label="CUSTOMER">客户账号</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="登录账号">
          <el-input
            v-model="createForm.username"
            :disabled="Boolean(editingAccountId)"
            placeholder="请输入登录账号"
          />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="createForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.roleId" placeholder="请选择角色" class="full-input">
            <el-option v-for="role in createRoleOptions" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="createForm.type === 'INTERNAL'" label="部门">
          <el-input v-model="createForm.department" placeholder="例如：销售部、财务部、资产部" />
        </el-form-item>
        <el-form-item v-else label="所属客户">
          <el-input v-model="createForm.customerName" placeholder="请输入客户公司名称" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="createForm.phone" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :icon="UserFilled" @click="saveAccount">
          {{ editingAccountId ? "保存账号" : "创建账号" }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="passwordVisible" title="临时密码已生成" width="420px">
      <div v-if="passwordResult" class="password-result">
        <span>账号</span>
        <strong>{{ passwordResult.username }}</strong>
        <span>临时密码</span>
        <code>{{ passwordResult.temporaryPassword }}</code>
        <em>{{ passwordResult.expiredAt }}，首次登录后必须修改。</em>
      </div>
      <template #footer>
        <el-button type="primary" @click="passwordVisible = false">我知道了</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dictionaryDialogVisible" title="编辑字典项" width="560px">
      <el-form label-width="92px">
        <el-form-item label="编码">
          <el-input v-model="dictionaryForm.itemCode" disabled />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="dictionaryForm.label" />
        </el-form-item>
        <el-form-item label="业务规则">
          <el-input v-model="dictionaryForm.businessRule" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="dictionaryForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictionaryDialogVisible = false">取消</el-button>
        <el-button type="primary" :icon="Setting" @click="saveDictionary">保存配置</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialogVisible" :title="roleDialogTitle" width="720px">
      <el-form label-width="96px">
        <el-form-item label="角色名称">
          <el-input v-model.trim="roleForm.name" placeholder="例如：区域销售主管" />
        </el-form-item>
        <el-form-item label="角色范围">
          <el-radio-group
            v-model="roleForm.scope"
            :disabled="roleForm.mode === 'edit'"
            @change="changeRoleScope"
          >
            <el-radio-button label="内部后台" />
            <el-radio-button label="客户移动端" />
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="roleForm.mode === 'create'" label="复制模板">
          <el-select v-model="roleForm.templateRoleId" class="full-input" @change="applyRoleTemplate()">
            <el-option
              v-for="role in roleTemplateOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数据范围">
          <el-input v-model.trim="roleForm.dataScope" />
        </el-form-item>
        <el-form-item label="角色说明">
          <el-input v-model.trim="roleForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="风险提示">
          <el-input
            v-model="roleForm.riskNotesText"
            type="textarea"
            :rows="2"
            placeholder="每行一条，会展示在角色卡片上"
          />
        </el-form-item>
        <el-form-item label="权限点">
          <el-checkbox-group v-model="roleForm.permissionCodes" class="role-checks">
            <el-checkbox
              v-for="permission in roleForm.permissions"
              :key="permission.code"
              :label="permission.code"
              border
            >
              {{ permission.name }}
              <small v-if="permission.sensitive">敏感</small>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :icon="Setting" @click="saveRole">
          {{ roleForm.mode === "create" ? "创建角色" : "保存权限" }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="interfaceDialogVisible" title="编辑接口配置" width="640px">
      <el-form label-width="96px">
        <el-form-item label="接口名称">
          <el-input v-model="interfaceForm.name" disabled />
        </el-form-item>
        <el-form-item label="接口地址">
          <el-input v-model="interfaceForm.endpoint" />
        </el-form-item>
        <el-form-item label="请求方式">
          <el-segmented v-model="interfaceForm.requestMethod" :options="['GET', 'POST']" />
        </el-form-item>
        <el-form-item label="同步频率">
          <el-input v-model="interfaceForm.syncInterval" placeholder="例如：5分钟、按需" />
        </el-form-item>
        <el-form-item label="鉴权方式">
          <el-select v-model="interfaceForm.authMode" class="full-input">
            <el-option label="Bearer Token" value="Bearer Token" />
            <el-option label="API Key" value="API Key" />
            <el-option label="AccessKey" value="AccessKey" />
            <el-option label="无鉴权" value="无鉴权" />
          </el-select>
        </el-form-item>
        <el-form-item label="鉴权凭据">
          <el-input
            v-model="interfaceForm.credential"
            type="password"
            show-password
            :placeholder="'留空则保留已有凭据'"
          />
        </el-form-item>
        <el-form-item label="超时时间">
          <el-input-number v-model="interfaceForm.timeoutMs" :min="1000" :step="500" />
          <span class="form-unit">ms</span>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="interfaceForm.owner" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="interfaceForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="interfaceDialogVisible = false">取消</el-button>
        <el-button type="primary" :icon="Connection" @click="saveInterface">保存接口</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="flowDialogVisible" :title="flowDialogTitle" width="680px">
      <el-form label-width="96px">
        <el-form-item v-if="flowMode === 'create'" label="引用模板">
          <el-select
            v-model="flowForm.templateKey"
            clearable
            filterable
            placeholder="可选，从业务流程文档带入节点"
            class="full-input"
            @change="applyFlowTemplate"
          >
            <el-option
              v-for="template in flowTemplateOptions"
              :key="template.key"
              :label="template.label"
              :value="template.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流程名称">
          <el-input v-model="flowForm.name" placeholder="例如：客户退租审批" />
        </el-form-item>
        <el-form-item label="业务类型">
          <el-input v-model="flowForm.businessType" placeholder="例如：租赁管理、采购管理、财务管理" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="flowForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="审批时限">
          <el-input-number v-model="flowForm.slaHours" :min="1" />
          <span class="form-unit">小时</span>
        </el-form-item>
        <el-form-item label="审批节点">
          <el-input
            v-model="flowForm.approverText"
            type="textarea"
            :rows="4"
            placeholder="每行一个审批节点，例如：销售发起"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="flowDialogVisible = false">取消</el-button>
        <el-button type="primary" :icon="Setting" @click="saveFlow">
          {{ flowMode === "create" ? "创建流程" : "保存流程" }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="parameterDialogVisible" title="修改系统参数" width="560px">
      <el-form label-width="96px">
        <el-form-item label="参数名称">
          <el-input v-model="parameterForm.name" disabled />
        </el-form-item>
        <el-form-item label="参数说明">
          <el-input v-model="parameterForm.description" type="textarea" :rows="2" disabled />
        </el-form-item>
        <el-form-item label="参数值">
          <template v-if="parameterForm.valueType === 'boolean'">
            <el-switch v-model="parameterForm.booleanValue" active-text="开启" inactive-text="关闭" />
          </template>
          <template v-else-if="parameterForm.valueType === 'number'">
            <el-input-number v-model="parameterForm.numberValue" :min="0" />
            <span class="form-unit">{{ parameterForm.unit }}</span>
          </template>
          <el-input v-else v-model="parameterForm.stringValue" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="parameterDialogVisible = false">取消</el-button>
        <el-button type="primary" :icon="Setting" @click="saveParameter">保存参数</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  CircleCheck,
  Connection,
  Delete as DeleteIcon,
  Document,
  Download,
  Edit,
  Lock,
  Plus,
  Refresh,
  Search,
  Setting,
  UserFilled,
  Warning,
} from "@element-plus/icons-vue";
import { deleteMock, getMock, patchMock, postMock } from "../api/http";
import { approvalTemplates } from "./approvalTemplates";

type AccountType = "INTERNAL" | "CUSTOMER";
type AccountStatus = "ENABLED" | "DISABLED";
type InterfaceStatus = "ONLINE" | "ERROR" | "DISABLED";

interface SystemStats {
  accountTotal: number;
  enabledAccountCount: number;
  disabledAccountCount: number;
  roleCount: number;
  dictionaryGroupCount: number;
  dictionaryItemCount: number;
  enabledInterfaceCount: number;
  interfaceErrorCount: number;
  enabledApprovalFlowCount: number;
  parameterCount: number;
  auditLogCount: number;
}

interface SystemAccount {
  id: string;
  type: AccountType;
  username: string;
  name: string;
  roleId: string;
  roleName: string;
  department: string;
  customerName: string;
  phone: string;
  status: AccountStatus;
  lastLoginAt: string;
  createdAt: string;
}

interface SystemRole {
  id: string;
  name: string;
  scope: "内部后台" | "客户移动端";
  userCount: number;
  dataScope: string;
  description: string;
  permissionSummary: string[];
  permissions: RolePermission[];
  riskNotes: string[];
}

interface RolePermission {
  code: string;
  name: string;
  module: string;
  enabled: boolean;
  sensitive: boolean;
}

interface DictionaryItem {
  code: string;
  label: string;
  businessRule: string;
  usedBy: string;
  enabled: boolean;
}

interface DictionaryGroup {
  code: string;
  name: string;
  owner: string;
  updatedAt: string;
  items: DictionaryItem[];
}

interface PlatformInterface {
  id: string;
  name: string;
  platform: string;
  endpoint: string;
  requestMethod: "GET" | "POST";
  syncInterval: string;
  owner: string;
  authMode: string;
  credential: string;
  credentialConfigured?: boolean;
  credentialHint?: string;
  timeoutMs: number;
  enabled: boolean;
  status: InterfaceStatus;
  lastSyncAt: string;
  lastResult: string;
  lastLatencyMs?: number;
}

interface ApprovalFlowConfig {
  id: string;
  name: string;
  businessType: string;
  enabled: boolean;
  nodeCount: number;
  approvers: string[];
  slaHours: number;
  updatedAt: string;
}

interface SystemOperationLog {
  id: string;
  module: string;
  action: string;
  operator: string;
  target: string;
  result: "成功" | "失败";
  ip: string;
  createdAt: string;
  detail: string;
}

interface SystemParameter {
  code: string;
  name: string;
  module: string;
  value: number | string | boolean;
  unit: string;
  description: string;
  riskLevel: "低" | "中" | "高";
  updatedAt: string;
}

interface SystemManagementData {
  stats: SystemStats;
  accounts: SystemAccount[];
  roles: SystemRole[];
  dictionaries: DictionaryGroup[];
  interfaces: PlatformInterface[];
  approvalFlows: ApprovalFlowConfig[];
  parameters: SystemParameter[];
  operationLogs: SystemOperationLog[];
}

interface SystemConfigSnapshot {
  version: number;
  exportedAt: string;
  accounts: SystemAccount[];
  roles: SystemRole[];
  dictionaries: DictionaryGroup[];
  interfaces: PlatformInterface[];
  approvalFlows: ApprovalFlowConfig[];
  parameters: SystemParameter[];
  operationLogs: SystemOperationLog[];
}

interface PasswordResetResult {
  accountId: string;
  username: string;
  temporaryPassword: string;
  expiredAt: string;
}

const emptyStats: SystemStats = {
  accountTotal: 0,
  enabledAccountCount: 0,
  disabledAccountCount: 0,
  roleCount: 0,
  dictionaryGroupCount: 0,
  dictionaryItemCount: 0,
  enabledInterfaceCount: 0,
  interfaceErrorCount: 0,
  enabledApprovalFlowCount: 0,
  parameterCount: 0,
  auditLogCount: 0,
};

const systemData = ref<SystemManagementData>({
  stats: emptyStats,
  accounts: [],
  roles: [],
  dictionaries: [],
  interfaces: [],
  approvalFlows: [],
  parameters: [],
  operationLogs: [],
});

const loading = ref(false);
const activeTab = ref("overview");
const accountKeyword = ref("");
const accountTypeFilter = ref<AccountType | "">("");
const accountStatusFilter = ref<AccountStatus | "">("");
const activeDictionaryCode = ref("ASSET_STATUS");
const auditModuleFilter = ref("");
const auditResultFilter = ref<"成功" | "失败" | "">("");
const testingInterfaceId = ref("");
const snapshotImporting = ref(false);
const createDialogVisible = ref(false);
const editingAccountId = ref("");
const passwordVisible = ref(false);
const dictionaryDialogVisible = ref(false);
const roleDialogVisible = ref(false);
const interfaceDialogVisible = ref(false);
const flowDialogVisible = ref(false);
const flowMode = ref<"create" | "edit">("edit");
const parameterDialogVisible = ref(false);
const passwordResult = ref<PasswordResetResult | null>(null);

const createForm = ref({
  type: "INTERNAL" as AccountType,
  username: "",
  name: "",
  roleId: "",
  department: "",
  customerName: "",
  phone: "",
});

const dictionaryForm = ref({
  groupCode: "",
  itemCode: "",
  label: "",
  businessRule: "",
  enabled: true,
});

const roleForm = ref({
  mode: "edit" as "create" | "edit",
  id: "",
  name: "",
  scope: "内部后台" as SystemRole["scope"],
  templateRoleId: "",
  dataScope: "",
  description: "",
  riskNotesText: "",
  permissionCodes: [] as string[],
  permissions: [] as RolePermission[],
});

const interfaceForm = ref({
  id: "",
  name: "",
  endpoint: "",
  requestMethod: "GET" as "GET" | "POST",
  syncInterval: "",
  authMode: "Bearer Token",
  credential: "",
  timeoutMs: 5000,
  owner: "",
  enabled: true,
});

const flowForm = ref({
  id: "",
  templateKey: "",
  name: "",
  businessType: "",
  enabled: true,
  slaHours: 1,
  approverText: "",
});

const parameterForm = ref({
  code: "",
  name: "",
  description: "",
  unit: "",
  valueType: "number" as "number" | "string" | "boolean",
  numberValue: 0,
  stringValue: "",
  booleanValue: false,
});

const metrics = computed(() => [
  {
    label: "账号总数",
    value: systemData.value.stats.accountTotal,
    hint: `${systemData.value.stats.enabledAccountCount} 启用 / ${systemData.value.stats.disabledAccountCount} 停用`,
    tone: "blue",
  },
  {
    label: "角色权限",
    value: systemData.value.stats.roleCount,
    hint: "内部与客户端分权",
    tone: "green",
  },
  {
    label: "状态字典",
    value: systemData.value.stats.dictionaryItemCount,
    hint: `${systemData.value.stats.dictionaryGroupCount} 个分组`,
    tone: "orange",
  },
  {
    label: "接口配置",
    value: systemData.value.stats.enabledInterfaceCount,
    hint: systemData.value.stats.interfaceErrorCount
      ? `${systemData.value.stats.interfaceErrorCount} 个异常`
      : "全部正常",
    tone: systemData.value.stats.interfaceErrorCount ? "red" : "green",
  },
  {
    label: "系统参数",
    value: systemData.value.stats.parameterCount,
    hint: "业务规则可配置",
    tone: "blue",
  },
  {
    label: "操作日志",
    value: systemData.value.stats.auditLogCount,
    hint: "关键操作可追溯",
    tone: "purple",
  },
]);

const deliveryChecks = computed(() => {
  const enabledAccounts = systemData.value.accounts.filter((account) => account.status === "ENABLED").length;
  const sensitiveRoles = systemData.value.roles.filter((role) =>
    role.permissions.some((permission) => permission.enabled && permission.sensitive),
  ).length;
  const configuredInterfaces = systemData.value.interfaces.filter(
    (item) => item.enabled && item.credentialConfigured !== false && item.status !== "ERROR",
  ).length;
  const enabledFlows = systemData.value.approvalFlows.filter((flow) => flow.enabled).length;
  const highRiskParameters = systemData.value.parameters.filter((item) => item.riskLevel === "高").length;

  return [
    {
      label: "账号启用",
      value: `${enabledAccounts}/${systemData.value.accounts.length} 个账号可用`,
      done: enabledAccounts > 0 && systemData.value.stats.disabledAccountCount <= enabledAccounts,
      suggestion: "交付前停用离职/测试账号，保留管理员和业务岗位账号。",
    },
    {
      label: "角色权限",
      value: `${systemData.value.roles.length} 个角色 / ${sensitiveRoles} 个含敏感权限`,
      done: systemData.value.roles.length >= 4 && sensitiveRoles > 0,
      suggestion: "按最小权限保留销售、资产、财务、售后、客户管理员等岗位。",
    },
    {
      label: "接口凭据",
      value: `${configuredInterfaces}/${systemData.value.interfaces.filter((item) => item.enabled).length} 个启用接口正常`,
      done: systemData.value.stats.enabledInterfaceCount > 0 && systemData.value.stats.interfaceErrorCount === 0,
      suggestion: "设备平台、通知、定位等接口需完成鉴权、超时和负责人配置。",
    },
    {
      label: "审批流程",
      value: `${enabledFlows} 条流程启用`,
      done: enabledFlows >= 4,
      suggestion: "至少覆盖合同、出库、退款、报废、维修费用等关键流程。",
    },
    {
      label: "审计日志",
      value: `${systemData.value.operationLogs.length} 条记录`,
      done: systemData.value.operationLogs.length > 0,
      suggestion: "账号、权限、账单、接口和审批变更必须可追溯。",
    },
    {
      label: "配置快照",
      value: `${systemData.value.stats.accountTotal} 账号 / ${systemData.value.stats.parameterCount} 参数可导出`,
      done: systemData.value.stats.accountTotal > 0 && systemData.value.stats.parameterCount > 0,
      suggestion: "上线前导出 JSON 快照，作为回滚和验收附件。",
    },
    {
      label: "参数风险",
      value: `${highRiskParameters} 个高风险参数`,
      done: highRiskParameters <= 2,
      suggestion: "自动收货天数、逾期策略、金额阈值等需由业务负责人确认。",
    },
  ];
});

const deliveryScore = computed(() => {
  if (!deliveryChecks.value.length) return 0;
  const passed = deliveryChecks.value.filter((item) => item.done).length;
  return Math.round((passed / deliveryChecks.value.length) * 100);
});

const filteredAccounts = computed(() => {
  const keyword = accountKeyword.value.trim().toLowerCase();
  return systemData.value.accounts.filter((account) => {
    const text = [
      account.username,
      account.name,
      account.roleName,
      account.department,
      account.customerName,
      account.phone,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!keyword || text.includes(keyword)) &&
      (!accountTypeFilter.value || account.type === accountTypeFilter.value) &&
      (!accountStatusFilter.value || account.status === accountStatusFilter.value)
    );
  });
});

const selectedDictionary = computed(() =>
  systemData.value.dictionaries.find((group) => group.code === activeDictionaryCode.value),
);

const createRoleOptions = computed(() =>
  systemData.value.roles.filter((role) =>
    createForm.value.type === "INTERNAL"
      ? role.scope === "内部后台"
      : role.scope === "客户移动端",
  ),
);

const auditModules = computed(() =>
  Array.from(new Set(systemData.value.operationLogs.map((item) => item.module))),
);

const filteredLogs = computed(() =>
  systemData.value.operationLogs.filter(
    (log) =>
      (!auditModuleFilter.value || log.module === auditModuleFilter.value) &&
      (!auditResultFilter.value || log.result === auditResultFilter.value),
  ),
);

const accountDialogTitle = computed(() =>
  editingAccountId.value ? "编辑账号" : "新增账号",
);

const roleDialogTitle = computed(() =>
  roleForm.value.mode === "create" ? "新增角色" : "配置角色权限",
);

const roleTemplateOptions = computed(() =>
  systemData.value.roles.filter((role) => role.scope === roleForm.value.scope),
);

const flowDialogTitle = computed(() =>
  flowMode.value === "create" ? "新增审批流程" : "编辑审批流程",
);

const flowTemplateOptions = computed(() =>
  approvalTemplates.map((template) => ({
    key: template.key,
    label: `${template.label}｜${template.source}`,
  })),
);

async function loadSystem(showLoading = true) {
  if (showLoading) loading.value = true;
  try {
    systemData.value = await getMock<SystemManagementData>("/system");
    if (
      systemData.value.dictionaries.length &&
      !systemData.value.dictionaries.some((group) => group.code === activeDictionaryCode.value)
    ) {
      activeDictionaryCode.value = systemData.value.dictionaries[0].code;
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "系统管理数据加载失败");
  } finally {
    loading.value = false;
  }
}

function accountTypeLabel(type: AccountType) {
  return type === "INTERNAL" ? "内部账号" : "客户账号";
}

function accountTypeTag(type: AccountType) {
  return type === "INTERNAL" ? "primary" : "success";
}

function accountOwner(account: SystemAccount) {
  return account.type === "INTERNAL" ? account.department : account.customerName;
}

function interfaceStatusLabel(status: InterfaceStatus) {
  return {
    ONLINE: "正常",
    ERROR: "异常",
    DISABLED: "停用",
  }[status];
}

function interfaceStatusType(status: InterfaceStatus) {
  return {
    ONLINE: "success",
    ERROR: "danger",
    DISABLED: "info",
  }[status];
}

function parameterRiskType(riskLevel: SystemParameter["riskLevel"]) {
  return {
    低: "success",
    中: "warning",
    高: "danger",
  }[riskLevel];
}

function parameterValueText(row: SystemParameter) {
  if (typeof row.value === "boolean") {
    return row.value ? "开启" : "关闭";
  }
  return `${row.value}${row.unit}`;
}

function syncCreateRole() {
  if (!createRoleOptions.value.some((role) => role.id === createForm.value.roleId)) {
    createForm.value.roleId = createRoleOptions.value[0]?.id ?? "";
  }
}

function openCreateAccount(type: AccountType = "INTERNAL") {
  editingAccountId.value = "";
  createForm.value = {
    type,
    username: "",
    name: "",
    roleId: "",
    department: type === "INTERNAL" ? "销售部" : "",
    customerName: type === "CUSTOMER" ? "河南示例物流有限公司" : "",
    phone: "",
  };
  syncCreateRole();
  createDialogVisible.value = true;
}

function openEditAccount(row: SystemAccount) {
  editingAccountId.value = row.id;
  createForm.value = {
    type: row.type,
    username: row.username,
    name: row.name,
    roleId: row.roleId,
    department: row.department,
    customerName: row.customerName,
    phone: row.phone,
  };
  syncCreateRole();
  createDialogVisible.value = true;
}

async function saveAccount() {
  if (!createForm.value.username.trim() || !createForm.value.name.trim()) {
    ElMessage.warning("请填写登录账号和姓名");
    return;
  }
  if (createForm.value.type === "CUSTOMER" && !createForm.value.customerName.trim()) {
    ElMessage.warning("客户账号必须填写所属客户");
    return;
  }

  if (editingAccountId.value) {
    await patchMock<SystemAccount>(`/system/accounts/${editingAccountId.value}`, {
      type: createForm.value.type,
      name: createForm.value.name,
      roleId: createForm.value.roleId,
      department: createForm.value.department,
      customerName: createForm.value.customerName,
      phone: createForm.value.phone,
    });
  } else {
    await postMock<SystemAccount>("/system/accounts", createForm.value);
  }
  createDialogVisible.value = false;
  ElMessage.success(editingAccountId.value ? "账号已更新" : "账号已创建");
  await loadSystem(false);
}

async function toggleAccount(row: SystemAccount) {
  await patchMock<SystemAccount>(`/system/accounts/${row.id}/status`, {
    enabled: row.status !== "ENABLED",
  });
  ElMessage.success(`账号已${row.status === "ENABLED" ? "停用" : "启用"}`);
  await loadSystem(false);
}

async function resetPassword(row: SystemAccount) {
  passwordResult.value = await postMock<PasswordResetResult>(
    `/system/accounts/${row.id}/reset-password`,
    {},
  );
  passwordVisible.value = true;
  await loadSystem(false);
}

async function deleteAccount(row: SystemAccount) {
  await ElMessageBox.confirm(
    `确认删除账号“${row.username}”？该账号将不能再登录系统。`,
    "删除账号",
    {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  );
  await deleteMock<{ id: string; username: string; deleted: boolean }>(
    `/system/accounts/${row.id}`,
  );
  ElMessage.success("账号已删除");
  await loadSystem(false);
}

function openRoleDialog(row: SystemRole) {
  roleForm.value = {
    mode: "edit",
    id: row.id,
    name: row.name,
    scope: row.scope,
    templateRoleId: "",
    dataScope: row.dataScope,
    description: row.description,
    riskNotesText: row.riskNotes.join("\n"),
    permissionCodes: row.permissions
      .filter((permission) => permission.enabled)
      .map((permission) => permission.code),
    permissions: row.permissions.map((permission) => ({ ...permission })),
  };
  roleDialogVisible.value = true;
}

function applyRoleTemplate() {
  const template = systemData.value.roles.find(
    (role) => role.id === roleForm.value.templateRoleId,
  );
  if (!template) {
    roleForm.value.permissions = [];
    roleForm.value.permissionCodes = [];
    return;
  }

  roleForm.value.scope = template.scope;
  roleForm.value.dataScope = template.dataScope;
  roleForm.value.description = template.description;
  roleForm.value.riskNotesText = template.riskNotes.join("\n");
  roleForm.value.permissions = template.permissions.map((permission) => ({
    ...permission,
  }));
  roleForm.value.permissionCodes = template.permissions
    .filter((permission) => permission.enabled)
    .map((permission) => permission.code);
}

function changeRoleScope() {
  roleForm.value.templateRoleId = roleTemplateOptions.value[0]?.id ?? "";
  applyRoleTemplate();
}

function openCreateRoleDialog(templateRole?: SystemRole) {
  const template =
    templateRole ??
    systemData.value.roles.find((role) => role.scope === "内部后台") ??
    systemData.value.roles[0];

  roleForm.value = {
    mode: "create",
    id: "",
    name: templateRole ? `${templateRole.name}副本` : "",
    scope: template?.scope ?? "内部后台",
    templateRoleId: template?.id ?? "",
    dataScope: "",
    description: "",
    riskNotesText: "",
    permissionCodes: [],
    permissions: [],
  };
  applyRoleTemplate();
  if (templateRole) roleForm.value.name = `${templateRole.name}副本`;
  roleDialogVisible.value = true;
}

async function saveRole() {
  if (!roleForm.value.name.trim()) {
    ElMessage.warning("请填写角色名称");
    return;
  }
  if (!roleForm.value.dataScope.trim()) {
    ElMessage.warning("请填写数据范围");
    return;
  }
  if (!roleForm.value.description.trim()) {
    ElMessage.warning("请填写角色说明");
    return;
  }

  const riskNotes = roleForm.value.riskNotesText
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const payload = {
    name: roleForm.value.name,
    scope: roleForm.value.scope,
    dataScope: roleForm.value.dataScope,
    description: roleForm.value.description,
    permissionCodes: roleForm.value.permissionCodes,
    copyFromRoleId: roleForm.value.templateRoleId || undefined,
    riskNotes,
  };

  if (roleForm.value.mode === "create") {
    await postMock<SystemRole>("/system/roles", payload);
  } else {
    await patchMock<SystemRole>(`/system/roles/${roleForm.value.id}`, payload);
  }
  roleDialogVisible.value = false;
  ElMessage.success(roleForm.value.mode === "create" ? "角色已创建" : "角色权限已更新");
  await loadSystem(false);
}

async function deleteRole(row: SystemRole) {
  if (row.userCount > 0) {
    ElMessage.warning("该角色已有绑定账号，不能删除");
    return;
  }
  await ElMessageBox.confirm(
    `确认删除角色“${row.name}”？删除后不能再为账号分配该角色。`,
    "删除角色",
    {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  );
  await deleteMock<{ id: string; name: string; deleted: boolean }>(
    `/system/roles/${row.id}`,
  );
  ElMessage.success("角色已删除");
  await loadSystem(false);
}

function openDictionaryDialog(row: DictionaryItem) {
  dictionaryForm.value = {
    groupCode: activeDictionaryCode.value,
    itemCode: row.code,
    label: row.label,
    businessRule: row.businessRule,
    enabled: row.enabled,
  };
  dictionaryDialogVisible.value = true;
}

async function saveDictionary() {
  await patchMock<DictionaryItem>(
    `/system/dictionaries/${dictionaryForm.value.groupCode}/items/${dictionaryForm.value.itemCode}`,
    {
      label: dictionaryForm.value.label,
      businessRule: dictionaryForm.value.businessRule,
      enabled: dictionaryForm.value.enabled,
    },
  );
  dictionaryDialogVisible.value = false;
  ElMessage.success("字典项已更新");
  await loadSystem(false);
}

async function updateDictionaryEnabled(row: DictionaryItem, enabled: boolean) {
  await patchMock<DictionaryItem>(
    `/system/dictionaries/${activeDictionaryCode.value}/items/${row.code}`,
    { enabled },
  );
  ElMessage.success(`字典项已${enabled ? "启用" : "停用"}`);
  await loadSystem(false);
}

async function testInterface(row: PlatformInterface) {
  testingInterfaceId.value = row.id;
  try {
    const result = await postMock<PlatformInterface>(`/system/interfaces/${row.id}/test`, {});
    ElMessage[result.status === "ONLINE" ? "success" : "warning"](result.lastResult);
    await loadSystem(false);
  } finally {
    testingInterfaceId.value = "";
  }
}

function openInterfaceDialog(row: PlatformInterface) {
  interfaceForm.value = {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    requestMethod: row.requestMethod || "GET",
    syncInterval: row.syncInterval,
    authMode: row.authMode,
    credential: "",
    timeoutMs: row.timeoutMs,
    owner: row.owner,
    enabled: row.enabled,
  };
  interfaceDialogVisible.value = true;
}

async function saveInterface() {
  if (!interfaceForm.value.endpoint.trim()) {
    ElMessage.warning("请填写接口地址");
    return;
  }
  await patchMock<PlatformInterface>(`/system/interfaces/${interfaceForm.value.id}`, {
    endpoint: interfaceForm.value.endpoint,
    requestMethod: interfaceForm.value.requestMethod,
    syncInterval: interfaceForm.value.syncInterval,
    authMode: interfaceForm.value.authMode,
    credential: interfaceForm.value.credential || undefined,
    timeoutMs: interfaceForm.value.timeoutMs,
    owner: interfaceForm.value.owner,
    enabled: interfaceForm.value.enabled,
  });
  interfaceDialogVisible.value = false;
  ElMessage.success("接口配置已保存");
  await loadSystem(false);
}

async function toggleInterface(row: PlatformInterface, enabled: boolean) {
  await patchMock<PlatformInterface>(`/system/interfaces/${row.id}`, { enabled });
  ElMessage.success(`${row.name}已${enabled ? "启用" : "停用"}`);
  await loadSystem(false);
}

async function testAllEnabledInterfaces() {
  const targets = systemData.value.interfaces.filter((item) => item.enabled);
  for (const item of targets) {
    await postMock<PlatformInterface>(`/system/interfaces/${item.id}/test`, {});
  }
  ElMessage.success("已完成启用接口的连接测试");
  await loadSystem(false);
}

function inferFlowBusinessType(templateKey: string) {
  if (templateKey.includes("PURCHASE")) return "采购管理";
  if (templateKey.includes("PAYMENT") || templateKey.includes("REIMBURSEMENT") || templateKey.includes("LOAN")) {
    return "财务管理";
  }
  if (templateKey.includes("CONTRACT") || templateKey.includes("SAMPLE")) return "销售管理";
  if (templateKey.includes("OUTBOUND") || templateKey.includes("RETURN") || templateKey.includes("BUYOUT")) {
    return "租赁管理";
  }
  if (templateKey.includes("REPAIR") || templateKey.includes("SCRAP") || templateKey.includes("DISPOSAL")) {
    return "资产管理";
  }
  if (templateKey.includes("SEAL")) return "用印管理";
  if (templateKey.includes("BUSINESS_TRIP") || templateKey.includes("LEAVE")) return "行政人事";
  return "通用审批";
}

function applyFlowTemplate(templateKey: string) {
  const template = approvalTemplates.find((item) => item.key === templateKey);
  if (!template) return;
  flowForm.value.name = template.label;
  flowForm.value.businessType = inferFlowBusinessType(template.key);
  flowForm.value.approverText = template.nodes.map((node) => node.name).join("\n");
}

function openCreateFlow(templateKey = "") {
  flowMode.value = "create";
  flowForm.value = {
    id: "",
    templateKey,
    name: "",
    businessType: "",
    enabled: true,
    slaHours: 24,
    approverText: "发起人提交\n部门负责人审批\n总经理审批",
  };
  if (templateKey) applyFlowTemplate(templateKey);
  flowDialogVisible.value = true;
}

function openFlowDialog(row: ApprovalFlowConfig) {
  flowMode.value = "edit";
  flowForm.value = {
    id: row.id,
    templateKey: "",
    name: row.name,
    businessType: row.businessType,
    enabled: row.enabled,
    slaHours: row.slaHours,
    approverText: row.approvers.join("\n"),
  };
  flowDialogVisible.value = true;
}

async function saveFlow() {
  const approvers = flowForm.value.approverText
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (approvers.length < 2) {
    ElMessage.warning("审批流至少需要两个节点");
    return;
  }
  if (!flowForm.value.name.trim() || !flowForm.value.businessType.trim()) {
    ElMessage.warning("请填写流程名称和业务类型");
    return;
  }
  const payload = {
    name: flowForm.value.name,
    businessType: flowForm.value.businessType,
    enabled: flowForm.value.enabled,
    slaHours: flowForm.value.slaHours,
    approvers,
  };
  if (flowMode.value === "create") {
    await postMock<ApprovalFlowConfig>("/system/approval-flows", payload);
  } else {
    await patchMock<ApprovalFlowConfig>(`/system/approval-flows/${flowForm.value.id}`, payload);
  }
  flowDialogVisible.value = false;
  ElMessage.success(flowMode.value === "create" ? "审批流程已创建" : "审批流程已更新");
  await loadSystem(false);
}

async function toggleFlow(row: ApprovalFlowConfig, enabled: boolean) {
  await patchMock<ApprovalFlowConfig>(`/system/approval-flows/${row.id}`, { enabled });
  ElMessage.success(`${row.name}已${enabled ? "启用" : "停用"}`);
  await loadSystem(false);
}

async function deleteFlow(row: ApprovalFlowConfig) {
  await ElMessageBox.confirm(
    `确认删除“${row.name}”？删除后将不再作为可配置审批流使用。`,
    "删除审批流程",
    {
      confirmButtonText: "确认删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  );
  await deleteMock<{ id: string; deleted: boolean }>(`/system/approval-flows/${row.id}`);
  ElMessage.success("审批流程已删除");
  await loadSystem(false);
}

function openParameterDialog(row: SystemParameter) {
  const valueType = typeof row.value as "number" | "string" | "boolean";
  parameterForm.value = {
    code: row.code,
    name: row.name,
    description: row.description,
    unit: row.unit,
    valueType,
    numberValue: typeof row.value === "number" ? row.value : 0,
    stringValue: typeof row.value === "string" ? row.value : "",
    booleanValue: typeof row.value === "boolean" ? row.value : false,
  };
  parameterDialogVisible.value = true;
}

async function saveParameter() {
  const value =
    parameterForm.value.valueType === "number"
      ? parameterForm.value.numberValue
      : parameterForm.value.valueType === "boolean"
        ? parameterForm.value.booleanValue
        : parameterForm.value.stringValue;
  await patchMock<SystemParameter>(`/system/parameters/${parameterForm.value.code}`, { value });
  parameterDialogVisible.value = false;
  ElMessage.success("系统参数已更新");
  await loadSystem(false);
}

async function exportSystemSnapshot() {
  const snapshot = await getMock<SystemConfigSnapshot>("/system/snapshot");
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yckx-system-config-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  ElMessage.success("系统配置快照已导出");
}

function importSystemSnapshot() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    snapshotImporting.value = true;
    try {
      const snapshot = JSON.parse(await file.text()) as SystemConfigSnapshot;
      await ElMessageBox.confirm(
        `将使用 ${file.name} 覆盖当前账号、角色、字典、接口、审批流、参数和审计日志，是否继续？`,
        "恢复系统配置",
        {
          confirmButtonText: "确认恢复",
          cancelButtonText: "取消",
          type: "warning",
        },
      );
      systemData.value = await postMock<SystemManagementData>("/system/snapshot/restore", snapshot);
      ElMessage.success("系统配置已恢复");
    } catch (error) {
      if (error !== "cancel") {
        ElMessage.error(error instanceof Error ? error.message : "系统配置恢复失败");
      }
    } finally {
      snapshotImporting.value = false;
      input.remove();
    }
  };
  input.click();
}

async function resetSystemDefaults() {
  await ElMessageBox.confirm(
    "将把系统管理中的账号、角色权限、字典、接口、审批流、参数和审计日志恢复为默认配置，是否继续？",
    "恢复默认配置",
    {
      confirmButtonText: "确认恢复",
      cancelButtonText: "取消",
      type: "warning",
    },
  );
  systemData.value = await postMock<SystemManagementData>("/system/snapshot/reset", {});
  ElMessage.success("系统默认配置已恢复");
}

function runDeliveryCheck() {
  const failed = deliveryChecks.value.filter((item) => !item.done);
  if (!failed.length) {
    ElMessage.success(`系统设置交付健康度 ${deliveryScore.value}%，已达到验收线`);
    return;
  }
  ElMessage.warning(
    `系统设置交付健康度 ${deliveryScore.value}%，仍需处理：${failed.map((item) => item.label).join("、")}`,
  );
}

function exportAcceptanceChecklist() {
  const header = ["检查项", "结果", "当前值", "整改建议"];
  const rows = deliveryChecks.value.map((item) => [
    item.label,
    item.done ? "通过" : "需处理",
    item.value,
    item.suggestion,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yckx-system-acceptance-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  ElMessage.success("系统设置验收清单已导出");
}

function exportAudit() {
  const header = ["时间", "模块", "动作", "操作人", "对象", "结果", "IP", "详情"];
  const rows = filteredLogs.value.map((log) => [
    log.createdAt,
    log.module,
    log.action,
    log.operator,
    log.target,
    log.result,
    log.ip,
    log.detail,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `yckx-system-audit-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

onMounted(loadSystem);
</script>

<style scoped>
.system-page {
  min-height: 100%;
}

.system-title p {
  max-width: 720px;
}

.system-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.system-stat {
  min-height: 108px;
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fff;
}

.system-stat span {
  color: var(--ant-text-secondary);
}

.system-stat strong {
  color: #1f2329;
  font-size: 30px;
  line-height: 34px;
}

.system-stat em {
  color: var(--ant-text-tertiary);
  font-size: 12px;
  font-style: normal;
}

.system-stat.blue strong {
  color: #1677ff;
}

.system-stat.green strong {
  color: #389e0d;
}

.system-stat.orange strong {
  color: #d48806;
}

.system-stat.red strong {
  color: #cf1322;
}

.system-stat.purple strong {
  color: #5b4dce;
}

.system-tabs {
  padding: 0 16px 16px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fff;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.system-panel {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fff;
}

.panel-wide {
  grid-row: span 2;
}

.delivery-panel {
  border-color: #dfe5ff;
  background: #fbfcff;
}

.delivery-score {
  min-width: 104px;
  display: grid;
  place-items: center;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #cf1322;
  background: #fff1f0;
}

.delivery-score.pass {
  color: #237804;
  background: #f6ffed;
}

.delivery-score strong {
  font-size: 26px;
  line-height: 30px;
}

.delivery-score span {
  font-size: 12px;
}

.delivery-check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.delivery-check-grid div {
  min-width: 0;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 4px 8px;
  padding: 12px;
  border: 1px solid #eef0f5;
  border-radius: 8px;
  color: #8c6d1f;
  background: #fffbe6;
}

.delivery-check-grid div.done {
  color: #237804;
  background: #f6ffed;
}

.delivery-check-grid strong,
.delivery-check-grid span,
.delivery-check-grid em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delivery-check-grid strong {
  color: #1f2329;
}

.delivery-check-grid span,
.delivery-check-grid em {
  grid-column: 2;
  color: var(--ant-text-secondary);
  font-size: 12px;
  line-height: 1.45;
  font-style: normal;
}

.delivery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head.compact {
  align-items: center;
}

.panel-head h3 {
  margin: 0;
  font-size: 16px;
}

.panel-head p {
  margin: 4px 0 0;
  color: var(--ant-text-secondary);
}

.interface-list,
.flow-list,
.risk-list {
  display: grid;
  gap: 10px;
}

.interface-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 82px minmax(180px, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fafafa;
}

.interface-main {
  min-width: 0;
}

.interface-main strong,
.interface-main span {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.interface-main span,
.last-result {
  color: var(--ant-text-secondary);
  font-size: 13px;
}

.last-result {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.flow-item {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
}

.flow-item span,
.flow-item small {
  color: var(--ant-text-secondary);
}

.flow-item small {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  color: #595959;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
}

.risk-item .el-icon {
  margin-top: 2px;
}

.risk-item.danger {
  color: #a8071a;
  border-color: #ffa39e;
  background: #fff1f0;
}

.risk-item.warning {
  color: #ad6800;
  border-color: #ffe58f;
  background: #fffbe6;
}

.snapshot-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.snapshot-summary span {
  min-height: 36px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: #1f2329;
  border: 1px solid var(--ant-border-light);
  border-radius: 6px;
  background: #fafafa;
  font-size: 13px;
}

.snapshot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.table-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 150px 150px auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.flow-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.flow-toolbar div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.flow-toolbar strong {
  color: #1f2329;
  font-size: 15px;
}

.flow-toolbar span {
  color: var(--ant-text-secondary);
  font-size: 13px;
}

.audit-toolbar {
  grid-template-columns: 180px 160px auto;
  justify-content: start;
}

.role-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fff;
}

.role-toolbar div {
  display: grid;
  gap: 5px;
}

.role-toolbar strong {
  font-size: 16px;
}

.role-toolbar span {
  color: var(--ant-text-secondary);
  font-size: 13px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.role-card {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fff;
}

.role-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.role-head h3 {
  margin: 0 0 6px;
  font-size: 17px;
}

.role-head span,
.role-card p {
  color: var(--ant-text-secondary);
}

.role-card p {
  margin: 0;
  line-height: 1.6;
}

.role-card-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.role-card-actions :deep(.el-button) {
  margin-left: 0;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-risks {
  display: grid;
  gap: 6px;
  margin-top: auto;
}

.role-risks span {
  color: #8c6d1f;
  font-size: 12px;
}

.permission-matrix {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.permission-matrix span {
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 5px 8px;
  color: #0958d9;
  border: 1px solid #91caff;
  border-radius: 4px;
  background: #e6f4ff;
  font-size: 12px;
}

.permission-matrix span.disabled {
  color: #8f959e;
  border-color: #d9d9d9;
  background: #f5f5f5;
}

.permission-matrix span.sensitive:not(.disabled) {
  color: #ad6800;
  border-color: #ffe58f;
  background: #fffbe6;
}

.role-checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.role-checks :deep(.el-checkbox) {
  height: auto;
  min-height: 40px;
  margin-right: 0;
  padding: 8px 12px;
}

.role-checks small {
  margin-left: 6px;
  color: #d48806;
}

.form-unit {
  margin-left: 8px;
  color: var(--ant-text-secondary);
}

.dictionary-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
}

.dictionary-nav {
  display: grid;
  align-content: start;
  gap: 10px;
}

.dictionary-nav button {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 14px;
  text-align: left;
  border: 1px solid var(--ant-border-light);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.dictionary-nav button.active {
  color: #1677ff;
  border-color: #91caff;
  background: #e6f4ff;
}

.dictionary-nav span {
  color: var(--ant-text-secondary);
  font-size: 12px;
}

.dictionary-panel {
  min-height: 520px;
}

.full-input {
  width: 100%;
}

.password-result {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.password-result span {
  color: var(--ant-text-secondary);
}

.password-result code {
  padding: 8px 10px;
  border-radius: 6px;
  background: #f5f7fa;
  font-size: 16px;
  font-weight: 700;
}

.password-result em {
  grid-column: 1 / -1;
  color: var(--ant-text-tertiary);
  font-style: normal;
}

@media (max-width: 1280px) {
  .system-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .role-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .overview-grid,
  .dictionary-layout {
    grid-template-columns: 1fr;
  }

  .role-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel-wide {
    grid-row: auto;
  }

  .table-toolbar {
    grid-template-columns: 1fr;
  }

  .delivery-check-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .system-stats,
  .role-grid {
    grid-template-columns: 1fr;
  }

  .interface-row {
    grid-template-columns: 1fr;
  }

  .system-tabs {
    padding: 0 10px 10px;
  }
}
</style>
