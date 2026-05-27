<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import {
  listProducts,
  setProductStatus,
  setProductStock,
  type ProductSummary,
} from '@/api/products'

const router = useRouter()
const user = useUserStore()

const items = ref<ProductSummary[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const statusFilter = ref<number | undefined>(undefined)

async function reload() {
  loading.value = true
  try {
    const r = await listProducts({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value,
    })
    items.value = r.items
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(reload)

function fmtPrice(p: number) {
  return '¥' + (p / 100).toFixed(2)
}

function statusLabel(s: number) {
  return s === 1 ? '上架' : '下架'
}

function reviewLabel(r: number) {
  switch (r) {
    case 0:
      return '待审核'
    case 1:
      return '已通过'
    case 2:
      return '已驳回'
    default:
      return '-'
  }
}

function firstImage(images: string) {
  if (!images) return ''
  const comma = images.indexOf(',')
  return comma >= 0 ? images.slice(0, comma) : images
}

async function toggleStatus(row: ProductSummary) {
  const nextStatus = row.status === 1 ? 0 : 1
  try {
    await setProductStatus(row.id, nextStatus)
    ElMessage.success(nextStatus === 1 ? '已上架' : '已下架')
    await reload()
  } catch {
    // request 拦截器已 toast
  }
}

const editingStockId = ref<number | null>(null)
const stockDraft = ref(0)

function startEditStock(row: ProductSummary) {
  editingStockId.value = row.id
  stockDraft.value = row.stock
}

async function commitStock(row: ProductSummary) {
  if (stockDraft.value < 0) {
    ElMessage.error('库存不能为负')
    return
  }
  try {
    await setProductStock(row.id, stockDraft.value)
    ElMessage.success('库存已更新')
    editingStockId.value = null
    await reload()
  } catch {
    // toast
  }
}

function goEdit(row: ProductSummary) {
  router.push(`/products/${row.id}/edit`)
}

function goNew() {
  router.push('/products/new')
}
</script>

<template>
  <PageContainer title="商品管理">
    <div class="header-bar">
      <div class="filters">
        <el-select
          v-model="statusFilter"
          placeholder="全部状态"
          clearable
          style="width: 120px"
          @change="reload"
        >
          <el-option label="上架" :value="1" />
          <el-option label="下架" :value="0" />
        </el-select>
        <span class="hint">共 {{ total }} 个商品</span>
      </div>
      <el-button v-if="user.hasPerm('product.write')" type="primary" @click="goNew">
        + 新建商品
      </el-button>
    </div>

    <el-table v-loading="loading" :data="items" border>
      <el-table-column label="缩略图" width="100">
        <template #default="{ row }">
          <el-image
            v-if="firstImage(row.images)"
            :src="firstImage(row.images)"
            fit="cover"
            style="width: 60px; height: 60px; border-radius: 4px"
          />
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column label="价格" width="120">
        <template #default="{ row }">
          <span class="price">{{ fmtPrice(row.price) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="库存" width="160">
        <template #default="{ row }">
          <template v-if="editingStockId === row.id">
            <el-input-number
              v-model="stockDraft"
              :min="0"
              size="small"
              style="width: 100px"
              @keyup.enter="commitStock(row)"
            />
            <el-button size="small" type="primary" link @click="commitStock(row)">✓</el-button>
            <el-button size="small" link @click="editingStockId = null">✗</el-button>
          </template>
          <template v-else>
            <span>{{ row.stock }}</span>
            <el-button
              v-if="user.hasPerm('product.write')"
              size="small"
              link
              style="margin-left: 4px"
              @click="startEditStock(row)"
            >
              改
            </el-button>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="100">
        <template #default="{ row }">
          <el-tag :type="row.reviewStatus === 1 ? 'success' : row.reviewStatus === 2 ? 'danger' : 'warning'">
            {{ reviewLabel(row.reviewStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" v-if="user.hasPerm('product.write')">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="goEdit(row)">编辑</el-button>
          <el-button
            size="small"
            :type="row.status === 1 ? 'danger' : 'success'"
            link
            @click="toggleStatus(row)"
          >
            {{ row.status === 1 ? '下架' : '上架' }}
          </el-button>
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
        @current-change="reload"
      />
    </div>
  </PageContainer>
</template>

<style scoped>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}
.hint {
  color: #999;
  font-size: 13px;
}
.muted {
  color: #ccc;
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
</style>
