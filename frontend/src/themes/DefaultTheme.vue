<script lang="ts">
import type { ThemeMeta } from '@/composables/useThemeRegistry'

export const themeMeta: ThemeMeta = {
  key: 'default',
  name: '默认主题',
  description: '简约明亮风格',
  category: 'mac',
  previewColor: '#3b82f6',
  colors: {
    light: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#ec4899',
      text: '#1f2937',
      textSecondary: '#6b7280',
      surface: '#ffffff',
      cardBg: 'rgba(255, 255, 255, 0.75)',
      cardBorder: 'rgba(255, 255, 255, 0.4)',
      headerBg: 'linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.02))',
      hoverBg: '#f3f4f6',
      placeholderBg: '#f3f4f6',
      overlayBg: 'rgba(255, 255, 255, 0.5)',
      bgColor: '#f5f5f5',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      onPrimary: '#ffffff',
      adminBg: '#f0f2f5',
      adminTextTertiary: 'rgba(0, 0, 0, 0.45)',
    },
    dark: {
      primary: '#60a5fa',
      secondary: '#818cf8',
      accent: '#f472b6',
      text: '#f3f4f6',
      textSecondary: '#9ca3af',
      surface: '#1a1a2e',
      cardBg: 'rgba(34, 34, 58, 0.85)',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      headerBg: 'linear-gradient(to bottom, rgba(26,26,46,0.95), rgba(22,22,42,0.95))',
      hoverBg: 'rgba(255, 255, 255, 0.08)',
      placeholderBg: '#374151',
      overlayBg: 'rgba(0, 0, 0, 0.6)',
      bgColor: '#0f0f1a',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      onPrimary: '#ffffff',
      adminBg: '#0f0f1a',
      adminTextTertiary: 'rgba(255, 255, 255, 0.35)',
    },
  },
}
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import logoImg from '@/assets/logo.webp'
import { useHomeLogic } from '@/composables/useHomeLogic'
import { useThemeStore } from '@/stores/theme'
import type { Content } from '@/types'

const {
  contents,
  recommendContents,
  sortedTags,
  searchKeyword,
  selectedTags,
  selectedTypes,
  page,
  isLoading,
  isRecommendLoading,
  total,
  totalPages,
  recommendHint,
  swapSections,
  contentTypes,
  contentTypeLabels,
  selectTag,
  selectType,
  handleSearch,
  goToDetail,
  goToPage,
  goToEasterEgg,
  refreshRecommend,
  onMountedHome,
} = useHomeLogic()

const themeStore = useThemeStore()

const isDark = computed(() => themeStore.mode === 'dark')

onMounted(() => {
  onMountedHome()
})
</script>

<template>
  <div class="default-theme">
    <div class="theme-container">
      <div class="page-card">
        <div class="theme-header">
          <div class="window-controls">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <span class="header-title">小泉动漫二创站</span>
        </div>

        <div class="theme-content">
          <div class="hero-section">
            <img :src="logoImg" alt="小泉动漫二创站" class="logo" />
            <button class="cta-button" @click="goToEasterEgg">
              发现精彩
            </button>
          </div>

          <div class="search-section">
            <div class="search-bar">
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索内容..."
                aria-label="搜索内容"
                @keyup.enter="handleSearch"
              />
              <button @click="handleSearch">搜索</button>
            </div>
          </div>

          <div class="poll-section">
            <PollComponent />
          </div>

          <div class="filter-section">
            <div class="filter-group">
              <span class="filter-label">类型</span>
              <div class="filter-tags">
                <button
                  v-for="type in contentTypes"
                  :key="type"
                  :class="['filter-tag', { active: selectedTypes.includes(type) }]"
                  @click="selectType(type)"
                >
                  {{ contentTypeLabels[type] }}
                </button>
              </div>
            </div>
            <div class="filter-group">
              <span class="filter-label">标签云</span>
              <div class="filter-tags">
                <button
                  v-for="tag in sortedTags"
                  :key="tag"
                  :class="['filter-tag', { active: selectedTags.includes(tag) }]"
                  @click="selectTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>

          <motion.div
            class="content-wrapper"
            :animate="{ height: 'auto', transition: { duration: 0.3, ease: 'easeOut' } }"
          >
            <motion.div
              id="recommend-section-default"
              class="recommend-section"
              :style="{ scrollMarginTop: '120px' }"
              :initial="{ opacity: 1, y: 0 }"
              :animate="{
                opacity: swapSections ? 0 : 1,
                y: swapSections ? -100 : 0,
                height: swapSections ? 0 : 'auto',
                transition: { duration: 0.3, ease: 'easeOut' },
              }"
              style="overflow: hidden"
            >
              <div class="section-header">
                <h2>推荐内容</h2>
                <div class="section-actions">
                  <span class="section-hint">精选推荐</span>
                  <button
                    class="refresh-btn"
                    :disabled="isRecommendLoading"
                    @click="refreshRecommend"
                  >
                    {{ isRecommendLoading ? '加载中...' : '刷新' }}
                  </button>
                </div>
                <span v-if="recommendHint" class="recommend-hint">{{ recommendHint }}</span>
              </div>

              <div :class="['content-grid', { loading: isRecommendLoading }]">
                <HomeContentCard
                  v-for="content in recommendContents"
                  :key="content.id"
                  :content="{ ...content, audit_status: 'approved' } as unknown as Content"
                  :variant="isDark ? 'dark' : 'default'"
                  @click="goToDetail"
                />
              </div>

              <div v-if="isRecommendLoading" class="loading-overlay">
                <div class="spinner"></div>
                <p>加载中...</p>
              </div>
            </motion.div>

            <div id="content-section-default" class="content-section" style="scroll-margin-top: 120px">
              <div class="section-header">
                <h2>最近上传</h2>
                <span class="total-count">共 {{ total }} 条</span>
              </div>

              <div :class="['content-grid', { loading: isLoading }]">
                <HomeContentCard
                  v-for="content in contents"
                  :key="content.id"
                  :content="content"
                  :variant="isDark ? 'dark' : 'default'"
                  @click="goToDetail"
                />
              </div>

              <div v-if="isLoading" class="loading-overlay">
                <div class="spinner"></div>
                <p>加载中...</p>
              </div>

              <div v-if="!isLoading && contents.length === 0" class="empty-state">
                <p>暂无内容</p>
              </div>
            </div>
          </motion.div>

          <HomePagination
            v-if="totalPages > 1"
            :current-page="page"
            :total-pages="totalPages"
            :show-first-last="true"
            :disabled="isLoading"
            @change="goToPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.default-theme {
  min-height: 100vh;
  padding: 0;

  @media (min-width: 640px) {
    padding: 1.25rem;
  }
}

