<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import {
  getRefund,
  handleRefund,
  inspectReturn,
  shipExchange,
  type RefundDetail,
} from '@/api/refunds'

const route = useRoute()
const user = useUserStore()

const refund = ref<RefundDetail | null>(null)
const loading = ref(false)

const STATUS_LABEL: Record<number, string> = {
  0: '待处理', 1: '同意待寄回', 2: '用户已寄回',
  3: '仲裁中', 4: '已完成', 5: '已驳回', 6: '已退款',
}
const TYPE_LABEL: Record<number, string> = {
  1: '仅退款', 2: '退货退款', 3: '换货',
}
const CARRIERS = ['顺丰', '京东', '中通', '圆通', '韵达', '申通', 'EMS', '其他']

// ====== stepper steps (按 refund_type 动态) ======
const stepDefs = computed(() => {
  const type = refund.value?.refundType ?? 1
  if (type === 1) {
    return ['提交申请', '商家处理', '完成']
  }
  if (type === 2) {
    return ['提交申请', '商家同意', '用户寄回', '商家验货', '完成']
  }
  // type === 3 换货
  return ['提交申请', '商家同意', '用户寄回', '商家验货', '商家寄换货', '完成']
})

// 把 status 映射到 stepper 索引；不同 type 的映射不一样
const currentStep = computed(() => {
  if (!refund.value) return 0
  const s = refund.value.status
  const type = refund.value.refundType ?? 1
  if (type === 1) {
    if (s === 0) return 1
    if (s === 4 || s === 6) return 3
    if (s === 5) return 2 // 驳回也算"商家处理"完成
    return 1
  }
  if (type === 2) {
    if (s === 0) return 1
    if (s === 1) return 2
    if (s === 2) return 3
    if (s === 3 || s === 4 || s === 6) return 4
    if (s === 5) return 1
    return 1
  }
  // type 3
  if (s === 0) return 1
  if (s === 1) return 2
  if (s === 2) return 3
  if (s === 3) return 4
  if (s === 4 || s === 6) return 5
  if (s === 5) return 1
  return 1
})

// ====== 按 (status, type, perm) 决定哪个 action 可用 ======
const canHandle = computed(() => refund.value?.status === 0 && user.hasPerm('refund.handle'))
const canInspect = computed(
  () =>
    refund.value &&
    refund.value.status === 2 &&
    (refund.value.refundType === 2 || refund.value.refundType === 3) &&
    user.hasPerm('refund.inspect'),
)
const canShipExchange = computed(
  () =>
    refund.value &&
    refund.value.status === 3 &&
    refund.value.refundType === 3 &&
    user.hasPerm('order.ship'),
)

// ====== handle 同意/驳回 modal ======
const handleDialog = ref(false)
const handleAction = ref<1 | 2>(1)
const handleRemark = ref('')
const handleLoading = ref(false)

function openHandle(action: 1 | 2) {
  handleAction.value = action
  handleRemark.value = ''
  handleDialog.value = true
}

async function submitHandle() {
  if (!refund.value) return
  handleLoading.value = true
  try {
    await handleRefund(refund.value.id, handleAction.value, handleRemark.value)
    ElMessage.success(handleAction.value === 1 ? '已同意' : '已驳回')
    handleDialog.value = false
    await reload()
  } finally {
    handleLoading.value = false
  }
}

// ====== inspect 验货 modal ======
const inspectDialog = ref(false)
const inspectPassed = ref(true)
const inspectRemark = ref('')
const inspectLoading = ref(false)

function openInspect() {
  inspectPassed.value = true
  inspectRemark.value = ''
  inspectDialog.value = true
}

async function submitInspect() {
  if (!refund.value) return
  inspectLoading.value = true
  try {
    await inspectReturn(refund.value.id, inspectPassed.value, inspectRemark.value)
    ElMessage.success(inspectPassed.value ? '验货通过' : '验货不通过')
    inspectDialog.value = false
    await reload()
  } finally {
    inspectLoading.value = false
  }
}

// ====== ship-exchange 寄换货 modal ======
const exchangeDialog = ref(false)
const exchangeFormRef = ref<FormInstance>()
const exchangeForm = ref({ carrier: '顺丰', trackingNo: '' })
const exchangeLoading = ref(false)
const exchangeRules: FormRules = {
  carrier: [{ required: true, message: '请选择物流公司', trigger: 'change' }],
  trackingNo: [{ required: true, message: '请填面单号', trigger: 'blur' }],
}

function openExchange() {
  exchangeForm.value = { carrier: '顺丰', trackingNo: '' }
  exchangeDialog.value = true
}

async function submitExchange() {
  if (!exchangeFormRef.value || !refund.value) return
  try {
    await exchangeFormRef.value.validate()
  } catch {
    return
  }
  exchangeLoading.value = true
  try {
    await shipExchange(refund.value.id, exchangeForm.value.carrier, exchangeForm.value.trackingNo)
    ElMessage.success('换货已寄出')
    exchangeDialog.value = false
    await reload()
  } finally {
    exchangeLoading.value = false
  }
}

async function reload() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    refund.value = await getRefund(id)
  } finally {
    loading.value = false
  }
}

onMounted(reload)

function fmtPrice(p: number) { return '¥' + (p / 100).toFixed(2) }
function fmtTs(ts: number) { return ts ? new Date(ts * 1000).toLocaleString() : '-' }
</script>

