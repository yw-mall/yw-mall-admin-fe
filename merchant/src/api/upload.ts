import axios from 'axios'
import { useUserStore } from '@/stores/user'

export interface UploadResult {
  url: string
  key: string
}

/**
 * 上传图片到 admin-api /merchant/v1/upload/image。
 * dev: 走 vite proxy /merchant/v1 → :18999
 * prod: 走 nginx → apisix → mall-admin-api
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const sess = useUserStore()
  const fd = new FormData()
  fd.append('file', file)
  const resp = await axios.post('/merchant/v1/upload/image', fd, {
    headers: {
      Authorization: `Bearer ${sess.accessToken}`,
      // 不显式设 Content-Type，浏览器会自动加 boundary
    },
    timeout: 30000,
  })
  const body = resp.data?.data ?? resp.data
  return body as UploadResult
}
