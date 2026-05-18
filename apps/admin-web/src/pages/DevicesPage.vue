<template>
  <div class="target-device-page" :class="{ 'is-bms-view': viewMode === 'bms' }">
    <template v-if="viewMode === 'list'">
      <aside class="target-left">
        <div class="tree-panel">
          <el-input v-model="userKeyword" clearable placeholder="请输入用户名称" />
          <div class="user-tree">
            <button
              v-for="user in filteredUsers"
              :key="user"
              :class="{ active: user === selectedUser }"
              @click="selectedUser = user"
            >
              {{ user }}
            </button>
          </div>
        </div>

        <div class="left-line"></div>

        <div class="filter-block">
          <div class="filter-title">
            <span>设备筛选</span>
            <div class="scope-tabs">
              <button :class="{ active: ownerScope === 'all' }" @click="ownerScope = 'all'">
                全部
              </button>
              <button :class="{ active: ownerScope === 'self' }" @click="ownerScope = 'self'">
                本人
              </button>
            </div>
          </div>

          <button class="status-group active" @click="leftFilter = 'all'">
            <span>设备状态({{ visibleRows.length }})</span>
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

          <button class="side-item">
            <span class="side-left">
              <el-icon><House /></el-icon>
              续费(0)
            </span>
            <el-icon class="right-icon"><ArrowDown /></el-icon>
          </button>
          <button class="side-item" :class="{ active: leftFilter === 'alarm' }" @click="leftFilter = 'alarm'">
            <span class="side-left">
              <el-icon><Warning /></el-icon>
              异常({{ countByFilter("alarm") }})
            </span>
            <el-icon class="right-icon"><ArrowDown /></el-icon>
          </button>
          <button class="side-item">
            <span class="side-left">
              <el-icon><Tools /></el-icon>
              维护({{ visibleRows.length }})
            </span>
          </button>
          <button class="side-item">
            <span class="side-left">
              <el-icon><Document /></el-icon>
              批量查询
            </span>
          </button>
          <button class="side-item">
            <span class="side-left">
              <el-icon><Operation /></el-icon>
              分组管理
            </span>
          </button>
        </div>
      </aside>

      <main class="target-main">
        <div class="target-tabs">
          <button class="active">设备列表</button>
          <button @click="openDialog('地图模式')">地图模式</button>
          <button @click="openDialog('循环分析')">循环分析</button>
        </div>

        <div class="list-toolbar">
          <div class="toolbar-left">
            <el-select v-model="queryField" class="field-select">
              <el-option label="二维码" value="qrCode" />
              <el-option label="电池编号" value="batterySn" />
              <el-option label="所属机构" value="orgName" />
            </el-select>
            <el-input v-model="keyword" clearable placeholder="请输入内容">
              <template #append>
                <el-button :icon="Search" @click="noopSearch" />
              </template>
            </el-input>
            <el-button type="primary" @click="openDialog('分组查询')">分组查询</el-button>
            <el-button type="primary" @click="openDialog('更多')">更多</el-button>
            <el-button type="primary" @click="resetQuery">重置</el-button>
          </div>
          <div class="toolbar-right">
            <el-button @click="openDialog('修改BT码')">修改BT码</el-button>
            <el-button @click="exportCsv">导出</el-button>
            <el-dropdown trigger="click" @command="openDialog">
              <el-button>
                批量操作
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="续费">续费</el-dropdown-item>
                  <el-dropdown-item command="处理告警">处理告警</el-dropdown-item>
                  <el-dropdown-item command="绑定分组">绑定分组</el-dropdown-item>
                  <el-dropdown-item command="远程操作">远程操作</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <el-table :data="filteredRows" border height="calc(100% - 86px)" class="target-table">
          <el-table-column type="selection" width="50" fixed />
          <el-table-column type="index" label="序号" width="80" align="center" fixed />
          <el-table-column prop="qrCode" label="二维码" width="150" fixed show-overflow-tooltip />
          <el-table-column prop="orgName" label="所属机构" min-width="120" fixed />
          <el-table-column label="异常" width="48" align="center">
            <template #default="{ row }">
              <span v-if="row.hasAlarm" class="alarm-mark">▲</span>
            </template>
          </el-table-column>
          <el-table-column label="电量" width="60" align="center">
            <template #default="{ row }">
              <span class="power-tag" :class="{ low: row.powerPercent < 20 }">
                {{ row.powerPercent }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="outputState" label="输出" width="62" align="center" />
          <el-table-column label="电压V" width="82" align="right">
            <template #default="{ row }">{{ row.voltage }}V</template>
          </el-table-column>
          <el-table-column label="电流A" width="82" align="right">
            <template #default="{ row }">{{ row.current }}A</template>
          </el-table-column>
          <el-table-column label="温度℃" width="86" align="right">
            <template #default="{ row }">{{ row.temperature }}℃</template>
          </el-table-column>
          <el-table-column label="充电" width="60" align="center">
            <template #default="{ row }">
              <span class="switch-tag" :class="{ on: row.charge === '开' }">{{ row.charge }}</span>
            </template>
          </el-table-column>
          <el-table-column label="放电" width="60" align="center">
            <template #default="{ row }">
              <span class="switch-tag" :class="{ on: row.discharge === '开' }">{{ row.discharge }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="positioning" label="定位" width="68" />
          <el-table-column label="压差mV" width="92" align="right">
            <template #default="{ row }">{{ row.pressureDiff }}mV</template>
          </el-table-column>
          <el-table-column label="最高V" width="88" align="right">
            <template #default="{ row }">{{ row.maxVoltage }}V</template>
          </el-table-column>
          <el-table-column label="最低V" width="88" align="right">
            <template #default="{ row }">{{ row.minVoltage }}V</template>
          </el-table-column>
          <el-table-column label="SOH%" width="74" align="center">
            <template #default="{ row }">{{ row.soh || "" }}</template>
          </el-table-column>
          <el-table-column label="标称" width="76" align="right">
            <template #default="{ row }">{{ row.nominalCapacity }}AH</template>
          </el-table-column>
          <el-table-column label="剩余" width="76" align="right">
            <template #default="{ row }">{{ row.remainingCapacity }}AH</template>
          </el-table-column>
          <el-table-column label="循环" width="72" align="right">
            <template #default="{ row }">{{ row.cycleCount }}次</template>
          </el-table-column>
          <el-table-column prop="signal" label="信号" width="62" align="right" />
          <el-table-column label="串数" width="62" align="right">
            <template #default="{ row }">{{ row.seriesCount }}串</template>
          </el-table-column>
          <el-table-column label="总里程Km" width="104" align="right">
            <template #default="{ row }">{{ row.mileage }}Km</template>
          </el-table-column>
          <el-table-column prop="lastChargeDate" label="最后充电日期" width="128" />
          <el-table-column prop="lastDischargeDate" label="最后放电日期" width="128" />
          <el-table-column prop="updatedAt" label="更新时间" width="160" />
          <el-table-column prop="protectBoard" label="保护板" width="98" />
          <el-table-column prop="batterySn" label="电池编号" min-width="240" />
          <el-table-column label="操作" width="132" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button text type="primary" @click="openBms(row)">BMS</el-button>
                <el-button text type="primary" @click="openDialog('更多')">更多</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </template>

    <template v-else>
      <div class="bms-detail-page">
        <div class="panel-top">
          <div class="nav-box">
            <button
              v-for="tab in bmsTabs"
              :key="tab.val"
              class="item"
              :class="{ active: activeBmsTab === tab.val }"
              @click="activeBmsTab = tab.val"
            >
              {{ tab.label }}
            </button>
          </div>
          <div v-if="currentRow.hasAlarm" class="device-tips">当前设备存在重要告警，请及时处理</div>
          <div v-if="activeBmsTab === 1" class="tools-box">
            <el-button size="small" @click="detailVisible = true">
              <el-icon><View /></el-icon>
              日详情
            </el-button>
            <el-button size="small" :icon="Refresh" :loading="refreshLoading" @click="refreshBms">
              刷新
            </el-button>
            <el-button size="small" type="primary" @click="remoteVisible = true">
              <el-icon><Setting /></el-icon>
              操作
            </el-button>
          </div>
        </div>

        <div class="panel-content">
          <section v-if="activeBmsTab === 1" class="bms-content">
            <div class="content-l">
              <div class="bms-panel">
                <div class="bms-first">
                  <div>
                    <span class="device-qrcode">{{ currentRow.qrCode }}</span>
                    <span class="device-status" :class="{ offline: currentRow.status !== 'online' }">
                      {{ currentRow.status === "online" ? "在线" : "离线" }}
                    </span>
                    <span class="signal-bars">
                      <i></i><i></i><i></i>
                      {{ currentRow.signal }}
                    </span>
                  </div>
                  <div class="device-belong">
                    <el-icon><UserFilled /></el-icon>
                    {{ currentRow.orgName }}
                  </div>
                </div>

                <div class="bms-second">
                  <div class="second-l">{{ currentRow.protectBoard }}-{{ currentRow.batterySn }}</div>
                  <div class="second-r">更新时间：{{ currentRow.updatedAt }}</div>
                </div>

                <div class="bms-third">
                  <div class="third-l">
                    <div class="battery">
                      <div class="battery-top"></div>
                      <div class="fill-bg" :style="{ height: `${currentRow.powerPercent}%` }"></div>
                      <div class="value">{{ currentRow.powerPercent }}<small>%</small></div>
                    </div>
                    <div class="battery-status">{{ currentRow.outputState }}中</div>
                  </div>

                  <div class="third-r">
                    <div v-for="metric in bmsCoreMetrics" :key="metric.label" class="third-r-item">
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

                <div class="bms-fourth">
                  <div class="fourth-t">
                    <div class="fourth-t-l">
                      <span class="icon-box blue"><el-icon><Lightning /></el-icon></span>
                      <div>
                        <div class="fourth-label">充电MOS</div>
                        <strong>已打开</strong>
                      </div>
                    </div>
                    <div class="line"></div>
                    <div class="fourth-t-r">
                      <span class="icon-box red"><el-icon><Cpu /></el-icon></span>
                      <div>
                        <div class="fourth-label">放电MOS</div>
                        <strong>已打开</strong>
                      </div>
                    </div>
                  </div>
                  <div class="fourth-line"></div>
                  <div class="fourth-b">
                    <div v-for="temp in temperatureInfo" :key="temp.label" class="fourth-b-item">
                      <div class="item-val">{{ temp.value }}℃</div>
                      <div class="item-label" :style="{ color: temp.color }">
                        <el-icon><Sunny /></el-icon>
                        {{ temp.label }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="alarm-panel">
                <template v-if="leftAlarmRows.length">
                  <div class="alarm-list-panel">
                    <div class="list-head">
                      <div>告警时间</div>
                      <div>告警类型</div>
                      <div>持续时长</div>
                      <div>恢复状态</div>
                    </div>
                    <div class="list-body">
                      <div v-for="item in leftAlarmRows" :key="item.id" class="body-row">
                        <div>{{ item.alarmTime }}</div>
                        <div class="link" @click="activeBmsTab = 5">{{ item.alarmType }}</div>
                        <div>{{ item.duration }}</div>
                        <div>{{ item.state }}</div>
                      </div>
                    </div>
                  </div>
                </template>
                <el-empty v-else description="暂无告警" />
              </div>
            </div>

            <div class="content-r">
              <div class="chart-panel">
                <div v-for="chart in chartInfo" :key="chart.title" class="chart-item">
                  <div class="chart-title">{{ chart.title }}</div>
                  <div class="chart-val">{{ chart.value }}</div>
                  <div class="mini-line-chart" :class="chart.type">
                    <span v-for="line in chart.lines" :key="line" :style="{ top: line }"></span>
                    <em v-for="tick in chart.ticks" :key="tick" :style="{ left: tick }"></em>
                  </div>
                </div>
              </div>

              <div class="right-b">
                <div class="voltage-panel">
                  <div class="title">单体电压</div>
                  <div class="info-panel">
                    <div v-for="item in cellInfo" :key="item.label" class="item-info">
                      <span class="icon-box" :class="item.tone">
                        <el-icon><component :is="item.icon" /></el-icon>
                      </span>
                      <div class="info">
                        <div class="label">{{ item.label }}</div>
                        <div class="val">{{ item.value }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="voltage-chart">
                    <div v-for="bar in voltageBars" :key="bar.index" class="voltage-bar">
                      <span>{{ bar.value }}</span>
                      <i :style="{ height: bar.height }"></i>
                      <em>{{ bar.index }}</em>
                    </div>
                  </div>
                </div>

                <div class="address-panel">
                  <div class="map-panel">
                    <div class="now-address">
                      <span>当前位置</span>
                      <em>({{ currentRow.positioning }}定位，郑州市高新区科学大道100号)</em>
                    </div>
                    <div class="map-update">更新时间：{{ currentRow.updatedAt }}</div>
                    <div class="map-box">
                      <div class="map-more">
                        <div><el-icon><Location /></el-icon><span>{{ currentRow.positioning }}</span></div>
                        <div><el-icon><Histogram /></el-icon><span>0km/h</span></div>
                        <div><el-icon><Odometer /></el-icon><span>{{ currentRow.mileage }}km</span></div>
                      </div>
                      <div class="base-label">基站 0km</div>
                      <button class="base-btn">基站</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeBmsTab === 2" class="trajectory-panel">
            <div class="trajectory-side">
              <div class="info-item device-title">
                <el-icon class="user-icon"><UserFilled /></el-icon>
                <div>{{ currentRow.qrCode }}</div>
                <strong>{{ currentRow.protectBoard }}-{{ currentRow.batterySn }}</strong>
              </div>
              <div class="info-item subtle">所属机构：{{ currentRow.orgName }}</div>
              <div class="info-item date-row">
                <span>轨迹日期</span>
                <el-date-picker v-model="trajectoryDate" type="date" value-format="YYYY-MM-DD" />
              </div>
              <div class="info-item">
                <el-time-picker
                  v-model="trajectoryTimes"
                  is-range
                  clearable
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  placeholder="选择时间范围"
                />
              </div>
              <div class="info-item speed-row">
                <span class="label">速度</span>
                <el-slider v-model="trackSpeed" :min="1" :max="11" :step="2" show-stops />
              </div>
              <div class="info-item action-row">
                <el-button type="primary" :icon="isPlaying ? VideoPause : VideoPlay" @click="isPlaying = !isPlaying">
                  {{ isPlaying ? "暂停" : "开始" }}
                </el-button>
                <el-button @click="isPlaying = false">重置</el-button>
              </div>
              <div class="line"></div>
              <div class="info-item type-row">
                <div class="item-l">
                  <span :class="{ active: trajectoryMode === 'line' }" @click="trajectoryMode = 'line'">轨迹</span>
                  <span :class="{ active: trajectoryMode === 'stop' }" @click="trajectoryMode = 'stop'">停留点</span>
                </div>
                <div class="item-r" @click="openDialog('导出全部')">导出全部</div>
              </div>
              <div class="info-item mileage-total">
                今日轨迹里程：{{ currentRow.mileage }}Km
              </div>
              <div class="info-item list-box">
                <div
                  v-for="(point, index) in trajectoryList"
                  :key="point.time"
                  class="track-item"
                  :class="{ active: index === 0 }"
                >
                  <div class="line-top">
                    <span><i class="circle">{{ index + 1 }}</i>{{ point.title }}</span>
                    <strong>{{ point.distance }}</strong>
                  </div>
                  <div class="line-bottom">
                    <div class="start-step">
                      <i class="icon start-icon"></i>
                      <div class="time-box">
                        <span class="box-l"><el-icon><Timer /></el-icon> 时间</span>
                        <span class="box-r">{{ point.time }}</span>
                      </div>
                      <div class="site-text">位置</div>
                      <div class="address-box">
                        <span class="box-l"><el-icon><Location /></el-icon></span>
                        <span class="box-r">{{ point.address }}</span>
                      </div>
                    </div>
                    <div class="end-step" v-if="trajectoryMode === 'line'">
                      <i class="icon end-icon"></i>
                      <div class="time-box">
                        <span class="box-l"><el-icon><Timer /></el-icon> 时间</span>
                        <span class="box-r">{{ point.endTime }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="trajectory-map">
              <div class="map-grid"></div>
              <div class="route-line one"></div>
              <div class="route-line two"></div>
              <span class="map-marker start">起</span>
              <span class="map-marker mid">2</span>
              <span class="map-marker end">终</span>
              <div class="map-floating">
                <div><el-icon><Location /></el-icon> GPS</div>
                <div><el-icon><Histogram /></el-icon> {{ isPlaying ? "18.5km/h" : "0km/h" }}</div>
                <div><el-icon><Odometer /></el-icon> {{ currentRow.mileage }}km</div>
              </div>
              <div class="speed-curve">
                <div class="curve-title">速度曲线</div>
                <div class="curve-bars">
                  <i v-for="bar in speedBars" :key="bar" :style="{ height: bar }"></i>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeBmsTab === 3" class="history-panel">
            <div class="history-head">
              <el-date-picker
                v-model="historyDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
              />
              <el-button type="primary" :icon="Search">查询</el-button>
              <el-button>前一天</el-button>
              <el-button>后一天</el-button>
              <el-button @click="openDialog('电芯分析')">电芯分析</el-button>
              <el-button @click="openDialog('导出历史曲线')">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
            <div class="history-content">
              <aside class="history-left">
                <div class="history-device">
                  <strong>{{ currentRow.qrCode }}</strong>
                  <span>{{ currentRow.batterySn }}</span>
                </div>
                <div class="history-metric" v-for="metric in historyMetrics" :key="metric.label">
                  <div>
                    <i :style="{ background: metric.color }"></i>
                    {{ metric.label }}
                  </div>
                  <strong>{{ metric.value }}</strong>
                </div>
                <el-checkbox-group v-model="checkedCurves" class="curve-checks">
                  <el-checkbox label="电量" />
                  <el-checkbox label="电压" />
                  <el-checkbox label="电流" />
                  <el-checkbox label="温度" />
                  <el-checkbox label="里程" />
                </el-checkbox-group>
              </aside>
              <div class="history-charts">
                <div v-for="chart in historyCharts" :key="chart.title" class="history-chart">
                  <div class="chart-y">{{ chart.title }}</div>
                  <div class="chart-canvas">
                    <div class="axis-line" v-for="line in 4" :key="line"></div>
                    <svg viewBox="0 0 600 120" preserveAspectRatio="none">
                      <polyline :points="chart.points" :stroke="chart.color" />
                    </svg>
                    <div class="time-axis">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>24:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="activeBmsTab === 4" class="parameter-panel">
            <div class="parameter-toolbar">
              <el-radio-group v-model="parameterType">
                <el-radio-button label="general">一般参数设置</el-radio-button>
                <el-radio-button label="protect">保护参数设置</el-radio-button>
                <el-radio-button label="current">充放电保护电流</el-radio-button>
                <el-radio-button label="low">低电量设置</el-radio-button>
              </el-radio-group>
              <div class="parameter-actions">
                <el-button type="primary">加载模板</el-button>
                <el-button type="primary">保存为模板</el-button>
                <el-button>读取</el-button>
                <el-button type="primary">写入</el-button>
              </div>
            </div>
            <div class="parameter-content">
              <div v-for="group in activeParameterGroups" :key="group.title" class="param-card">
                <div class="color-title">
                  <span></span>
                  <strong>{{ group.title }}</strong>
                </div>
                <el-descriptions :column="3" border>
                  <el-descriptions-item v-for="item in group.items" :key="item.label" :label="item.label">
                    <el-input v-model="item.value" size="small">
                      <template #append>{{ item.unit }}</template>
                    </el-input>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </section>

          <section v-else-if="activeBmsTab === 5" class="record-page">
            <div class="record-head">
              <el-select v-model="alarmType" placeholder="告警类型查询" clearable>
                <el-option label="单体欠压" value="low" />
                <el-option label="单体过压" value="high" />
                <el-option label="温度异常" value="temp" />
              </el-select>
              <el-date-picker
                v-model="alarmRange"
                type="datetimerange"
                range-separator="至"
                start-placeholder="告警开始时间"
                end-placeholder="告警结束时间"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
              <el-button type="primary" :icon="Search">查询</el-button>
              <el-button class="right-action" @click="openDialog('批量导出')">
                <el-icon><Download /></el-icon>
                批量导出
              </el-button>
            </div>
            <el-table :data="alarmRows" border stripe height="calc(100% - 58px)" class="record-table">
              <el-table-column prop="deviceNum" label="设备编号" width="140" />
              <el-table-column prop="qrCode" label="二维码" min-width="120" />
              <el-table-column prop="userName" label="所属机构" min-width="120" />
              <el-table-column prop="board" label="保护板厂家" width="120" align="center" />
              <el-table-column prop="alarmType" label="告警类型" min-width="180" />
              <el-table-column prop="alarmTime" label="告警时间" width="180" />
              <el-table-column prop="duration" label="持续时长" width="150" />
              <el-table-column prop="state" label="恢复状态" width="100" />
              <el-table-column prop="batterySn" label="电池编号" min-width="220" />
              <el-table-column label="操作" width="90" fixed="right">
                <template #default>
                  <el-button text type="primary" @click="openDialog('告警详情')">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </section>

          <section v-else-if="activeBmsTab === 6" class="record-page">
            <div class="record-head">
              <el-select v-model="changeType" placeholder="变更类型查询" clearable>
                <el-option label="手动备注" value="manual" />
                <el-option label="换货记录" value="replace" />
                <el-option label="维修记录" value="repair" />
              </el-select>
              <div class="right-action group">
                <el-button @click="openDialog('新增设备纪事')">
                  <el-icon><Plus /></el-icon>
                  新增
                </el-button>
                <el-button>
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </div>
            <el-table :data="deviceRecords" border stripe height="calc(100% - 58px)" class="record-table">
              <el-table-column type="selection" width="50" align="center" />
              <el-table-column prop="deviceNum" label="设备编号" min-width="180" />
              <el-table-column prop="changeType" label="变更类型" min-width="160" align="center" />
              <el-table-column prop="content" label="变更内容" min-width="260" show-overflow-tooltip />
              <el-table-column prop="createTime" label="创建时间" width="180" />
            </el-table>
          </section>

          <section v-else class="record-page">
            <div class="record-head command-head">
              <el-select v-model="commandQuery.userType" placeholder="用户类型查询" clearable>
                <el-option label="平台用户" value="sys_user" />
                <el-option label="终端用户" value="end_user" />
              </el-select>
              <el-select v-model="commandQuery.type" placeholder="操作类型查询" clearable>
                <el-option label="读状态数据" value="1" />
                <el-option label="控制" value="2" />
                <el-option label="读参数" value="3" />
                <el-option label="写参数" value="4" />
              </el-select>
              <el-select v-model="commandQuery.sendType" placeholder="接口类型查询" clearable>
                <el-option label="平台下发" value="platform" />
                <el-option label="设备上报" value="device" />
              </el-select>
              <el-select v-model="commandQuery.result" placeholder="操作结果查询" clearable>
                <el-option label="成功" value="0" />
                <el-option label="已下发" value="1" />
              </el-select>
              <el-select v-model="commandQuery.userId" placeholder="请选择所属机构" clearable>
                <el-option label="测试电池" value="1" />
                <el-option label="Y2测试" value="2" />
              </el-select>
              <el-input v-model="commandQuery.createBy" placeholder="请输入操作人员">
                <template #append>
                  <el-button :icon="Search" />
                </template>
              </el-input>
            </div>
            <el-table :data="commandRows" border stripe height="calc(100% - 74px)" class="record-table">
              <el-table-column prop="deviceNum" label="设备编号" width="140" />
              <el-table-column prop="qrCode" label="二维码" min-width="120" />
              <el-table-column prop="batterySn" label="电池编号" min-width="170" />
              <el-table-column prop="createBy" label="操作人员" width="120" />
              <el-table-column prop="userType" label="用户类型" width="100" />
              <el-table-column prop="userName" label="所属机构" min-width="130" />
              <el-table-column prop="type" label="操作类型" width="120" />
              <el-table-column prop="sendType" label="接口类型" width="120" />
              <el-table-column prop="msgType" label="具体操作开始地址" width="140" />
              <el-table-column prop="content" label="报文内容" min-width="170" show-overflow-tooltip />
              <el-table-column prop="remark" label="中文内容" min-width="170" show-overflow-tooltip />
              <el-table-column label="操作结果" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.result === '成功' ? 'success' : 'warning'">{{ row.result }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间" width="180" />
            </el-table>
          </section>
        </div>
      </div>
    </template>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-empty description="该操作入口已保留，后续接真实接口" />
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="日详情" width="1100px" class="device-detail-dialog">
      <el-tabs>
        <el-tab-pane label="设备信息">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="设备编号">{{ currentRow.qrCode }}</el-descriptions-item>
            <el-descriptions-item label="电池编号">{{ currentRow.batterySn }}</el-descriptions-item>
            <el-descriptions-item label="所属机构">{{ currentRow.orgName }}</el-descriptions-item>
            <el-descriptions-item label="今日里程">{{ currentRow.mileage }}Km</el-descriptions-item>
            <el-descriptions-item label="电芯类型/串数">磷酸铁锂/{{ currentRow.seriesCount }}串</el-descriptions-item>
            <el-descriptions-item label="SOH">{{ currentRow.soh || "--" }}</el-descriptions-item>
            <el-descriptions-item label="最后充电日期">{{ currentRow.lastChargeDate }}</el-descriptions-item>
            <el-descriptions-item label="最后放电日期">{{ currentRow.lastDischargeDate }}</el-descriptions-item>
            <el-descriptions-item label="BMS时间">{{ currentRow.updatedAt }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="保护板信息">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="保护板">{{ currentRow.protectBoard }}</el-descriptions-item>
            <el-descriptions-item label="485通信状态">485通讯</el-descriptions-item>
            <el-descriptions-item label="CAN通信状态">CAN未通信</el-descriptions-item>
            <el-descriptions-item label="充电量">{{ currentRow.remainingCapacity }}AH</el-descriptions-item>
            <el-descriptions-item label="放电量">{{ currentRow.nominalCapacity - currentRow.remainingCapacity }}AH</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ currentRow.updatedAt }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="remoteVisible" title="操作" width="420px">
      <el-tabs stretch>
        <el-tab-pane label="控制MOS">
          <el-form label-width="110px">
            <el-form-item label="充电MOS">
              <el-switch v-model="remoteForm.chargeMos" active-text="开" inactive-text="关" />
            </el-form-item>
            <el-form-item label="放电MOS">
              <el-switch v-model="remoteForm.dischargeMos" active-text="开" inactive-text="关" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="校准">
          <el-form label-width="110px">
            <el-form-item label="当前电量">
              <el-input-number v-model="remoteForm.soc" :min="0" :max="100" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="remoteVisible = false">取消</el-button>
        <el-button type="primary" @click="remoteVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Box,
  CircleCheck,
  Close,
  Cpu,
  DataLine,
  Delete,
  Document,
  Download,
  Histogram,
  House,
  Lightning,
  Location,
  Odometer,
  Operation,
  Plus,
  Refresh,
  Search,
  Setting,
  Tickets,
  Timer,
  Tools,
  UserFilled,
  VideoPause,
  VideoPlay,
  View,
  Warning,
  Sunny,
} from "@element-plus/icons-vue";
import { useRoute, useRouter } from "vue-router";

type DeviceRow = {
  id: string;
  qrCode: string;
  orgName: string;
  hasAlarm: boolean;
  powerPercent: number;
  outputState: string;
  voltage: number;
  current: number;
  temperature: number;
  charge: "开" | "关";
  discharge: "开" | "关";
  positioning: string;
  pressureDiff: number;
  maxVoltage: number;
  minVoltage: number;
  soh: string;
  nominalCapacity: number;
  remainingCapacity: number;
  cycleCount: number;
  signal: number;
  seriesCount: number;
  mileage: number;
  lastChargeDate: string;
  lastDischargeDate: string;
  updatedAt: string;
  protectBoard: string;
  batterySn: string;
  status: "online" | "offline" | "silent";
};

type BmsTab = 1 | 2 | 3 | 4 | 5 | 6 | 8;

const targetRows: DeviceRow[] = [
  {
    id: "1",
    qrCode: "H2505017434",
    orgName: "测试电池",
    hasAlarm: false,
    powerPercent: 91,
    outputState: "空闲",
    voltage: 80,
    current: 0,
    temperature: 29.7,
    charge: "开",
    discharge: "开",
    positioning: "基站",
    pressureDiff: 6,
    maxVoltage: 3.33,
    minVoltage: 3.32,
    soh: "",
    nominalCapacity: 45,
    remainingCapacity: 41,
    cycleCount: 14,
    signal: 17,
    seriesCount: 24,
    mileage: 2112,
    lastChargeDate: "2026-04-25",
    lastDischargeDate: "2026-03-31",
    updatedAt: "2026-05-17 23:00:27",
    protectBoard: "锂钠安",
    batterySn: "BT107204512BGYH250919001",
    status: "online",
  },
  {
    id: "2",
    qrCode: "T2509350872",
    orgName: "测试电池",
    hasAlarm: true,
    powerPercent: 0,
    outputState: "空闲",
    voltage: 37,
    current: 0,
    temperature: 18.3,
    charge: "关",
    discharge: "关",
    positioning: "基站",
    pressureDiff: 179,
    maxVoltage: 2.43,
    minVoltage: 2.25,
    soh: "",
    nominalCapacity: 50,
    remainingCapacity: 0,
    cycleCount: 1,
    signal: 31,
    seriesCount: 16,
    mileage: 189,
    lastChargeDate: "2025-11-26",
    lastDischargeDate: "2025-09-16",
    updatedAt: "2026-05-13 22:17:48",
    protectBoard: "锂钠安",
    batterySn: "BT104805012BGYH250915092",
    status: "offline",
  },
  {
    id: "3",
    qrCode: "T2509350770",
    orgName: "测试电池",
    hasAlarm: true,
    powerPercent: 0,
    outputState: "空闲",
    voltage: 37,
    current: 0,
    temperature: 23.1,
    charge: "关",
    discharge: "关",
    positioning: "基站",
    pressureDiff: 164,
    maxVoltage: 2.41,
    minVoltage: 2.25,
    soh: "",
    nominalCapacity: 50,
    remainingCapacity: 0,
    cycleCount: 1,
    signal: 31,
    seriesCount: 16,
    mileage: 186,
    lastChargeDate: "2025-11-22",
    lastDischargeDate: "2025-09-16",
    updatedAt: "2026-05-12 11:10:57",
    protectBoard: "锂钠安",
    batterySn: "BT104805012BGYH250915084",
    status: "offline",
  },
  {
    id: "4",
    qrCode: "H2507032375",
    orgName: "Y2测试",
    hasAlarm: false,
    powerPercent: 0,
    outputState: "空闲",
    voltage: 72,
    current: 0,
    temperature: 23.3,
    charge: "关",
    discharge: "关",
    positioning: "基站",
    pressureDiff: 967,
    maxVoltage: 3.17,
    minVoltage: 2.2,
    soh: "",
    nominalCapacity: 45,
    remainingCapacity: 0,
    cycleCount: 6,
    signal: 20,
    seriesCount: 24,
    mileage: 848,
    lastChargeDate: "2025-10-24",
    lastDischargeDate: "2025-11-15",
    updatedAt: "2026-05-17 21:10:51",
    protectBoard: "锂钠安",
    batterySn: "BT107204512BGYH250913001",
    status: "offline",
  },
  {
    id: "5",
    qrCode: "H2507035606",
    orgName: "测试电池",
    hasAlarm: false,
    powerPercent: 98,
    outputState: "空闲",
    voltage: 67,
    current: 0,
    temperature: 25.2,
    charge: "开",
    discharge: "开",
    positioning: "基站",
    pressureDiff: 3,
    maxVoltage: 3.33,
    minVoltage: 3.32,
    soh: "100%",
    nominalCapacity: 45,
    remainingCapacity: 44,
    cycleCount: 2,
    signal: 19,
    seriesCount: 20,
    mileage: 2251,
    lastChargeDate: "2026-05-12",
    lastDischargeDate: "2025-09-19",
    updatedAt: "2026-05-17 22:59:40",
    protectBoard: "锂钠安",
    batterySn: "BT106004512BGYH250913001",
    status: "online",
  },
  {
    id: "6",
    qrCode: "T2507328403",
    orgName: "测试电池",
    hasAlarm: false,
    powerPercent: 7,
    outputState: "空闲",
    voltage: 51,
    current: 0,
    temperature: 27.6,
    charge: "开",
    discharge: "开",
    positioning: "GPS",
    pressureDiff: 3,
    maxVoltage: 3.19,
    minVoltage: 3.19,
    soh: "100%",
    nominalCapacity: 55,
    remainingCapacity: 4,
    cycleCount: 50,
    signal: 29,
    seriesCount: 16,
    mileage: 4836,
    lastChargeDate: "2026-04-18",
    lastDischargeDate: "2026-04-18",
    updatedAt: "2026-05-17 22:58:50",
    protectBoard: "锂钠安",
    batterySn: "BT1048055120KAN250823001",
    status: "online",
  },
  {
    id: "7",
    qrCode: "T2507334361",
    orgName: "首衡测试",
    hasAlarm: false,
    powerPercent: 79,
    outputState: "空闲",
    voltage: 80,
    current: 0,
    temperature: 20.4,
    charge: "开",
    discharge: "关",
    positioning: "基站",
    pressureDiff: 3,
    maxVoltage: 3.32,
    minVoltage: 3.32,
    soh: "",
    nominalCapacity: 105,
    remainingCapacity: 35,
    cycleCount: 19,
    signal: 23,
    seriesCount: 24,
    mileage: 1299,
    lastChargeDate: "2026-04-10",
    lastDischargeDate: "2026-04-07",
    updatedAt: "2026-05-17 22:58:45",
    protectBoard: "锂钠安",
    batterySn: "BT107210512BGYH250827001",
    status: "online",
  },
  {
    id: "8",
    qrCode: "T2505314545",
    orgName: "测试电池",
    hasAlarm: true,
    powerPercent: 0,
    outputState: "空闲",
    voltage: 50,
    current: 0,
    temperature: 24.4,
    charge: "关",
    discharge: "关",
    positioning: "基站",
    pressureDiff: 931,
    maxVoltage: 3.18,
    minVoltage: 2.25,
    soh: "",
    nominalCapacity: 50,
    remainingCapacity: 0,
    cycleCount: 20,
    signal: 29,
    seriesCount: 16,
    mileage: 661,
    lastChargeDate: "2025-11-28",
    lastDischargeDate: "2025-08-15",
    updatedAt: "2026-05-12 09:09:10",
    protectBoard: "锂钠安",
    batterySn: "BT104805012ZJYH02507001",
    status: "offline",
  },
];

const users = ["测试电池", "Y2测试", "CS测试", "首衡测试"];
const userKeyword = ref("");
const selectedUser = ref("测试电池");
const ownerScope = ref<"all" | "self">("all");
const leftFilter = ref("all");
const queryField = ref<"qrCode" | "batterySn" | "orgName">("qrCode");
const keyword = ref("");
const viewMode = ref<"list" | "bms">("list");
const currentRow = ref<DeviceRow>(targetRows[0]);
const activeBmsTab = ref<BmsTab>(1);
const dialogVisible = ref(false);
const dialogTitle = ref("");
const detailVisible = ref(false);
const remoteVisible = ref(false);
const refreshLoading = ref(false);
const route = useRoute();
const router = useRouter();

const trajectoryDate = ref("2026-05-17");
const historyDate = ref("2026-05-17");
const trackSpeed = ref(5);
const trajectoryMode = ref<"line" | "stop">("line");
const isPlaying = ref(false);
const trajectoryTimes = ref<[Date, Date]>([
  new Date("2026-05-17 00:00:00"),
  new Date("2026-05-17 23:59:59"),
]);
const checkedCurves = ref(["电量", "电压", "电流", "温度", "里程"]);
const parameterType = ref("general");
const alarmType = ref("");
const alarmRange = ref<[string, string] | []>([]);
const changeType = ref("");
const commandQuery = ref({
  userType: "",
  type: "",
  sendType: "",
  result: "",
  userId: "",
  createBy: "",
});
const remoteForm = ref({
  chargeMos: true,
  dischargeMos: true,
  soc: 91,
});

const statusFilters = [
  { key: "online", label: "在线", icon: CircleCheck },
  { key: "offline", label: "离线", icon: Close },
  { key: "silent", label: "沉默", icon: Warning },
] as const;

const bmsTabs: { label: string; val: BmsTab }[] = [
  { label: "BMS", val: 1 },
  { label: "电池轨迹", val: 2 },
  { label: "历史曲线", val: 3 },
  { label: "参数设置", val: 4 },
  { label: "重要告警", val: 5 },
  { label: "设备纪事", val: 6 },
  { label: "指令下发记录", val: 8 },
];

const filteredUsers = computed(() => {
  const text = userKeyword.value.trim();
  if (!text) return users;
  return users.filter((user) => user.includes(text));
});

const rootUser = users[0];
const bmsTabValues = [1, 2, 3, 4, 5, 6, 8] as const;

const visibleRows = computed(() => {
  let rows = targetRows;
  if (selectedUser.value && selectedUser.value !== rootUser) {
    rows = rows.filter((item) => item.orgName === selectedUser.value);
  }
  if (leftFilter.value === "online") return rows.filter((item) => item.status === "online");
  if (leftFilter.value === "offline") return rows.filter((item) => item.status === "offline");
  if (leftFilter.value === "silent") return rows.filter((item) => item.status === "silent");
  if (leftFilter.value === "alarm") return rows.filter((item) => item.hasAlarm);
  return rows;
});

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return visibleRows.value;
  return visibleRows.value.filter((item) =>
    String(item[queryField.value]).toLowerCase().includes(text),
  );
});

const bmsTemp2 = computed(() => Number((currentRow.value.temperature - 1.3).toFixed(1)));
const powerTemp = computed(() => Number((currentRow.value.temperature - 0.1).toFixed(1)));

const bmsCoreMetrics = computed(() => [
  { label: "电压", value: `${currentRow.value.voltage.toFixed(1)}V`, icon: DataLine },
  { label: "电流", value: `${currentRow.value.current}A`, icon: Histogram },
  { label: "循环次数", value: `${currentRow.value.cycleCount}次`, icon: Refresh },
  { label: "设计容量", value: `${currentRow.value.nominalCapacity}Ah`, icon: Box },
]);

const temperatureInfo = computed(() => [
  { label: "电芯温度1", value: currentRow.value.temperature, color: "#2563ff" },
  { label: "电芯温度2", value: bmsTemp2.value, color: "#42bf79" },
  { label: "功率温度", value: powerTemp.value, color: "#f37c5b" },
]);

const chartInfo = computed(() => [
  {
    title: "当前电量",
    value: `${currentRow.value.powerPercent}%`,
    type: "soc",
    lines: ["30%", "62%"],
    ticks: ["8%", "31%", "54%", "77%"],
  },
  {
    title: "温度",
    value: `${currentRow.value.temperature}℃`,
    type: "temp",
    lines: ["44%", "48%"],
    ticks: ["8%", "31%", "54%", "77%"],
  },
  {
    title: "总里程",
    value: `${currentRow.value.mileage}Km`,
    type: "mileage",
    lines: ["76%"],
    ticks: ["10%", "30%", "50%", "70%", "90%"],
  },
]);

const cellInfo = computed(() => [
  {
    label: "电芯类型/串数",
    value: `磷酸铁锂/${currentRow.value.seriesCount}串`,
    tone: "blue",
    icon: Tickets,
  },
  { label: "压差", value: `${currentRow.value.pressureDiff}mV`, tone: "mint", icon: Odometer },
  { label: "单体最大电压", value: `${currentRow.value.maxVoltage}V`, tone: "pink", icon: DataLine },
  { label: "单体最小电压", value: `${currentRow.value.minVoltage}V`, tone: "yellow", icon: DataLine },
]);

const voltageBars = computed(() =>
  Array.from({ length: currentRow.value.seriesCount }, (_, index) => {
    const step = (index * 7) % 6;
    const value = Number((currentRow.value.minVoltage + step * 0.001).toFixed(3));
    return {
      index: index + 1,
      value,
      height: `${Math.max(42, Math.round((value / currentRow.value.maxVoltage) * 178))}px`,
    };
  }),
);

const leftAlarmRows = computed(() =>
  currentRow.value.hasAlarm
    ? [
        {
          id: "a1",
          alarmTime: currentRow.value.updatedAt,
          alarmType: "单体欠压",
          duration: "2天3小时",
          state: "未恢复",
        },
      ]
    : [],
);

const trajectoryList = computed(() => [
  {
    title: "起点",
    distance: "0.8km",
    time: `${trajectoryDate.value} 08:12:35`,
    endTime: `${trajectoryDate.value} 08:26:10`,
    address: "河南省郑州市高新区科学大道100号",
  },
  {
    title: "停留点",
    distance: "1.4km",
    time: `${trajectoryDate.value} 12:18:02`,
    endTime: `${trajectoryDate.value} 12:46:41`,
    address: "郑州市中原区长椿路与冬青街交叉口",
  },
  {
    title: "终点",
    distance: "2.6km",
    time: `${trajectoryDate.value} 18:05:18`,
    endTime: `${trajectoryDate.value} 18:25:06`,
    address: "郑州市高新区莲花街地铁站附近",
  },
]);

const speedBars = ["32px", "54px", "72px", "45px", "88px", "58px", "70px", "96px", "62px", "44px"];

const historyMetrics = computed(() => [
  { label: "当前电量", value: `${currentRow.value.powerPercent}%`, color: "#52c41a" },
  { label: "总电压", value: `${currentRow.value.voltage}V`, color: "#2563ff" },
  { label: "电流", value: `${currentRow.value.current}A`, color: "#f37c5b" },
  { label: "最高温度", value: `${currentRow.value.temperature}℃`, color: "#faad14" },
  { label: "总里程", value: `${currentRow.value.mileage}Km`, color: "#13c2c2" },
]);

const historyCharts = computed(() => [
  { title: "电量/容量", color: "#52c41a", points: "0,62 80,60 160,61 240,59 320,58 400,58 480,57 600,55" },
  { title: "电压/电流", color: "#2563ff", points: "0,38 80,40 160,39 240,42 320,41 400,42 480,44 600,43" },
  { title: "温度", color: "#f37c5b", points: "0,70 80,66 160,68 240,64 320,60 400,58 480,57 600,56" },
  { title: "里程", color: "#13c2c2", points: "0,106 80,96 160,90 240,74 320,72 400,58 480,42 600,36" },
]);

const parameterGroups = {
  general: [
    {
      title: "一般参数设置",
      items: [
        { label: "设计容量", value: "45000", unit: "mAH" },
        { label: "循环容量", value: "36000", unit: "mAH" },
        { label: "单体满电压", value: "3650", unit: "mV" },
        { label: "单体空电压", value: "2500", unit: "mV" },
        { label: "自放电率", value: "3", unit: "%" },
        { label: "均衡开启电压", value: "3400", unit: "mV" },
      ],
    },
    {
      title: "功能配置",
      items: [
        { label: "电芯温度数量", value: "2", unit: "个" },
        { label: "NTC数量", value: "3", unit: "个" },
        { label: "串数", value: String(currentRow.value.seriesCount), unit: "串" },
      ],
    },
  ],
  protect: [
    {
      title: "保护参数设置",
      items: [
        { label: "单体过压保护", value: "3650", unit: "mV" },
        { label: "单体过压恢复", value: "3500", unit: "mV" },
        { label: "单体欠压保护", value: "2500", unit: "mV" },
        { label: "单体欠压恢复", value: "2800", unit: "mV" },
        { label: "充电高温保护", value: "55", unit: "℃" },
        { label: "放电高温保护", value: "65", unit: "℃" },
      ],
    },
  ],
  current: [
    {
      title: "充放电保护电流",
      items: [
        { label: "充电过流保护", value: "60", unit: "A" },
        { label: "放电过流保护", value: "120", unit: "A" },
        { label: "短路保护延时", value: "300", unit: "us" },
      ],
    },
  ],
  low: [
    {
      title: "低电量设置",
      items: [
        { label: "低电量告警", value: "20", unit: "%" },
        { label: "严重低电量", value: "10", unit: "%" },
        { label: "休眠电量", value: "5", unit: "%" },
      ],
    },
  ],
};

const activeParameterGroups = computed(() => {
  return parameterGroups[parameterType.value as keyof typeof parameterGroups];
});

const alarmRows = computed(() => [
  {
    deviceNum: currentRow.value.qrCode,
    qrCode: currentRow.value.qrCode,
    userName: currentRow.value.orgName,
    board: currentRow.value.protectBoard,
    alarmType: "单体欠压",
    alarmTime: currentRow.value.updatedAt,
    duration: "2天3小时",
    state: currentRow.value.hasAlarm ? "未恢复" : "已恢复",
    batterySn: currentRow.value.batterySn,
  },
  {
    deviceNum: currentRow.value.qrCode,
    qrCode: currentRow.value.qrCode,
    userName: currentRow.value.orgName,
    board: currentRow.value.protectBoard,
    alarmType: "温度异常",
    alarmTime: "2026-05-16 17:22:03",
    duration: "18分钟",
    state: "已恢复",
    batterySn: currentRow.value.batterySn,
  },
]);

const deviceRecords = computed(() => [
  {
    deviceNum: currentRow.value.qrCode,
    changeType: "手动备注",
    content: "设备巡检完成，BMS数据正常。",
    createTime: "2026-05-17 20:12:11",
  },
  {
    deviceNum: currentRow.value.qrCode,
    changeType: "维修记录",
    content: "检查保护板连接线束，重新固定外壳。",
    createTime: "2026-05-12 11:20:45",
  },
]);

const commandRows = computed(() => [
  {
    deviceNum: currentRow.value.qrCode,
    qrCode: currentRow.value.qrCode,
    batterySn: currentRow.value.batterySn,
    createBy: "系统管理员",
    userType: "平台用户",
    userName: currentRow.value.orgName,
    type: "读状态数据",
    sendType: "平台下发",
    msgType: "0x03",
    content: "68 31 00 00 16",
    remark: "读取BMS状态数据",
    result: "成功",
    createTime: "2026-05-17 23:01:10",
  },
  {
    deviceNum: currentRow.value.qrCode,
    qrCode: currentRow.value.qrCode,
    batterySn: currentRow.value.batterySn,
    createBy: "系统管理员",
    userType: "平台用户",
    userName: currentRow.value.orgName,
    type: "控制",
    sendType: "平台下发",
    msgType: "0x10",
    content: "68 10 01 01 16",
    remark: "控制充放电MOS",
    result: "已下发",
    createTime: "2026-05-17 22:44:08",
  },
]);

function countByFilter(key: string) {
  const rows =
    selectedUser.value && selectedUser.value !== rootUser
      ? targetRows.filter((item) => item.orgName === selectedUser.value)
      : targetRows;
  if (key === "online") return rows.filter((item) => item.status === "online").length;
  if (key === "offline") return rows.filter((item) => item.status === "offline").length;
  if (key === "silent") return rows.filter((item) => item.status === "silent").length;
  if (key === "alarm") return rows.filter((item) => item.hasAlarm).length;
  return rows.length;
}

function resolveRow(qrCode?: string | null) {
  if (!qrCode) return targetRows[0];
  return targetRows.find((item) => item.qrCode === qrCode) ?? targetRows[0];
}

function resolveTab(tab?: string | null) {
  const value = Number(tab);
  return bmsTabValues.includes(value as BmsTab) ? (value as BmsTab) : 1;
}

function syncFromRoute() {
  if (route.query.view !== "bms") {
    viewMode.value = "list";
    return;
  }
  currentRow.value = resolveRow(typeof route.query.device === "string" ? route.query.device : null);
  activeBmsTab.value = resolveTab(typeof route.query.tab === "string" ? route.query.tab : null);
  viewMode.value = "bms";
}

function resetQuery() {
  keyword.value = "";
  leftFilter.value = "all";
}

function openBms(row: DeviceRow) {
  currentRow.value = row;
  activeBmsTab.value = 1;
  viewMode.value = "bms";
  router.push({
    path: "/devices",
    query: {
      view: "bms",
      device: row.qrCode,
      tab: "1",
    },
  });
}

function refreshBms() {
  refreshLoading.value = true;
  window.setTimeout(() => {
    currentRow.value = { ...currentRow.value, updatedAt: "2026-05-17 23:00:55" };
    refreshLoading.value = false;
  }, 500);
}

function openDialog(title: string) {
  dialogTitle.value = title;
  dialogVisible.value = true;
}

function noopSearch() {
  return undefined;
}

function exportCsv() {
  const header = [
    "二维码",
    "所属机构",
    "异常",
    "电量",
    "电压V",
    "电流A",
    "温度℃",
    "压差mV",
    "最高V",
    "最低V",
    "电池编号",
  ];
  const body = filteredRows.value.map((item) =>
    [
      item.qrCode,
      item.orgName,
      item.hasAlarm ? "异常" : "",
      `${item.powerPercent}%`,
      item.voltage,
      item.current,
      item.temperature,
      item.pressureDiff,
      item.maxVoltage,
      item.minVoltage,
      item.batterySn,
    ].join(","),
  );
  const blob = new Blob([[header.join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "device-list.csv";
  link.click();
  URL.revokeObjectURL(url);
}

watch(
  () => route.query,
  () => {
    syncFromRoute();
  },
  { immediate: true },
);

watch(activeBmsTab, (tab) => {
  if (viewMode.value !== "bms") return;
  const nextQuery = {
    view: "bms",
    device: currentRow.value.qrCode,
    tab: String(tab),
  };
  const sameQuery =
    route.query.view === nextQuery.view &&
    route.query.device === nextQuery.device &&
    route.query.tab === nextQuery.tab;
  if (sameQuery) return;
  router.replace({ path: "/devices", query: nextQuery });
});
</script>

<style scoped>
.target-device-page {
  height: calc(100vh - 70px);
  display: flex;
  gap: 16px;
  margin: -16px;
  padding: 16px;
  overflow: hidden;
  color: #3a374c;
  background: #eef0f3;
}

.target-device-page.is-bms-view {
  display: block;
  padding: 0;
}

.target-device-page :deep(.el-button--primary) {
  --el-button-bg-color: #4e5afe;
  --el-button-border-color: #4e5afe;
  --el-button-hover-bg-color: #626cff;
  --el-button-hover-border-color: #626cff;
}

.target-left {
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

.user-tree {
  height: 310px;
  margin-top: 0;
  padding: 8px 15px;
  overflow-y: auto;
  border: 1px solid #d8d8d8;
  border-top: 0;
  border-radius: 0 0 10px 10px;
}

.user-tree button,
.target-tabs button,
.nav-box button,
.side-item,
.status-group {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.user-tree button {
  width: 100%;
  min-height: 26px;
  display: block;
  padding: 3px 10px;
  color: #222;
  border-radius: 6px;
  text-align: left;
}

.user-tree button.active {
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

.target-main {
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

.target-table :deep(.el-table__row:nth-child(5)) {
  background: #eef0ff;
}

.alarm-mark {
  color: #ff385c;
  font-size: 12px;
}

.power-tag,
.switch-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 32px;
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

.switch-tag {
  color: #8f959e;
  border-color: #d5d9e2;
  background: #f7f8fa;
}

.switch-tag.on {
  color: #16a364;
  border-color: #6add9f;
  background: #effbf4;
}

.bms-detail-page {
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

.panel-top > div {
  display: inline-block;
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

.device-tips {
  margin-left: 10px;
  color: #f14949;
  font-size: 18px;
  line-height: 44px;
}

.tools-box {
  margin-left: auto;
  line-height: 42px;
}

.tools-box :deep(.el-button .el-icon) {
  margin-right: 4px;
}

.panel-content {
  height: calc(100% - 57px);
  padding: 0 4px;
}

.bms-content {
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

.bms-panel {
  flex-shrink: 0;
  color: #3a374c;
  padding: clamp(16px, 1.04167vw, 22px) clamp(22px, 1.5625vw, 32px);
  border-radius: 20px;
  background: #fff;
}

.bms-first,
.bms-second,
.bms-third {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bms-first {
  margin-bottom: 5px;
}

.device-qrcode {
  margin-right: 10px;
  color: #23253c;
  font-size: 18px;
}

.device-status {
  display: inline-block;
  margin-right: 10px;
  padding: 1px 6px;
  color: #42bf79;
  border: 1px solid #42bf79;
  border-radius: 5px;
  background: #ecf8f1;
  font-size: 14px;
}

.device-status.offline {
  color: #868395;
  border-color: #868395;
  background: rgba(134, 131, 149, 0.1);
}

.signal-bars {
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

.device-belong {
  display: flex;
  align-items: center;
  color: #4e5afe;
  font-size: 12px;
}

.bms-second {
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

.bms-third {
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
  background: linear-gradient(
    90deg,
    rgba(251, 251, 251, 0),
    #d8d8d8 27%,
    rgba(216, 216, 216, 0.49) 70%,
    rgba(251, 251, 251, 0)
  );
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
  width: 96px;
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
  color: #23253c;
  font-size: 24px;
}

.bms-fourth {
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

.fourth-t-l,
.fourth-t-r {
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

.icon-box.red {
  background: #ffe4dc;
}

.icon-box.mint {
  background: #cefcf1;
}

.icon-box.pink {
  background: #ffe4e6;
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

.fourth-t .line {
  width: 1px;
  height: 46px;
  background: linear-gradient(180deg, rgba(251, 251, 251, 0), #d8d8d8 27%, rgba(216, 216, 216, 0.49) 70%, rgba(251, 251, 251, 0));
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

.fourth-b-item .item-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.alarm-panel {
  min-height: 0;
  flex: 1;
  margin-top: 15px;
  padding: 20px;
  overflow-y: auto;
  border-radius: 20px;
  background: #fff;
}

.list-head,
.body-row {
  display: grid;
  grid-template-columns: 28% 27% 30% 15%;
  align-items: center;
  text-align: center;
}

.list-head {
  height: 25px;
  color: #7f7f89;
  font-size: 14px;
}

.body-row {
  padding: 8px 0;
  color: #23253c;
  font-size: 12px;
}

.body-row .link {
  color: #4e5afe;
  cursor: pointer;
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

.mini-line-chart.soc span:first-child,
.mini-line-chart.temp span:first-child {
  background: #5bf048;
}

.mini-line-chart.mileage span {
  height: 2px;
  opacity: 0.18;
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

.voltage-panel,
.address-panel {
  width: calc(50% - 7.5px);
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 20px;
  background: #fff;
}

.voltage-panel {
  margin-right: 15px;
}

.voltage-panel .title {
  flex-shrink: 0;
  color: #23253c;
  font-size: 18px;
}

.info-panel {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 20px 0 20px 60px;
}

.info-panel .item-info {
  width: calc(50% - 20px);
  display: flex;
  align-items: center;
}

.info-panel .item-info:first-child,
.info-panel .item-info:nth-child(2) {
  margin-bottom: 20px;
}

.info .label {
  color: #3a374c;
  font-size: 14px;
  line-height: 20px;
}

.info .val {
  color: #23253c;
  font-size: 24px;
  line-height: 35px;
}

.voltage-chart {
  min-height: 0;
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: clamp(6px, 0.7vw, 14px);
  padding: 0 35px 8px;
}

.voltage-bar {
  min-width: 10px;
  flex: 1;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 5px;
}

.voltage-bar span {
  color: #635f7b;
  font-size: 11px;
  transform: rotate(-45deg);
}

.voltage-bar i {
  width: 10px;
  display: block;
  border-radius: 20px 20px 0 0;
  background: #2563ff;
}

.voltage-bar:last-child i {
  background: #35c3ff;
}

.voltage-bar em {
  color: #635f7b;
  font-size: 11px;
  font-style: normal;
}

.map-panel {
  height: 100%;
}

.now-address {
  display: flex;
  align-items: center;
  min-width: 0;
  color: #23253c;
  white-space: nowrap;
}

.now-address span {
  margin-right: 4px;
  font-size: 18px;
}

.now-address em,
.map-update {
  overflow: hidden;
  color: #7f7f89;
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
}

.map-update {
  padding: 5px 0;
}

.map-box {
  position: relative;
  height: calc(100% - 50px);
  overflow: hidden;
  border-radius: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.035) 1px, transparent 1px),
    #f7f7f7;
  background-size: 7px 100%;
}

.map-more {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.65);
}

.map-more div {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #23253c;
  font-size: 14px;
}

.base-label {
  position: absolute;
  top: 65px;
  left: 18px;
  padding: 14px 18px;
  border-radius: 9px;
  background: #fff;
  font-size: 16px;
}

.base-btn {
  position: absolute;
  top: 22px;
  right: 16px;
  height: 30px;
  padding: 0 18px;
  color: #fff;
  border: 0;
  border-radius: 4px;
  background: #4e5afe;
}

.trajectory-panel {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
}

.trajectory-side {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 300px;
  height: 100%;
  padding: 20px;
  overflow: hidden;
  border-radius: 20px 0 0 20px;
  background: #fff;
}

.trajectory-side .info-item {
  margin-bottom: 10px;
  color: #23253c;
}

.device-title {
  font-size: 16px;
}

.device-title strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  font-size: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.user-icon {
  color: #4e5afe;
}

.subtle {
  color: #7f7f89 !important;
  font-size: 12px;
}

.date-row,
.speed-row,
.type-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date-row span {
  flex: 0 0 auto;
  white-space: nowrap;
}

.date-row :deep(.el-date-editor) {
  width: 170px;
}

.trajectory-side :deep(.el-date-editor),
.trajectory-side :deep(.el-input__wrapper) {
  background: #f9f9f9;
  box-shadow: none;
}

.trajectory-side :deep(.el-date-editor.el-input),
.trajectory-side :deep(.el-date-editor.el-input__wrapper),
.trajectory-side :deep(.el-date-editor--timerange.el-input__wrapper) {
  width: 240px;
}

.speed-row .label {
  margin-right: 20px;
  font-size: 14px;
}

.speed-row :deep(.el-slider) {
  width: 170px;
}

.action-row {
  display: flex;
  justify-content: space-between;
}

.action-row .el-button {
  width: 110px;
  height: 40px;
  border-radius: 10px;
}

.trajectory-side .line {
  height: 1px;
  margin: 20px 0;
  background: #d8d8d8;
}

.type-row .item-l {
  display: flex;
}

.type-row .item-l span {
  width: 60px;
  height: 30px;
  border: 1px solid #d8d8d8;
  text-align: center;
  line-height: 30px;
  font-size: 12px;
  cursor: pointer;
}

.type-row .item-l span:first-child {
  border-radius: 10px 0 0 10px;
}

.type-row .item-l span:nth-child(2) {
  border-radius: 0 10px 10px 0;
}

.type-row .item-l span.active {
  color: #fff;
  border-color: #4e5afe;
  background: #4e5afe;
}

.type-row .item-r {
  height: 30px;
  padding: 0 10px;
  color: #fff;
  border-radius: 10px;
  background: #fe405a;
  line-height: 30px;
  cursor: pointer;
}

.mileage-total {
  font-size: 14px;
}

.list-box {
  height: calc(100% - 367px);
  padding-right: 10px;
  overflow-y: auto;
}

.track-item {
  margin-bottom: 10px;
  padding: 20px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 15px;
  cursor: pointer;
}

.track-item.active {
  border-color: #4e5afe;
  background: rgba(78, 90, 254, 0.05);
}

.track-item .line-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.circle {
  width: 20px;
  height: 20px;
  display: inline-block;
  margin-right: 5px;
  color: #fff;
  border-radius: 50%;
  background: #4e5afe;
  text-align: center;
  line-height: 20px;
  font-style: normal;
}

.line-bottom {
  padding-left: 10px;
  color: #5f718d;
  font-size: 13px;
}

.start-step,
.end-step {
  position: relative;
  padding-left: 18px;
}

.start-step {
  border-left: 1px solid #4e5afe;
}

.line-bottom .icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translateX(-50%);
}

.start-icon {
  background: #4e5afe;
}

.end-icon {
  background: #00c5d3;
}

.time-box,
.address-box {
  display: flex;
}

.box-l {
  margin-right: 10px;
  white-space: nowrap;
}

.box-r {
  min-width: 0;
  flex: 1;
}

.site-text {
  padding: 10px 0;
  color: #3a374c;
}

.trajectory-map {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 20px;
  background: #dfe8ec;
}

.map-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.65) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.65) 1px, transparent 1px),
    radial-gradient(circle at 70% 30%, rgba(78, 90, 254, 0.16), transparent 26%),
    linear-gradient(135deg, #edf4f7, #d4e1e7);
  background-size: 42px 42px, 42px 42px, 100% 100%, 100% 100%;
}

.route-line {
  position: absolute;
  height: 8px;
  border-radius: 999px;
  background: #4e5afe;
  transform-origin: left center;
}

.route-line.one {
  top: 39%;
  left: 24%;
  width: 36%;
  transform: rotate(-13deg);
}

.route-line.two {
  top: 50%;
  left: 55%;
  width: 26%;
  transform: rotate(28deg);
}

.map-marker {
  position: absolute;
  z-index: 3;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #fff;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #4e5afe;
  font-weight: 700;
}

.map-marker.start {
  top: 36%;
  left: 23%;
}

.map-marker.mid {
  top: 34%;
  left: 58%;
}

.map-marker.end {
  top: 58%;
  left: 80%;
  background: #00c5d3;
}

.map-floating {
  position: absolute;
  top: 10px;
  left: 320px;
  display: flex;
  gap: 12px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
}

.map-floating div {
  display: flex;
  align-items: center;
  gap: 4px;
}

.speed-curve {
  position: absolute;
  right: 0;
  bottom: 0;
  width: calc(100% - 300px);
  height: 180px;
  padding: 15px 24px;
  background: rgba(255, 255, 255, 0.62);
}

.curve-title {
  color: #23253c;
  font-size: 14px;
}

.curve-bars {
  height: 125px;
  display: flex;
  align-items: flex-end;
  gap: 18px;
  padding-top: 14px;
}

.curve-bars i {
  width: 16px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #83bff6, #188df0);
}

.history-panel,
.parameter-panel,
.record-page {
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
  background: #fff;
}

.history-head,
.record-head,
.parameter-toolbar {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #edf0f4;
}

.history-content {
  height: calc(100% - 58px);
  display: flex;
}

.history-left {
  width: 310px;
  padding: 16px 20px;
  overflow: hidden;
  border-right: 1px solid #d0d0d0;
}

.history-device strong,
.history-device span {
  display: block;
}

.history-device strong {
  color: #23253c;
  font-size: 18px;
}

.history-device span {
  margin-top: 5px;
  color: #7f7f89;
  font-size: 12px;
}

.history-metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  background: #f7f8fb;
}

.history-metric i {
  width: 10px;
  height: 10px;
  display: inline-block;
  margin-right: 8px;
  border-radius: 50%;
}

.curve-checks {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.history-charts {
  min-width: 0;
  flex: 1;
  padding: 16px 22px;
  overflow: auto;
}

.history-chart {
  height: 24%;
  min-height: 135px;
  display: flex;
  margin-bottom: 12px;
  border-bottom: 1px solid #edf0f4;
}

.chart-y {
  width: 90px;
  color: #635f7b;
  font-size: 14px;
}

.chart-canvas {
  position: relative;
  min-width: 0;
  flex: 1;
}

.axis-line {
  height: 25%;
  border-top: 1px dashed #d9dce6;
}

.chart-canvas svg {
  position: absolute;
  inset: 0 0 22px;
}

.chart-canvas polyline {
  fill: none;
  stroke-width: 3;
}

.time-axis {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  color: #868395;
  font-size: 12px;
}

.parameter-toolbar {
  justify-content: space-between;
}

.parameter-actions {
  display: flex;
  gap: 8px;
}

.parameter-content {
  height: calc(100% - 58px);
  padding: 16px;
  overflow: auto;
  background: #f5f6fa;
}

.param-card {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 8px;
  background: #fff;
}

.color-title {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.color-title span {
  width: 4px;
  height: 20px;
  margin-right: 8px;
  border-radius: 3px;
  background: #2563ff;
}

.color-title strong {
  color: #2563ff;
  font-size: 18px;
}

.param-card :deep(.el-input) {
  width: 150px;
}

.record-head {
  flex-wrap: nowrap;
}

.record-head :deep(.el-select) {
  width: 140px;
}

.record-head :deep(.el-date-editor) {
  width: 360px;
}

.right-action {
  margin-left: auto;
}

.right-action.group {
  display: flex;
  gap: 8px;
}

.command-head {
  min-height: 74px;
  flex-wrap: wrap;
}

.command-head :deep(.el-select) {
  width: 145px;
}

.command-head :deep(.el-input) {
  width: 230px;
}

.record-table {
  padding: 0 16px 16px;
  font-size: 13px;
}

.record-table :deep(.el-table__header th) {
  color: #868395;
  background: #f9f9f9;
  font-weight: 400;
}

.device-detail-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

@media (max-width: 1400px) {
  .target-left {
    width: 240px;
    flex-basis: 240px;
  }

  .content-l {
    min-width: 390px;
  }

  .info-panel {
    padding-left: 20px;
  }
}

@media (max-width: 1180px) {
  .target-device-page {
    height: auto;
    min-height: calc(100vh - 70px);
    flex-direction: column;
    overflow: visible;
  }

  .target-left {
    width: 100%;
    flex-basis: auto;
  }

  .target-main {
    min-height: 700px;
  }

  .bms-detail-page {
    height: auto;
    min-height: calc(100vh - 70px);
    overflow: visible;
  }

  .panel-content {
    height: auto;
  }

  .bms-content {
    flex-direction: column;
  }

  .content-l,
  .content-r {
    width: 100%;
    min-width: 0;
    margin-right: 0;
  }

  .content-r {
    margin-top: 15px;
  }

  .right-b,
  .history-content {
    flex-direction: column;
  }

  .voltage-panel,
  .address-panel,
  .history-left {
    width: 100%;
  }

  .voltage-panel {
    margin-right: 0;
    margin-bottom: 15px;
  }

  .address-panel {
    height: 520px;
  }
}
</style>
