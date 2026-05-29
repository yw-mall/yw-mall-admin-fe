<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer.vue'
import { listOrders, type OrderItem } from '@/api/orders'

const router = useRouter()
const items = ref<OrderItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref<number>(-1) // -1 = 全部
const loading = ref(false)
// 模糊检索 —— 输入后回车或点搜索；reset 清空并重查
const orderNoKw = ref('')
const receiverNameKw = ref('')
const receiverPhoneKw = ref('')

const STATUS_TABS = [
  { label: '全部', value: -1 },
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '已发货', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已取消', value: 4 },
]

const STATUS_LABEL: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '已发货',
  3: '已完成',
  4: '已取消',
}

const STATUS_TAG_TYPE: Record<number, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
  0: 'warning',
  1: 'danger',
  2: 'primary',
  3: 'success',
  4: 'info',
}

async function reload() {
  loading.value = true
  try {
    const r = await listOrders({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value >= 0 ? status.value : undefined,
      orderNoKw: orderNoKw.value.trim() || undefined,
      receiverNameKw: receiverNameKw.value.trim() || undefined,
      receiverPhoneKw: receiverPhoneKw.value.trim() || undefined,
    })
    items.value = r.orders
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch([status, page], reload)

// 搜索 —— 重置 page 到 1 后触发 reload（如果 page 已经是 1 就直接调）
function onSearch() {
  if (page.value === 1) reload()
  else page.value = 1 // watcher 会自动 reload
}
function onReset() {
  orderNoKw.value = ''
  receiverNameKw.value = ''
  receiverPhoneKw.value = ''
  onSearch()
}

function fmtPrice(p: number) {
  return '¥' + (p / 100).toFixed(2)
}
function fmtTs(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : '-'
}
function goDetail(o: OrderItem) {
  router.push(`/orders/${o.id}`)
}
</script>

<template>
  <PageContainer title="订单管理">
    <!-- 模糊检索区 —— 回车 / 搜索按钮触发，重置清空 -->
    <div class="filter-bar">
      <el-input
        v-model="orderNoKw"
        placeholder="订单号"
        clearable
        style="width: 220px"
        @keyup.enter="onSearch"
      />
      <el-input
        v-model="receiverNameKw"
        placeholder="收件人"
        clearable
        style="width: 160px"
        @keyup.enter="onSearch"
      />
      <el-input
        v-model="receiverPhoneKw"
        placeholder="手机号"
        clearable
        style="width: 180px"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" @click="onSearch">搜索</el-button>
      <el-button @click="onReset">重置</el-button>
    </div>

    <el-tabs
      v-model="status"
      @tab-change="(v: string | number) => (status = Number(v))"
      style="margin-bottom: 16px"
    >
      <el-tab-pane
        v-for="t in STATUS_TABS"
        :key="t.value"
        :label="t.label"
        :name="t.value"
      />
    </el-tabs>

    <el-table v-loading="loading" :data="items" border @row-click="goDetail">
      <el-table-column prop="orderNo" label="订单号" width="220" />
      <el-table-column label="收件人" min-width="200">
        <template #default="{ row }">
          <div>{{ row.receiverName }} · {{ row.receiverPhone }}</div>
          <div class="muted">{{ row.receiverProvince }}{{ row.receiverCity }}{{ row.receiverDistrict }}</div>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="120">
        <template #default="{ row }">
          <span class="price">{{ fmtPrice(row.totalAmount) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="STATUS_TAG_TYPE[row.status] || 'info'">
            {{ STATUS_LABEL[row.status] || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ fmtTs(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="物流" min-width="200">
        <template #default="{ row }">
          <div v-if="row.carrier">{{ row.carrier }} · {{ row.trackingNo }}</div>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, jumper, total"
        background
      />
    </div>
  </PageContainer>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.muted {
  color: #999;
  font-size: 12px;
}
.price {
  color: #e1251b;
  font-weight: 600;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.el-table :deep(.el-table__row) {
  cursor: pointer;
}
</style>
