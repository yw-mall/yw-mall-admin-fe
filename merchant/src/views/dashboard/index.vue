<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import { getDashboard, type DashboardData } from '@/api/dashboard'

const user = useUserStore()
const router = useRouter()
const data = ref<DashboardData | null>(null)
const loading = ref(false)

async function reload() {
  loading.value = true
  try {
    data.value = await getDashboard()
  } finally {
    loading.value = false
  }
}

onMounted(reload)

function fmtPrice(p: number) {
  return '¥' + (p / 100).toFixed(2)
}

const todos = computed(() => {
  if (!data.value) return []
  const list: { label: string; count: number; to: string; tone: 'danger' | 'warning' }[] = []
  if (data.value.pendingShipments > 0) {
    list.push({ label: '待发货订单', count: data.value.pendingShipments, to: '/orders', tone: 'danger' })
  }
  if (data.value.pendingRefunds > 0) {
    list.push({ label: '待处理退款', count: data.value.pendingRefunds, to: '/refunds', tone: 'warning' })
  }
  return list
})

function goTo(path: string) {
  router.push(path)
}
</script>

<template>
  <PageContainer title="商家工作台" v-loading="loading">
    <div class="welcome">
      <h2>欢迎，{{ user.username }}</h2>
      <p class="muted">店铺 ID: {{ user.shopId || '-' }} · 角色: {{ user.staffRole || user.role || '-' }}</p>
    </div>

    <!-- 待办提醒 -->
    <el-row v-if="todos.length" :gutter="16" style="margin-bottom: 24px">
      <el-col v-for="(t, i) in todos" :key="i" :span="12">
        <el-alert
          :title="`${t.label}: ${t.count} 条`"
          :type="t.tone === 'danger' ? 'error' : 'warning'"
          :closable="false"
          show-icon
        >
          <template #default>
            <el-button link type="primary" @click="goTo(t.to)">前往处理 →</el-button>
          </template>
        </el-alert>
      </el-col>
    </el-row>

    <!-- 4 核心指标 -->
    <el-row :gutter="24">
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card clickable" @click="goTo('/orders')">
          <div class="metric-num">{{ data ? data.totalOrders : '--' }}</div>
          <div class="metric-label">总订单数</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card clickable danger" @click="goTo('/orders')">
          <div class="metric-num">{{ data ? data.pendingShipments : '--' }}</div>
          <div class="metric-label">待发货</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card clickable warning" @click="goTo('/refunds')">
          <div class="metric-num">{{ data ? data.pendingRefunds : '--' }}</div>
          <div class="metric-label">待退款</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card clickable income" @click="goTo('/wallet')">
          <div class="metric-num">{{ data ? fmtPrice(data.walletAvailable) : '--' }}</div>
          <div class="metric-label">钱包余额</div>
          <div v-if="data && data.walletFrozen > 0" class="metric-hint">
            冻结 {{ fmtPrice(data.walletFrozen) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      style="margin-top: 24px"
      type="success"
      :closable="false"
      title="商家工作台 M1-M6 已就绪"
      description="员工管理 · 商品 · 订单 · 退款 · 财务 · 装修 全套功能可用。点击左侧 nav 进入对应模块。"
    />
  </PageContainer>
</template>

<style scoped>
.welcome {
  margin-bottom: 24px;
}
.welcome h2 {
  margin: 0;
  font-size: 22px;
  color: #333;
}
.muted {
  color: #999;
  font-size: 13px;
  margin: 4px 0 0;
}
.metric-card {
  text-align: center;
  border-radius: 12px;
  transition: all 0.2s;
}
.metric-card.clickable {
  cursor: pointer;
}
.metric-card.clickable:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.metric-card.danger .metric-num {
  color: #f56c6c;
}
.metric-card.warning .metric-num {
  color: #e6a23c;
}
.metric-card.income .metric-num {
  color: #67c23a;
}
.metric-num {
  font-size: 28px;
  font-weight: 600;
  color: #e1251b;
  line-height: 1.4;
}
.metric-label {
  margin-top: 4px;
  color: #666;
  font-size: 13px;
}
.metric-hint {
  margin-top: 2px;
  font-size: 12px;
  color: #999;
}
</style>
