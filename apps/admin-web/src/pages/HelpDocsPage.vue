<template>
  <div class="help-docs-page">
    <section class="help-hero">
      <div>
        <p class="eyebrow">操作手册</p>
        <h1>帮助文档</h1>
        <p>
          覆盖后台首页、设备、告警、订单、资产、报修、财务、OA 审批和系统管理的日常操作说明。
        </p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" @click="scrollTo('acceptance')">查看交付验收</el-button>
        <el-button @click="scrollTo('orders')">查看租赁订单</el-button>
        <el-button @click="scrollTo('customer')">查看客户移动端</el-button>
        <el-button @click="scrollTo('workflows')">查看常用流程</el-button>
      </div>
    </section>

    <section class="help-shell">
      <aside class="help-directory">
        <div class="directory-title">文档目录</div>
        <button
          v-for="doc in helpDocs"
          :key="doc.key"
          :class="{ active: activeKey === doc.key }"
          type="button"
          @click="scrollTo(doc.key)"
        >
          <el-icon><component :is="doc.icon" /></el-icon>
          <span>{{ doc.title }}</span>
        </button>
      </aside>

      <main class="help-content">
        <section id="acceptance" class="acceptance-section">
          <div class="section-head">
            <div>
              <p class="eyebrow">交付验收</p>
              <h2>上线前模块检查</h2>
            </div>
            <el-tag type="success" effect="plain">95% 交付线</el-tag>
          </div>
          <div class="acceptance-grid">
            <article v-for="item in acceptanceDocs" :key="item.module" class="acceptance-card">
              <div>
                <strong>{{ item.module }}</strong>
                <span>{{ item.owner }}</span>
              </div>
              <ul>
                <li v-for="check in item.checks" :key="check">{{ check }}</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="roles" class="role-guide-section">
          <div class="section-head">
            <div>
              <p class="eyebrow">岗位路径</p>
              <h2>不同角色日常怎么操作</h2>
            </div>
            <el-tag effect="plain">按岗位交接</el-tag>
          </div>
          <div class="role-guide-grid">
            <article v-for="role in roleGuides" :key="role.role" class="role-guide-card">
              <strong>{{ role.role }}</strong>
              <p>{{ role.path }}</p>
              <span>{{ role.result }}</span>
            </article>
          </div>
        </section>

        <section id="workflows" class="workflow-section">
          <div class="section-head">
            <div>
              <p class="eyebrow">高频协同</p>
              <h2>常用业务流程</h2>
            </div>
            <el-tag type="primary" effect="plain">跨模块</el-tag>
          </div>
          <div class="workflow-grid">
            <article v-for="flow in workflowDocs" :key="flow.title" class="workflow-card">
              <strong>{{ flow.title }}</strong>
              <ol>
                <li v-for="step in flow.steps" :key="step">{{ step }}</li>
              </ol>
            </article>
          </div>
        </section>

        <article v-for="doc in helpDocs" :id="doc.key" :key="doc.key" class="help-section">
          <div class="section-head">
            <div>
              <p class="eyebrow">{{ doc.path }}</p>
              <h2>{{ doc.title }}</h2>
              <p>{{ doc.summary }}</p>
            </div>
            <el-icon class="section-icon"><component :is="doc.icon" /></el-icon>
          </div>

          <div class="doc-grid">
            <section class="doc-block">
              <h3>适用场景</h3>
              <ul>
                <li v-for="item in doc.scenarios" :key="item">{{ item }}</li>
              </ul>
            </section>
            <section class="doc-block">
              <h3>主要操作</h3>
              <ol>
                <li v-for="item in doc.steps" :key="item">{{ item }}</li>
              </ol>
            </section>
            <section class="doc-block">
              <h3>关键字段</h3>
              <ul>
                <li v-for="item in doc.fields" :key="item">{{ item }}</li>
              </ul>
            </section>
            <section class="doc-block">
              <h3>注意事项</h3>
              <ul>
                <li v-for="item in doc.notes" :key="item">{{ item }}</li>
              </ul>
            </section>
          </div>
        </article>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Component } from "vue";
