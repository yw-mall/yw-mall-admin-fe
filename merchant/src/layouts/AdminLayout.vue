<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

interface MenuItem {
  path: string
  title: string
  icon: string
  perm?: string // 缺则所有人可见
  disabled?: boolean // M2-M6 占位
}

// 商家工作台菜单 — 按 perm 条件渲染，M2-M6 模块灰显占位
const menu: MenuItem[] = [
  { path: '/dashboard', title: '仪表盘', icon: 'Odometer' },
  { path: '/staff', title: '员工管理', icon: 'UserFilled', perm: 'staff.read' },
  { path: '/products', title: '商品管理', icon: 'Goods', perm: 'product.read' },
  { path: '/orders', title: '订单管理', icon: 'List', perm: 'order.read' },
  { path: '/refunds', title: '退款处理', icon: 'RefreshLeft', perm: 'refund.read' },
  { path: '/wallet', title: '钱包 (M5)', icon: 'Money', perm: 'finance.read', disabled: true },
  { path: '/freight', title: '物流模板', icon: 'Van', perm: 'freight.read' },
  { path: '/decoration', title: '装修 (M6)', icon: 'Picture', perm: 'decoration.write', disabled: true },
]

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => (route.meta?.title as string) ?? '')

const visibleItems = computed(() =>
  menu.filter((m) => !m.perm || userStore.hasPerm(m.perm)),
)

async function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    await userStore.logout()
    router.push('/login')
  }
}

function staffRoleLabel(r: string) {
  switch (r) {
    case 'owner':
      return '店主'
    case 'service':
      return '客服'
    case 'warehouse':
      return '仓管'
    case 'finance':
      return '财务'
    default:
      return r || '-'
  }
}
</script>

<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <div class="brand-mark">YW</div>
        <div class="brand-name">商家工作台</div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
        background-color="#fff"
        text-color="#333"
        active-text-color="#e1251b"
      >
        <el-menu-item
          v-for="m in visibleItems"
          :key="m.path"
          :index="m.path"
          :disabled="m.disabled"
        >
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
        <el-dropdown trigger="click" @command="handleCommand">
          <span class="user-info">
            <el-avatar :size="28">{{ (userStore.username || 'M').charAt(0).toUpperCase() }}</el-avatar>
            <span class="username">{{ userStore.username || '商家' }}</span>
            <el-tag size="small" effect="plain" style="margin-left: 4px">
              {{ staffRoleLabel(userStore.staffRole) }}
            </el-tag>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>店铺 ID: {{ userStore.shopId || '-' }}</el-dropdown-item>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-root {
  height: 100vh;
}
.aside {
  background-color: #fff;
  border-right: 1px solid #ebeef5;
  overflow-y: auto;
}
.brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
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
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.menu {
  border-right: 0;
}
.menu :deep(.el-menu-item.is-active) {
  background-color: #fff5f5 !important;
  border-right: 3px solid #e1251b;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
}
.user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.username {
  font-size: 14px;
}
.main {
  background-color: #f5f5f7;
  padding: 20px;
}
</style>
