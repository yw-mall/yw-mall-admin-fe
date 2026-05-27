<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Key, Iphone } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { login as loginApi, mfaLogin, mfaSmsSend } from '@/api/auth'
import type { LoginResponse } from '@/types/api'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

type Mode = 'password' | 'mfa'
const mode = ref<Mode>('password')

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = ref({
  username: 'admin',
  password: 'admin123',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const challengeToken = ref('')
const mfaCode = ref('')
const smsLoading = ref(false)

function applySession(resp: LoginResponse) {
  userStore.setSession({
    accessToken: resp.token,
    refreshToken: resp.refreshToken,
    csrfToken: resp.csrfToken,
    expiresIn: resp.expiresIn,
    uid: resp.uid ?? resp.id ?? 0,
    role: resp.role,
    perms: resp.perms ?? resp.permissions ?? [],
    shopId: resp.shopId ?? 0,
    username: resp.username ?? form.value.username,
  })
}

async function onSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const resp = await loginApi({ username: form.value.username, password: form.value.password })
    if (resp.mfaRequired) {
      challengeToken.value = resp.challengeToken ?? ''
      mode.value = 'mfa'
      mfaCode.value = ''
      ElMessage.info('请输入 MFA 验证码')
      return
    }
    applySession(resp)
    finishLogin(resp)
  } catch {
    // ElMessage handled in interceptor
  } finally {
    loading.value = false
  }
}

async function onMfaSubmit() {
  if (!challengeToken.value || mfaCode.value.length !== 6) {
    ElMessage.warning('请输入 6 位验证码')
    return
  }
  loading.value = true
  try {
    const resp = await mfaLogin({ challengeToken: challengeToken.value, code: mfaCode.value })
    applySession(resp)
    finishLogin(resp)
  } catch {
    // interceptor surfaces the message
  } finally {
    loading.value = false
  }
}

async function onRequestSms() {
  if (!challengeToken.value) return
  smsLoading.value = true
  try {
    await mfaSmsSend({ challengeToken: challengeToken.value })
    ElMessage.success('短信已发送（开发模式：查看 user-rpc 日志）')
  } finally {
    smsLoading.value = false
  }
}

function backToPassword() {
  challengeToken.value = ''
  mfaCode.value = ''
  mode.value = 'password'
}

function finishLogin(resp: LoginResponse) {
  ElMessage.success('登录成功')
  if (resp.passwordExpired) {
    ElMessage.warning('密码已过期，请立即修改')
    router.replace('/security/password')
    return
  }
  const redirect = (route.query.redirect as string) || '/'
  router.replace(redirect)
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="brand">
        <div class="brand__logo">YW</div>
        <div class="brand__name">yw-mall</div>
      </div>

      <template v-if="mode === 'password'">
        <div class="header">
          <div class="title">欢迎登录</div>
          <div class="subtitle">yw-mall 平台管理后台</div>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          @submit.prevent="onSubmit"
          class="form"
        >
          <el-form-item prop="username">
            <div class="input-block">
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                :prefix-icon="User"
              />
            </div>
          </el-form-item>
          <el-form-item prop="password">
            <div class="input-block">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
                :prefix-icon="Lock"
                @keyup.enter="onSubmit"
              />
            </div>
          </el-form-item>

          <button type="button" class="submit-btn" :disabled="loading" @click="onSubmit">
            <span v-if="loading">登录中...</span>
            <span v-else>登 录</span>
          </button>
        </el-form>

        <div class="footer-tip">登录即代表同意平台管理员使用协议</div>
      </template>

      <template v-else>
        <div class="header">
          <div class="title">两步验证</div>
          <div class="subtitle">请输入 Authenticator 或短信中的 6 位验证码</div>
        </div>

        <div class="form">
          <div class="input-block">
            <el-input
              v-model="mfaCode"
              maxlength="6"
              placeholder="6 位验证码"
              size="large"
              :prefix-icon="Key"
              @keyup.enter="onMfaSubmit"
            />
          </div>

          <button type="button" class="submit-btn" :disabled="loading" @click="onMfaSubmit">
            <span v-if="loading">验证中...</span>
            <span v-else>验证并登录</span>
          </button>

          <div class="mfa-actions">
            <button type="button" class="link-btn" :disabled="smsLoading" @click="onRequestSms">
              <el-icon><Iphone /></el-icon>
              <span>{{ smsLoading ? '发送中...' : '使用短信验证码' }}</span>
            </button>
            <button type="button" class="link-btn link-btn--ghost" @click="backToPassword">
              返回密码登录
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  padding: 24px;
  box-sizing: border-box;
}

.login-panel {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 56px 48px 40px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
}
.brand__logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff4b4b 0%, #e1251b 100%);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.5px;
}
.brand__name {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 0.3px;
}

.header {
  margin-bottom: 32px;
}
.title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  margin-bottom: 8px;
}
.subtitle {
  font-size: 13px;
  color: #999;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-block {
  background: #f5f5f7;
  border-radius: 12px;
  padding: 2px 12px;
}

:deep(.el-form-item) { margin-bottom: 18px; }
:deep(.el-form-item__error) { padding-left: 4px; }

:deep(.input-block .el-input__wrapper) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 4px;
}
:deep(.input-block .el-input__wrapper.is-focus) {
  box-shadow: none !important;
}
:deep(.input-block .el-input__inner) {
  height: 44px;
  font-size: 15px;
  color: #1a1a1a;
}
:deep(.input-block .el-input__inner::placeholder) {
  color: #b0b0b0;
}
:deep(.input-block .el-input__prefix-inner) {
  color: #999;
  font-size: 18px;
  margin-right: 4px;
}

.submit-btn {
  margin-top: 20px;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 23px;
  background: linear-gradient(90deg, #ff4b4b 0%, #e1251b 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.submit-btn:hover:not(:disabled) { opacity: 0.92; }
.submit-btn:active:not(:disabled) { transform: scale(0.99); }
.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.footer-tip {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #b0b0b0;
}

.mfa-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 0 4px;
}
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #e1251b;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
}
.link-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.link-btn--ghost { color: #999; }
.link-btn:hover:not(:disabled) { opacity: 0.8; }
</style>
