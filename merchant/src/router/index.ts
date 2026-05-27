import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '商家登录', public: true },
  },
  {
    path: '/accept-invite',
    name: 'AcceptInvite',
    component: () => import('@/views/invite/accept.vue'),
    meta: { title: '接受邀请', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'Odometer' },
      },
      {
        path: 'staff',
        name: 'Staff',
        component: () => import('@/views/staff/list.vue'),
        meta: { title: '员工管理', icon: 'UserFilled', perms: ['staff.read'] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const store = useUserStore()
  if (to.meta?.public) return next()
  if (!store.accessToken) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  const required = to.meta?.perms as string[] | undefined
  if (required && required.length > 0) {
    if (!required.some((p) => store.hasPerm(p))) {
      return next({ path: '/dashboard' })
    }
  }
  if (typeof to.meta?.title === 'string') {
    document.title = `${to.meta.title} · 商家工作台`
  }
  next()
})

export default router
