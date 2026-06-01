import { get, post } from './request'
import type { ApiResponse } from '@/types/api'

export interface CouponTemplate {
  id: number
  activityId: number
  shopId: number
  name: string
  type: 'full_reduce' | 'discount' | 'cash' | 'freeship'
  value: number
  minAmount: number
  maxDiscount: number
  categoryId: number
  totalCount: number
  receivedCount: number
  usedCount: number
  perUserLimit: number
  validType: number // 0固定/1领后N天
  validDays: number
  validStart: number
  validEnd: number
  receiveStart: number
  receiveEnd: number
  status: number // 0下架/1上架
  createTime: number
  updateTime: number
  isNewUserOnly?: boolean
  newUserWithinDays?: number
}

export interface CreateCouponTemplateReq {
  name: string
  type: string
  value: number
  minAmount?: number
  maxDiscount?: number
  totalCount: number
  perUserLimit?: number
  validType: number
  validDays?: number
  validStart?: number
  validEnd?: number
  receiveStart: number
  receiveEnd: number
  // S2.3 新人券
  isNewUserOnly?: boolean
  newUserWithinDays?: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) return (b as ApiResponse<T>).data as T
  return b as unknown as T
}

export async function listCouponTemplates(params: {
  status?: number
  page?: number
  pageSize?: number
}): Promise<{ templates: CouponTemplate[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  if (params.status !== undefined) qs.set('status', String(params.status))
  type Body = { templates: CouponTemplate[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/coupon-templates?${qs.toString()}`)
  return unwrap(body) as Body
}

export async function createCouponTemplate(req: CreateCouponTemplateReq): Promise<{ id: number }> {
  const body = await post<ApiResponse<{ id: number }> & { id: number }>('/coupon-templates', req)
  return unwrap(body) as { id: number }
}

export async function onlineCouponTemplate(id: number) {
  return post(`/coupon-templates/${id}/online`, {})
}

export async function offlineCouponTemplate(id: number) {
  return post(`/coupon-templates/${id}/offline`, {})
}
