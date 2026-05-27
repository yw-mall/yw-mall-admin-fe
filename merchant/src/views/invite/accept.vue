<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const invitationCode = ref('')

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = ref({ account: '', password: '' })

const result = ref<{ shopId: number; role: string; shopName: string } | null>(null)
const errMsg = ref('')

const rules: FormRules = {
  account: [{ required: true, message: '请输入 C 端账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

onMounted(() => {
  const code = route.query.code as string
  if (!code) {
    errMsg.value = '邀请链接缺少 code 参数'
    return
  }
  invitationCode.value = code
})

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!invitationCode.value) {
    errMsg.value = '邀请链接缺少 code 参数'
    return
  }
  loading.value = true
  try {
    // 1. C 端登录拿 token；dev 走 vite proxy /api → :18888，prod 走 nginx
    const loginResp = await axios.post(
      '/api/auth/login',
      { account: form.value.account, password: form.value.password },
      { timeout: 15000 },
    )
    const data = loginResp.data?.data ?? loginResp.data
    const accessToken: string = data?.accessToken
    if (!accessToken) {
      errMsg.value = '账号或密码错误'
      return
    }
    // 2. 用 c-user token 调 accept
    const acceptResp = await axios.post(
      '/merchant/v1/invitations/accept',
      { invitationCode: invitationCode.value },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 },
    )
    const r = acceptResp.data?.data ?? acceptResp.data
    if (r && r.shopId) {
      result.value = r
      ElMessage.success(`已加入「${r.shopName}」`)
    } else {
      errMsg.value = (acceptResp.data as { message?: string })?.message ?? '接受失败'
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } }; message?: string }
    errMsg.value = e?.response?.data?.message ?? e?.message ?? '接受失败'
  } finally {
    loading.value = false
  }
}

function roleLabel(r: string) {
  return ({ owner: '店主', service: '客服', warehouse: '仓管', finance: '财务' } as Record<string, string>)[r] || r
}
</script>

<template>
  <div class="invite-page">
    <div class="invite-card">
      <h2 class="title">接受店铺邀请</h2>

      <div v-if="result">
        <el-result
          icon="success"
          :title="`已加入「${result.shopName}」`"
          :sub-title="`角色：${roleLabel(result.role)}（店铺 ID: ${result.shopId}）`"
        >
          <template #extra>
            <button class="submit-btn" @click="router.replace('/login')">前往商家工作台登录</button>
          </template>
        </el-result>
      </div>

      <div v-else>
        <p class="subtitle">请用您的 C 端账号验证身份（防止代领）。</p>
        <el-alert v-if="errMsg" :title="errMsg" type="error" :closable="false" style="margin-bottom: 16px" />

        <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="onSubmit">
          <el-form-item prop="account">
            <div class="input-block">
              <el-input v-model="form.account" placeholder="C 端账号（用户名/手机号/邮箱）" :prefix-icon="User" />
            </div>
          </el-form-item>
          <el-form-item prop="password">
            <div class="input-block">
              <el-input v-model="form.password" type="password" show-password placeholder="密码" :prefix-icon="Lock" />
            </div>
          </el-form-item>
          <button class="submit-btn" :disabled="loading || !invitationCode" @click.prevent="onSubmit">
            {{ loading ? '验证中...' : '接受邀请' }}
          </button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invite-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f7;
}
.invite-card {
  width: 440px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  padding: 36px;
}
.title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}
.subtitle {
  color: #999;
  font-size: 13px;
  margin: 0 0 20px;
}
.input-block {
  width: 100%;
  background: #f5f5f7;
  border-radius: 12px;
  padding: 2px 10px;
}
.input-block :deep(.el-input__wrapper) {
  background: transparent !important;
  box-shadow: none !important;
}
.input-block :deep(.el-input__inner) {
  height: 44px;
  font-size: 15px;
}
.input-block :deep(.el-input__prefix-inner) {
  color: #999;
  font-size: 18px;
}
.submit-btn {
  width: 100%;
  height: 46px;
  border: 0;
  border-radius: 23px;
  background: linear-gradient(135deg, #e1251b, #ff4b4b);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
