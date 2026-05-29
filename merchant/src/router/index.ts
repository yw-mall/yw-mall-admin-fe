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
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/product/list.vue'),
        meta: { title: '商品管理', icon: 'Goods', perms: ['product.read'] },
      },
      {
        path: 'products/new',
        name: 'ProductNew',
        component: () => import('@/views/product/edit.vue'),
        meta: { title: '新建商品', perms: ['product.write'] },
      },
      {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        component: () => import('@/views/product/edit.vue'),
        meta: { title: '编辑商品', perms: ['product.write'] },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/order/list.vue'),
        meta: { title: '订单管理', icon: 'List', perms: ['order.read'] },
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/detail.vue'),
        meta: { title: '订单详情', perms: ['order.read'] },
      },
      {
        path: 'freight',
        name: 'FreightTemplates',
        component: () => import('@/views/freight/list.vue'),
        meta: { title: '物流模板', icon: 'Van', perms: ['freight.read'] },
      },
      {
        path: 'refunds',
        name: 'Refunds',
        component: () => import('@/views/refund/list.vue'),
        meta: { title: '退款处理', icon: 'RefreshLeft', perms: ['refund.read'] },
      },
      {
        path: 'refunds/:id',
        name: 'RefundDetail',
        component: () => import('@/views/refund/detail.vue'),
        meta: { title: '退款详情', perms: ['refund.read'] },
      },
      {
        path: 'wallet',
        name: 'Wallet',
        component: () => import('@/views/wallet/index.vue'),
        meta: { title: '财务', icon: 'Money', perms: ['finance.read'] },
      },
      {
        path: 'decoration',
        name: 'Decoration',
        component: () => import('@/views/decoration/edit.vue'),
        meta: { title: '店铺装修', icon: 'Picture' },
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
