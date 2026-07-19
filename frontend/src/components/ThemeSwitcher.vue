<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { getThemesByCategory } from '@/composables/useThemeRegistry'

const themeStore = useThemeStore()

const visibleThemes = computed(() => {
  const map = getThemesByCategory()
  const result: { key: string; name: string }[] = []
  for (const [, themes] of map) {
    for (const t of themes) {
      result.push({ key: t.key, name: t.name })
    }
  }
  return result
})

function selectTheme(key: string) {
  themeStore.setTheme(key)
}
</script>

<template>
  <div class="theme-switcher">
    <div class="mb-3">
      <span class="text-xs theme-text-secondary">显示模式</span>
      <div class="flex gap-2 mt-1.5">
        <button
          @click="themeStore.setMode('light')"
          class="px-3 py-1.5 rounded-full text-sm transition-all border cursor-pointer"
          :class="themeStore.mode === 'light' ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' : 'theme-surface theme-border theme-text-secondary hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'"
        >
          日间
        </button>
        <button
          @click="themeStore.setMode('dark')"
          class="px-3 py-1.5 rounded-full text-sm transition-all border cursor-pointer"
          :class="themeStore.mode === 'dark' ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' : 'theme-surface theme-border theme-text-secondary hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'"
        >
          暗色
        </button>
      </div>
    </div>
    <div>
      <span class="text-xs theme-text-secondary">主题风格</span>
      <div class="flex items-center gap-2 flex-wrap mt-1.5">
        <button
          v-for="theme in visibleThemes"
          :key="theme.key"
          @click="selectTheme(theme.key)"
          class="px-3 py-1.5 rounded-full text-sm transition-all border cursor-pointer"
          :class="themeStore.currentTheme === theme.key ? 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)] border-[var(--theme-primary)]' : 'theme-surface theme-border theme-text-secondary hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'"
        >
          {{ theme.name }}
        </button>
      </div>
    </div>
  </div>
</template>
