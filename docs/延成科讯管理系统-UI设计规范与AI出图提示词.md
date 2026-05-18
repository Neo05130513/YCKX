# 延成科讯管理系统 - UI 设计规范与 AI 出图提示词

## 1. 文档用途

本文档用于统一延成科讯管理系统的界面设计方向，供 UI 设计、AI 出图、前端开发和产品验收参考。

当前项目的第一视觉基准为「设备管理」页面：顶部蓝色主导航、浅灰页面底、白色业务面板、组织筛选侧栏、高密度设备表格、BMS 数据详情和运维型状态表达。后续后台页面应优先延续这套风格，而不是另起一套深色侧边栏或营销型 SaaS 风格。

系统包含两个端：

| 端 | 说明 |
|---|---|
| 内部管理后台 | 公司内部员工使用，面向设备、告警、订单、资产、售后、财务、OA 审批等复杂业务 |
| 客户移动端网页 | 外部客户使用，面向订单查看、电池查看、账单查看、扫码报修、确认收货 |

设计目标是做一套可落地、可开发、可长期维护的设备运维管理系统界面。优先保证数据密度、查询效率、状态识别和操作闭环，不做花哨概念图。

---

## 2. 整体视觉定位

### 2.1 推荐风格

| 项目 | 规范 |
|---|---|
| 主风格 | 设备运维管理后台 + Ant Design 风格组件 + 高密度数据表格 |
| 后台气质 | 稳定、清晰、专业、数据密集、操作效率高 |
| 视觉基准 | 当前设备管理页面，包括顶部蓝色导航、白色面板、浅灰工作区、蓝色主按钮、状态标签 |
| 适用场景 | 电池设备管理、BMS 运行数据、告警处理、租赁订单、资产流转、售后工单、财务账单、OA 审批 |
| 客户端气质 | 简洁、可信、移动优先、突出关键动作，颜色体系继承后台主色 |

### 2.2 不建议采用

| 风格 | 不建议原因 |
|---|---|
| 深色大屏风 | 不适合长期操作和复杂表格阅读 |
| Cyberpunk | 娱乐化过强，不符合企业后台 |
| 纯营销 SaaS 首页 | 信息密度不足，会削弱业务操作效率 |
| 大面积渐变和玻璃拟态 | 可读性和稳定性差，不适合设备数据 |
| 重装饰插画风 | 与设备管理当前落地页面割裂 |

### 2.3 设计关键词

```text
设备运维
高密度表格
浅灰工作台
白色业务面板
亮蓝导航
状态清晰
查询高效
BMS 数据
组织树筛选
批量操作
右侧详情
流程可追踪
```

---

## 3. 配色规范

### 3.1 主配色

| 类型 | 色值 | 用途 |
|---|---|---|
| 品牌主蓝 | `#4E5AFE` | 顶部导航、主按钮、当前菜单、关键选中态 |
| 主蓝 Hover | `#6670FF` | 主按钮 hover、交互反馈 |
| 深主蓝 | `#2F3BE8` | 强调态、深色文本链接、图表重点线 |
| 页面背景 | `#EFF0F2` | 后台工作区整体背景 |
| 面板白 | `#FFFFFF` | 页面标题区、筛选区、表格容器、卡片 |
| 浅蓝面板 | `#F5F7FF` | 设备统计卡、轻量选中背景 |
| 表头背景 | `#F3F6FA` | 高密度表格表头 |
| 分割线 | `#EDF0F4` | 卡片分割、表格边框、模块边界 |
| 常规边框 | `#D9DDE7` | 输入框、按钮、卡片边界 |
| 主文字 | `#1F2329` | 标题、表格主字段、重要数字 |
| 次文字 | `#646A73` | 辅助说明、更新时间、表格次字段 |
| 弱文字 | `#8F959E` | 占位符、空态、弱提示 |

### 3.2 状态颜色

