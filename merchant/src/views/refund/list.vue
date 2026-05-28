<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer.vue'
import { listRefunds, type RefundItem } from '@/api/refunds'

const router = useRouter()
const items = ref<RefundItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref<number>(-1)
const loading = ref(false)

const STATUS_TABS = [
  { label: '全部', value: -1 },
  { label: '待处理', value: 0 },
  { label: '同意待寄回', value: 1 },
  { label: '用户已寄回', value: 2 },
  { label: '仲裁中', value: 3 },
  { label: '已完成', value: 4 },
  { label: '已驳回', value: 5 },
  { label: '已退款', value: 6 },
]

const STATUS_LABEL: Record<number, string> = {
  0: '待处理', 1: '同意待寄回', 2: '用户已寄回',
  3: '仲裁中', 4: '已完成', 5: '已驳回', 6: '已退款',
}

const STATUS_TAG: Record<number, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
  0: 'danger', 1: 'warning', 2: 'warning',
  3: 'warning', 4: 'success', 5: 'info', 6: 'success',
}

const TYPE_LABEL: Record<number, string> = {
  1: '仅退款', 2: '退货退款', 3: '换货',
}

async function reload() {
  loading.value = true
  try {
    const r = await listRefunds({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value >= 0 ? status.value : undefined,
    })
    items.value = r.requests
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch([status, page], reload)

function fmtPrice(p: number) { return '¥' + (p / 100).toFixed(2) }
function fmtTs(ts: number) { return ts ? new Date(ts * 1000).toLocaleString() : '-' }
function goDetail(row: RefundItem) { router.push(`/refunds/${row.id}`) }
</script>

<template>
  <PageContainer title="退款处理">
    <el-tabs
      v-model="status"
      @tab-change="(v: string | number) => (status = Number(v))"
      style="margin-bottom: 16px"
    >
      <el-tab-pane v-for="t in STATUS_TABS" :key="t.value" :label="t.label" :name="t.value" />
    </el-tabs>

    <el-table v-loading="loading" :data="items" border @row-click="goDetail">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="orderNo" label="订单号" width="200" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.refundType" type="info">{{ TYPE_LABEL[row.refundType] || '-' }}</el-tag>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="120">
        <template #default="{ row }">
          <span class="price">{{ fmtPrice(row.amount) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="申请理由" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="STATUS_TAG[row.status] || 'info'">{{ STATUS_LABEL[row.status] || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" width="180">
        <template #default="{ row }">{{ fmtTs(row.createTime) }}</template>
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
.muted { color: #999 }
.price { color: #e1251b; font-weight: 600 }
.pager { margin-top: 16px; display: flex; justify-content: flex-end }
.el-table :deep(.el-table__row) { cursor: pointer }
</style>
