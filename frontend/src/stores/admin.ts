import { defineStore } from 'pinia'
import { adminApi, contentApi, commentApi, pollApi } from '@/api'
import { message, Modal } from 'ant-design-vue'
import type { Content, User, Claim, CommentReport, Poll, CreatePollData } from '@/types'

interface PaginatedState<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading: boolean
}

function createPaginatedState<T>(pageSize = 20): PaginatedState<T> {
  return { list: [], total: 0, page: 1, pageSize, totalPages: 1, loading: false }
}

async function apiChangeAuthor(contentId: number, userId: number): Promise<boolean> {
  try {
    await adminApi.updateContentAuthor(contentId, userId)
    message.success('作者已更新')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '更新失败'); return false }
}

function apiConfirmDelete(id: number, onOk?: () => void) {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这条内容吗？此操作不可撤销。',
    okType: 'danger',
    async onOk() {
      try {
        await contentApi.delete(id)
        message.success('删除成功')
        onOk?.()
      } catch (e: unknown) { message.error((e as Error).message || '删除失败') }
    },
  })
}

async function apiAuditContent(id: number, status: 'approved' | 'rejected', _adminId: number): Promise<boolean> {
  try {
    await adminApi.audit(id, { status, remark: '' })
    message.success('审核成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '审核失败'); return false }
}

async function apiUpdateUserRole(id: number, isAdmin: boolean): Promise<boolean> {
  try {
    await adminApi.updateUserRole(id, isAdmin)
    message.success('更新成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '更新失败'); return false }
}

async function apiUpdateUserBan(id: number, isBanned: boolean): Promise<boolean> {
  try {
    await adminApi.updateUserBan(id, isBanned)
    message.success(isBanned ? '封禁成功' : '解封成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || (isBanned ? '封禁失败' : '解封失败')); return false }
}

async function apiDeleteUser(id: number): Promise<boolean> {
  try {
    await adminApi.deleteUser(id)
    message.success('删除成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '删除失败'); return false }
}

async function apiHandleClaim(claimId: number, action: 'approve' | 'reject'): Promise<boolean> {
  let reason: string | null = ''
  if (action === 'reject') {
    reason = prompt('请输入拒绝原因（可选）：')
    if (reason === null) return false
  }
  try {
    await adminApi.handleClaim(claimId, action, reason || undefined)
    message.success(action === 'approve' ? '认领已通过' : '认领已拒绝')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '操作失败'); return false }
}

async function apiDeletePoll(id: number): Promise<boolean> {
  try {
    await pollApi.delete(id)
    message.success('删除成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '删除失败'); return false }
}

async function apiHandleReport(reportId: number): Promise<boolean> {
  try {
    await commentApi.handleReport(reportId)
    message.success('处理成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '处理失败'); return false }
}

async function apiDeleteComment(commentId: number): Promise<boolean> {
  try {
    await commentApi.delete(commentId)
    message.success('删除成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '删除失败'); return false }
}

async function apiRegenerateThumbnail(id: number): Promise<boolean> {
  try {
    await adminApi.regenerateThumbnail(id)
    message.success('封面更新成功')
    return true
  } catch (e: unknown) { message.error((e as Error).message || '封面更新失败'); return false }
}

async function apiRegenerateAllThumbnails() {
  try {
    const r = await adminApi.regenerateAllThumbnails()
    message.success(`已开始处理 ${r.data.count} 条`)
  } catch (e: unknown) { message.error((e as Error).message || '操作失败') }
}

export const useAdminStore = defineStore('admin', () => {
  const activeTab = ref('my')
  const tags = ref<string[]>([])
  const tagsLoading = ref(false)

  const myContent = reactive(createPaginatedState<Content>())
  const allContent = reactive(createPaginatedState<Content>())
  const pendingContent = reactive(createPaginatedState<Content>())
  const users = reactive(createPaginatedState<User>(24))
  const claims = reactive(createPaginatedState<Claim>())
  const polls = ref<Poll[]>([])
  const pollsLoading = ref(false)
  const showCreatePollModal = ref(false)
  const createPollForm = ref<CreatePollData>({ title: '', description: '', options: ['', ''] })
  const reports = ref<CommentReport[]>([])
  const reportsLoading = ref(false)

  const drawerOpen = ref(false)
  const drawerMode = ref<'view' | 'edit'>('view')
  const drawerContent = ref<Content | null>(null)
  const drawerSaving = ref(false)

  const uploadProgress = ref(0)
  const uploading = ref(false)

  async function loadTags() {
    tagsLoading.value = true
    try {
      const r = await contentApi.getTags()
      tags.value = r.data
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { tagsLoading.value = false }
  }

  async function loadMyContent(page = 1) {
    myContent.loading = true
    myContent.page = page
    try {
      const r = await contentApi.myList({ page, page_size: myContent.pageSize })
      myContent.list = r.data.list
      myContent.total = r.data.total
      myContent.totalPages = r.data.total_page
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { myContent.loading = false }
  }

  async function loadAllContent(page = 1) {
    allContent.loading = true
    allContent.page = page
    try {
      const r = await adminApi.getAllContent({ page, page_size: allContent.pageSize })
      allContent.list = r.data.list
      allContent.total = r.data.total
      allContent.totalPages = r.data.total_page
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { allContent.loading = false }
  }

  async function loadPendingContent(page = 1) {
    pendingContent.loading = true
    pendingContent.page = page
    try {
      const r = await adminApi.pending({ page, page_size: pendingContent.pageSize })
      pendingContent.list = r.data.list
      pendingContent.total = r.data.total
      pendingContent.totalPages = r.data.total_page
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { pendingContent.loading = false }
  }

  async function loadUsers(page = 1) {
    users.loading = true
    users.page = page
    try {
      const r = await adminApi.getUsers({ page, page_size: users.pageSize })
      users.list = r.data.list
      users.total = r.data.total
      users.totalPages = r.data.total_page
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { users.loading = false }
  }

  async function loadClaims(page = 1, status?: string) {
    claims.loading = true
    claims.page = page
    try {
      const params = { page, page_size: claims.pageSize, ...(status ? { status } : {}) }
      const r = await adminApi.getClaims(params)
      claims.list = r.data.list
      claims.total = r.data.total
      claims.totalPages = Math.ceil(r.data.total / r.data.page_size)
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { claims.loading = false }
  }

  async function loadPolls() {
    pollsLoading.value = true
    try {
      const r = await pollApi.list()
      polls.value = r.data.list
    } catch (e: unknown) { message.error((e as Error).message || '加载失败') } finally { pollsLoading.value = false }
  }

  async function loadReports() {
    reportsLoading.value = true
    try {
      const r = await commentApi.getReports()
      reports.value = r.data
    } catch (e: unknown) { message.error((e as Error).message || '加载举报列表失败') } finally { reportsLoading.value = false }
  }

  function openDrawer(content: Content, mode: 'view' | 'edit' = 'view') {
    drawerContent.value = content
    drawerMode.value = mode
    drawerOpen.value = true
  }

  function closeDrawer() {
    drawerOpen.value = false
    drawerContent.value = null
  }

  async function fetchContentDetail(id: number): Promise<Content | null> {
    try {
      const r = await contentApi.detail(id)
      return r.data
    } catch (e: unknown) { message.error((e as Error).message || '加载失败'); return null }
  }

  async function saveContent(id: number, data: {
    title: string; content: string; url: string; tags: string[]; file?: File
  }): Promise<boolean> {
    drawerSaving.value = true
    try {
      await contentApi.update(id, data)
      message.success('保存成功')
      return true
    } catch (e: unknown) { message.error((e as Error).message || '保存失败'); return false }
    finally { drawerSaving.value = false }
  }

  async function createPoll(): Promise<boolean> {
    const valid = createPollForm.value.options.filter((o) => o.trim())
    if (valid.length < 2) { message.error('至少需要2个有效选项'); return false }
    try {
      await pollApi.create({
        title: createPollForm.value.title.trim(),
        description: (createPollForm.value.description || '').trim(),
        options: valid.map((o) => o.trim()),
      })
      message.success('投票创建成功')
      showCreatePollModal.value = false
      createPollForm.value = { title: '', description: '', options: ['', ''] }
      return true
    } catch (e: unknown) { message.error((e as Error).message || '创建失败'); return false }
  }

  function addPollOption() { createPollForm.value.options.push('') }
  function removePollOption(i: number) {
    if (createPollForm.value.options.length > 2) createPollForm.value.options.splice(i, 1)
  }

  async function uploadContent(data: {
    title: string; type: string; content: string; url: string; tags: string[]; file?: File; userId: number
  }): Promise<boolean> {
    uploading.value = true
    uploadProgress.value = 0
    try {
      await contentApi.upload({
        title: data.title, type: data.type as 'video' | 'image' | 'text' | 'link',
        content: data.content, url: data.url, user_id: data.userId, tags: data.tags, file: data.file,
      }, (p) => { uploadProgress.value = p })
      message.success('上传成功')
      return true
    } catch (e: unknown) { message.error(`上传失败: ${(e as Error).message}`); return false }
    finally { uploading.value = false; uploadProgress.value = 0 }
  }

  return {
    activeTab,
    tags, tagsLoading,
    myContent, allContent, pendingContent, users, claims, polls, pollsLoading, reports, reportsLoading,
    showCreatePollModal, createPollForm,
    drawerOpen, drawerMode, drawerContent, drawerSaving,
    uploadProgress, uploading,
    loadTags,
    loadMyContent, loadAllContent, loadPendingContent, loadUsers, loadClaims, loadPolls, loadReports,
    openDrawer, closeDrawer, fetchContentDetail, saveContent,
    changeAuthor: apiChangeAuthor,
    confirmDelete: apiConfirmDelete,
    auditContent: apiAuditContent,
    updateUserRole: apiUpdateUserRole,
    updateUserBan: apiUpdateUserBan,
    deleteUser: apiDeleteUser,
    handleClaim: apiHandleClaim,
    createPoll, deletePoll: apiDeletePoll, addPollOption, removePollOption,
    handleReport: apiHandleReport,
    deleteComment: apiDeleteComment,
    regenerateThumbnail: apiRegenerateThumbnail,
    regenerateAllThumbnails: apiRegenerateAllThumbnails,
    uploadContent,
  }
})