| 状态类型 | 色值 | 背景 | 示例 |
|---|---|---|---|
| 在线/成功 | `#42BF79` | `#EFFBF4` | 在线、已完成、已结清、在库 |
| 异常/危险 | `#FF385C` | `#FFF1F3` | 异常、严重告警、逾期、报废 |
| 待处理/警告 | `#F59A23` | `#FFF7E8` | 即将到期、待处理、维修中、部分付款 |
| 离线/中性 | `#8F959E` | `#F7F8FA` | 离线、已关闭、已停用 |
| 信息/操作 | `#4E5AFE` | `#F0F3FF` | BMS 详情、查询、批量操作、审批中 |
| 辅助青色 | `#14C9C9` | `#EAFBFB` | 地图轨迹终点、数据图表辅助线 |

### 3.3 页面层级

| 层级 | 背景 | 说明 |
|---|---|---|
| 顶部导航 | `#4E5AFE` | 全局主导航，白色文字，当前菜单白底蓝字 |
| 工作区背景 | `#EFF0F2` | 所有后台页面统一背景 |
| 页面标题条 | `#FFFFFF` | 页面名称、说明、全局操作按钮 |
| 业务面板 | `#FFFFFF` | 筛选区、表格区、详情区 |
| 统计卡 | `#F5F7FF` / `#F7F8FB` | 设备总数、在线、异常、即将到期等 |
| 表格表头 | `#F3F6FA` | 高密度数据表格头部 |

---

## 4. 字体与排版

### 4.1 字体

| 场景 | 字体 |
|---|---|
| 中文界面 | Microsoft YaHei / PingFang SC / Noto Sans SC |
| 英文与数字 | Inter / Segoe UI / system-ui |
| 设备编号、BT 码、金额 | Inter / DIN / system-ui |

### 4.2 后台字号

| 类型 | 字号 | 用途 |
|---|---|---|
| 顶部导航文字 | 16px - 18px | 一级菜单 |
| 页面标题 | 20px - 22px | 页面主标题 |
| 面板标题 | 15px - 16px | 筛选区、表格区、详情区标题 |
| 表格正文 | 13px - 14px | 设备列表、订单列表、告警列表 |
| 表格辅助文字 | 12px - 13px | 更新时间、编号补充、说明 |
| 统计数字 | 26px - 32px | 设备总数、在线、异常、金额 |
| BMS 重点数值 | 22px - 30px | 电量、电压、电流、温度、里程 |

### 4.3 排版原则

- 后台页面以 1440px 宽度为主要设计基准。
- 数据列表要保持高密度，避免过大的留白和营销式大卡片。
- 表格数字类字段右对齐，状态类字段居中，名称和编号左对齐。
- 设备编号、BT 码、BMS 编号等长字段必须支持省略和悬浮提示。
- 页面标题区说明文字使用 13px 次文字，不占用过多高度。

---

## 5. 后台管理端布局规范

### 5.1 全局布局

后台采用当前设备管理一致的顶部导航结构。

```text
顶部蓝色导航 70px
├─ 左侧品牌标识
├─ 一级业务菜单：首页、设备管理、告警管理、租赁订单、固定资产、售后报修、财务管理、OA 审批、系统设置
├─ 全局搜索
├─ 帮助、通知、语言、当前用户

主工作区
├─ 页面标题条：标题、说明、全局按钮
└─ 页面主体：左侧筛选/组织树 + 右侧业务内容，或全宽业务面板
```

### 5.2 桌面端尺寸

| 项目 | 建议 |
|---|---|
| 设计基准宽度 | 1440px |
| 顶部导航高度 | 70px |
| 页面外边距 | 16px |
| 标题条高度 | 80px 左右 |
| 左侧组织树宽度 | 280px |
| 主内容最小高度 | `calc(100vh - 70px)` |
| 业务面板圆角 | 10px |
| BMS 详情面板圆角 | 20px |
| 表格行高 | 54px - 64px |
| 工具栏控件高度 | 32px - 36px |

### 5.3 页面结构规则

