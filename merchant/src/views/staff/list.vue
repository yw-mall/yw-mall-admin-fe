<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import PageContainer from '@/components/PageContainer.vue'
import { useUserStore } from '@/stores/user'
import {
  listStaff,
  updateStaffRole,
  disableStaff,
  listInvitations,
  createInvitation,
  revokeInvitation,
  type StaffItem,
  type InvitationItem,
} from '@/api/staff'

const user = useUserStore()
const staff = ref<StaffItem[]>([])
const invitations = ref<InvitationItem[]>([])
const loadingStaff = ref(false)
const loadingInv = ref(false)

const ROLE_OPTIONS = [
  { value: 'service', label: '客服' },
  { value: 'warehouse', label: '仓管' },
  { value: 'finance', label: '财务' },
]

function roleLabel(r: string) {
  return (
    ({ owner: '店主', service: '客服', warehouse: '仓管', finance: '财务' } as Record<string, string>)[r] ||
    r
  )
}

function statusLabel(s: number) {
  return s === 1 ? '正常' : '已冻结'
}

function fmtTs(ts: number) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString()
}

async function reload() {
  loadingStaff.value = true
  try {
    const r = await listStaff()
    staff.value = r.items || []
  } finally {
    loadingStaff.value = false
  }
  loadingInv.value = true
  try {
    const r = await listInvitations()
    invitations.value = r.items || []
  } finally {
    loadingInv.value = false
  }
}

onMounted(reload)

// ===== Invite modal =====
const inviteDialogVisible = ref(false)
const inviteFormRef = ref<FormInstance>()
const inviteForm = ref({ targetPhone: '', targetEmail: '', role: 'warehouse' })
const inviteLoading = ref(false)
const newCode = ref('')

