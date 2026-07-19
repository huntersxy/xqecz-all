<script setup lang="ts">
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/api'
import { getImageUrl, renderMarkdown } from '@/utils'
import { Tag, Modal } from 'ant-design-vue'
import type { User } from '@/types'
import { PlusOutlined } from '@ant-design/icons-vue'

const admin = useAdminStore()

const editTitle = ref('')
const editContent = ref('')
const editUrl = ref('')
const editTags = ref<string[]>([])
const editFile = ref<File | undefined>()
const editFileName = ref('')
const newTagInput = ref('')
const tabKey = ref('preview')

const authorKeyword = ref('')
const allUsers = ref<User[]>([])
const usersLoading = ref(false)

const renderedContent = computed(() => {
  if (!admin.drawerContent) return ''
  return renderMarkdown(admin.drawerContent.text || '')
})

const filteredUsers = computed(() => {
  if (!authorKeyword.value.trim()) return allUsers.value
  const kw = authorKeyword.value.toLowerCase()
  return allUsers.value.filter(u => u.username.toLowerCase().includes(kw))
})

watch(() => admin.drawerOpen, async (open) => {
  if (open && admin.drawerContent) {
    const detail = await admin.fetchContentDetail(admin.drawerContent.id)
    if (detail) admin.drawerContent = detail
    editTitle.value = admin.drawerContent.title
    editContent.value = admin.drawerContent.text || ''
    editUrl.value = admin.drawerContent.url || ''
    editTags.value = [...(admin.drawerContent.tags || [])]
    editFile.value = undefined
    editFileName.value = ''
    tabKey.value = 'preview'
    loadUsers()
  }
})

async function loadUsers() {
  usersLoading.value = true
  try {
    const r = await adminApi.getUsers({ page_size: 200 })
    if (r.code === 200) allUsers.value = r.data.list
  } catch { /* */ } finally { usersLoading.value = false }
}

function insertMarkdown(prefix: string, suffix: string) {
  const ta = document.querySelector('.drawer-edit-textarea textarea') as HTMLTextAreaElement
  if (!ta) return
  const s = ta.selectionStart, e = ta.selectionEnd, t = editContent.value || ''
  editContent.value = t.substring(0, s) + prefix + t.substring(s, e) + suffix + t.substring(e)
  ta.focus()
  setTimeout(() => ta.setSelectionRange(s + prefix.length + (e - s) + suffix.length, s + prefix.length + (e - s) + suffix.length), 0)
}

async function handleSave() {
  if (!admin.drawerContent) return
  const ok = await admin.saveContent(admin.drawerContent.id, {
    title: editTitle.value, content: editContent.value, url: editUrl.value,
    tags: editTags.value, file: editFile.value,
  })
  if (ok) admin.closeDrawer()
}

async function handleChangeAuthor(userId: number, username: string) {
  if (!admin.drawerContent) return
  Modal.confirm({
    title: '修改作者',
    content: `确定将作者改为「${username}」吗？`,
    async onOk() {
      const ok = await admin.changeAuthor(admin.drawerContent!.id, userId)
      if (ok) admin.closeDrawer()
    },
  })
}

function toggleTag(tag: string) {
  const i = editTags.value.indexOf(tag)
  if (i > -1) editTags.value.splice(i, 1)
  else editTags.value.push(tag)
}

function addNewTag() {
  const tag = newTagInput.value.trim()
  if (!tag) return
  if (!editTags.value.includes(tag)) editTags.value.push(tag)
  newTagInput.value = ''
}
</script>