- 后台列表页统一采用「标题条 + 统计卡 + 筛选区 + 表格区 + 详情/操作入口」。
- 设备类页面可以使用「左侧组织树 + 右侧列表」结构。
- 业务流程页可以使用全宽面板，但顶部导航、背景、按钮、状态颜色必须保持一致。
- 详情优先使用右侧抽屉、弹窗或页内详情区，避免频繁跳页。
- 批量操作放在表格标题行右侧，查询操作放在筛选区右下角。
- 危险操作必须二次确认。
- 所有核心列表必须支持搜索、筛选、状态筛选和导出。

---

## 6. 设备管理风格落地规范

### 6.1 设备管理页面基准

当前设备管理页面是后续后台页面的视觉样板，关键特征如下：

| 模块 | 规范 |
|---|---|
| 顶部导航 | `#4E5AFE` 蓝色通栏，当前菜单白色胶囊态，图标 + 文案 |
| 标题条 | 白色背景，左侧标题和说明，右侧刷新、导入、导出、新增按钮 |
| 左侧栏 | 白色大面板，组织树、机构搜索、机构数量 |
| 主内容 | 白色大面板，顶部页签，统计卡、筛选表单、设备表格 |
| 页签 | 当前页签蓝底白字，其他页签灰色图标文字 |
| 统计卡 | 浅灰蓝背景，标题弱文字，数字用状态色 |
| 筛选区 | 白底细边框，多列输入框，右下角查询和重置 |
| 表格区 | 表头浅灰、边框细、字段高密度、操作列固定在右侧 |
| 状态标签 | 小圆角色块，在线绿、异常红、离线橙/灰 |
| 链接操作 | 蓝色文字，如 BMS 详情、详情、续费、更多 |

### 6.2 设备列表字段展示

- 设备基础字段分组展示，表头可使用分组表头。
- 设备编号、二维码、所属机构、状态、电量、异常、运动状态、离线天数为第一屏优先字段。
- 电量使用进度条 + 百分比，低电量使用红色。
- 异常字段使用醒目标记，但不要使用大面积红色背景。
- 操作列固定右侧，保持 `BMS详情 / 详情 / 续费 / 更多` 这种短文本链接样式。

### 6.3 BMS 详情风格

- BMS 详情采用全屏工作台，不使用营销式详情页。
- 内容分为左侧核心设备面板、告警列表，右侧趋势图、电压图、位置/轨迹等面板。
- 白色卡片圆角可放大到 20px，背景使用 `#EEF0F3`。
- 关键数值可使用更大的数字字号，但图表和数据必须可读。
- 电池图、信号条、MOS 状态、电压柱状图、轨迹地图等可视化要服务于运维判断。

---

## 7. 客户移动端网页布局规范

### 7.1 基础原则

客户移动端继承主蓝、状态色和白卡片风格，但不能照搬后台高密度表格。

| 原则 | 说明 |
|---|---|
| 移动优先 | 以 390px 宽度为设计基准 |
| 卡片化 | 订单、电池、账单、报修以卡片展示 |
| 少字段 | 只展示客户真正需要看的字段 |
| 强操作 | 扫码报修、确认收货、查看账单要明显 |
| 权限隐藏 | 客户员工不显示金额模块，不用 `****` 占位 |
| 状态清晰 | 订单、电池、账单、报修都要有状态标签 |

### 7.2 移动端尺寸

| 项目 | 建议 |
|---|---|
| 设计基准宽度 | 390px |
| 页面边距 | 16px |
| 卡片圆角 | 10px - 12px |
| 主按钮高度 | 44px - 48px |
| 底部导航高度 | 56px - 64px |

### 7.3 移动端导航

```text
首页
订单
电池
报修
我的
```

账单入口根据权限展示：

- 客户管理员显示账单入口和金额。
- 客户员工隐藏账单金额相关入口。

---

## 8. 统一组件规范

### 8.1 后台组件