import {
  Bell,
  Coin,
  DataAnalysis,
  House,
  Monitor,
  Operation,
  Setting,
  Tickets,
  Tools,
  UserFilled,
} from "@element-plus/icons-vue";

type HelpDoc = {
  key: string;
  title: string;
  path: string;
  icon: Component;
  summary: string;
  scenarios: string[];
  steps: string[];
  fields: string[];
  notes: string[];
};

const helpDocs: HelpDoc[] = [
  {
    key: "dashboard",
    title: "首页 / 工作台",
    path: "/dashboard",
    icon: House,
    summary: "用于查看经营概览、设备在线情况、告警摘要和待处理事项，是进入各业务模块前的总览页面。",
    scenarios: [
      "运营人员每天登录后先查看设备总览、在线率和重要告警。",
      "管理人员快速判断租赁中、库存中、维修中和待审批数据是否异常。",
      "根据客户设备 TOP、通知公告和运营统计决定下一步处理模块。",
    ],
    steps: [
      "先看左侧设备总览，确认设备总数、在线设备、离线设备和重要告警数量。",
      "查看设备统计中的在线率、租赁中和维修中数量，判断当天设备运行状态。",
      "查看中间设备分布和客户设备 TOP5，定位设备集中区域和重点客户。",
      "查看右侧最新重要告警和通知公告，再进入告警管理或设备管理继续处理。",
    ],
    fields: [
      "设备总数：系统当前登记的电池/设备数量。",
      "在线设备：当前有有效状态上报或被判定为在线的设备。",
      "重要告警：需要优先关注的高等级告警。",
      "待出库、待报修、待审批：来自订单、售后和 OA 的待办统计。",
    ],
    notes: [
      "首页用于快速判断问题，不替代各模块中的明细查询。",
      "首页统计异常时，优先进入对应明细模块核对设备、订单或审批记录。",
      "生产部署时需要校验首页统计口径和订单、资产、审批、财务明细保持一致。",
    ],
  },
  {
    key: "devices",
    title: "设备管理",
    path: "/devices",
    icon: Monitor,
    summary: "用于查看设备列表、地图模式、循环分析和 BMS 详情，是电池运行状态和轨迹数据的核心入口。",
    scenarios: [
      "根据客户、机构、在线状态、异常状态筛选设备。",
      "查看设备当前电量、电压、电流、温度、定位、循环次数和里程。",
      "进入 BMS 详情查看电池轨迹、历史曲线、参数设置、重要告警和设备纪事。",
    ],
    steps: [
      "在左侧树选择客户或设备状态，缩小设备范围。",
      "在设备列表页使用编号、关键字、分组查询等条件筛选目标设备。",
      "点击设备行的 BMS 进入详情，查看当前电量、温度、总里程和单体电压。",
      "在详情页切换电池轨迹、历史曲线、参数设置、重要告警、设备纪事等页签。",
      "发现异常后，进入告警管理确认告警；需要维修时，进入售后报修创建工单。",
    ],
    fields: [
      "二编码 / 设备编号：设备唯一识别信息，用于查询、扫码和报修关联。",
      "所属机构：设备所属客户或组织。",
      "电量、电压、电流、温度：设备实时运行指标。",
      "充电、放电、定位、压差、单体最高/最低电压：判断电池健康状态的关键字段。",
      "保护板、电池编号：设备硬件和固定资产追踪依据。",
    ],
    notes: [
      "不要在设备列表中额外添加来源不明字段，字段应和被复刻系统及业务文档保持一致。",
      "BMS 详情页中的历史曲线和轨迹数据应以后端采集记录为准。",
      "设备状态变更需要和固定资产、租赁订单、售后报修联动，不能只改前端展示。",
    ],
  },
  {
    key: "alarms",
    title: "告警管理",
    path: "/alarms",
    icon: Bell,
    summary: "用于接收、筛选、确认和闭环设备告警，重点处理高压、欠压、温度、通信和定位异常。",
    scenarios: [
      "查看未处理、处理中和已恢复告警。",
      "按客户、设备编号、告警等级、告警类型和时间范围查询。",
      "把需要人工干预的告警转入售后报修或 OA 审批流程。",
    ],
    steps: [
      "进入告警列表，先筛选未处理和高等级告警。",
      "打开告警详情，核对设备编号、所属客户、告警值、触发时间和恢复时间。",
      "确认属于误报、已恢复或需要跟进，并记录处理意见。",
      "需要现场或返厂处理时，关联售后报修工单。",
      "告警处理完成后，检查设备管理中的 BMS 状态是否恢复正常。",
    ],
    fields: [
      "告警编号：告警记录唯一编号。",
      "告警等级：区分一般、重要、严重等优先级。",
      "告警类型：电压、温度、通讯、定位、SOC 等异常分类。",
      "触发值 / 阈值：判断告警原因的依据。",
      "处理状态：未处理、处理中、已恢复、已关闭。",
    ],
    notes: [
      "严重告警应优先处理，并保留处理记录。",
      "同一设备短时间内重复告警时，要结合 BMS 历史曲线判断根因。",
      "告警关闭不等于设备维修完成，需要看设备状态和报修工单状态。",
    ],
  },
  {
    key: "orders",
    title: "租赁订单",
    path: "/orders",
    icon: Tickets,
    summary: "用于管理客户租赁、订单创建、合同信息、设备分配、出库、归还和结算状态。",
    scenarios: [
      "为客户创建租赁订单并维护合同、租期、押金、租金和付款信息。",
      "从订单中选择设备并推动出库。",
      "跟踪租赁中、即将到期、逾期和归还中的订单。",
    ],
    steps: [
      "创建订单时先选择客户、合同信息、租赁周期和计费方式。",
      "维护设备数量、型号、押金、租金、优惠和应收信息。",
      "确认订单后进入设备分配或出库动作，形成出库单。",
      "租赁期间关注到期提醒、逾期金额和客户回款。",
      "设备归还后联动固定资产入库，并生成对应结算记录。",
    ],
    fields: [
      "订单编号 / 合同编号：订单和合同追踪依据。",
      "客户名称、联系人、手机号：租赁客户信息。",
      "租赁周期：起租、到期和归还判断依据。",
      "设备数量、设备编号、BT 编码：租赁设备范围。",
      "押金、租金、应收、已收、逾期金额：财务联动字段。",
    ],
    notes: [
      "出库单是订单动作的一部分，不应作为独立一级模块暴露。",
      "订单状态变化需要同步固定资产占用状态。",
      "财务结算应以订单合同和实际归还时间为依据。",
    ],
  },
  {
    key: "assets",
    title: "固定资产",
    path: "/assets",
    icon: Coin,
    summary: "用于管理电池资产台账、采购入库、资产状态、出库、归还、维修、报废和盘点。",
    scenarios: [
      "维护每块电池的资产编号、BT 编码、型号、供应商、质保和当前状态。",
      "处理采购入库、租赁出库、归还入库、维修入库和报废。",
      "按客户、仓库、状态、批次和资产类型查询资产。",
    ],
    steps: [
      "新资产进入系统时先完成入库信息、资产编号和 BT 编码维护。",
      "订单出库时从可用资产中分配设备，并记录出库单。",
      "客户归还后检查设备状态，正常设备入库，异常设备转售后报修。",
      "维修完成后走入库确认，更新资产状态和仓位。",
      "定期导出台账或进行盘点，核对账实一致。",
    ],
    fields: [
      "资产编号、BT 编码、二编码：资产和设备双向追踪字段。",
      "资产状态：库存中、租赁中、维修中、待入库、已报废等。",
      "仓库 / 机构 / 客户：资产当前归属和位置。",
      "采购批次、供应商、质保期：采购和售后责任判断依据。",
      "入库单、出库单、维修单：资产流转记录。",
    ],
    notes: [
      "固定资产是设备、订单、售后和财务的状态底账。",
      "维修、报废、租赁出库等动作不能只保留页面记录，需要改变资产状态。",
      "资产字段应按业务文档和实际台账口径继续补齐。",
    ],
  },
  {
    key: "repairs",
    title: "售后报修",
    path: "/repairs",
    icon: Tools,
    summary: "用于处理客户报修、内部报修、受理、维修跟进、配件检测、费用责任和维修入库。",
    scenarios: [
      "客户提交设备故障后，售后人员受理并跟踪维修过程。",
      "内部仓库或运营人员发现异常设备时，创建内部报修。",
      "维修完成后将设备转待入库，并同步固定资产状态。",
    ],
    steps: [
      "在报修列表中按客户、状态、紧急程度、来源和关键字筛选工单。",
      "打开工单详情，核对客户、设备、BT 编码、故障描述、联系人和图片资料。",
      "点击受理后填写技术判断，再进入维修跟进。",
      "在维修记录中维护检测结果、配件、维修方式、费用和责任归属。",
      "维修完成后进入待入库，固定资产确认入库后关闭工单。",
    ],
    fields: [
      "报修编号：售后工单唯一编号。",
      "来源：客户报修、内部报修、告警转报修。",
      "故障类型、故障描述、图片资料：判断维修方案依据。",
      "维修状态：待受理、处理中、维修中、待入库、已完成、已关闭。",
      "费用金额、责任归属、客户确认：财务和客户闭环依据。",
    ],
    notes: [
      "报修动作需要和设备状态、告警状态、固定资产状态联动。",
      "内部报修适用于仓库盘点、归还检测和运营巡检发现的问题。",
      "生产部署时需校验图片/附件存储、数据库持久化和客户侧状态刷新策略。",
    ],
  },
  {
    key: "bills",
    title: "财务管理",
    path: "/bills",
    icon: DataAnalysis,
    summary: "用于查看租赁收入、押金、应收应付、逾期账款、对账和开票等财务数据。",
    scenarios: [
      "根据租赁订单生成应收、实收和逾期记录。",
      "核对客户付款、押金退还、维修费用和坏账风险。",
      "按客户、订单、时间范围导出财务报表。",
    ],
    steps: [
      "先按客户或订单筛选账单，核对合同金额和租赁周期。",
      "查看应收、已收、未收、逾期金额和付款记录。",
      "对需要开票或退款的记录维护处理状态。",
      "维修费用确认后，关联售后报修工单和责任归属。",
      "月底导出财务明细，和订单、资产状态做交叉核对。",
    ],
    fields: [
      "账单编号、订单编号、合同编号：财务追踪依据。",
      "应收金额、实收金额、未收金额、逾期金额：核心金额字段。",
      "押金、租金、维修费、退款金额：账款类型。",
      "付款状态、开票状态、对账状态：财务处理进度。",
      "客户名称、付款时间、收款账号：对账信息。",
    ],
    notes: [
      "财务数据应来自订单、售后和实际收款，避免手工重复录入造成差异。",
      "逾期金额需要结合订单到期日和实际付款日期计算。",
      "退款和维修费用必须保留审批或确认记录。",
    ],
  },
  {
    key: "approvals",
    title: "OA 审批",
    path: "/approvals",
    icon: Operation,
    summary: "用于处理采购、入库、出库、维修、报废、退款等需要多人确认的业务流程。",
    scenarios: [
      "采购入库、资产报废、客户退款等关键动作需要审批。",
      "固定资产、财务、售后等模块发起跨部门流程。",
      "管理员维护审批模板、节点、风险提示和表单字段。",
    ],
    steps: [
      "选择对应审批模板，确认业务类型和发起部门。",
      "填写审批表单中的订单、资产、费用或维修信息。",
      "提交后按节点流转到负责人处理。",
      "审批通过后回写业务模块状态；驳回时按原因修改后重新提交。",
      "在审批记录中查看当前节点、处理意见和流转时间。",
    ],
    fields: [
      "审批编号、模板名称、业务类型：审批识别信息。",
      "发起人、当前节点、处理人：流程流转字段。",
      "关联订单、资产、报修单、账单：业务回写依据。",
      "审批状态：草稿、审批中、通过、驳回、撤回。",
      "风险提示、附件、处理意见：审核依据。",
    ],
    notes: [
      "审批通过后的业务状态回写必须明确，避免只完成 OA 记录。",
      "涉及资产和财务的审批应保留附件和处理意见。",
      "模板字段变更会影响后续流程发起，需要先测试再启用。",
    ],
  },
  {
    key: "settings",
    title: "系统管理",
    path: "/settings",
    icon: Setting,
    summary: "用于维护账号、角色权限、字典、接口、审批流、系统参数和审计日志。",
    scenarios: [
      "新增或调整后台账号、角色和菜单权限。",
      "维护设备状态、资产状态、告警类型、报修类型等基础字典。",
      "配置审批流、接口信息、系统参数和审计查询。",
    ],
    steps: [
      "先维护角色和权限，再创建或调整用户账号。",
      "业务字段枚举变化时，在字典管理中统一修改。",
      "审批流程变更时，先复制模板或新增版本，再启用。",
      "接口配置调整后，检查设备、客户和财务相关模块是否可用。",
      "通过审计日志查看关键操作的操作者、时间和结果。",
    ],
    fields: [
      "账号、角色、权限：用户访问控制字段。",
      "字典编码、字典名称、启用状态：基础数据字段。",
      "审批流节点、处理人、条件规则：流程配置字段。",
      "接口地址、密钥、启用状态：外部系统对接字段。",
      "审计类型、操作人、操作时间、操作结果：安全追踪字段。",
    ],
    notes: [
      "系统管理变更会影响全局功能，修改前要确认影响范围。",
      "角色权限应按岗位最小权限配置。",
      "重置默认配置前需要确认不会覆盖正在使用的业务配置。",
    ],
  },
  {
    key: "customer",
    title: "客户移动端",
    path: "/customer",
    icon: UserFilled,
    summary: "用于客户管理员和客户员工在手机端查看订单、电池、收货、报修和账单，承担客户自助闭环。",
    scenarios: [
      "客户管理员查看租赁订单、欠款账单并提交付款凭证。",
      "客户员工核对出库单和 BT 码后确认收货。",
      "现场人员扫码或选择电池提交报修，并持续查看处理进度。",
    ],
    steps: [
      "客户登录后先进入首页查看待收货、报修中和待付款事项。",
      "在订单页按全部、待收货、租赁中、退租中、已完成筛选订单。",
      "收到出库设备后进入收货页核对出库单、BT 码、地址和收货人，确认整单收货。",
      "设备异常时进入报修页提交故障描述和联系方式，后台受理后同步状态。",
      "客户管理员在账单页查看欠款、付款状态并提交付款凭证。",
    ],
    fields: [
      "客户名称、登录账号、权限：决定客户管理员和员工可见范围。",
      "订单号、合同状态、租期、待收货数：客户侧履约判断字段。",
      "出库单号、BT 码、自动收货日：确认收货依据。",
      "报修设备、故障描述、处理状态：售后闭环字段。",
      "账单金额、欠款、凭证状态：财务对账字段。",
    ],
    notes: [
      "客户员工默认不展示金额，只开放订单、电池、收货和报修。",
      "收货确认后会同步订单待收货数和后台出库状态。",
      "生产部署时需配置 HTTPS、移动端登录有效期、文件上传和短信/通知策略。",
    ],
  },
];

