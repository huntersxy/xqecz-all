<script setup lang="ts">
defineEmits<{
  insert: [prefix: string, suffix: string]
  uploadImage: []
}>()
</script>

<template>
  <div class="flex gap-1.5 mb-2 p-2 bg-[var(--theme-hover-bg)] rounded-md">
    <button
      type="button"
      @click="$emit('insert', '## ', '')"
      class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-md theme-text-secondary hover:text-[var(--theme-primary)] hover:border-blue-300 transition-all active:bg-[var(--theme-primary)]/10 active:shadow-inner active:ring-1 active:ring-[var(--theme-primary)]/30"
      title="标题"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 12h16M4 6h16M4 18h10" />
      </svg>
    </button>
    <button
      type="button"
      @click="$emit('insert', '**', '**')"
      class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-md theme-text-secondary hover:text-[var(--theme-primary)] hover:border-blue-300 transition-all active:bg-[var(--theme-primary)]/10 active:shadow-inner active:ring-1 active:ring-[var(--theme-primary)]/30"
      title="粗体"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      </svg>
    </button>
    <button
      type="button"
      @click="$emit('insert', '*', '*')"
      class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-md theme-text-secondary hover:text-[var(--theme-primary)] hover:border-blue-300 transition-all active:bg-[var(--theme-primary)]/10 active:shadow-inner active:ring-1 active:ring-[var(--theme-primary)]/30"
      title="斜体"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
      </svg>
    </button>
    <button
      type="button"
      @click="$emit('insert', '- ', '')"
      class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-md theme-text-secondary hover:text-[var(--theme-primary)] hover:border-blue-300 transition-all active:bg-[var(--theme-primary)]/10 active:shadow-inner active:ring-1 active:ring-[var(--theme-primary)]/30"
      title="列表"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    </button>
    <button
      type="button"
      @click="$emit('insert', '`', '`')"
      class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-md theme-text-secondary hover:text-[var(--theme-primary)] hover:border-blue-300 transition-all active:bg-[var(--theme-primary)]/10 active:shadow-inner active:ring-1 active:ring-[var(--theme-primary)]/30"
      title="代码"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    </button>
    <button
      type="button"
      @click="$emit('uploadImage')"
      class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-md theme-text-secondary hover:text-[var(--theme-primary)] hover:border-blue-300 transition-all active:bg-[var(--theme-primary)]/10 active:shadow-inner active:ring-1 active:ring-[var(--theme-primary)]/30"
      title="上传图片"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </button>
  </div>
</template>
