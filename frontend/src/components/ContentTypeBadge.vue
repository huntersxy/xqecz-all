<script setup lang="ts">
defineProps<{
  type: 'video' | 'image' | 'text' | 'link'
}>()
</script>

<template>
  <span
    :class="[
      'px-2 py-0.5 rounded-full text-xs font-medium',
      type === 'video' ? 'bg-[var(--theme-danger)]/10 text-[var(--theme-danger)]' :
      type === 'image' ? 'bg-[var(--theme-success)]/10 text-[var(--theme-success)]' :
      type === 'link' ? 'bg-[var(--theme-secondary)]/10 text-[var(--theme-secondary)]' :
      'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]',
    ]"
  >
    {{ type === 'video' ? '视频' : type === 'image' ? '图片' : type === 'link' ? '链接' : '文字' }}
  </span>
</template>
