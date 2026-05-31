<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import {
  createCouponTemplate,
  listCouponTemplates,
  offlineCouponTemplate,
  onlineCouponTemplate,
  type CouponTemplate,
} from '@/api/coupons'

const items = ref<CouponTemplate[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref<number>(-1)
const loading = ref(false)

const STATUS_TABS = [
  { label: '全部', value: -1 },
  { label: '上架', value: 1 },
  { label: '下架', value: 0 },
]

const TYPE_LABEL: Record<string, string> = {
  cash: '立减券',
  full_reduce: '满减券',
  discount: '折扣券',
  freeship: '包邮券',
}

async function reload() {
  loading.value = true
  try {
    const r = await listCouponTemplates({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value >= 0 ? status.value : undefined,
    })
    items.value = r.templates
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch([status, page], reload)

function fmtPrice(p: number) {
  return '¥' + (p / 100).toFixed(2)
}
function fmtTs(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : '-'
}
function fmtValue(t: CouponTemplate): string {
  if (t.type === 'discount') return (t.value / 10).toFixed(1) + ' 折'
  if (t.type === 'freeship') return '包邮'
  return fmtPrice(t.value)
}

async function handleOnline(t: CouponTemplate) {
  await onlineCouponTemplate(t.id)
  ElMessage.success('已上架')
  reload()
}
async function handleOffline(t: CouponTemplate) {
  await ElMessageBox.confirm(`确认下架「${t.name}」？已领取的券不受影响`, '下架确认', {
    type: 'warning',
  })
  await offlineCouponTemplate(t.id)
  ElMessage.success('已下架')
  reload()
}

// ===== 创建对话框 =====
const dlgVisible = ref(false)
const form = ref({
  name: '',
  type: 'cash' as 'cash' | 'full_reduce' | 'discount' | 'freeship',
  valueYuan: 5,
  minAmountYuan: 50,
  maxDiscountYuan: 0,
  totalCount: 1000,
  perUserLimit: 1,
  validType: 1 as 0 | 1,
  validDays: 14,
  fixedRange: null as [Date, Date] | null,
  receiveRange: [new Date(), new Date(Date.now() + 30 * 86400 * 1000)] as [Date, Date],
})
const saving = ref(false)

function openCreate() {
  form.value = {
    name: '',
    type: 'cash',
    valueYuan: 5,
    minAmountYuan: 50,
    maxDiscountYuan: 0,
    totalCount: 1000,
    perUserLimit: 1,
    validType: 1,
    validDays: 14,
    fixedRange: null,
    receiveRange: [new Date(), new Date(Date.now() + 30 * 86400 * 1000)],
  }
  dlgVisible.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    ElMessage.error('请填写名称')
    return
  }
  if (form.value.valueYuan <= 0) {
    ElMessage.error('面值必须 > 0')
    return
  }
  if (form.value.validType === 0 && !form.value.fixedRange) {
    ElMessage.error('固定日期模式必须选有效期范围')
    return
  }

  // 折扣类 value 是百分比 (75=7.5折), 其余按"分"
  const valueRaw =
    form.value.type === 'discount'
      ? Math.floor(form.value.valueYuan * 10) // 7.5 折 -> 75
      : Math.floor(form.value.valueYuan * 100)
  saving.value = true
  try {
    const { id } = await createCouponTemplate({
      name: form.value.name,
      type: form.value.type,
      value: valueRaw,
      minAmount: Math.floor(form.value.minAmountYuan * 100),
      maxDiscount: Math.floor(form.value.maxDiscountYuan * 100),
      totalCount: form.value.totalCount,
      perUserLimit: form.value.perUserLimit,
      validType: form.value.validType,
      validDays: form.value.validDays,
      validStart:
        form.value.fixedRange ? Math.floor(form.value.fixedRange[0].getTime() / 1000) : 0,
      validEnd: form.value.fixedRange ? Math.floor(form.value.fixedRange[1].getTime() / 1000) : 0,
      receiveStart: Math.floor(form.value.receiveRange[0].getTime() / 1000),
      receiveEnd: Math.floor(form.value.receiveRange[1].getTime() / 1000),
    })
    ElMessage.success(`已创建模板 #${id}, 默认上架`)
    dlgVisible.value = false
    reload()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageContainer title="优惠券">
    <div class="filter-bar">
      <el-tabs v-model="status" @tab-change="(v: string | number) => (status = Number(v))">
        <el-tab-pane v-for="t in STATUS_TABS" :key="t.value" :label="t.label" :name="t.value" />
      </el-tabs>
      <span class="spacer" />
      <el-button type="primary" @click="openCreate">+ 创建券模板</el-button>
    </div>

    <el-table v-loading="loading" :data="items" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ TYPE_LABEL[row.type] || row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="面值/折扣" width="100">
        <template #default="{ row }">{{ fmtValue(row) }}</template>
      </el-table-column>
      <el-table-column label="门槛" width="100">
        <template #default="{ row }">
          {{ row.minAmount > 0 ? '满 ' + fmtPrice(row.minAmount) : '无门槛' }}
        </template>
      </el-table-column>
      <el-table-column label="领取进度" width="130">
        <template #default="{ row }">
          {{ row.receivedCount }} / {{ row.totalCount }}
          <div class="muted">已用 {{ row.usedCount }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.status === 1" type="success">上架</el-tag>
          <el-tag v-else type="info">下架</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="领取窗口" min-width="220">
        <template #default="{ row }">
          {{ fmtTs(row.receiveStart) }}
          <div class="muted">~ {{ fmtTs(row.receiveEnd) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 0"
            link
            type="success"
            size="small"
            @click="handleOnline(row)"
          >上架</el-button>
          <el-button
            v-else
            link
            type="danger"
            size="small"
            @click="handleOffline(row)"
          >下架</el-button>
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

    <!-- 创建对话框 -->
    <el-dialog v-model="dlgVisible" title="创建券模板" width="640">
      <el-form label-width="110px">
        <el-form-item label="券名称" required>
          <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="如：店铺立减 5 元" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.type" style="width: 200px">
            <el-option label="立减券 (无门槛或固定门槛)" value="cash" />
            <el-option label="满减券" value="full_reduce" />
            <el-option label="折扣券" value="discount" />
            <el-option label="包邮券" value="freeship" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type !== 'freeship'" :label="form.type === 'discount' ? '折扣率' : '面值'" required>
          <el-input-number v-model="form.valueYuan" :min="0.1" :max="form.type === 'discount' ? 9.9 : 9999" :step="form.type === 'discount' ? 0.5 : 5" :precision="form.type === 'discount' ? 1 : 2" />
          <span class="hint">{{ form.type === 'discount' ? '如 7.5 = 7.5 折' : '单位：元' }}</span>
        </el-form-item>
        <el-form-item label="使用门槛">
          <el-input-number v-model="form.minAmountYuan" :min="0" :step="10" />
          <span class="hint">单位：元；0 = 无门槛</span>
        </el-form-item>
        <el-form-item v-if="form.type === 'discount'" label="最高优惠">
          <el-input-number v-model="form.maxDiscountYuan" :min="0" :step="10" />
          <span class="hint">单位：元；0 = 不限</span>
        </el-form-item>
        <el-form-item label="总发放量" required>
          <el-input-number v-model="form.totalCount" :min="1" :step="100" />
        </el-form-item>
        <el-form-item label="每人限领">
          <el-input-number v-model="form.perUserLimit" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="有效期模式" required>
          <el-radio-group v-model="form.validType">
            <el-radio :value="1">领取后 N 天有效</el-radio>
            <el-radio :value="0">固定日期</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.validType === 1" label="N 天">
          <el-input-number v-model="form.validDays" :min="1" :max="365" />
        </el-form-item>
        <el-form-item v-if="form.validType === 0" label="固定日期范围" required>
          <el-date-picker v-model="form.fixedRange" type="datetimerange" range-separator="~" />
        </el-form-item>
        <el-form-item label="领取窗口" required>
          <el-date-picker v-model="form.receiveRange" type="datetimerange" range-separator="~" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">创建并上架</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<style scoped>
.filter-bar {
  display: flex;
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
.hint {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
