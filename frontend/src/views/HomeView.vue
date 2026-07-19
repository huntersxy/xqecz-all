<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { getThemeComponent, getDefaultTheme } from '@/composables/useThemeRegistry'

const themeStore = useThemeStore()

const themeComponent = computed(() => {
  const component = getThemeComponent(themeStore.currentTheme)
  if (component) {
    return defineAsyncComponent(component as () => Promise<Component>)
  }
  const defaultComponent = getThemeComponent(getDefaultTheme())
  return defaultComponent
    ? defineAsyncComponent(defaultComponent as () => Promise<Component>)
    : null
})
</script>

<template>
  <component :is="themeComponent" />
  <MarkdownModal :modal-id="1">
    <div>
      <h4 class="text-sm font-medium text-[var(--theme-text)] mb-2">切换主题</h4>
      <ThemeSwitcher />
    </div>
  </MarkdownModal>
</template>
