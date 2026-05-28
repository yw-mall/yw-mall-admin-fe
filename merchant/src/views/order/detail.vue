<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import { getOrder, shipOrder, rejectRefund, type OrderDetail } from '@/api/orders'
import { listTemplates, type FreightTemplate } from '@/api/freight'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const order = ref<OrderDetail | null>(null)
const loading = ref(false)
const templates = ref<FreightTemplate[]>([])

const STATUS_LABEL: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '已发货',
  3: '已完成',
  4: '已取消',
}
const REFUND_LABEL: Record<number, string> = {
  0: '无退款',
  1: '申请中',
  2: '协商中',
  3: '已退款',
  4: '已驳回',
}
const CARRIERS = ['顺丰', '京东', '中通', '圆通', '韵达', '申通', 'EMS', '其他']

const shipDialog = ref(false)
const shipFormRef = ref<FormInstance>()
const shipForm = ref({ carrier: '顺丰', trackingNo: '' })
const shipLoading = ref(false)
const shipRules: FormRules = {
  carrier: [{ required: true, message: '请选择物流公司', trigger: 'change' }],
  trackingNo: [{ required: true, message: '请填面单号', trigger: 'blur' }],
}

const rejectDialog = ref(false)
const rejectReason = ref('')
const rejectLoading = ref(false)

const canShip = computed(() => order.value?.status === 1)
const canRejectRefund = computed(() => order.value?.refundStatus === 1)

async function reload() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    order.value = await getOrder(id)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  reload()
  try {
    templates.value = (await listTemplates()).templates
  } catch {
    // 物流模板加载失败不阻塞订单详情
  }
})

function fmtPrice(p: number) {
  return '¥' + (p / 100).toFixed(2)
}
function fmtTs(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : '-'
}

function openShip() {
  shipForm.value = { carrier: '顺丰', trackingNo: '' }
  shipDialog.value = true
}

async function submitShip() {
  if (!shipFormRef.value || !order.value) return
  try {
    await shipFormRef.value.validate()
  } catch {
    return
  }
  shipLoading.value = true
  try {
    await shipOrder(order.value.id, shipForm.value.carrier, shipForm.value.trackingNo)
    ElMessage.success('已发货')
    shipDialog.value = false
    await reload()
  } finally {
    shipLoading.value = false
  }
}

function openReject() {
  rejectReason.value = ''
  rejectDialog.value = true
}

async function submitReject() {
  if (!order.value) return
  if (!rejectReason.value.trim()) {
    ElMessage.error('请填拒绝理由')
    return
  }
  rejectLoading.value = true
  try {
    await rejectRefund(order.value.id, rejectReason.value)
    ElMessage.success('已拒绝退款')
    rejectDialog.value = false
    await reload()
  } finally {
    rejectLoading.value = false
  }
}
</script>

<template>
  <PageContainer title="订单详情" v-loading="loading">
    <div v-if="order">
      <div class="header-bar">
        <span class="order-no">订单号: {{ order.orderNo }}</span>
        <span>
          <el-button v-if="canShip && user.hasPerm('order.ship')" type="primary" @click="openShip">
            发货
          </el-button>
          <el-button
            v-if="canRejectRefund && user.hasPerm('refund.handle')"
            type="danger"
            plain
            @click="openReject"
          >
            拒绝退款
          </el-button>
          <el-button @click="$router.back()">返回</el-button>
        </span>
      </div>

      <el-descriptions :column="2" border style="margin-bottom: 16px">
        <el-descriptions-item label="订单状态">
          <el-tag>{{ STATUS_LABEL[order.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <el-tag type="warning">{{ REFUND_LABEL[order.refundStatus] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          <span class="price">{{ fmtPrice(order.totalAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ fmtTs(order.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="付款时间">{{ fmtTs(order.payTime) }}</el-descriptions-item>
        <el-descriptions-item label="发货时间">{{ fmtTs(order.shipTime) }}</el-descriptions-item>
        <el-descriptions-item label="物流" :span="2">
          <span v-if="order.carrier">{{ order.carrier }} · {{ order.trackingNo }}</span>
          <span v-else class="muted">未发货</span>
        </el-descriptions-item>
        <el-descriptions-item label="收件人">{{ order.receiverName }} · {{ order.receiverPhone }}</el-descriptions-item>
        <el-descriptions-item label="收件地址">
          {{ order.receiverProvince }}{{ order.receiverCity }}{{ order.receiverDistrict }}{{ order.receiverDetail }}
        </el-descriptions-item>
        <el-descriptions-item v-if="order.refundReason" label="退款理由" :span="2">
          {{ order.refundReason }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <el-dialog v-model="shipDialog" title="发货" width="480px">
      <el-form ref="shipFormRef" :model="shipForm" :rules="shipRules" label-width="100px">
        <el-form-item label="物流公司" prop="carrier">
          <el-select v-model="shipForm.carrier" style="width: 100%">
            <el-option v-for="c in CARRIERS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="面单号" prop="trackingNo">
          <el-input v-model="shipForm.trackingNo" placeholder="请填快递单号" />
        </el-form-item>
        <el-form-item v-if="templates.length" label="物流模板">
          <span class="muted">已配置 {{ templates.length }} 个模板（M3 仅展示，不强制绑定）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">取消</el-button>
        <el-button type="primary" :loading="shipLoading" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectDialog" title="拒绝退款" width="480px">
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请简述拒绝理由（会通知给买家）"
      />
      <template #footer>
        <el-button @click="rejectDialog = false">取消</el-button>
        <el-button type="danger" :loading="rejectLoading" @click="submitReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<style scoped>
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.order-no {
  font-size: 15px;
  color: #333;
  font-weight: 600;
}
.muted {
  color: #999;
}
.price {
  color: #e1251b;
  font-weight: 600;
  font-size: 16px;
}
</style>
