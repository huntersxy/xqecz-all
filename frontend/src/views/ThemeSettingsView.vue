<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { getThemesByCategory, categoryLabels } from '@/composables/useThemeRegistry'

const themeStore = useThemeStore()
const router = useRouter()

const themeCategories = computed(() => getThemesByCategory())

function selectTheme(key: string) {
  themeStore.setTheme(key)
}

function goBack() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen p-2 sm:p-4 md:p-5 lg:p-6 flex justify-center bg-transparent">
    <div class="w-full max-w-6xl bg-[var(--theme-surface)] rounded-xl shadow-lg shadow-black/5 border border-[var(--theme-card-border)] overflow-hidden">
      <div class="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 theme-header-bg">
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-[#ff5f57] mr-2"></div>
          <div class="w-3 h-3 rounded-full bg-[#febc2e] mr-2"></div>
          <div class="w-3 h-3 rounded-full bg-[#28c840] mr-4"></div>
          <div class="text-xs sm:text-sm theme-text-secondary font-medium">主题设置</div>
        </div>
        <button @click="goBack" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg theme-surface theme-border text-xs sm:text-sm transition-all hover:bg-[var(--theme-hover-bg)] theme-text-secondary">
          <img src="/icons/arrow-left.svg" alt="" class="w-4 h-4" />
          <span>返回首页</span>
        </button>
      </div>

      <div class="p-3 sm:p-4 md:p-6">
        <div class="text-center mb-5 sm:mb-8">
          <h1 class="text-xl sm:text-2xl font-bold theme-text mb-2">选择你的主题</h1>
          <p class="text-sm theme-text-secondary">每个主题都有独特的布局和视觉体验</p>
        </div>

        <div class="max-w-[800px] mx-auto mb-6 sm:mb-8 p-4 sm:p-6 theme-card rounded-xl theme-border">
          <h3 class="text-base sm:text-lg font-semibold theme-text mb-4">显示模式</h3>
          <div class="flex gap-4">
            <button
              :class="['px-4 py-2 rounded-lg text-sm font-medium transition-all', themeStore.mode === 'light' ? 'bg-[var(--theme-primary)] text-white' : 'theme-surface theme-border theme-text-secondary hover:bg-[var(--theme-hover-bg)]']"
              @click="themeStore.setMode('light')"
            >
              日间模式
            </button>
            <button
              :class="['px-4 py-2 rounded-lg text-sm font-medium transition-all', themeStore.mode === 'dark' ? 'bg-[var(--theme-primary)] text-white' : 'theme-surface theme-border theme-text-secondary hover:bg-[var(--theme-hover-bg)]']"
              @click="themeStore.setMode('dark')"
            >
              暗色模式
            </button>
          </div>
        </div>

        <template v-for="[category, themes] in [...themeCategories]" :key="category">
          <div class="max-w-[1000px] mx-auto mb-4 sm:mb-6" :class="{ 'mt-8 sm:mt-10': category !== [...themeCategories.keys()][0] }">
            <h2 class="text-lg sm:text-xl font-bold theme-text">{{ categoryLabels[category] || category }}</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-[1000px] mx-auto">
            <div
              v-for="theme in themes"
              :key="theme.key"
              class="theme-option-card theme-card rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg group relative"
              :class="{ 'border-[var(--theme-primary)] shadow-md': themeStore.currentTheme === theme.key, 'theme-border': themeStore.currentTheme !== theme.key }"
              @click="selectTheme(theme.key)"
            >
              <div class="theme-preview h-40 sm:h-48 relative overflow-hidden" :style="{ background: `linear-gradient(135deg, ${theme.previewColor}, ${theme.previewColor}88)` }">
                <div class="preview-mockup absolute inset-4 sm:inset-6 theme-surface rounded-lg shadow-lg overflow-hidden">
                  <div class="flex items-center gap-1.5 px-3 py-2 theme-header-bg">
                    <div class="w-2 h-2 rounded-full bg-[#ff5f57]"></div>
                    <div class="w-2 h-2 rounded-full bg-[#febc2e]"></div>
                    <div class="w-2 h-2 rounded-full bg-[#28c840]"></div>
                  </div>
                  <div class="p-2 sm:p-3">
                    <div class="h-1.5 rounded-full theme-placeholder-bg w-3/5 mb-2"></div>
                    <div class="h-1.5 rounded-full theme-placeholder-bg w-full mb-3"></div>
                    <div class="grid grid-cols-3 gap-1.5">
                      <div class="h-8 rounded theme-placeholder-bg"></div>
                      <div class="h-8 rounded theme-placeholder-bg"></div>
                      <div class="h-8 rounded theme-placeholder-bg"></div>
                    </div>
                  </div>
                </div>
                <div v-if="themeStore.currentTheme === theme.key" class="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5" :style="{ color: theme.previewColor }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div class="p-3 sm:p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm sm:text-base font-semibold theme-text">{{ theme.name }}</h3>
                  <span v-if="themeStore.currentTheme === theme.key" class="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">当前使用</span>
                </div>
                <p class="text-xs sm:text-sm theme-text-secondary mt-1">{{ theme.description }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-option-card {
  border-color: var(--theme-card-border);
}
</style>