<template>
  <a-drawer
    :open="admin.drawerOpen"
    :title="admin.drawerContent?.title || '内容详情'"
    :width="720"
    @close="admin.closeDrawer"
    :body-style="{ padding: '16px 24px' }"
  >
    <template v-if="admin.drawerContent">
      <a-tabs v-model:activeKey="tabKey">
        <a-tab-pane key="preview" tab="预览">
          <div class="preview-meta">
            <Tag :color="admin.drawerContent.type === 'video' ? 'red' : admin.drawerContent.type === 'image' ? 'green' : admin.drawerContent.type === 'link' ? 'orange' : 'blue'">
              {{ { video: '视频', image: '图片', link: '链接', text: '文字' }[admin.drawerContent.type] }}
            </Tag>
            <Tag v-if="admin.drawerContent.audit_status" :color="admin.drawerContent.audit_status === 'approved' ? 'success' : admin.drawerContent.audit_status === 'pending' ? 'warning' : 'error'">
              {{ { approved: '已通过', pending: '审核中', rejected: '已拒绝' }[admin.drawerContent.audit_status] }}
            </Tag>
            <span style="font-size: 13px; color: var(--admin-text-tertiary)">
              {{ admin.drawerContent.view_count }} 次浏览 · {{ admin.drawerContent.user?.username }}
            </span>
          </div>
          <div class="preview-tags">
            <Tag v-for="tag in admin.drawerContent.tags" :key="tag">{{ tag }}</Tag>
          </div>
          <div v-if="admin.drawerContent.type === 'image'" class="preview-media-wrap">
            <img :src="getImageUrl(admin.drawerContent.img)" class="preview-media" alt="" />
          </div>
          <div v-else-if="admin.drawerContent.type === 'video'" class="preview-media-wrap">
            <video controls class="preview-media"><source :src="getImageUrl(admin.drawerContent.video)" /><track kind="captions" /></video>
          </div>
          <div v-else-if="admin.drawerContent.type === 'link'" class="preview-media-wrap">
            <a :href="admin.drawerContent.url" target="_blank" rel="noopener">
              <img v-if="admin.drawerContent.thumb" :src="getImageUrl(admin.drawerContent.thumb)" class="preview-media" alt="" />
              <div v-else class="link-box">{{ admin.drawerContent.url }}</div>
            </a>
          </div>
          <div v-else class="preview-text" v-html="renderedContent"></div>
        </a-tab-pane>

        <a-tab-pane key="edit" tab="编辑">
          <a-form layout="vertical">
            <a-form-item label="标题"><a-input v-model:value="editTitle" /></a-form-item>
            <a-form-item v-if="admin.drawerContent.type === 'link'" label="链接"><a-input v-model:value="editUrl" /></a-form-item>
            <a-form-item label="标签">
              <div class="flex flex-wrap gap-1.5 mb-2">
                <Tag v-for="tag in editTags" :key="tag" color="blue" closable @close="editTags = editTags.filter(t => t !== tag)">{{ tag }}</Tag>
              </div>
              <div class="flex gap-2 mb-2">
                <a-input v-model:value="newTagInput" placeholder="输入标签后回车" @keyup.enter="addNewTag" style="flex:1" />
                <a-button @click="addNewTag"><PlusOutlined /></a-button>
              </div>
              <div v-if="admin.tags.length" class="flex flex-wrap gap-1 p-2 rounded" style="background: var(--theme-hover-bg)">
                <Tag v-for="tag in admin.tags" :key="tag" :color="editTags.includes(tag) ? 'blue' : 'default'" style="cursor:pointer" @click="toggleTag(tag)">{{ tag }}</Tag>
              </div>
            </a-form-item>
            <a-form-item v-if="admin.drawerContent.type === 'text'" label="内容 (Markdown)">
              <MarkdownToolbar @insert="insertMarkdown" @upload-image="() => {}" />
              <a-textarea v-model:value="editContent" :rows="8" class="drawer-edit-textarea" />
            </a-form-item>
            <a-form-item v-if="admin.drawerContent.type !== 'text' && admin.drawerContent.type !== 'link'" label="替换文件">
              <input type="file" :accept="admin.drawerContent.type === 'image' ? 'image/*' : 'video/*'" @change="(e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { editFile = f; editFileName = f.name } }" />
              <span v-if="editFileName" style="margin-left: 8px; font-size: 13px">{{ editFileName }}</span>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="author" tab="修改作者">
          <div style="margin-bottom: 12px">
            <span style="font-size: 13px; color: var(--admin-text-tertiary)">当前作者：</span>
            <Tag color="blue">{{ admin.drawerContent.user?.username }}</Tag>
          </div>
          <a-input v-model:value="authorKeyword" placeholder="搜索用户名..." allow-clear style="margin-bottom: 12px" />
          <a-spin :spinning="usersLoading">
            <div class="user-list">
              <div v-for="user in filteredUsers" :key="user.id" class="user-item" @click="handleChangeAuthor(user.id, user.username)">
                <span>{{ user.username }}</span>
                <Tag v-if="user.is_admin" color="orange" size="small">管理员</Tag>
              </div>
            </div>
          </a-spin>
        </a-tab-pane>
      </a-tabs>
    </template>

    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <a-button @click="admin.closeDrawer">关闭</a-button>
        <a-button v-if="tabKey === 'edit'" type="primary" :loading="admin.drawerSaving" @click="handleSave">保存修改</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.preview-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.preview-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
.preview-media-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
.preview-media { max-width: 100%; border-radius: 8px; }
.link-box { padding: 16px; background: var(--theme-hover-bg); border-radius: 8px; text-align: center; color: var(--admin-text-tertiary); }
.preview-text { line-height: 1.8; }
.preview-text :deep(h1), .preview-text :deep(h2), .preview-text :deep(h3) { margin: 16px 0 8px; color: $admin-text; }
.preview-text :deep(h1) { font-size: 24px; }
.preview-text :deep(h2) { font-size: 20px; }
.preview-text :deep(h3) { font-size: 16px; }
.preview-text :deep(p) { margin-bottom: 12px; color: $admin-text-secondary; }
.preview-text :deep(ul), .preview-text :deep(ol) { margin-bottom: 12px; padding-left: 24px; }
.preview-text :deep(blockquote) { border-left: 4px solid var(--theme-primary); padding-left: 12px; margin: 12px 0; color: var(--admin-text-tertiary); font-style: italic; }
.preview-text :deep(code) { background: var(--theme-hover-bg); padding: 2px 6px; border-radius: 4px; font-family: monospace; }
.preview-text :deep(pre) { background: #1a1a1a; color: #e0e0e0; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
.preview-text :deep(pre code) { background: none; padding: 0; color: inherit; }
.user-list { max-height: 320px; overflow-y: auto; }
.user-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
.user-item:hover { background: var(--theme-hover-bg); }
</style>
