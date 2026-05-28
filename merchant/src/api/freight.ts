import { get, post, put as putReq, del } from './request'
import type { ApiResponse } from '@/types/api'

export interface FreightTemplate {
  id: number
  shopId: number
  name: string
  calcType: number // 1=按件, 2=按重(g)
  firstValue: number
  firstFee: number // 分
  extraValue: number
  extraFee: number // 分
  regions: string // 省份逗号分隔
  isDefault: boolean
  status: number
  createTime: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) {
    return (b as ApiResponse<T>).data as T
  }
  return b as unknown as T
}

export async function listTemplates(): Promise<{ templates: FreightTemplate[]; total: number }> {
  type Body = { templates: FreightTemplate[]; total: number }
  const body = await get<ApiResponse<Body> & Body>('/freight-templates?page=1&pageSize=50')
  return unwrap(body) as Body
}

export async function createTemplate(
  req: Omit<FreightTemplate, 'id' | 'shopId' | 'status' | 'createTime'>,
): Promise<{ id: number }> {
  const body = await post<ApiResponse<{ id: number }> & { id: number }>('/freight-templates', req)
  return unwrap(body) as { id: number }
}

export async function updateTemplate(id: number, req: Partial<FreightTemplate>) {
  return putReq(`/freight-templates/${id}`, req)
}

export async function deleteTemplate(id: number) {
  return del(`/freight-templates/${id}`)
}
