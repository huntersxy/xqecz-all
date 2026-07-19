import { ofetch, type FetchContext } from 'ofetch'
import { message } from 'ant-design-vue'
import { toFormData } from '@/utils'
import type {
  ApiResponse,
  User,
  LoginResponse,
  RegisterResponse,
  Content,
  UploadContentData,
  AuditRequest,
  ListParams,
  PaginatedResponse,
  Comment,
  CommentReport,
  CommentCount,
  CommentListResponse,
  RecommendResponse,
  Poll,
  PollListResponse,
  PollDetail,
  CreatePollData,
  Claim,
  ClaimListResponse,
  UploadImageResponse,
  RegenerateThumbnailResponse,
  RegenerateAllResponse,
  UpdateContentAuthorResponse,
  ApiKey,
  ApiKeyCreated,
  CreateApiKeyData,
  UpdateApiKeyData,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 防止 401 处理过程中再次触发 401（如 logout 自身返回 401）造成死循环
let handling401 = false

const api = ofetch.create({
  baseURL: BASE_URL,
  credentials: 'include',
  retry: 3,
  retryDelay(context: FetchContext) {
    const ctx = context as FetchContext & { options: { retryCount: number } }
    return Math.min(1000 * 2 ** ctx.options.retryCount, 10000)
  },
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  timeout: 10000,
  onRequestError({ error }) {
    console.error('[API] 请求失败:', error)
  },
  async onResponseError({ response }) {
    const status = response.status
    if (status === 401) {
      if (!handling401) {
        handling401 = true
        console.warn('[API] 未授权，请重新登录')
        try {
          await Promise.all([
            import('@/stores/user')
              .then((m) => { try { m.useUserStore().logout() } catch { /* 忽略，避免循环 */ } })
              .catch(() => {}),
            import('@/router').then((m) => {
              const router = m.default
              const cur = router.currentRoute.value
              // 只在受保护页面（/admin）才跳转登录页，公开页面不跳转
              if (cur.path.startsWith('/admin') && cur.path !== '/login') {
                router.push({ path: '/login', query: { redirect: cur.fullPath } })
              }
            }).catch(() => {}),
          ])
        } finally {
          handling401 = false
        }
      }
      return
    }
    // F3: 不再吞掉后端返回的业务错误文案，统一透出给用户
    const msg =
      pickServerMessage((response as unknown as { _data?: unknown })._data) ||
      `请求失败 (${status})`
    console.error('[API]', status, msg)
    // 不在这里 message.error — 由 request() catch 统一弹出，避免重复 toast
  },
})

// F3: 从后端返回体里提取可读错误文案（兼容 {message} 与 {data:{message}} 两种结构）
function pickServerMessage(body: unknown): string | null {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    if (typeof b['message'] === 'string' && b['message']) {
      return b['message'] as string
    }
    const d = b['data']
    if (d && typeof d === 'object') {
      const dm = (d as Record<string, unknown>)['message']
      if (typeof dm === 'string' && dm) return dm as string
    }
  }
  return null
}

// 统一的业务错误类型：name='ApiError' 便于调用方区分「后端业务错误」与「网络/取消错误」。
// request() 与 upload 的 onload 非 2xx 分支共用，保证错误通道一致。
function apiError(msg: string): Error {
  const e = new Error(msg)
  e.name = 'ApiError'
  return e
}

async function request<T>(
  url: string,
  options: Parameters<typeof api>[1] = {},
): Promise<ApiResponse<T>> {
  try {
    return (await api(url, options)) as unknown as Promise<ApiResponse<T>>
  } catch (err) {
    // F3: 把后端文案包进 Error，供调用方 catch 后直接展示
    const e = err as {
      response?: { _data?: unknown }
      data?: unknown
      message?: string
    }
    const msg =
      pickServerMessage(e.data) ||
      pickServerMessage(e.response?._data) ||
      e.message ||
      '请求失败'
    message.error(msg)
    throw apiError(msg)
  }
}

export const authApi = {
  initAdmin: () => request('/auth/init-admin', { method: 'POST' }),

  register: (username: string, password: string) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: { username, password },
    }),

  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getMe: () => request<User>('/auth/me', { method: 'GET' }),
}

