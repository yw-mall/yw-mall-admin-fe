import { get, post, put as putReq } from './request'
import type { ApiResponse } from '@/types/api'

export interface SkuInput {
  id?: number
  skuCode?: string
  specText?: string
  specJson?: string
  price: number
  stock: number
  image?: string
  status?: number
}

export interface SkuItem {
  id: number
  productId: number
  skuCode: string
  specText: string
  specJson: string
  price: number
  stock: number
  image: string
  status: number
}

export interface ProductSummary {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  images: string
  status: number
  reviewStatus: number
  categoryId: number
  shopId: number
}

export interface ProductDetail extends ProductSummary {
  detail?: string
  brand?: string
  weight?: number
  reviewRemark?: string
  createTime?: number
  skus: SkuItem[]
}

function unwrap<T>(body: ApiResponse<T> & T): T {
  if (body && (body as ApiResponse<T>).data !== undefined) {
    return (body as ApiResponse<T>).data as T
  }
  return body as unknown as T
}

export async function listProducts(params: {
  page?: number
  pageSize?: number
  status?: number
  reviewStatus?: number
}): Promise<{ items: ProductSummary[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  if (params.status !== undefined) qs.set('status', String(params.status))
  if (params.reviewStatus !== undefined) qs.set('reviewStatus', String(params.reviewStatus))
  // 后端接口字段名是 items/total 或 products/total，二者都兼容
  type Body = { items?: ProductSummary[]; products?: ProductSummary[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/products?${qs.toString()}`)
  const data = unwrap(body) as Body
  return { items: data.items ?? data.products ?? [], total: data.total }
}

export async function getProduct(id: number): Promise<ProductDetail> {
  const body = await get<ApiResponse<ProductDetail> & ProductDetail>(`/products/${id}`)
  return unwrap(body) as ProductDetail
}

export async function createProduct(req: {
  name: string
  description?: string
  categoryId: number
  brand?: string
  detail?: string
  images?: string
  skus: SkuInput[]
}): Promise<{ id: number }> {
  const body = await post<ApiResponse<{ id: number }> & { id: number }>('/products', req)
  return unwrap(body) as { id: number }
}

export async function updateProduct(
  id: number,
  req: {
    name?: string
    description?: string
    brand?: string
    detail?: string
    images?: string
    categoryId?: number
  },
): Promise<{ ok: boolean }> {
  const body = await putReq<ApiResponse<{ ok: boolean }> & { ok: boolean }>(
    `/products/${id}`,
    req,
  )
  return unwrap(body) as { ok: boolean }
}

export async function setProductStatus(id: number, status: number) {
  return post(`/products/${id}/status`, { status })
}

export async function setProductStock(id: number, stock: number) {
  return post(`/products/${id}/stock`, { stock })
}

export async function batchUpsertSkus(
  productId: number,
  skus: SkuInput[],
): Promise<{ items: SkuItem[] }> {
  const body = await post<ApiResponse<{ items: SkuItem[] }> & { items: SkuItem[] }>(
    `/products/${productId}/skus`,
    { skus },
  )
  return unwrap(body) as { items: SkuItem[] }
}