| 组件 | 规范 |
|---|---|
| 顶部导航 | 蓝色通栏，当前菜单白底蓝字，图标 + 文案 |
| 页面标题条 | 白色容器，标题 20px，说明 13px，右侧操作按钮 |
| 组织树侧栏 | 280px 白色面板，支持搜索、数量、选中蓝底 |
| 页签 | 蓝底白字选中，普通态灰色图标文字 |
| 统计卡 | 浅灰蓝底，数字使用状态色 |
| 筛选区 | 多列输入框和下拉框，细边框，查询按钮靠右 |
| 数据表格 | 高密度、浅灰表头、固定操作列、支持横向滚动 |
| 状态标签 | 4px 圆角，细边框，浅色底 |
| 进度条 | 用于电量、出库进度、回款进度 |
| 右侧抽屉 | 查看详情、处理记录、关联信息 |
| 弹窗表单 | 新建、编辑、确认、远程操作 |
| 时间线 | 审批流、维修记录、资产履历 |
| 批量操作栏 | 批量查询、批量换货、批量更新、批量处理 |

### 8.2 客户移动端组件

| 组件 | 用途 |
|---|---|
| 信息卡片 | 订单、电池、账单、报修 |
| 底部导航 | 首页、订单、电池、报修、我的 |
| 主操作按钮 | 扫码报修、确认收货 |
| 状态标签 | 租赁中、待收货、已逾期、处理中 |
| 图片上传 | 报修图片 |
| 空状态 | 暂无订单、暂无账单、暂无报修 |
| 错误提示 | BT 码不属于当前客户 |
| 金额卡片 | 客户管理员查看欠款和账单 |

---

## 9. 关键业务状态展示

### 9.1 设备运行状态

| 状态 | 展示 |
|---|---|
| 在线 | 绿色标签 `#42BF79`，浅绿背景 |
| 异常 | 红色标签 `#FF385C`，浅红背景 |
| 离线 | 橙色或灰色标签，显示离线天数 |
| 低电量 | 电量进度条红色，百分比红色 |
| 正常电量 | 电量进度条绿色 |

### 9.2 电池资产业务状态

| 状态 | 展示 |
|---|---|
| 在库 | 绿色标签，表示可出库 |
| 租赁 | 蓝色标签，表示已绑定客户订单 |
| 维修 | 橙色标签，表示处理中 |
| 报废 | 红色标签，表示不可用 |
| 买断 | 灰色或紫色标签，标记为终态 |

### 9.3 订单状态

| 状态 | 颜色 |
|---|---|
| 草稿 | 灰色 |
| 审批中 | 蓝色 |
| 待出库 | 橙色 |
| 部分出库 | 橙色 |
| 待客户收货 | 橙色 |
| 租赁中 | 绿色 |
| 已完成 | 绿色 |
| 已取消 | 灰色 |

### 9.4 告警状态

| 状态 | 颜色 |
|---|---|
| 严重告警 | 红色 |
| 一般告警 | 橙色 |
| 待处理 | 蓝色 |
| 处理中 | 橙色 |
| 已处理 | 绿色 |
| 误报 | 灰色 |

### 9.5 财务状态

| 状态 | 颜色 |
|---|---|
| 待确认 | 蓝色 |
| 待付款 | 橙色 |
| 部分付款 | 橙色 |
| 已结清 | 绿色 |
| 已逾期 | 红色 |
| 已调整 | 紫色 |
| 已作废 | 灰色 |

---

## 10. 核心页面设计说明

### 10.1 工作台首页

页面目标：快速展示系统关键业务状态和待处理事项。

必须包含：

- 设备总数、在线、异常、离线、即将到期。
- 当前告警数、严重告警数。
- 待审批、待出库、待收货、待处理报修。
- 本月应收、已收、欠款、逾期。
- 快捷入口：新增订单、创建出库单、处理报修、确认账单。

设计要求：

- 延续设备管理统计卡样式，浅色卡片 + 状态色数字。
- 工作台不做深色大屏，应保持可操作后台风格。
- 待办事项可点击进入对应模块。

