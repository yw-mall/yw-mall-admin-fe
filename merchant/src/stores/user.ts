import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { LoginRequest, LoginResponse } from '@/types/api'
import { login as loginApi, logout as logoutApi } from '@/api/auth'

const STORAGE_KEY = 'yw-mall-merchant-user'

interface PersistedState {
  accessToken: string
  refreshToken: string
  csrfToken: string
  expiresAt: number
  uid: number
  username: string
  role: string
  staffRole: string // M1: owner/service/warehouse/finance
  perms: string[]
  shopId: number
}

function loadFromStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

interface SessionPayload {
  accessToken: string
  refreshToken: string
  csrfToken: string
  expiresIn: number
  uid?: number
  username?: string
  role?: string
  staffRole?: string
  perms?: string[]
  shopId?: number
}

export const useUserStore = defineStore('user', () => {
  const persisted = loadFromStorage()

  const accessToken = ref<string>(persisted?.accessToken ?? '')
  const refreshToken = ref<string>(persisted?.refreshToken ?? '')
  const csrfToken = ref<string>(persisted?.csrfToken ?? '')
  const expiresAt = ref<number>(persisted?.expiresAt ?? 0)
  const uid = ref<number>(persisted?.uid ?? 0)
  const username = ref<string>(persisted?.username ?? '')
  const role = ref<string>(persisted?.role ?? '')
  const staffRole = ref<string>(persisted?.staffRole ?? '')
  const perms = ref<string[]>(persisted?.perms ?? [])
  const shopId = ref<number>(persisted?.shopId ?? 0)

  function persist() {
    const state: PersistedState = {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      csrfToken: csrfToken.value,
      expiresAt: expiresAt.value,
      uid: uid.value,
      username: username.value,
      role: role.value,
      staffRole: staffRole.value,
      perms: perms.value,
      shopId: shopId.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  watch(
    [accessToken, refreshToken, csrfToken, expiresAt, uid, username, role, staffRole, perms, shopId],
    () => {
      if (accessToken.value) {
        persist()
      }
    },
    { deep: true },
  )

  // setSession is called after login and after a successful refresh; only the
  // token-shaped fields are mandatory, identity fields are kept across rotations.
  function setSession(payload: SessionPayload) {
    accessToken.value = payload.accessToken
    refreshToken.value = payload.refreshToken
    csrfToken.value = payload.csrfToken
    expiresAt.value = Date.now() + payload.expiresIn * 1000
    if (payload.uid !== undefined) uid.value = payload.uid
    if (payload.username !== undefined) username.value = payload.username
    if (payload.role !== undefined) role.value = payload.role
    if (payload.staffRole !== undefined) staffRole.value = payload.staffRole
    if (payload.perms !== undefined) perms.value = payload.perms
    if (payload.shopId !== undefined) shopId.value = payload.shopId
    persist()
  }

  async function login(req: LoginRequest): Promise<LoginResponse> {
    const resp = await loginApi(req)
    setSession({
      accessToken: resp.token,
      refreshToken: resp.refreshToken,
      csrfToken: resp.csrfToken,
      expiresIn: resp.expiresIn,
      uid: resp.uid ?? resp.id ?? 0,
      role: resp.role,
      staffRole: resp.staffRole ?? '',
      perms: resp.perms ?? resp.permissions ?? [],
      shopId: resp.shopId ?? 0,
      username: resp.username ?? req.username,
    })
    return resp
  }

  function clear() {
    accessToken.value = ''
    refreshToken.value = ''
    csrfToken.value = ''
    expiresAt.value = 0
    uid.value = 0
    username.value = ''
    role.value = ''
    staffRole.value = ''
    perms.value = []
    shopId.value = 0
    localStorage.removeItem(STORAGE_KEY)
  }

  async function logout() {
    if (accessToken.value) {
      try {
        await logoutApi()
      } catch {
        // best-effort, server may already be down or token already gone
      }
    }
    clear()
  }

  function hasPerm(p: string): boolean {
    if (!p) return true
    // M1 merchant: owner 的 perms 是 ["*"] 全开
    if (perms.value.includes('*')) return true
    if (role.value === 'super_admin') return true
    return perms.value.includes(p)
  }

  return {
    // legacy alias for components that still read `token`
    token: accessToken,
    accessToken,
    refreshToken,
    csrfToken,
    expiresAt,
    uid,
    username,
    role,
    staffRole,
    perms,
    shopId,
    setSession,
    login,
    logout,
    clear,
    hasPerm,
  }
})
