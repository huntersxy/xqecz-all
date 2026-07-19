<script setup lang="ts">
defineProps<{
  type?: 'success' | 'error' | 'warning' | 'info'
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <div
    class="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg text-xs sm:text-sm transition-all"
    :class="{
      'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20': type === 'success',
      'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20': type === 'error',
      'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20': type === 'warning',
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20': type === 'info',
    }"
  >
    <svg v-if="type === 'error'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
    <svg v-else-if="type === 'success'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
    </svg>
    <svg v-else-if="type === 'warning'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <span class="flex-1"><slot /></span>
    <button
      class="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      @click="$emit('close')"
      aria-label="关闭"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>
