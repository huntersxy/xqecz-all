<script setup lang="ts">
interface Props {
  currentPage: number
  totalPages: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  change: [page: number]
}>()

function goTo(page: number) {
  if (!props.disabled && page >= 1 && page <= props.totalPages) {
    emit('change', page)
  }
}
</script>

<template>
  <nav class="flex flex-wrap justify-center items-center gap-2 pt-4 border-t theme-border" aria-label="分页导航">
    <button
      @click="goTo(currentPage - 1)"
      :disabled="currentPage <= 1 || disabled"
      class="w-9 h-9 flex items-center justify-center rounded-lg theme-surface border theme-border text-sm theme-text-secondary cursor-pointer transition-all hover:bg-[var(--theme-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
      :aria-label="`上一页，当前第 ${currentPage} 页`"
      aria-controls="content-list"
    >
      <img src="/icons/arrow-left.svg" alt="" class="w-4 h-4" aria-hidden="true" />
    </button>
    <span class="text-sm theme-text-secondary px-2" aria-live="polite" aria-atomic="true">
      第 {{ currentPage }} / {{ totalPages }} 页
    </span>
    <button
      @click="goTo(currentPage + 1)"
      :disabled="currentPage >= totalPages || disabled"
      class="w-9 h-9 flex items-center justify-center rounded-lg theme-surface border theme-border text-sm theme-text-secondary cursor-pointer transition-all hover:bg-[var(--theme-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
      :aria-label="`下一页，当前第 ${currentPage} 页`"
      aria-controls="content-list"
    >
      <img src="/icons/arrow-right.svg" alt="" class="w-4 h-4" aria-hidden="true" />
    </button>
  </nav>
</template>
