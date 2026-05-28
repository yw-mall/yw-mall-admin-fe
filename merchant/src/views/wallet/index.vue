<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import {
  getWallet,
  listLedger,
  listBills,
  createWithdrawal,
  listWithdrawals,
  type WalletInfo,
  type LedgerEntry,
  type BillRecord,
  type WithdrawalItem,
} from '@/api/wallet'

const user = useUserStore()

const wallet = ref<WalletInfo | null>(null)
const walletLoading = ref(false)

const tab = ref<'ledger' | 'bills' | 'withdrawals'>('ledger')

// ===== ledger 流水 =====
const ledgerItems = ref<LedgerEntry[]>([])
const ledgerTotal = ref(0)
const ledgerPage = ref(1)
const ledgerLoading = ref(false)

// ===== bills 账单 =====
const billItems = ref<BillRecord[]>([])
const billTotal = ref(0)
const billPage = ref(1)
const billLoading = ref(false)

// ===== withdrawals 提现记录 =====
const wdItems = ref<WithdrawalItem[]>([])
const wdTotal = ref(0)
const wdPage = ref(1)
const wdLoading = ref(false)

const DIRECTION_LABEL: Record<number, string> = { 1: '入账', 2: '出账' }
const CATEGORY_LABEL: Record<string, string> = {
  order_paid: '订单收入',
  refund: '退款',
  commission: '平台抽佣',
  withdrawal: '提现',
}
const WD_STATUS_LABEL: Record<number, string> = {
  0: '待审核',
  1: '已通过',
  2: '已驳回',
  3: '已打款',
}
const WD_STATUS_TAG: Record<number, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
  0: 'warning',
  1: 'primary',
  2: 'danger',
  3: 'success',
}

async function reloadWallet() {
  walletLoading.value = true
  try {
    wallet.value = await getWallet()
  } finally {
    walletLoading.value = false
  }
}

async function reloadLedger() {
  ledgerLoading.value = true
  try {
    const r = await listLedger({ page: ledgerPage.value, pageSize: 20 })
    ledgerItems.value = r.entries
    ledgerTotal.value = r.total
  } finally {
    ledgerLoading.value = false
  }
}

async function reloadBills() {
  billLoading.value = true
  try {
    const r = await listBills({ page: billPage.value, pageSize: 20 })
    billItems.value = r.records
    billTotal.value = r.total
  } finally {
    billLoading.value = false
  }
}

async function reloadWithdrawals() {
  wdLoading.value = true
  try {
    const r = await listWithdrawals({ page: wdPage.value, pageSize: 20 })
    wdItems.value = r.withdrawals
    wdTotal.value = r.total
  } finally {
    wdLoading.value = false
  }
}

onMounted(() => {
  reloadWallet()
  reloadLedger()
})

watch(tab, (v) => {
  if (v === 'ledger' && ledgerItems.value.length === 0) reloadLedger()
  if (v === 'bills' && billItems.value.length === 0) reloadBills()
  if (v === 'withdrawals' && wdItems.value.length === 0) reloadWithdrawals()
})

watch(ledgerPage, reloadLedger)
watch(billPage, reloadBills)
watch(wdPage, reloadWithdrawals)

