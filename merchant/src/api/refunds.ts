import { get, post } from './request'
import type { ApiResponse } from '@/types/api'

export interface RefundItemSku {
  skuId: number
  skuName: string
  quantity: number
  amount: number
}

export interface RefundItem {
  id: number
  orderId: number
  orderNo: string
  userId: number
  shopId: number
  amount: number
  reason: string
  status: number // 0待商家处理 1同意待寄回 2用户已寄回 3验货通过/已仲裁 4已完成 5驳回 6已退款 等
  refundType?: number // 1=仅退款, 2=退货退款, 3=换货
  merchantHandleTime?: number
  merchantRemark?: string
  returnTrackingNo?: string // 退货物流单号 (用户填的)
  createTime: number
}

export interface RefundDetail extends RefundItem {
  evidence?: string[]
  items?: RefundItemSku[]
  adminId?: number
  adminRemark?: string
  appealReason?: string
  appealTime?: number
  refundNo?: string
  refundCompleteTime?: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) return (b as ApiResponse<T>).data as T
  return b as unknown as T
}

export async function listRefunds(params: {
  page?: number
  pageSize?: number
  status?: number
}): Promise<{ requests: RefundItem[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  if (params.status !== undefined && params.status >= 0) {
    qs.set('status', String(params.status))
  }
  type Body = { requests: RefundItem[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/refunds?${qs.toString()}`)
  return unwrap(body) as Body
}

export async function getRefund(id: number): Promise<RefundDetail> {
  const body = await get<ApiResponse<RefundDetail> & RefundDetail>(`/refunds/${id}`)
  return unwrap(body) as RefundDetail
}

// action: 1=同意, 2=驳回
export async function handleRefund(id: number, action: number, remark: string) {
  return post(`/refunds/${id}/handle`, { action, remark })
}

export async function inspectReturn(id: number, passed: boolean, remark: string) {
  return post(`/refunds/${id}/inspect`, { passed, remark })
}

export async function shipExchange(id: number, carrier: string, trackingNo: string) {
  return post(`/refunds/${id}/ship-exchange`, { carrier, trackingNo })
}
