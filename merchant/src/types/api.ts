// Common API types

export interface ApiResponse<T = unknown> {
  code: number
  message?: string
  data?: T
  // Some endpoints flatten result fields onto the body (e.g. list endpoints):
  [key: string]: unknown
}

export interface PageParams {
  page?: number
  page_size?: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  expiresIn: number
  csrfToken: string
  // backend returns `id` (snake-case `id`), the FE used to call it `uid`;
  // accept both so refresh-then-relogin reuses the same store shape.
  uid?: number
  id?: number
  role: string
  shopId?: number
  // M1 merchant 子角色 owner/service/warehouse/finance
  staffRole?: string
  perms?: string[]
  permissions?: string[]
  username?: string
  // S4.3 — when true the FE must reLaunch to /security/password before any other nav.
  passwordExpired?: boolean
  // S4.1 — when true Token/RefreshToken are EMPTY; the FE must call mfaLogin
  // with `challengeToken` + 6-digit code to mint the real session.
  mfaRequired?: boolean
  challengeToken?: string
}

export interface MfaLoginRequest {
  challengeToken: string
  code: string
}

export interface MfaSmsSendRequest {
  challengeToken: string
}

export interface RefreshResponse {
  token: string
  refreshToken: string
  expiresIn: number
  csrfToken: string
}

export interface ReviewRequest {
  action: number // 1=通过, 2=驳回
  remark?: string
}

// ----- Domain -----

export interface ShopApplication {
  id: number
  shopName: string
  legalPerson: string
  contactPhone: string
  category: string
  status: number
  createTime: number
}

export interface Shop {
  id: number
  name: string
  ownerUserId: number
  status: number
  level: number
  creditScore: number
  productCount: number
  createTime: number
}

export interface Product {
  id: number
  name: string
  shopId: number
  price: number
  status: number
  createTime: number
}

export interface UserItem {
  id: number
  username: string
  phone: string
  status: number
  createTime: number
}

export interface Account {
  id: number
  username: string
  email: string
  role: string
  status: number
  createTime: number
}

export interface ReviewDeleteRequest {
  id: number
  reviewId: number
  shopId: number
  reason: string
  status: number
  createTime: number
}

export interface Complaint {
  id: number
  complainantType: string
  targetId: number
  type: string
  status: number
  createTime: number
}

export interface Restriction {
  id: number
  restriction: string
  reason: string
  operatorId: number
  createTime: number
  expireTime: number
}

export interface Activity {
  id: number
  code: string
  title: string
  type: string
  status: number
  startTime: number
  endTime: number
}

export interface Rule {
  id: number
  code: string
  description: string
  expression: string
  status: number
  createTime: number
}

export interface Withdrawal {
  id: number
  shopId: number
  amount: number
  status: number
  bankInfo: string
  createTime: number
}

export interface LevelApplication {
  id: number
  shopId: number
  currentLevel: number
  targetLevel: number
  snapshot: string
  status: number
  createTime: number
}

export interface LifecycleRequest {
  id: number
  shopId: number
  action: string
  reason: string
  status: number
  createTime: number
}

export interface SensitiveWord {
  id: number
  word: string
  category: string
  action: string
  status: number
  createTime: number
}