const acceptanceDocs = [
  {
    module: "OA 审批",
    owner: "运营 / 管理层",
    checks: [
      "审批台账、待我处理、草稿、已办、超时队列可筛选。",
      "新建审批可按模板带出字段、节点、风险项和附件要求。",
      "通过、驳回、转办、撤销、删除、催办、批量通过都有操作记录。",
      "详情中能查看表单、节点、流转、附件和交付检查清单。",
    ],
  },
  {
    module: "租赁订单",
    owner: "销售 / 资产 / 财务",
    checks: [
      "订单创建、会签、合同归档、出库、收货、账单、回款、续租、退租可闭环。",
      "合同待归档、待出库、待收货、催收回款、退租结清队列可直接进入。",
      "订单详情可查看合同、电池、出库、账单、报修和履约检查。",
      "客户移动端收货和账单动作能回写后台状态。",
    ],
  },
  {
    module: "系统管理",
    owner: "系统管理员",
    checks: [
      "账号、角色、字典、接口、审批流、参数、审计日志可维护。",
      "支持导出配置快照、恢复配置、恢复默认和导出审计。",
      "交付健康度覆盖账号、权限、接口、审批、审计、备份和参数风险。",
      "接口测试和验收清单导出可作为上线附件。",
    ],
  },
  {
    module: "客户移动端",
    owner: "客户管理员 / 客户员工",
    checks: [
      "首页有待收货、报修、账单/订单待办和最近订单。",
      "订单页支持状态筛选和确认收货、查看电池、发起报修、付款凭证入口。",
      "收货页展示出库时间、自动收货日、收货人、地址和 BT 码。",
      "账单金额按权限展示，客户员工不暴露金额。",
    ],
  },
  {
    module: "帮助 / 操作文档",
    owner: "项目交付",
    checks: [
      "内置帮助页覆盖各后台模块、客户移动端、岗位路径和常用流程。",
      "仓库 docs 中保留正式交付验收清单和核心流程操作手册。",
      "上线前检查明确环境、数据库、对象存储、接口、账号、备份和审计。",
      "验收材料能够直接交给实施、培训和客户试运行人员使用。",
    ],
  },
];