const inviteRules: FormRules = {
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

function openInvite() {
  inviteForm.value = { targetPhone: '', targetEmail: '', role: 'warehouse' }
  newCode.value = ''
  inviteDialogVisible.value = true
}

async function submitInvite() {
  if (!inviteFormRef.value) return
  try {
    await inviteFormRef.value.validate()
  } catch {
    return
  }
  if (!inviteForm.value.targetPhone && !inviteForm.value.targetEmail) {
    ElMessage.error('手机号和邮箱至少填一个')
    return
  }
  inviteLoading.value = true
  try {
    const r = await createInvitation({
      targetPhone: inviteForm.value.targetPhone || undefined,
      targetEmail: inviteForm.value.targetEmail || undefined,
      role: inviteForm.value.role,
    })
    newCode.value = r.invitationCode
    ElMessage.success('邀请已发送（dev: 看 logs/shop-rpc.log 拿验证码）')
    await reload()
  } finally {
    inviteLoading.value = false
  }
}

// ===== Change role =====
async function onChangeRole(s: StaffItem, newRole: string) {
  if (s.role === 'owner') {
    ElMessage.warning('店主角色不可修改')
    return
  }
  try {
    await updateStaffRole(s.id, newRole)
    ElMessage.success(`已将 ${s.username} 改为 ${roleLabel(newRole)}`)
    await reload()
  } catch {
    // request 已 toast
  }
}

// ===== Disable =====
async function onDisable(s: StaffItem) {
  if (s.role === 'owner') {
    ElMessage.warning('店主不可冻结')
    return
  }
  try {
    await ElMessageBox.confirm(`确定冻结员工「${s.username}」吗？`, '冻结员工', {
      type: 'warning',
      confirmButtonText: '冻结',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await disableStaff(s.id)
  ElMessage.success('已冻结')
  await reload()
}

// ===== Revoke invitation =====
async function onRevoke(inv: InvitationItem) {
  try {
    await ElMessageBox.confirm('确定撤销这条邀请吗？', '撤销邀请', {
      type: 'warning',
      confirmButtonText: '撤销',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await revokeInvitation(inv.id)
  ElMessage.success('已撤销')
  await reload()
}

const buildInviteLink = (code: string) =>
  `${window.location.origin}/accept-invite?code=${code}`

async function copyLink(code: string) {
  const link = buildInviteLink(code)
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success('邀请链接已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <PageContainer title="员工管理">
    <div class="header-bar">
      <span class="hint">当前共 {{ staff.length }} 位员工 · {{ invitations.length }} 条待处理邀请</span>
      <el-button
        v-if="user.hasPerm('staff.write')"
        type="primary"
        @click="openInvite"
      >
        + 邀请新成员
      </el-button>
    </div>

    <h3 class="section-title">员工列表</h3>
    <el-table v-loading="loadingStaff" :data="staff" border style="margin-bottom: 24px">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="账号" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'owner' ? 'danger' : 'info'">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="加入时间" width="180">
        <template #default="{ row }">{{ fmtTs(row.joinedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" v-if="user.hasPerm('staff.write')">
        <template #default="{ row }">
          <el-select
            v-if="row.role !== 'owner' && row.status === 1"
            :model-value="row.role"
            placeholder="改角色"
            size="small"
            style="width: 110px; margin-right: 8px"
            @change="(v: string) => onChangeRole(row, v)"
          >
            <el-option v-for="o in ROLE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-button
            v-if="row.role !== 'owner' && row.status === 1"
            size="small"
            type="danger"
            link
            @click="onDisable(row)"
          >
            冻结
          </el-button>
          <span v-else-if="row.role === 'owner'" class="muted">—</span>
        </template>
      </el-table-column>
    </el-table>

    <h3 class="section-title">待处理邀请</h3>
    <el-table v-loading="loadingInv" :data="invitations" border empty-text="暂无待处理邀请">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="对象">
        <template #default="{ row }">
          <span v-if="row.targetPhone">📱 {{ row.targetPhone }}</span>
          <span v-else-if="row.targetEmail">📧 {{ row.targetEmail }}</span>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="100">
        <template #default="{ row }">{{ roleLabel(row.role) }}</template>
      </el-table-column>
      <el-table-column label="过期时间" width="180">
        <template #default="{ row }">{{ fmtTs(row.expiresAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" v-if="user.hasPerm('staff.write')">
        <template #default="{ row }">
          <el-button size="small" type="danger" link @click="onRevoke(row)">撤销</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Invite modal -->
    <el-dialog v-model="inviteDialogVisible" title="邀请新成员" width="480px">
      <el-form ref="inviteFormRef" :model="inviteForm" :rules="inviteRules" label-width="80px">
        <el-form-item label="手机号" prop="targetPhone">
          <el-input v-model="inviteForm.targetPhone" placeholder="11 位手机号（与邮箱二选一）" />
        </el-form-item>
        <el-form-item label="邮箱" prop="targetEmail">
          <el-input v-model="inviteForm.targetEmail" placeholder="example@domain.com（可选）" />
        </el-form-item>
        <el-form-item label="角色" prop="role" required>
          <el-radio-group v-model="inviteForm.role">
            <el-radio v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <div v-if="newCode" class="result-block">
        <el-alert type="success" :closable="false" title="邀请已生成" />
        <p class="result-line">
          邀请链接：
          <code>{{ buildInviteLink(newCode) }}</code>
        </p>
        <el-button type="primary" plain size="small" @click="copyLink(newCode)">复制链接</el-button>
      </div>

      <template #footer>
        <el-button @click="inviteDialogVisible = false">关闭</el-button>
        <el-button v-if="!newCode" type="primary" :loading="inviteLoading" @click="submitInvite">
          发送邀请
        </el-button>
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
.hint {
  color: #666;
  font-size: 13px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #333;
}
.muted {
  color: #ccc;
}
.result-block {
  margin-top: 16px;
}
.result-line {
  margin: 12px 0 8px;
  font-size: 12px;
  color: #666;
  word-break: break-all;
}
code {
  background: #f5f5f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
</style>
