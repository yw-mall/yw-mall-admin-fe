import { get, post } from './request'
import type { ApiResponse } from '@/types/api'

export interface WalletInfo {
  shopId: number
  balance: number // 可用余额（分）
  frozen: number // 冻结金额（分）
  totalIncome: number // 累计收入
  totalWithdrawn: number // 累计提现
  updateTime: number
}

export interface LedgerEntry {
  id: number
  shopId: number
  direction: number // 1=入账, 2=出账
  category: string // 'order_paid' / 'refund' / 'commission' / 'withdrawal' ...
  amount: number
  runningBalance: number
  orderId: number
  refundId: number
  refNo: string
  description: string
  createTime: number
}

export interface BillRecord {
  id: number
  shopId: number
  type: string
  amount: number
  orderId: number
  remark: string
  createTime: number
}

export interface WithdrawalItem {
  id: number
  shopId: number
  amount: number
  status: number // 0=待审核, 1=已通过, 2=已驳回, 3=已打款
  bankInfo: string
  adminRemark?: string
  createTime: number
  handleTime?: number
}

export interface LedgerSummary {
  totalIncome: number
  totalRefund: number
  totalCommission: number
  totalWithdrawal: number
}

function unwrap<T>(b: ApiResponse<T> & T): T {
  if (b && (b as ApiResponse<T>).data !== undefined) return (b as ApiResponse<T>).data as T
  return b as unknown as T
}

export async function getWallet(): Promise<WalletInfo> {
  const body = await get<ApiResponse<WalletInfo> & WalletInfo>('/wallet')
  return unwrap(body) as WalletInfo
}

export async function getLedgerSummary(params?: {
  startTime?: number
  endTime?: number
}): Promise<LedgerSummary> {
  const qs = new URLSearchParams()
  if (params?.startTime) qs.set('startTime', String(params.startTime))
  if (params?.endTime) qs.set('endTime', String(params.endTime))
  const url = qs.toString() ? `/ledger/summary?${qs.toString()}` : '/ledger/summary'
  const body = await get<ApiResponse<LedgerSummary> & LedgerSummary>(url)
  return unwrap(body) as LedgerSummary
}

export async function listLedger(params: {
  page?: number
  pageSize?: number
  category?: string
  startTime?: number
  endTime?: number
}): Promise<{ entries: LedgerEntry[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  if (params.category) qs.set('category', params.category)
  if (params.startTime) qs.set('startTime', String(params.startTime))
  if (params.endTime) qs.set('endTime', String(params.endTime))
  type Body = { entries: LedgerEntry[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/ledger?${qs.toString()}`)
  return unwrap(body) as Body
}

export async function listBills(params: {
  page?: number
  pageSize?: number
}): Promise<{ records: BillRecord[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  type Body = { records: BillRecord[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/wallet/bills?${qs.toString()}`)
  return unwrap(body) as Body
}

export async function createWithdrawal(amount: number, bankInfo: string): Promise<{ id: number }> {
  const body = await post<ApiResponse<{ id: number }> & { id: number }>(
    '/wallet/withdraw',
    { amount, bankInfo },
  )
  return unwrap(body) as { id: number }
}

export async function listWithdrawals(params: {
  page?: number
  pageSize?: number
}): Promise<{ withdrawals: WithdrawalItem[]; total: number }> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 20))
  type Body = { withdrawals: WithdrawalItem[]; total: number }
  const body = await get<ApiResponse<Body> & Body>(`/wallet/withdrawals?${qs.toString()}`)
  return unwrap(body) as Body
}