// ====== 提现 modal ======
const wdDialog = ref(false)
const wdFormRef = ref<FormInstance>()
const wdForm = ref({ amount: 0, bankInfo: '' })
const wdSubmitting = ref(false)
const wdRules: FormRules = {
  amount: [
    { required: true, message: '请填提现金额', trigger: 'blur' },
    {
      validator: (_r, v: number, cb) => {
        if (!v || v <= 0) cb(new Error('金额必须大于 0'))
        else if (wallet.value && v > wallet.value.balance) cb(new Error('超过可用余额'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  bankInfo: [{ required: true, message: '请填收款账户', trigger: 'blur' }],
}

function openWithdraw() {
  wdForm.value = { amount: 0, bankInfo: '' }
  wdDialog.value = true
}

async function submitWithdraw() {
  if (!wdFormRef.value) return
  try {
    await wdFormRef.value.validate()
  } catch {
    return
  }
  wdSubmitting.value = true
  try {
    await createWithdrawal(wdForm.value.amount, wdForm.value.bankInfo)
    ElMessage.success('提现申请已提交，等待平台审核')
    wdDialog.value = false
    await reloadWallet()
    // 切到提现记录 tab + reload
    tab.value = 'withdrawals'
    wdPage.value = 1
    await reloadWithdrawals()
  } finally {
    wdSubmitting.value = false
  }
}

function fmtPrice(p: number) {
  return '¥' + (p / 100).toFixed(2)
}
function fmtTs(ts: number) {
  return ts ? new Date(ts * 1000).toLocaleString() : '-'
}
</script>

<template>
  <PageContainer title="财务">
    <!-- 钱包概览 -->
    <el-row :gutter="20" v-loading="walletLoading">
      <el-col :span="6">
        <el-card class="metric-card available">
          <div class="metric-label">可用余额</div>
          <div class="metric-num">{{ wallet ? fmtPrice(wallet.balance) : '--' }}</div>
          <el-button
            v-if="user.hasPerm('finance.write')"
            type="primary"
            size="small"
            @click="openWithdraw"
            :disabled="!wallet || wallet.balance <= 0"
            style="margin-top: 8px"
          >
            申请提现
          </el-button>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-label">冻结金额</div>
          <div class="metric-num">{{ wallet ? fmtPrice(wallet.frozen) : '--' }}</div>
          <div class="metric-hint">含 T+3 未到账 + 退款冻结</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-label">累计收入</div>
          <div class="metric-num">{{ wallet ? fmtPrice(wallet.totalIncome) : '--' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-label">累计提现</div>
          <div class="metric-num">{{ wallet ? fmtPrice(wallet.totalWithdrawn) : '--' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="tab" style="margin-top: 24px">
      <el-tab-pane label="收支流水" name="ledger">
        <el-table v-loading="ledgerLoading" :data="ledgerItems" border>
          <el-table-column label="时间" width="180">
            <template #default="{ row }">{{ fmtTs(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="方向" width="80">
            <template #default="{ row }">
              <el-tag :type="row.direction === 1 ? 'success' : 'danger'" size="small">
                {{ DIRECTION_LABEL[row.direction] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">{{ CATEGORY_LABEL[row.category] || row.category }}</template>
          </el-table-column>
          <el-table-column label="金额" width="140">
            <template #default="{ row }">
              <span :class="row.direction === 1 ? 'income' : 'expense'">
                {{ row.direction === 1 ? '+' : '-' }}{{ fmtPrice(row.amount) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="结余" width="140">
            <template #default="{ row }">{{ fmtPrice(row.runningBalance) }}</template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
          <el-table-column label="参考号" width="160">
            <template #default="{ row }">
              <span v-if="row.refNo" class="muted">{{ row.refNo }}</span>
              <span v-else-if="row.orderId">订单 #{{ row.orderId }}</span>
              <span v-else-if="row.refundId">退款 #{{ row.refundId }}</span>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="pager">
          <el-pagination v-model:current-page="ledgerPage" :page-size="20" :total="ledgerTotal"
            layout="prev, pager, next, jumper, total" background />
        </div>
      </el-tab-pane>

      <el-tab-pane label="账单记录" name="bills">
        <el-table v-loading="billLoading" :data="billItems" border>
          <el-table-column label="时间" width="180">
            <template #default="{ row }">{{ fmtTs(row.createTime) }}</template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="140" />
          <el-table-column label="金额" width="140">
            <template #default="{ row }"><span class="price">{{ fmtPrice(row.amount) }}</span></template>
          </el-table-column>
          <el-table-column label="订单" width="120">
            <template #default="{ row }">
              <span v-if="row.orderId">#{{ row.orderId }}</span>
              <span v-else class="muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        </el-table>
        <div class="pager">
          <el-pagination v-model:current-page="billPage" :page-size="20" :total="billTotal"
            layout="prev, pager, next, jumper, total" background />
        </div>
      </el-tab-pane>

      <el-tab-pane label="提现记录" name="withdrawals">
        <el-table v-loading="wdLoading" :data="wdItems" border>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="申请时间" width="180">
            <template #default="{ row }">{{ fmtTs(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="金额" width="140">
            <template #default="{ row }"><span class="price">{{ fmtPrice(row.amount) }}</span></template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="WD_STATUS_TAG[row.status] || 'info'" size="small">
                {{ WD_STATUS_LABEL[row.status] || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="bankInfo" label="收款账户" min-width="200" show-overflow-tooltip />
          <el-table-column label="处理时间" width="180">
            <template #default="{ row }">{{ fmtTs(row.handleTime ?? 0) }}</template>
          </el-table-column>
          <el-table-column prop="adminRemark" label="平台备注" min-width="160" show-overflow-tooltip />
        </el-table>
        <div class="pager">
          <el-pagination v-model:current-page="wdPage" :page-size="20" :total="wdTotal"
            layout="prev, pager, next, jumper, total" background />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 提现 modal -->
    <el-dialog v-model="wdDialog" title="申请提现" width="480px">
      <el-form ref="wdFormRef" :model="wdForm" :rules="wdRules" label-width="100px">
        <el-form-item label="提现金额" prop="amount">
          <el-input
            :model-value="(wdForm.amount / 100).toFixed(2)"
            @update:model-value="(v: string) => (wdForm.amount = Math.round(Number(v || 0) * 100))"
            placeholder="0.00"
            style="width: 200px"
          />
          <span class="hint">元；可用余额 {{ wallet ? fmtPrice(wallet.balance) : '--' }}</span>
        </el-form-item>
        <el-form-item label="收款账户" prop="bankInfo">
          <el-input
            v-model="wdForm.bankInfo"
            type="textarea"
            :rows="3"
            placeholder="如：工商银行 6222 0202 ... · 户主 张三"
          />
        </el-form-item>
        <el-alert
          type="info"
          :closable="false"
          title="提现申请提交后等待平台审核，通常 T+1 工作日处理"
        />
      </el-form>
      <template #footer>
        <el-button @click="wdDialog = false">取消</el-button>
        <el-button type="primary" :loading="wdSubmitting" @click="submitWithdraw">提交申请</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<style scoped>
.metric-card {
  text-align: center;
  border-radius: 12px;
}
.metric-card.available {
  background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
  border: 1px solid #ffd6d6;
}
.metric-label {
  color: #999;
  font-size: 13px;
}
.metric-num {
  font-size: 24px;
  font-weight: 600;
  color: #e1251b;
  margin-top: 8px;
  line-height: 1.4;
}
.metric-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.price {
  color: #e1251b;
  font-weight: 600;
}
.income {
  color: #67c23a;
  font-weight: 600;
}
.expense {
  color: #f56c6c;
  font-weight: 600;
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
.hint {
  margin-left: 12px;
  color: #999;
  font-size: 12px;
}
</style>