.theme-container {
  display: flex;
  justify-content: center;
  min-height: 100vh;
}

.page-card {
  width: 100%;
  max-width: 1200px;
  min-height: 100vh;
  overflow: hidden;
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--theme-card-border);
  background: var(--theme-card-bg);
  transition: all 0.5s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.12);
  }
}

.theme-header {
  display: flex;
  align-items: center;
  padding: 0.625rem 1rem;
  background: var(--theme-header-bg);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.window-controls {
  display: flex;
  gap: 0.5rem;
  margin-right: 1rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;

  &-red { background: #ff5f57; }
  &-yellow { background: #febc2e; }
  &-green { background: #28c840; }
}

.header-title {
  font-size: 0.875rem;
  color: var(--theme-text-secondary);
  font-weight: 500;
}

.theme-content {
  padding: 0.75rem;

  @media (min-width: 640px) {
    padding: 1.5rem;
  }
}

.hero-section {
  text-align: center;
  margin-bottom: 1.25rem;

  @media (min-width: 640px) {
    margin-bottom: 2rem;
  }
}

.logo {
  max-width: 100%;
  height: auto;
  max-height: 80px;
  margin: 0 auto 0.5rem;

  @media (min-width: 640px) {
    max-height: 120px;
    margin-bottom: 0.75rem;
  }
}

.cta-button {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--theme-on-primary);
  background: var(--theme-accent);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;

  @media (min-width: 640px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }
}

.search-section {
  margin-bottom: 1rem;

  @media (min-width: 640px) {
    margin-bottom: 1.5rem;
  }
}

.search-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 600px;
  margin: 0 auto;

  @media (min-width: 640px) {
    flex-direction: row;
    gap: 0.75rem;
  }

  input {
    flex: 1;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border: 1px solid var(--theme-card-border);
    border-radius: 0.5rem;
    background: var(--theme-surface);
    color: var(--theme-text);
    outline: none;
    transition: all 0.2s ease;

    &:focus {
      border-color: var(--theme-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: var(--theme-text-secondary);
      opacity: 0.4;
    }
  }

  button {
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-on-primary);
    background: var(--theme-primary);
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      filter: brightness(0.9);
    }
  }
}

.poll-section {
  margin-bottom: 1rem;

  @media (min-width: 640px) {
    margin-bottom: 1.5rem;
  }
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--theme-surface);
  border-radius: 0.75rem;

  @media (min-width: 640px) {
    flex-direction: row;
    gap: 1.25rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.filter-label {
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
  font-weight: 500;

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;

  @media (min-width: 640px) {
    gap: 0.5rem;
  }
}

.filter-tag {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
  background: var(--theme-surface);
  border: 1px solid var(--theme-card-border);
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;

  @media (min-width: 640px) {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  &:hover {
    color: var(--theme-primary);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.active {
    color: var(--theme-primary);
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    font-weight: 500;
  }
}

.content-wrapper {
  position: relative;
  overflow: hidden;
  min-height: 100px;
}

.recommend-section {
  margin-bottom: 1rem;

  @media (min-width: 640px) {
    margin-bottom: 1.5rem;
  }
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  @media (min-width: 640px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--theme-text);
    margin: 0;

    @media (min-width: 640px) {
      font-size: 1.125rem;
    }
  }
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  @media (min-width: 640px) {
    gap: 0.75rem;
  }
}

.section-hint {
  font-size: 0.75rem;
  color: var(--theme-text-secondary);

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
  background: var(--theme-surface);
  border: 1px solid var(--theme-card-border);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  @media (min-width: 640px) {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  &:hover:not(:disabled) {
    background: var(--theme-primary);
    border-color: var(--theme-primary);
    color: var(--theme-on-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.recommend-hint {
  font-size: 0.75rem;
  color: var(--theme-primary);
  animation: pulse 1.5s ease-in-out infinite;

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: start;
  gap: 0.5rem;
  transition: opacity 0.3s ease;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }

  &.loading {
    opacity: 0.3;
    pointer-events: none;
  }
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--theme-overlay-bg);
  z-index: 10;

  p {
    font-size: 0.875rem;
    color: var(--theme-text-secondary);
  }
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--theme-text-secondary);

  @media (min-width: 640px) {
    padding: 4rem;
  }

  p {
    font-size: 0.875rem;
  }
}

.content-section {
  margin-bottom: 1rem;

  @media (min-width: 640px) {
    margin-bottom: 1.5rem;
  }
}

.total-count {
  font-size: 0.75rem;
  color: var(--theme-text-secondary);

  @media (min-width: 640px) {
    font-size: 0.875rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
