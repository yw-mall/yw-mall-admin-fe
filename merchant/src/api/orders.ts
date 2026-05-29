import { get, post } from './request'
import type { ApiResponse } from '@/types/api'

export interface OrderItem {
  id: number
  orderNo: string
  userId: number
  totalAmount: number
  status: number
  receiverName: string
  receiverPhone: string
  receiverProvince: string
  receiverCity: string
  receiverDistrict: string
  receiverDetail: string
  trackingNo: string
  carrier: string
  payTime: number
  shipTime: number
  createTime: number
  refundStatus: number
}

export interface OrderDetail extends OrderItem {
  refundReason?: string
  cancelTime?: number
  cancelReason?: string
  completeTime?: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) {
    return (b as ApiResponse<T>).data as T
  }
  return b as unknown as T
}

export async function listOrders(params: {
  page?: number
  pageSize?: number
  status?: number
  orderNoKw?: string
  receiverNameKw?: string
  receiverPhoneKw?: string
}): Promise<{ orders: OrderItem[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  if (params.status !== undefined && params.status >= 0) {
    qs.set('status', String(params.status))
  }
  if (params.orderNoKw) qs.set('orderNoKw', params.orderNoKw)
  if (params.receiverNameKw) qs.set('receiverNameKw', params.receiverNameKw)
  if (params.receiverPhoneKw) qs.set('receiverPhoneKw', params.receiverPhoneKw)
  type Body = { orders: OrderItem[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/orders?${qs.toString()}`)
  return unwrap(body) as Body
}

export async function getOrder(id: number): Promise<OrderDetail> {
  const body = await get<ApiResponse<OrderDetail> & OrderDetail>(`/orders/${id}`)
  return unwrap(body) as OrderDetail
}

export async function shipOrder(id: number, carrier: string, trackingNo: string) {
  return post(`/orders/${id}/ship`, { carrier, trackingNo })
}

export async function rejectRefund(id: number, reason: string) {
  return post(`/orders/${id}/reject-refund`, { reason })
}
