import { get, post, put as putReq } from './request'
import type { ApiResponse } from '@/types/api'

export interface PromotionTarget {
  targetType: 'sku' | 'category' | 'shop' | 'all'
  targetId: number
}

export interface PromotionAction {
  actionType: 'reduce' | 'discount' | 'cash' | 'fixprice' | 'freeship' | 'gift'
  thresholdType?: 'none' | 'amount' | 'quantity'
  thresholdValue?: number // 分 或 件
  benefitValue: number // 减/折/一口价（分）
  maxDiscount?: number
  giftSkuId?: number
  stepOrder?: number
}

export interface Promotion {
  id: number
  type: 'fullreduce' | 'discount' | 'fixprice' | 'coupon'
  name: string
  shopId: number
  status: number // 0草稿/1待开始/2进行中/3已结束/4已下线
  startTime: number
  endTime: number
  priority: number
  stackable: boolean
  description: string
  createUserId: number
  createTime: number
  updateTime: number
  targets?: PromotionTarget[]
  actions?: PromotionAction[]
}

export interface CreatePromotionReq {
  type: string
  name: string
  startTime: number
  endTime: number
  priority?: number
  stackable?: boolean
  description?: string
  targets: PromotionTarget[]
  actions: PromotionAction[]
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) return (b as ApiResponse<T>).data as T
  return b as unknown as T
}

export async function listPromotions(params: {
  type?: string
  status?: number
  page?: number
  pageSize?: number
}): Promise<{ promotions: Promotion[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  if (params.type) qs.set('type', params.type)
  if (params.status !== undefined) qs.set('status', String(params.status))
  type Body = { promotions: Promotion[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/promotions?${qs.toString()}`)
  return unwrap(body) as Body
}

export async function getPromotion(id: number): Promise<Promotion> {
  const body = await get<ApiResponse<Promotion> & Promotion>(`/promotions/${id}`)
  return unwrap(body) as Promotion
}

export async function createPromotion(req: CreatePromotionReq): Promise<{ id: number }> {
  const body = await post<ApiResponse<{ id: number }> & { id: number }>('/promotions', req)
  return unwrap(body) as { id: number }
}

export async function updatePromotion(
  id: number,
  req: Omit<CreatePromotionReq, 'type'>,
) {
  return putReq(`/promotions/${id}`, req)
}

export async function onlinePromotion(id: number) {
  return post(`/promotions/${id}/online`, {})
}

export async function offlinePromotion(id: number) {
  return post(`/promotions/${id}/offline`, {})
}