export const contentApi = {
  getTags: () => request<string[]>('/content/tags'),

  recommend: (count: number, page?: number) => {
    return request<RecommendResponse>('/content/recommend', {
      query: { count, page: page || 1 },
    })
  },

  upload: (
    data: UploadContentData,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ): Promise<ApiResponse<Content>> => {
    const formData = toFormData({
      title: data.title,
      type: data.type,
      user_id: data.user_id,
      content: data.content,
      url: data.url,
      tags: data.tags,
      file: data.file,
    })

    return new Promise<ApiResponse<Content>>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/content/upload`)
      xhr.withCredentials = true
      xhr.timeout = 300000

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort()
          reject(new DOMException('Upload aborted', 'AbortError'))
        })
      }

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded * 100) / event.total)
            onProgress(percent)
          }
        })
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          // 解析后端业务错误文案（code==HTTP status，body 含 message），走统一错误通道
          let msg = `上传失败 (${xhr.status})`
          try {
            const parsed = JSON.parse(xhr.responseText)
            const m = pickServerMessage(parsed)
            if (m) msg = m
          } catch { /* 响应体非 JSON，使用兜底文案 */ }
          reject(apiError(msg))
        }
      }

      xhr.onerror = () => reject(new Error('网络错误，上传失败'))
      xhr.ontimeout = () => reject(new Error('Upload timeout'))
      xhr.onabort = () => reject(new Error('Upload aborted'))
      xhr.send(formData)
    })
  },

  list: (params?: ListParams) => {
    return request<PaginatedResponse<Content>>('/content/list', {
      query: params,
    })
  },

  myList: (params?: ListParams) => {
    return request<PaginatedResponse<Content>>('/content/my', {
      query: params,
    })
  },

  // 详情接口。options.silent=true 时附加 ?silent=1，后端不计入浏览量
  // （用于推荐页 hero 大图等仅展示、不应视为“进入详情页”的场景）。
  detail: (id: number, options?: { silent?: boolean }) =>
    request<Content>(`/content/${id}`, { query: options?.silent ? { silent: 1 } : {} }),

  search: (keyword: string, params?: Omit<ListParams, 'keyword'>) => {
    return request<PaginatedResponse<Content>>('/content/search', {
      query: { keyword, ...params },
    })
  },

  update: (
    id: number,
    data: { title?: string; content?: string; url?: string; tags?: string[]; file?: File },
  ) => {
    const formData = toFormData({
      title: data.title,
      content: data.content,
      url: data.url,
      tags: data.tags,
      file: data.file,
    })

    return request<Content>(`/content/${id}`, {
      method: 'PUT',
      body: formData,
    })
  },

  delete: (id: number) => request(`/content/${id}`, { method: 'DELETE' }),

  uploadImage: (file: File) => {
    const formData = toFormData({ file })
    return request<UploadImageResponse>('/content/upload-image', {
      method: 'POST',
      body: formData,
    })
  },

  submitClaim: (contentId: number, reason: string) =>
    request(`/content/${contentId}/claim`, {
      method: 'POST',
      body: { reason },
    }),
}

export const commentApi = {
  add: (contentId: number, text: string, parentId?: number) => {
    const formData = toFormData({
      content_id: contentId,
      text,
      parent_id: parentId,
    })
    return request<Comment>('/comment/add', {
      method: 'POST',
      body: formData,
    })
  },

  list: (contentId: number, page: number = 1, pageSize: number = 20) => {
    return request<CommentListResponse>(`/comment/list/${contentId}`, {
      query: { page, page_size: pageSize },
    })
  },

  delete: (id: number) => request(`/comment/${id}`, { method: 'DELETE' }),

  count: (contentId: number) => request<CommentCount>(`/comment/count/${contentId}`),

  report: (commentId: number, reason?: string) => {
    const formData = toFormData({
      comment_id: commentId,
      reason,
    })
    return request<CommentReport>('/comment/report', {
      method: 'POST',
      body: formData,
    })
  },

  handleReport: (reportId: number) => {
    return request(`/admin/comments/reports/${reportId}/handle`, {
      method: 'POST',
    })
  },

  getReports: () => request<CommentReport[]>('/admin/comments/reports'),
}

export const pollApi = {
  create: (data: CreatePollData) =>
    request<Poll>('/poll/create', {
      method: 'POST',
      body: data,
    }),

  list: () => request<PollListResponse>('/poll/list'),

  detail: (id: number) => request<PollDetail>(`/poll/${id}`),

  vote: (id: number, optionIndex: number) =>
    request(`/poll/${id}/vote`, {
      method: 'POST',
      body: {
        option_index: optionIndex,
      },
    }),

  delete: (id: number) => request(`/poll/${id}`, { method: 'DELETE' }),
}

export const adminApi = {
  audit: (id: number, data: AuditRequest) =>
    request<Content>(`/admin/audit/${id}`, {
      method: 'POST',
      body: data,
    }),

  pending: (params?: Pick<ListParams, 'page' | 'page_size'>) => {
    return request<PaginatedResponse<Content>>('/admin/pending', {
      query: params,
    })
  },

  getAllContent: (params?: ListParams) => {
    return request<PaginatedResponse<Content>>('/admin/content/all', {
      query: params,
    })
  },

  getUsers: (params?: Pick<ListParams, 'page' | 'page_size' | 'keyword'>) => {
    return request<PaginatedResponse<User>>('/admin/users', {
      query: params,
    })
  },

  updateUserRole: (id: number, isAdmin: boolean) =>
    request<User>(`/admin/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { is_admin: isAdmin },
    }),

  updateUserBan: (id: number, isBanned: boolean) =>
    request<User>(`/admin/users/${id}/ban`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { is_banned: isBanned },
    }),

  regenerateThumbnail: (id: number) =>
    request<RegenerateThumbnailResponse>(`/admin/content/${id}/regenerate-thumbnail`, {
      method: 'POST',
    }),

  regenerateAllThumbnails: () =>
    request<RegenerateAllResponse>('/admin/content/regenerate-all-thumbnails', {
      method: 'POST',
    }),

  deleteUser: (id: number) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  updateContentAuthor: (contentId: number, userId: number) =>
    request<UpdateContentAuthorResponse>(`/admin/content/${contentId}/author`, {
      method: 'PUT',
      body: { user_id: userId },
    }),

  getClaims: (params: { page?: number; page_size?: number; status?: string }) =>
    request<ClaimListResponse>('/admin/claims', {
      query: params,
    }),

  handleClaim: (claimId: number, action: 'approve' | 'reject', remark?: string) =>
    request(`/admin/claims/${claimId}/handle`, {
      method: 'POST',
      body: { action, remark },
    }),
}

export const apiKeyApi = {
  create: (data: CreateApiKeyData) =>
    request<ApiKeyCreated>('/api-keys', {
      method: 'POST',
      body: data,
    }),

  list: () =>
    request<{ list: ApiKey[] }>('/api-keys'),

  update: (id: number, data: UpdateApiKeyData) =>
    request<ApiKey>(`/api-keys/${id}`, {
      method: 'PUT',
      body: data,
    }),

  delete: (id: number) =>
    request(`/api-keys/${id}`, {
      method: 'DELETE',
    }),
}
