<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: '页面出错了',
  fallbackMessage: '发生未知错误，请刷新页面重试',
})

const error = ref<Error | null>(null)
const errorInfo = ref<string>('')

onErrorCaptured((err: Error, instance, info) => {
  console.error('ErrorBoundary caught error:', err)
  console.error('Component info:', info)

  error.value = err
  errorInfo.value = info

  // Prevent error from propagating further
  return false
})

function resetError() {
  error.value = null
  errorInfo.value = ''
}

function reloadPage() {
  globalThis.location.reload()
}
</script>

<template>
  <div v-if="error" class="error-boundary-fallback" role="alert" aria-live="assertive">
    <div class="error-boundary-content">
      <div class="error-boundary-icon">
        <svg
          class="w-16 h-16 text-[var(--theme-danger)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h2 class="error-boundary-title">{{ props.fallbackTitle }}</h2>
      <p class="error-boundary-message">{{ error.message || props.fallbackMessage }}</p>

      <div v-if="errorInfo" class="error-boundary-info">
        <details>
          <summary class="error-boundary-details-summary">错误详情</summary>
          <pre class="error-boundary-details-content">{{ errorInfo }}</pre>
        </details>
      </div>

      <div class="error-boundary-actions">
        <button
          @click="resetError"
          class="error-boundary-btn error-boundary-btn-secondary"
          aria-label="重试"
        >
          重试
        </button>
        <button
          @click="reloadPage"
          class="error-boundary-btn error-boundary-btn-primary"
          aria-label="刷新页面"
        >
          刷新页面
        </button>
      </div>

      <p class="error-boundary-contact">请联系站长@汐兮雨</p>
    </div>
  </div>

  <slot v-else />
</template>

<style scoped>
.error-boundary-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
}

.error-boundary-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 400px;
}

.error-boundary-icon {
  margin-bottom: 1.5rem;
}

.error-boundary-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme-text);
  margin-bottom: 0.5rem;
}

.error-boundary-message {
  font-size: 0.875rem;
  color: var(--theme-text-secondary);
  margin-bottom: 1rem;
}

.error-boundary-info {
  width: 100%;
  margin-bottom: 1.5rem;
}

.error-boundary-details-summary {
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--theme-text-secondary);
  margin-bottom: 0.5rem;
}

.error-boundary-details-content {
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
  background: var(--theme-hover-bg);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-boundary-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.error-boundary-btn {
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.error-boundary-btn-primary {
  background: var(--theme-primary);
  color: var(--theme-on-primary);
}

.error-boundary-btn-primary:hover {
  opacity: 0.9;
}

.error-boundary-btn-secondary {
  background: var(--theme-hover-bg);
  color: var(--theme-text);
}

.error-boundary-btn-secondary:hover {
  background: var(--theme-card-border);
}

.error-boundary-contact {
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
}
</style>