import { get, put as putReq } from './request'
import type { ApiResponse } from '@/types/api'

export interface ShopDecoration {
  shopId: number
  banners: string // csv url
  announcement: string
  featuredPids: string // csv pid
  updateTime: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) return (b as ApiResponse<T>).data as T
  return b as unknown as T
}

export async function getDecoration(): Promise<ShopDecoration> {
  const body = await get<ApiResponse<ShopDecoration> & ShopDecoration>('/decoration')
  return unwrap(body) as ShopDecoration
}

export async function updateDecoration(req: {
  banners?: string
  announcement?: string
  featuredPids?: string
}) {
  return putReq('/decoration', req)
}