const roleGuides = [
  {
    role: "销售 / 客户经理",
    path: "租赁订单 → 新建订单 → 发起会签 → 跟进合同归档 → 客户移动端收货确认",
    result: "形成可履约订单和客户侧可见进度。",
  },
  {
    role: "仓库 / 资产",
    path: "固定资产 → 可用库存 → 订单详情出库 → BT 码绑定 → 退租/维修入库",
    result: "保证资产状态和实际库存一致。",
  },
  {
    role: "财务",
    path: "订单详情账单 → 财务管理 → 账单确认 → 登记回款 → OA 审批退款/调整",
    result: "完成应收、实收、欠款和凭证闭环。",
  },
  {
    role: "售后",
    path: "客户移动端报修 → 售后报修受理 → 维修跟进 → 待入库 → 客户确认",
    result: "保留故障、维修、费用和状态记录。",
  },
  {
    role: "系统管理员",
    path: "系统管理 → 角色权限 → 接口配置 → 审批流 → 参数 → 交付健康度检查",
    result: "交付前完成账号、权限、接口和审计准备。",
  },
  {
    role: "客户管理员 / 员工",
    path: "移动端首页 → 订单 → 收货 → 报修 → 账单/付款凭证",
    result: "客户可自助查看履约状态并提交必要反馈。",
  },
];

