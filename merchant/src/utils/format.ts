import dayjs from 'dayjs'

export function formatTime(ts: number | string | undefined | null): string {
  if (!ts) return '-'
  const num = typeof ts === 'string' ? Number(ts) : ts
  if (!num) return '-'
  // 后端时间戳为 unix 秒
  return dayjs(num * 1000).format('YYYY-MM-DD HH:mm:ss')
}

export function formatAmount(cents: number | undefined | null): string {
  if (cents == null || Number.isNaN(cents)) return '-'
  return `¥${(cents / 100).toFixed(2)}`
}
