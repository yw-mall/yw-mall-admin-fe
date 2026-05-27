import { get, post } from './request'
import type { ApiResponse } from '@/types/api'

export interface StaffItem {
  id: number
  userId: number
  username: string
  role: string
  status: number
  joinedAt: number
}

export interface InvitationItem {
  id: number
  targetPhone: string
  targetEmail: string
  role: string
  status: number
  expiresAt: number
  createTime: number
}

function unwrap<T>(body: ApiResponse<T> & T): T {
  if (body && (body as ApiResponse<T>).data) {
    return (body as ApiResponse<T>).data as T
  }
  return body as unknown as T
}

// ===== Staff =====

export async function listStaff(): Promise<{ items: StaffItem[] }> {
  const body = await get<ApiResponse<{ items: StaffItem[] }> & { items: StaffItem[] }>('/staff')
  return unwrap(body)
}

export async function updateStaffRole(staffId: number, newRole: string): Promise<{ ok: boolean }> {
  const body = await post<ApiResponse<{ ok: boolean }> & { ok: boolean }>(
    `/staff/${staffId}/role`,
    { newRole },
  )
  return unwrap(body)
}

export async function disableStaff(staffId: number): Promise<{ ok: boolean }> {
  const body = await post<ApiResponse<{ ok: boolean }> & { ok: boolean }>(
    `/staff/${staffId}/disable`,
  )
  return unwrap(body)
}

// ===== Invitation =====

export async function listInvitations(): Promise<{ items: InvitationItem[] }> {
  const body = await get<ApiResponse<{ items: InvitationItem[] }> & { items: InvitationItem[] }>(
    '/staff/invitations',
  )
  return unwrap(body)
}

export async function createInvitation(payload: {
  targetPhone?: string
  targetEmail?: string
  role: string
}): Promise<{ invitationCode: string; expiresAt: number }> {
  const body = await post<
    ApiResponse<{ invitationCode: string; expiresAt: number }> & {
      invitationCode: string
      expiresAt: number
    }
  >('/staff/invitations', payload)
  return unwrap(body)
}

export async function revokeInvitation(id: number): Promise<{ ok: boolean }> {
  const body = await post<ApiResponse<{ ok: boolean }> & { ok: boolean }>(
    `/staff/invitations/${id}/revoke`,
  )
  return unwrap(body)
}

// ===== Accept (public endpoint, uses c-user token from caller's localStorage) =====

export async function acceptInvitation(
  invitationCode: string,
): Promise<{ shopId: number; role: string; shopName: string }> {
  const body = await post<
    ApiResponse<{ shopId: number; role: string; shopName: string }> & {
      shopId: number
      role: string
      shopName: string
    }
  >('/invitations/accept', { invitationCode })
  return unwrap(body)
}