const workflowDocs = [
  {
    title: "设备异常到售后闭环",
    steps: [
      "首页发现重要告警或设备离线。",
      "进入设备管理查看 BMS、轨迹和历史曲线。",
      "进入告警管理确认异常等级和处理状态。",
      "需要维修时转售后报修，维修完成后固定资产入库。",
    ],
  },
  {
    title: "租赁出库到归还",
    steps: [
      "租赁订单创建并确认合同、客户和设备数量。",
      "从固定资产可用库存中分配设备。",
      "订单出库后资产状态变为租赁中。",
      "客户归还后检测设备，正常入库，异常转售后报修。",
    ],
  },
  {
    title: "维修费用确认",
    steps: [
      "售后报修记录故障原因、维修方式和配件。",
      "判断责任归属和费用金额。",
      "需要客户承担或退款时进入财务管理。",
      "涉及金额审批时发起 OA 审批并回写处理状态。",
    ],
  },
  {
    title: "基础配置变更",
    steps: [
      "系统管理中维护账号、角色、字典和审批流。",
      "在对应业务模块验证字段和权限是否生效。",
      "通过审计日志确认关键配置变更记录。",
      "上线后持续观察订单、资产、售后流程是否正常。",
    ],
  },
];

const activeKey = ref(helpDocs[0].key);

