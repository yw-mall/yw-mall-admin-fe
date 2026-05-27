import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

const STORAGE_KEY = 'yw-mall-merchant-user'

interface PersistedShape {
  accessToken?: string
  refreshToken?: string
  csrfToken?: string
  // legacy `token` from the JWT era — still supported for one upgrade cycle
  token?: string
}

function readPersisted(): PersistedShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as PersistedShape
  } catch {
    return {}
  }
}

function readAccessToken(): string | null {
  const p = readPersisted()
  return p.accessToken || p.token || null
}

function readRefreshToken(): string | null {
  const p = readPersisted()
  return p.refreshToken || null
}

function readCsrfToken(): string | null {
  const p = readPersisted()
  return p.csrfToken || null
}

function writeSession(payload: { accessToken: string; refreshToken: string; csrfToken: string; expiresIn: number }) {
  // Re-read & merge so we don't clobber identity fields written by the user store.
  let merged: Record<string, unknown> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) merged = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // ignore
  }
  merged.accessToken = payload.accessToken
  merged.refreshToken = payload.refreshToken
  merged.csrfToken = payload.csrfToken
  merged.expiresAt = Date.now() + payload.expiresIn * 1000
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
}

const request: AxiosInstance = axios.create({
  baseURL: '/merchant/v1',
  timeout: 15000,
})

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  // Double-submit CSRF on writes when we have a bound csrf token.
  const method = (config.method ?? 'get').toUpperCase()
  if (WRITE_METHODS.has(method)) {
    const csrf = readCsrfToken()
    if (csrf) {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, string>)['X-CSRF-Token'] = csrf
    }
  }
  return config
})

interface RefreshRespBody {
  token: string
  refreshToken: string
  expiresIn: number
  csrfToken: string
  data?: RefreshRespBody
}

// Single in-flight refresh promise so a burst of 401s doesn't kick off
// multiple refreshes which would invalidate each other on the server side.
let refreshing: Promise<boolean> | null = null

function callRefresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = new Promise<boolean>((resolve) => {
    const rt = readRefreshToken()
    if (!rt) {
      resolve(false)
      return
    }
    axios
      .post<RefreshRespBody>('/merchant/v1/refresh', { refreshToken: rt }, { timeout: 15000 })
      .then((res) => {
        // The same code/data wrapper unwrap we do in the response interceptor.
        let body = res.data as RefreshRespBody
        if (body && body.data) body = body.data
        if (body && body.token && body.refreshToken) {
          writeSession({
            accessToken: body.token,
            refreshToken: body.refreshToken,
            csrfToken: body.csrfToken,
            expiresIn: body.expiresIn,
          })
          resolve(true)
        } else {
          resolve(false)
        }
      })
      .catch(() => resolve(false))
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean
}

request.interceptors.response.use(
  (resp) => {
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      const code = (body as { code: number }).code
      if (code !== 0) {
        const message = (body as { message?: string }).message ?? '请求失败'
        ElMessage.error(message)
        return Promise.reject(new Error(message))
      }
      return body
    }
    return body
  },
  async (error) => {
    const status = error?.response?.status
    const cfg = (error?.config ?? {}) as RetriableConfig
    if (status === 401 && !cfg._retried) {
      // Don't try to refresh on the refresh endpoint itself or login.
      const url: string = (cfg.url ?? '').toString()
      if (!url.endsWith('/refresh') && !url.endsWith('/login')) {
        const ok = await callRefresh()
        if (ok) {
          cfg._retried = true
          // Force a fresh Authorization header (instance interceptor will re-add).
          if (cfg.headers) {
            delete (cfg.headers as Record<string, string>).Authorization
          }
          return request(cfg)
        }
      }
      localStorage.removeItem(STORAGE_KEY)
      if (location.pathname !== '/login') {
        location.href = '/login'
      }
      ElMessage.error('登录已失效，请重新登录')
      return Promise.reject(error)
    }
    const message = error?.response?.data?.message || error.message || '网络错误'
    ElMessage.error(message)
    return Promise.reject(error)
  },
)

export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.get(url, config) as unknown as Promise<T>
}

export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.post(url, data, config) as unknown as Promise<T>
}

export function put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.put(url, data, config) as unknown as Promise<T>
}

export function del<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.delete(url, config) as unknown as Promise<T>
}

export default request
