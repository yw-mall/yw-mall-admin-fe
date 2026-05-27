<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const loading = ref(false)
const form = ref({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await userStore.login({ username: form.value.username, password: form.value.password })
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  } catch (err) {
    // request interceptor 已弹 toast，这里只补 console
    console.error('merchant login failed', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-mark">YW</div>
        <div class="brand-name">yw-mall</div>
      </div>
      <h2 class="title">欢迎登录</h2>
      <p class="subtitle">商家工作台</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        @keyup.enter="onSubmit"
        class="login-form"
      >
        <el-form-item prop="username">
          <div class="input-block">
            <el-input
              v-model="form.username"
              placeholder="账号"
              :prefix-icon="User"
              autocomplete="username"
            />
          </div>
        </el-form-item>

        <el-form-item prop="password">
          <div class="input-block">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="密码"
              :prefix-icon="Lock"
              autocomplete="current-password"
            />
          </div>
        </el-form-item>

        <button class="submit-btn" :disabled="loading" @click.prevent="onSubmit">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </el-form>

      <p class="foot">未注册账号？请联系平台客服申请店铺入驻。</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f7;
}
.login-card {
  width: 420px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  padding: 40px 36px 36px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e1251b, #ff4b4b);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}
.title {
  font-size: 26px;
  font-weight: 600;
  color: #333;
  margin: 0;
}
.subtitle {
  color: #999;
  font-size: 14px;
  margin: 6px 0 28px;
}
.login-form {
  margin-top: 12px;
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
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
  cursor: pointer;
  margin-top: 8px;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.foot {
  margin-top: 24px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