<template>
  <PageContainer title="退款详情" v-loading="loading">
    <div v-if="refund">
      <div class="header-bar">
        <span class="rid">退款单 #{{ refund.id }} · 订单 {{ refund.orderNo }}</span>
        <span>
          <el-button
            v-if="canHandle"
            type="primary"
            @click="openHandle(1)"
          >
            同意
          </el-button>
          <el-button v-if="canHandle" type="danger" plain @click="openHandle(2)">
            驳回
          </el-button>
          <el-button v-if="canInspect" type="primary" @click="openInspect">
            验货
          </el-button>
          <el-button v-if="canShipExchange" type="primary" @click="openExchange">
            寄换货
          </el-button>
          <el-button @click="$router.back()">返回</el-button>
        </span>
      </div>

      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 24px">
        <el-step v-for="(s, i) in stepDefs" :key="i" :title="s" />
      </el-steps>

      <el-descriptions :column="2" border style="margin-bottom: 16px">
        <el-descriptions-item label="类型">
          <el-tag type="info">{{ TYPE_LABEL[refund.refundType ?? 1] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag>{{ STATUS_LABEL[refund.status] || '-' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          <span class="price">{{ fmtPrice(refund.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ fmtTs(refund.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="买家理由" :span="2">{{ refund.reason }}</el-descriptions-item>
        <el-descriptions-item v-if="refund.merchantRemark" label="商家回复" :span="2">
          {{ refund.merchantRemark }} ({{ fmtTs(refund.merchantHandleTime ?? 0) }})
        </el-descriptions-item>
        <el-descriptions-item v-if="refund.returnTrackingNo" label="退货物流" :span="2">
          {{ refund.returnTrackingNo }}
        </el-descriptions-item>
        <el-descriptions-item v-if="refund.adminRemark" label="平台仲裁" :span="2">
          {{ refund.adminRemark }}
        </el-descriptions-item>
        <el-descriptions-item v-if="refund.refundNo" label="退款单号">{{ refund.refundNo }}</el-descriptions-item>
        <el-descriptions-item v-if="refund.refundCompleteTime" label="退款完成时间">
          {{ fmtTs(refund.refundCompleteTime) }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="refund.items?.length" class="section">
        <h3>退款 SKU</h3>
        <el-table :data="refund.items" border>
          <el-table-column prop="skuId" label="SKU ID" width="120" />
          <el-table-column prop="skuName" label="规格" />
          <el-table-column label="数量" width="80">
            <template #default="{ row }">{{ row.quantity }}</template>
          </el-table-column>
          <el-table-column label="金额" width="140">
            <template #default="{ row }"><span class="price">{{ fmtPrice(row.amount) }}</span></template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="refund.evidence?.length" class="section">
        <h3>买家凭证</h3>
        <div class="evidence">
          <el-image
            v-for="(url, i) in refund.evidence"
            :key="i"
            :src="url"
            fit="cover"
            style="width: 120px; height: 120px; border-radius: 6px"
            :preview-src-list="refund.evidence"
            :initial-index="i"
          />
        </div>
      </div>
    </div>

    <!-- handle modal -->
    <el-dialog
      v-model="handleDialog"
      :title="handleAction === 1 ? '同意退款申请' : '驳回退款申请'"
      width="480px"
    >
      <el-input v-model="handleRemark" type="textarea" :rows="4"
        :placeholder="handleAction === 1 ? '同意理由（可选，会通知买家）' : '驳回理由（必填，会通知买家）'" />
      <template #footer>
        <el-button @click="handleDialog = false">取消</el-button>
        <el-button :type="handleAction === 1 ? 'primary' : 'danger'" :loading="handleLoading" @click="submitHandle">
          确认{{ handleAction === 1 ? '同意' : '驳回' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- inspect modal -->
    <el-dialog v-model="inspectDialog" title="退货验货" width="480px">
      <el-form label-width="100px">
        <el-form-item label="验货结果">
          <el-radio-group v-model="inspectPassed">
            <el-radio :value="true">通过（同意退款）</el-radio>
            <el-radio :value="false">不通过（退回买家）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="inspectRemark" type="textarea" :rows="3" placeholder="验货说明（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inspectDialog = false">取消</el-button>
        <el-button type="primary" :loading="inspectLoading" @click="submitInspect">提交</el-button>
      </template>
    </el-dialog>

    <!-- ship-exchange modal -->
    <el-dialog v-model="exchangeDialog" title="寄出换货" width="480px">
      <el-form ref="exchangeFormRef" :model="exchangeForm" :rules="exchangeRules" label-width="100px">
        <el-form-item label="物流公司" prop="carrier">
          <el-select v-model="exchangeForm.carrier" style="width: 100%">
            <el-option v-for="c in CARRIERS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="面单号" prop="trackingNo">
          <el-input v-model="exchangeForm.trackingNo" placeholder="换货快递单号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exchangeDialog = false">取消</el-button>
        <el-button type="primary" :loading="exchangeLoading" @click="submitExchange">确认</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<style scoped>
.header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px }
.rid { font-size: 15px; color: #333; font-weight: 600 }
.price { color: #e1251b; font-weight: 600 }
.section { margin-top: 16px }
.section h3 { font-size: 14px; color: #333; margin: 0 0 12px }
.evidence { display: flex; gap: 8px; flex-wrap: wrap }
</style>
