<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useAdminStore } from '@/stores/admin'
import { CC_LICENSE_TEXT, VIDEO_TERMS_TEXT } from '@/utils/constants'
import { SECONDARY_STYLE } from './adminColumns'
import { UploadOutlined } from '@ant-design/icons-vue'
import TagCloud from './TagCloud.vue'

const userStore = useUserStore()
const admin = useAdminStore()

const form = ref({
  title: '', type: 'image' as 'video' | 'image' | 'text' | 'link',
  content: '', url: '', tags: [] as string[], file: undefined as File | undefined,
})
const filePreview = ref('')
const agreeUpload = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function toggleTag(tag: string) {
  const i = form.value.tags.indexOf(tag)
  if (i > -1) form.value.tags.splice(i, 1)
  else form.value.tags.push(tag)
}

function handleAddCustomTag(tag: string) {
  form.value.tags.push(tag)
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  form.value.file = f
  const reader = new FileReader()
  reader.onload = (ev) => { filePreview.value = ev.target?.result as string }
  reader.readAsDataURL(f)
}

function clearForm() {
  form.value = { title: '', type: 'image', content: '', url: '', tags: [], file: undefined }
  filePreview.value = ''
  agreeUpload.value = false
}

async function handleSubmit() {
  if (!userStore.user) return
  if (!form.value.title && form.value.type !== 'link') return
  const ok = await admin.uploadContent({ ...form.value, userId: userStore.user.id })
  if (ok) clearForm()
}

function insertMd(prefix: string, suffix: string) {
  const ta = document.querySelector('.upload-textarea textarea') as HTMLTextAreaElement
  if (!ta) return
  const s = ta.selectionStart, e = ta.selectionEnd, t = form.value.content || ''
  form.value.content = t.substring(0, s) + prefix + t.substring(s, e) + suffix + t.substring(e)
  ta.focus()
  setTimeout(() => ta.setSelectionRange(s + prefix.length + (e - s) + suffix.length, s + prefix.length + (e - s) + suffix.length), 0)
}
</script>

<template>
  <a-card :bordered="false" title="上传内容">
    <a-form layout="vertical">
      <a-form-item label="标题"><a-input v-model:value="form.title" placeholder="输入标题" /></a-form-item>
      <a-form-item label="类型">
        <a-radio-group v-model:value="form.type">
          <a-radio-button value="text">文字</a-radio-button>
          <a-radio-button value="image">图片</a-radio-button>
          <a-radio-button value="video">视频</a-radio-button>
          <a-radio-button value="link">链接</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-form-item v-if="form.type === 'text'" label="内容">
        <div class="w-full">
          <MarkdownToolbar @insert="insertMd" @upload-image="() => {}" />
          <a-textarea v-model:value="form.content" :rows="8" placeholder="支持Markdown" class="upload-textarea" />
        </div>
      </a-form-item>

      <a-form-item v-else label="文件">
        <input ref="fileInput" type="file" style="display:none" :accept="form.type === 'image' ? 'image/*' : 'video/*'" @change="onFileChange" />
        <div class="upload-area" @click="fileInput?.click()">
          <UploadOutlined class="text-3xl" style="color: var(--admin-text-tertiary)" />
          <span class="text-xs" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ form.file ? form.file.name : '点击选择文件' }}</span>
        </div>
        <div v-if="filePreview" class="mt-2 relative">
          <img v-if="form.type === 'image'" :src="filePreview" style="max-height:200px; border-radius:8px" alt="" />
          <video v-else :src="filePreview" controls style="max-height:200px; border-radius:8px"><track kind="captions" /></video>
        </div>
      </a-form-item>

      <a-form-item v-if="form.type === 'video'">
        <a-checkbox v-model:checked="agreeUpload"><span class="text-xs leading-relaxed" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ VIDEO_TERMS_TEXT }}</span></a-checkbox>
      </a-form-item>
      <div v-if="form.type !== 'video'" class="border-t pt-1 pb-0 mb-4 text-xs" :style="{ borderColor: 'var(--theme-card-border)', color: SECONDARY_STYLE.split(': ')[1] }" v-html="CC_LICENSE_TEXT"></div>
      <a-form-item v-if="form.type === 'link'" label="链接地址"><a-input v-model:value="form.url" placeholder="https://..." /></a-form-item>
      <a-form-item label="标签">
        <div v-if="form.tags.length" class="mb-2 flex flex-wrap gap-1">
          <Tag v-for="tag in form.tags" :key="tag" color="blue" closable @close.prevent="toggleTag(tag)">{{ tag }}</Tag>
        </div>
        <TagCloud :tags="admin.tags" :selected-tags="form.tags" :max-tags="50" allow-custom @toggle="toggleTag" @add="handleAddCustomTag" />
      </a-form-item>
      <a-form-item v-if="admin.uploading">
        <a-progress :percent="admin.uploadProgress" status="active" :stroke-width="18" />
      </a-form-item>
      <div class="flex justify-end gap-3">
        <a-button @click="clearForm" :disabled="admin.uploading">清空</a-button>
        <a-button type="primary" :loading="admin.uploading" :disabled="admin.uploading || (form.type === 'video' && form.file && form.file.size > 15*1024*1024 && !agreeUpload)" @click="handleSubmit">提交</a-button>
      </div>
    </a-form>
  </a-card>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.upload-area {
  width: 100%;
  padding: 24px;
  border: 2px dashed var(--theme-card-border);
  border-radius: 8px;
  background: var(--theme-hover-bg);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: border-color 0.2s;

  &:hover {
    border-color: $admin-primary;
  }
}
</style>