### 10.2 设备管理

页面目标：统一查看 8 个平台汇总后的电池运行数据。

必须包含：

- 左侧组织树和机构搜索。
- 设备列表、地图模式、循环分析、分组/批次页签。
- 设备总数、在线、异常、即将到期、已停用统计卡。
- 二维码/设备编号搜索。
- 设备状态、生命周期、流量卡状态、批次编号、分组名称等筛选。
- 电池列表表格。
- BMS 详情、设备详情、续费、更多操作。

设计要求：

- 这是后台全局视觉样板。
- 表格字段可以高密度，但分组、对齐和状态必须清楚。
- 运行状态和资产业务状态分开展示。
- 数据同步异常要有明显提示。

### 10.3 告警管理

页面目标：集中处理设备告警。

必须包含：

- 告警统计卡片。
- 告警等级、类型、BT 码、客户、订单、来源平台。
- 告警处理状态。
- 告警详情和处理时间线。
- 转报修操作。

设计要求：

- 延续设备管理的表格和筛选区样式。
- 严重告警用红色标签和数量强调，不使用整屏红色。
- 告警处理过程必须可追踪。

### 10.4 租赁订单管理

页面目标：销售创建订单并跟踪订单履约。

必须包含：

- 订单列表。
- 订单状态流。
- 客户信息。
- 合同信息。
- 出库进度。
- 已绑定电池。
- 账单和欠款。
- 报修记录。

设计要求：

- 列表页延续设备管理筛选区 + 表格区。
- 订单详情建议使用详情页或大抽屉，内部用 Tab 分组。
- Tab 建议为：基本信息、合同、电池、出库单、账单、报修。

### 10.5 出库单创建

页面目标：资产管理部门基于订单分批出库并绑定 BT 码。

必须包含：

- 订单信息卡。
- BT 码扫码/手动录入。
- 批量录入区域。
- 校验结果。
- 本次出库电池列表。
- 提交出库按钮。

设计要求：

- 校验结果必须逐条展示：可出库、非在库、重复、已租赁、已报废。
- 成功、警告、错误沿用统一状态色。
- 提交前必须确认。

### 10.6 BMS 详情

页面目标：展示单台电池的实时运行数据、告警、曲线和位置。

必须包含：

- 设备二维码、在线状态、信号、所属机构。
- 电量、电压、电流、温度、SOH、循环次数、里程。
- 充电 MOS、放电 MOS、温度点位。
- 告警列表。
- SOC、温度、里程趋势。
- 单体电压柱状图。
- 当前位置和轨迹入口。

设计要求：

- 使用白色面板 + 20px 圆角 + 浅灰页面底。
- 数值模块要清楚，图表只做辅助判断。
- 告警提示在顶部或核心信息旁出现。

### 10.7 固定资产管理

页面目标：管理电池全生命周期。

必须包含：

- 电池资产台账。
- BT 码搜索。
- 资产状态筛选。
- 当前客户和订单。
- 仓库或位置。
- 资产履历时间线。

设计要求：

- 资产履历必须完整展示入库、出库、维修、入库、报废、买断等动作。
- 不允许出库的状态要明确禁用操作。
- 列表和详情延续设备管理后台风格。

### 10.8 售后报修

页面目标：处理客户和内部发起的报修。

必须包含：

- 报修列表。
- 报修来源：客户报修 / 内部报修。
- BT 码、客户、订单、状态、提交时间。
- 故障描述、图片、地址。
- 处理记录和状态时间线。

设计要求：

- 图片展示要方便查看。
- 报修状态流要清楚。
- 客户看到简化进度，内部看到完整处理记录。

### 10.9 财务管理

页面目标：管理租赁账单、回款、欠款和逾期。

必须包含：

- 本月应收、已收、欠款、逾期金额。
- 账单列表。
- 财务确认账单。
- 手动调整金额和原因。
- 回款登记。
- 逾期标识。

设计要求：

