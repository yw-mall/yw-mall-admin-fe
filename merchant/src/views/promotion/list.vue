<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import {
  listPromotions,
  offlinePromotion,
  onlinePromotion,
  type Promotion,
} from '@/api/promotions'

const router = useRouter()
const items = ref<Promotion[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref<number>(-1)
const typeFilter = ref<string>('')
const loading = ref(false)

const STATUS_TABS = [
  { label: '全部', value: -1 },
  { label: '草稿', value: 0 },
  { label: '待开始', value: 1 },
  { label: '进行中', value: 2 },
  { label: '已结束', value: 3 },
  { label: '已下线', value: 4 },
]

const STATUS_LABEL: Record<number, string> = {
  0: '草稿',
  1: '待开始',
  2: '进行中',
  3: '已结束',
  4: '已下线',
}

const STATUS_TYPE: Record<number, 'info' | 'warning' | 'success' | 'danger'> = {
  0: 'info',
  1: 'warning',
  2: 'success',
  3: 'info',
  4: 'danger',
}

const TYPE_LABEL: Record<string, string> = {
  fullreduce: '满减',
  discount: '折扣',
  fixprice: '直降',
  coupon: '券',
}

async function reload() {
  loading.value = true
  try {
    const r = await listPromotions({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value >= 0 ? status.value : undefined,
      type: typeFilter.value || undefined,
    })
    items.value = r.promotions
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch([status, page, typeFilter], reload)

function fmtTs(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : '-'
}

function goCreate(type: string) {
  router.push(`/promotions/new?type=${type}`)
}

function goEdit(p: Promotion) {
  router.push(`/promotions/${p.id}/edit`)
}

async function handleOnline(p: Promotion) {
  await ElMessageBox.confirm(`确认上线活动「${p.name}」？上线后将立即对 C 端用户生效`, '上线确认', {
    type: 'warning',
  })
  await onlinePromotion(p.id)
  ElMessage.success('已上线')
  reload()
}

async function handleOffline(p: Promotion) {
  await ElMessageBox.confirm(`确认下线活动「${p.name}」？下线后用户将看不到此活动`, '下线确认', {
    type: 'warning',
  })
  await offlinePromotion(p.id)
  ElMessage.success('已下线')
  reload()
}
</script>

<template>
  <PageContainer title="营销活动">
    <div class="filter-bar">
      <el-select v-model="typeFilter" placeholder="活动类型" clearable style="width: 140px">
        <el-option label="满减" value="fullreduce" />
        <el-option label="折扣" value="discount" />
        <el-option label="直降" value="fixprice" />
      </el-select>
      <span class="spacer" />
      <el-dropdown @command="goCreate" trigger="click">
        <el-button type="primary">
          + 新建活动 <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="fullreduce">满减活动</el-dropdown-item>
            <el-dropdown-item command="fixprice">直降活动</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-tabs
      v-model="status"
      @tab-change="(v: string | number) => (status = Number(v))"
      style="margin-bottom: 16px"
    >
      <el-tab-pane v-for="t in STATUS_TABS" :key="t.value" :label="t.label" :name="t.value" />
    </el-tabs>

    <el-table v-loading="loading" :data="items" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ TYPE_LABEL[row.type] || row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="STATUS_TYPE[row.status] || 'info'">
            {{ STATUS_LABEL[row.status] || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间窗" min-width="280">
        <template #default="{ row }">
          <div>{{ fmtTs(row.startTime) }}</div>
          <div class="muted">~ {{ fmtTs(row.endTime) }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="100" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 0" link type="primary" size="small" @click="goEdit(row)">
            编辑
          </el-button>
          <el-button v-if="row.status === 0" link type="success" size="small" @click="handleOnline(row)">
            上线
          </el-button>
          <el-button
            v-if="row.status === 1 || row.status === 2"
            link
            type="danger"
            size="small"
            @click="handleOffline(row)"
          >
            下线
          </el-button>
          <el-button link size="small" @click="goEdit(row)">查看</el-button>
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
  margin-bottom: 12px;
}
.spacer {
  flex: 1;
}
.muted {
  color: #999;
  font-size: 12px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
