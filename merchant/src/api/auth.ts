import { post } from './request'
import type { LoginRequest, LoginResponse, RefreshResponse, ApiResponse } from '@/types/api'

function unwrap<T>(body: ApiResponse<T> & T): T {
  if (body && (body as ApiResponse<T>).data) {
    return (body as ApiResponse<T>).data as T
  }
  return body as unknown as T
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const body = await post<ApiResponse<LoginResponse> & LoginResponse>('/login', req)
  return unwrap<LoginResponse>(body)
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const body = await post<ApiResponse<RefreshResponse> & RefreshResponse>('/refresh', { refreshToken })
  return unwrap<RefreshResponse>(body)
}

export async function logout(): Promise<void> {
  await post<unknown>('/logout', {})
}