- 金额数字要清晰，避免装饰性过强。
- 逾期必须红色突出。
- 手动调整账单必须展示审计记录。

### 10.10 OA 业务审批

页面目标：处理和配置业务审批。

必须包含：

- 待我审批。
- 我发起的。
- 已审批。
- 审批详情。
- 审批时间线。
- 附件。
- 审批流配置。

设计要求：

- 审批详情以表单 + 时间线展示。
- 审批配置支持节点和条件分支。
- 视觉上延续设备管理的白色面板、蓝色主操作和状态标签。

---

## 11. AI 出图统一提示词模板

### 11.1 后台通用模板

```text
Ant Design style enterprise device operations management UI for 延成科讯管理系统, a lithium battery BMS, asset lifecycle and rental management platform,
visual reference: bright blue top navigation #4E5AFE, light gray workspace #EFF0F2, white business panels, dense data tables, organization tree sidebar, device management page style,
features: battery device management, BT code, BMS detail, alarms, rental orders, asset lifecycle, finance receivables, repair tickets, approval workflow,
style: professional equipment management system, high-density but readable, practical operations software, stable, clean, not dark dashboard, not marketing SaaS,
colors: primary blue #4E5AFE, hover blue #6670FF, success green #42BF79, warning orange #F59A23, danger red #FF385C, text #1F2329, background #EFF0F2, white cards,
layout: desktop web admin 1440px, top blue navbar 70px, page title bar, left organization tree, tabs, KPI stat cards, filter form, large data table, fixed action column, right-side detail drawer,
details: Chinese enterprise labels, device status chips, battery power progress bar, BT code, BMS detail link, batch operation buttons, subtle borders,
quality: high quality, UI/UX, Figma ready, 4K
```

### 11.2 设备管理页面提示词

```text
Enterprise battery device management UI design for 延成科讯管理系统,
visual style: same as current device management page, bright blue top navigation #4E5AFE, light gray background #EFF0F2, white panels, dense table, Ant Design components,
features: organization tree sidebar, device list tabs, map mode, cycle analysis, group batch, device total, online, abnormal, expiring soon, disabled stat cards,
filters: QR code or device number search, device status, lifecycle, SIM card status, batch number, group name, model, BMS version, locator hardware version,
table: grouped header, checkbox selection, index, QR code, organization, status, power progress bar, alarm, motion status, offline days, operation links BMS detail and detail,
style: professional operations backend, data-dense, clear status colors, high usability, not flashy,
colors: primary blue #4E5AFE, green #42BF79, red #FF385C, orange #F59A23, table header #F3F6FA, border #EDF0F4,
layout: 1440px desktop admin, top navbar, title bar with refresh import export add buttons, left organization tree 280px, right content panel with tabs, stat cards, filter box and table,
quality: high quality UI design, Chinese labels, Figma ready, 4K
```

### 11.3 BMS 详情页面提示词

```text
BMS battery detail operations dashboard UI for 延成科讯管理系统,
visual style: device management BMS detail page, light gray workspace, white rounded panels, blue active tabs, professional device monitoring,
features: device QR code, online status, signal, organization, last update time, battery power graphic, voltage, current, temperature, SOH, cycle count, mileage, charge MOS, discharge MOS, alarm list,
charts: SOC trend, temperature trend, mileage trend, single cell voltage bar chart, current location map, trajectory entrance,
colors: primary blue #4E5AFE, green #42BF79, red #FF385C, cyan #14C9C9, background #EEF0F3, panels #FFFFFF,
layout: full desktop operations page, top tab bar, left core BMS panel and alarm list, right charts and map panels, 20px panel radius,
quality: high quality UI/UX, Chinese enterprise labels, clear technical data, 4K
```

### 11.4 告警管理页面提示词