function scrollTo(key: string) {
  activeKey.value = key;
  document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<style scoped>
.help-docs-page {
  min-height: 100%;
  color: #252a3d;
}

.help-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 14px;
  padding: 22px 24px;
  border-radius: 10px;
  background: #fff;
}

.help-hero h1,
.section-head h2,
.doc-block h3 {
  margin: 0;
}

.help-hero h1 {
  margin-top: 4px;
  font-size: 26px;
  line-height: 34px;
}

.help-hero p,
.section-head p {
  margin: 8px 0 0;
  color: #69718b;
}

.eyebrow {
  margin: 0;
  color: #4e5afe;
  font-size: 13px;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.help-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.help-directory {
  position: sticky;
  top: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  background: #fff;
}

.directory-title {
  padding: 6px 10px 10px;
  color: #868395;
  font-size: 13px;
}

.help-directory button {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  padding: 0 10px;
  color: #3a374c;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.help-directory button:hover,
.help-directory button.active {
  color: #4e5afe;
  background: #f2f4ff;
}

.help-content {
  display: grid;
  gap: 14px;
}

.acceptance-section,
.role-guide-section,
.workflow-section,
.help-section {
  scroll-margin-top: 12px;
  border-radius: 10px;
  background: #fff;
}

.acceptance-section,
.role-guide-section,
.workflow-section {
  padding: 20px;
}

.help-section {
  padding: 22px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.section-head h2 {
  margin-top: 4px;
  color: #23253c;
  font-size: 21px;
  line-height: 30px;
}

.section-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #4e5afe;
  background: #f2f4ff;
  font-size: 24px;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.acceptance-grid,
.role-guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.acceptance-card,
.role-guide-card {
  padding: 16px;
  border: 1px solid #eef0f5;
  border-radius: 8px;
  background: #fbfcff;
}

.acceptance-card > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.acceptance-card strong,
.role-guide-card strong {
  color: #23253c;
  font-size: 15px;
}

.acceptance-card span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 4px 8px;
  color: #4e5afe;
  background: #eef2ff;
  font-size: 12px;
}

.role-guide-card p {
  margin: 10px 0;
  color: #3f4558;
  line-height: 1.6;
}

.role-guide-card span {
  color: #69718b;
  font-size: 13px;
}

.workflow-card {
  padding: 16px;
  border: 1px solid #eef0f5;
  border-radius: 8px;
  background: #fbfcff;
}

.workflow-card strong {
  display: block;
  margin-bottom: 10px;
  color: #23253c;
  font-size: 15px;
}

.doc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.doc-block {
  min-height: 190px;
  padding: 16px 18px;
  border: 1px solid #eef0f5;
  border-radius: 8px;
  background: #fbfcff;
}

.doc-block h3 {
  color: #23253c;
  font-size: 16px;
  line-height: 24px;
}

.doc-block ul,
.doc-block ol,
.acceptance-card ul,
.workflow-card ol {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #4d556b;
  line-height: 1.8;
}

.doc-block li,
.acceptance-card li,
.workflow-card li {
  margin-bottom: 4px;
}

@media (max-width: 1100px) {
  .help-shell {
    grid-template-columns: 1fr;
  }

  .help-directory {
    position: static;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .directory-title {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .help-hero,
  .section-head {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .acceptance-grid,
  .role-guide-grid,
  .workflow-grid,
  .doc-grid,
  .help-directory {
    grid-template-columns: 1fr;
  }
}
</style>
