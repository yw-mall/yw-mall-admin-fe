import { get } from './request'
import type { ApiResponse } from '@/types/api'

export interface DashboardData {
  totalOrders: number
  pendingShipments: number
  pendingRefunds: number
  walletAvailable: number
  walletFrozen: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) return (b as ApiResponse<T>).data as T
  return b as unknown as T
}

export async function getDashboard(): Promise<DashboardData> {
  const body = await get<ApiResponse<DashboardData> & DashboardData>('/dashboard')
  return unwrap(body) as DashboardData
}