```text
Enterprise alarm management UI for lithium battery device operations,
visual style: same as 延成科讯 device management page, blue top navigation, white panels, light gray workspace, dense table,
features: alarm statistics, severe warning count, BT code, customer, rental order, source platform, alarm level, processing status, convert to repair ticket,
layout: title bar, stat cards, filter form, alarm table, right detail drawer with processing timeline,
colors: primary blue #4E5AFE, danger red #FF385C, warning orange #F59A23, success green #42BF79, background #EFF0F2,
quality: professional operations backend, Chinese labels, Figma ready, 4K
```

### 11.5 租赁订单管理页面提示词

```text
Enterprise rental order management UI for battery leasing system,
visual style: device management consistent, blue top navigation #4E5AFE, white cards, high-density table, Ant Design form controls,
features: customer-based rental orders, order status workflow, contract attachment, monthly billing day, batch outbound delivery, linked BT code batteries, receivable summary,
layout: title bar, status tabs, filter toolbar, order table, fixed action column, order detail drawer with tabs for contract, batteries, outbound orders, bills and repairs,
colors: blue #4E5AFE, green #42BF79, orange #F59A23, red #FF385C, gray background #EFF0F2,
quality: professional B2B operations UI, Chinese labels, Figma ready, 4K
```

### 11.6 客户移动端通用模板

```text
Mobile web customer portal UI for 延成科讯 battery rental service,
visual style: mobile extension of device management style, primary blue #4E5AFE, white cards, light gray background, clear status chips,
features: customer login, rental orders, battery BT code list, billing details for admin role, repair request by QR scan, delivery confirmation, repair progress,
layout: mobile screen 390x844, top customer header, quick action buttons, summary cards, card list, bottom navigation,
details: Chinese labels, battery status, QR scan button, BT code chips, order status chips, role-based financial visibility,
quality: high quality mobile UI/UX, Figma ready, 4K
```

---

## 12. 开发落地规则

### 12.1 通用规则

- 后台 PC Web 优先适配 1440px 宽度。
- 客户端以手机浏览器为主，优先适配 390px 宽度。
- 后台页面统一使用顶部蓝色导航，不再新增深色左侧全局导航。
- 所有列表页必须支持搜索、筛选、状态筛选和导出。
- 所有详情页必须展示创建时间、更新时间、操作记录或状态记录。
- 状态必须使用统一颜色标签，不能只用文字。
- 危险操作必须二次确认。
- 金额字段必须做权限控制。
- 客户员工端不展示金额，也不使用 `****` 占位，应直接隐藏金额模块。

### 12.2 后台规则

- 列表页统一采用「标题条 + 筛选区 + 表格区 + 详情入口」。
- 设备类、客户类、资产类可增加左侧组织树或分类树。
- 筛选区使用白色面板和细边框，查询按钮放在右下角。
- 表格区必须支持横向滚动和固定操作列。
- 批量操作放在表格标题行右侧。
- 关键操作必须有明确成功/失败反馈。
- BMS、轨迹、历史数据等监控页面可使用更强的数据可视化，但整体仍保持白色面板和浅灰背景。

### 12.3 客户移动端规则

- 客户端不暴露内部菜单和内部字段。
- 客户端不展示告警详情。
- 客户只能查看本客户公司的订单、电池、报修和账单。
- 客户员工不能查看金额相关信息。
- 扫码报修失败时必须明确提示“该电池不属于您的订单，无法提交报修”。
- 待确认收货页面必须提示 7 天自动收货。
- 移动端表单按钮建议固定在底部，方便单手操作。

---

## 13. 首批出图顺序

第一批建议先出 4 张，用于确定整体视觉方向：

| 顺序 | 页面 | 原因 |
|---|---|---|
| 1 | 设备管理列表 | 当前视觉基准，确认后台主风格 |
| 2 | BMS 详情 | 确认设备数据详情和图表风格 |
| 3 | 告警管理 | 确认异常、状态和处理流风格 |
| 4 | 租赁订单详情 | 确认业务流程和订单履约风格 |

第二批再出：

- 工作台首页
- 出库单创建
- 固定资产台账
- 财务账单管理
- 售后报修后台
- OA 审批详情
- 客户移动端首页
- 客户扫码报修
