<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  modalId: number | string
  markdownContent?: string
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  markdownContent: '',
  isOpen: false,
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
}>()

const showModal = ref(false)
const loadedContent = ref('')

async function loadFromFile() {
  try {
    const res = await fetch(`/announcements/${props.modalId}.md`)
    if (res.ok) loadedContent.value = await res.text()
  } catch { /* */ }
}

const hasSeenModal = () => {
  if (import.meta.env.DEV) return false
  return document.cookie.split('; ').some(c => c.startsWith(`seenModal_${props.modalId}=`))
}

const setSeenCookie = () => {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `seenModal_${props.modalId}=true; expires=${expires}; path=/`
}

function closeModal() {
  setSeenCookie()
  showModal.value = false
  emit('update:isOpen', false)
}

const markdownSource = computed(() => props.markdownContent || loadedContent.value)

const renderedContent = computed(() => {
  if (!markdownSource.value) return ''
  return DOMPurify.sanitize(marked(markdownSource.value) as string)
})

onMounted(async () => {
  if (!props.markdownContent) await loadFromFile()
  if (!hasSeenModal() || props.isOpen) showModal.value = true
})

watch(() => props.isOpen, (v) => {
  if (v && !hasSeenModal()) showModal.value = true
})
</script>

<template>
  <a-modal
    v-model:open="showModal"
    title="通知"
    :width="640"
    :footer="null"
    @cancel="closeModal"
    class="theme-modal"
    aria-label="通知对话框"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-body">
      <slot />
      <div
        v-if="renderedContent"
        class="markdown-content"
        :class="{ 'mt-4 pt-4': $slots.default }"
        v-html="renderedContent"
      />
    </div>
    <template #footer>
      <a-button type="primary" @click="closeModal" aria-label="关闭通知对话框">知道了</a-button>
    </template>
  </a-modal>
</template>

<style>

html.theme-dark .ant-modal-content {
  background: #1f1f1f !important;
}
html.theme-dark .ant-modal-header {
  background: #1f1f1f !important;
  border-bottom: 1px solid #333 !important;
}
html.theme-dark .ant-modal-title {
  color: rgba(255,255,255,0.88) !important;
}
html.theme-dark .ant-modal-close {
  color: rgba(255,255,255,0.45) !important;
}
html.theme-dark .ant-modal-body {
  color: rgba(255,255,255,0.88) !important;
}
html.theme-dark .ant-modal-footer {
  border-top: 1px solid #333 !important;
}
</style>

<style scoped>
.modal-body {
  max-height: 60vh;
  overflow-y: auto;
}

.markdown-content {
  line-height: 1.75;
  color: var(--theme-text);
  padding-top: 16px;
}

.markdown-content.mt-4 {
  border-top: 1px solid var(--theme-card-border);
}

.markdown-content :deep(h1) {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--theme-text);
}

.markdown-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--theme-text);
}

.markdown-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--theme-text);
}

.markdown-content :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--theme-text);
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  color: var(--theme-text);
}

.markdown-content :deep(a) {
  color: var(--theme-primary);
  text-decoration: underline;
}

.markdown-content :deep(code) {
  background-color: var(--theme-hover-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: var(--theme-text);
}

.markdown-content :deep(pre) {
  background-color: #1a1a1a;
  color: #e0e0e0;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--theme-primary);
  padding-left: 1rem;
  color: var(--theme-text-secondary);
  font-style: italic;
  margin: 0.75rem 0;
}
</style>
