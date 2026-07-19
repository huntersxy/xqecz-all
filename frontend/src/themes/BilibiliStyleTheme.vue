<script lang="ts">
import type { ThemeMeta } from '@/composables/useThemeRegistry'

export const themeMeta: ThemeMeta = {
  key: 'bilibiliStyle',
  name: 'Bilibili风格',
  description: '大屏网格布局',
  category: 'large',
  previewColor: '#00a1d6',
  colors: {
    light: {
      primary: '#00a1d6',
      secondary: '#23ade5',
      accent: '#fb7299',
      text: '#1f2937',
      textSecondary: '#6b7280',
      surface: '#ffffff',
      cardBg: '#ffffff',
      cardBorder: '#e5e7eb',
      headerBg: 'linear-gradient(to bottom, #f1f2f3, #f6f7f8)',
      hoverBg: '#f1f2f3',
      placeholderBg: '#f1f2f3',
      overlayBg: 'rgba(255, 255, 255, 0.6)',
      bgColor: '#f4f5f5',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      onPrimary: '#ffffff',
      adminBg: '#f4f5f5',
      adminTextTertiary: 'rgba(0, 0, 0, 0.45)',
    },
    dark: {
      primary: '#00a1d6',
      secondary: '#23ade5',
      accent: '#fb7299',
      text: '#e5e7eb',
      textSecondary: '#9ca3af',
      surface: '#17181a',
      cardBg: '#222325',
      cardBorder: '#2e2f31',
      headerBg: 'linear-gradient(to bottom, #1f2022, #222325)',
      hoverBg: '#2a2b2d',
      placeholderBg: '#2a2b2d',
      overlayBg: 'rgba(0, 0, 0, 0.6)',
      bgColor: '#0f0f0f',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      onPrimary: '#ffffff',
      adminBg: '#0f0f0f',
      adminTextTertiary: 'rgba(255, 255, 255, 0.35)',
    },
  },
}
</script>

<script setup lang="ts">
import { contentApi } from '@/api'
import { useRouter } from 'vue-router'
import { getImageUrl } from '@/utils'
import { useSearchFilter } from '@/composables/useSearchFilter'
import logoImg from '@/assets/logo.webp'
import type { Content, RecommendContent, ListParams } from '@/types'

function hasNsfw(item: { tags?: string[] }) {
  return item.tags?.some((t) => t.toLowerCase() === 'nsfw')
}

function hasAi(item: { tags?: string[] }) {
  return item.tags?.some((t) => /ai/i.test(t))
}

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalHeight > img.naturalWidth * 1.2) {
    img.style.objectPosition = '50% 8%'
  }
}

const router = useRouter()
const searchFilter = useSearchFilter()

const contents = ref<Content[]>([])
const recommendContents = ref<RecommendContent[]>([])
// hero 大图：默认用推荐列表首条即时渲染，加载完成后用“无痕详情”覆盖（不计入浏览量）
const heroItem = ref<Content | RecommendContent | null>(null)
const hero = computed(() => heroItem.value ?? recommendContents.value[0] ?? null)
const loading = ref(true)
const loadMoreLoading = ref(false)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const allLoaded = computed(() => page.value >= totalPages.value)
const showMore = ref(false)
const maxVisibleTags = 18
const windowWidth = ref(window.innerWidth)
const observerTarget = ref<HTMLDivElement | null>(null)
const searchKeyword = ref('')
let observer: IntersectionObserver | null = null

const displayedTags = computed(() => {
  if (showMore.value) {
    return searchFilter.sortedTags.value
  }
  return searchFilter.sortedTags.value.slice(0, maxVisibleTags)
})

const isSearchActive = ref(false)

function toggleMore() {
  showMore.value = !showMore.value
}

async function loadData() {
  isSearchActive.value = false
  try {
    loading.value = true

    const listParams: ListParams = {
      page: 1,
      page_size: 12,
      sort_by: 'created_at',
      order: 'desc',
    }
    if (searchFilter.selectedTags.value.length > 0) {
      listParams.tag = searchFilter.selectedTags.value.join(',')
    }

    const [contentsRes, recommendRes] = await Promise.all([
      contentApi.list(listParams),
      contentApi.recommend(20, 1),
      searchFilter.loadTags(),
    ])
    const listData = contentsRes.data
    contents.value = listData?.list || []
    total.value = listData?.total || 0
    totalPages.value = listData?.total_page || 1
    page.value = 1
    recommendContents.value = recommendRes.data?.list || []
    // hero 大图走“无痕详情”，避免仅展示就计入浏览量（对应后端 get_content 的 silent 参数）
    const first = recommendContents.value[0]
    if (first) {
      contentApi
        .detail(first.id, { silent: true })
        .then((res) => {
          if (res.code === 200) heroItem.value = res.data
        })
        .catch(() => {})
    }
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
    await nextTick()
    setupObserver()
  }
}

async function loadMore() {
  if (loadMoreLoading.value || allLoaded.value) return
  try {
    loadMoreLoading.value = true
    const nextPage = page.value + 1
    const listParams: ListParams = {
      page: nextPage,
      page_size: 12,
      sort_by: 'created_at',
      order: 'desc',
    }
    if (searchFilter.selectedTags.value.length > 0) {
      listParams.tag = searchFilter.selectedTags.value.join(',')
    }
    const res = await contentApi.list(listParams)
    const list = res.data?.list || []
    contents.value.push(...list)
    page.value = nextPage
    totalPages.value = res.data?.total_page || totalPages.value
    total.value = res.data?.total || total.value
  } catch (error) {
    console.error('加载更多失败:', error)
  } finally {
    loadMoreLoading.value = false
  }
}

function setupObserver() {
  observer?.disconnect()
  if (!observerTarget.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadMoreLoading.value && !allLoaded.value) {
        loadMore()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(observerTarget.value)
}

function selectTag(tag: string) {
  searchFilter.selectTag(tag, () => {
    loadData()
  })
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}

function goToContent(item: Content | RecommendContent | null) {
  if (!item) return
  if (item.type === 'link' && item.url) {
    window.open(item.url, '_blank')
    return
  }
  router.push(`/content/${item.id}`)
}

async function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    isSearchActive.value = false
    loadData()
    return
  }
  isSearchActive.value = true
  try {
    loading.value = true
    const params: Record<string, unknown> = { page: 1, page_size: 12 }
    if (searchFilter.selectedTags.value.length > 0) {
      params.tag = searchFilter.selectedTags.value.join(',')
    }
    const res = await contentApi.search(kw, params)
    if (res.code === 200) {
      contents.value = res.data.list
      total.value = res.data.total
      totalPages.value = res.data.total_page
      page.value = 1
    }
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData().then(() => {
    setupObserver()
  })
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
  watch(searchKeyword, (val) => {
    if (!val.trim() && isSearchActive.value) {
      loadData()
    }
  })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="bilibili-theme">
    <div class="theme-banner">
      <img :src="logoImg" alt="小泉动漫二创站" class="logo" />
    </div>

    <div class="search-section">
      <div class="search-bar">
        <input
          v-model="searchKeyword"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="搜索内容..."
          aria-label="搜索内容"
        />
        <button @click="handleSearch">搜索</button>
      </div>
    </div>

    <div class="tags-section">
      <div class="tags-container">
        <div class="tags-list">
          <button
            v-for="tag in displayedTags"
            :key="tag"
            :class="['tag-item', { active: searchFilter.selectedTags.value.includes(tag) }]"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </button>
          <button class="tag-item tag-more" @click="toggleMore">
            {{ showMore ? '收起' : '全部标签' }}
            <svg
              class="arrow-icon"
              :class="{ rotated: showMore }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="poll-section">
      <PollComponent />
    </div>

    <div class="content-section">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <template v-else>
        <div v-if="!isSearchActive && searchFilter.selectedTags.value.length === 0 && recommendContents.length > 0" class="recommend-grid">
          <div v-if="hero" @click="goToContent(hero)" class="recommend-main">
            <template v-if="hasNsfw(hero)">
              <img
                :src="getImageUrl(hero.thumb)"
                alt="推荐内容"
                class="nsfw-blur"
                loading="lazy"
              />
              <div class="nsfw-overlay">
                <svg
                  class="shield-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>不适合在工作期间访问</span>
              </div>
            </template>
            <template v-else>
              <img
                :src="getImageUrl(hero.thumb)"
                alt="推荐内容"
                class="recommend-img"
                loading="lazy"
                @load="onImageLoad"
              />
            </template>
            <div v-if="hasAi(hero)" class="ai-badge">AI生成</div>
            <div class="recommend-overlay"></div>
            <div class="recommend-info">
              <h3>{{ hero.title }}</h3>
              <div class="recommend-meta">
                <span>{{ hero.user?.username }}</span>
                <span>{{ formatNumber(hero.view_count || 0) }} 次观看</span>
              </div>
            </div>
          </div>
          <div class="recommend-side">
            <div
              v-for="item in recommendContents.slice(1, windowWidth >= 1367 ? 7 : 5)"
              :key="item.id"
              @click="goToContent(item)"
              class="recommend-card"
            >
              <div class="card-image-wrapper">
                <template v-if="hasNsfw(item)">
                  <img
                    :src="getImageUrl(item.thumb)"
                    alt="推荐内容"
                    class="nsfw-blur"
                    loading="lazy"
                  />
                  <div class="nsfw-overlay small">
                    <svg
                      class="shield-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>不适合在工作期间访问</span>
                  </div>
                </template>
                <template v-else>
                  <img
                    :src="getImageUrl(item.thumb)"
                    alt="推荐内容"
                    class="card-img"
                    loading="lazy"
                    @load="onImageLoad"
                  />
                </template>
                <div v-if="hasAi(item)" class="ai-badge small">AI生成</div>
                <div class="type-badge">
                  {{
                    item.type === 'video'
                      ? '视频'
                      : item.type === 'image'
                        ? '图片'
                        : item.type === 'link'
                          ? '链接'
                          : '文字'
                  }}
                </div>
              </div>
              <div class="card-info">
                <h4>{{ item.title }}</h4>
                <div class="card-meta">
                  <span class="views">
                    <svg class="eye-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                      />
                    </svg>
                    {{ formatNumber(item.view_count || 0) }}
                  </span>
                  <span class="date">{{ formatDate(item.created_at) }}</span>
                </div>
                <div class="card-footer">
                  <span class="author">{{ item.user?.username }}</span>
                  <div class="card-tags">
                    <span v-for="tag in item.tags?.slice(0, 2)" :key="tag" class="card-tag">{{
                      tag
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!isSearchActive && searchFilter.selectedTags.value.length === 0 && recommendContents.length > (windowWidth >= 1367 ? 7 : 5)"
          class="more-recommend"
        >
          <div
            v-for="item in recommendContents.slice(
              windowWidth >= 1367 ? 7 : 5,
              windowWidth >= 1367 ? 17 : 13,
            )"
            :key="item.id"
            @click="goToContent(item)"
            class="recommend-card"
          >
            <div class="card-image-wrapper">
              <template v-if="hasNsfw(item)">
                <img
                  :src="getImageUrl(item.thumb)"
                  alt="推荐内容"
                  class="nsfw-blur"
                  loading="lazy"
                />
                <div class="nsfw-overlay small">
                  <svg
                    class="shield-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>不适合在工作期间访问</span>
                </div>
              </template>
              <template v-else>
                <img
                  :src="getImageUrl(item.thumb)"
                  alt="推荐内容"
                  class="card-img"
                  loading="lazy"
                  @load="onImageLoad"
                />
              </template>
              <div v-if="hasAi(item)" class="ai-badge small">AI生成</div>
              <div class="type-badge">
                {{
                  item.type === 'video'
                    ? '视频'
                    : item.type === 'image'
                      ? '图片'
                      : item.type === 'link'
                        ? '链接'
                        : '文字'
                }}
              </div>
            </div>
            <div class="card-info">
              <h4>{{ item.title }}</h4>
              <div class="card-meta">
                <span class="views">
                  <svg class="eye-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    />
                  </svg>
                  {{ formatNumber(item.view_count || 0) }}
                </span>
                <span class="date">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="card-footer">
                <span class="author">{{ item.user?.username }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="section-divider">
          <h2>最近上传</h2>
          <span class="total-count">共 {{ total }} 条</span>
        </div>

        <div class="main-grid">
          <div
            v-for="item in contents"
            :key="item.id"
            @click="goToContent(item)"
            class="recommend-card"
          >
            <div class="card-image-wrapper">
              <template v-if="hasNsfw(item)">
                <img
                  :src="getImageUrl(item.thumb)"
                  alt="内容图片"
                  class="nsfw-blur"
                  loading="lazy"
                />
                <div class="nsfw-overlay small">
                  <svg
                    class="shield-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>不适合在工作期间访问</span>
                </div>
              </template>
              <template v-else>
                <img
                  :src="getImageUrl(item.thumb)"
                  alt="内容图片"
                  class="card-img"
                  loading="lazy"
                  @load="onImageLoad"
                />
              </template>
              <div v-if="hasAi(item)" class="ai-badge small">AI生成</div>
              <div class="type-badge">
                {{
                  item.type === 'video'
                    ? '视频'
                    : item.type === 'image'
                      ? '图片'
                      : item.type === 'link'
                        ? '链接'
                        : '文字'
                }}
              </div>
            </div>
            <div class="card-info">
              <h4>{{ item.title }}</h4>
              <div class="card-meta">
                <span class="views">
                  <svg class="eye-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    />
                  </svg>
                  {{ formatNumber(item.view_count) }}
                </span>
                <span class="date">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="card-footer">
                <span class="author">{{ item.user?.username }}</span>
              </div>
            </div>
          </div>
        </div>

        <div ref="observerTarget" class="load-more-trigger">
          <div v-if="loadMoreLoading" class="spinner small"></div>
          <span v-else-if="allLoaded" class="all-loaded">— 已全部加载 —</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bilibili-theme {
  min-height: 100vh;
  background: transparent;
}

.theme-banner {
  height: 8rem;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 767px) {
    height: 5rem;
  }
}

.logo {
  max-width: 100%;
  height: auto;
  max-height: 80px;
}

.search-section {
  max-width: 600px;
  margin: 0 auto 1rem;
  padding: 0 1rem;
}

.search-bar {
  display: flex;
  gap: 0.5rem;

  input {
    flex: 1;
    padding: 0.625rem 1rem;
    background: var(--theme-card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--theme-card-border);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    outline: none;
    color: var(--theme-text);
    transition: border-color 0.2s;

    &:focus {
      border-color: var(--theme-primary);
    }

    &::placeholder {
      color: var(--theme-text-secondary);
      opacity: 0.5;
    }
  }

  button {
    padding: 0.625rem 1.25rem;
    background: var(--theme-primary);
    color: var(--theme-on-primary);
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: filter 0.2s;

    &:hover {
      filter: brightness(0.9);
    }
  }
}

.tags-section {
  max-width: 1400px;
  margin: 0 auto 1rem;
  width: 100%;
}

.tags-container {
  background: var(--theme-card-bg);
  backdrop-filter: blur(12px);
  border-radius: 0.5rem;
  border: 1px solid var(--theme-card-border);
  padding: 0.75rem 1rem;
  width: 100%;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  padding: 0.375rem 0.75rem;
  background: var(--theme-surface);
  border: 1px solid var(--theme-card-border);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--theme-text-secondary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--theme-primary);
    border-color: var(--theme-primary);
  }

  &.active {
    background: rgba(236, 72, 153, 0.1);
    color: var(--theme-primary);
    font-weight: 500;
    border-color: var(--theme-primary);
  }
}

.tag-more {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.arrow-icon {
  width: 0.75rem;
  height: 0.75rem;
  transition: transform 0.2s;

  &.rotated {
    transform: rotate(180deg);
  }
}

.poll-section {
  max-width: 1400px;
  margin: 0 auto 1rem;
  width: 100%;
}

.content-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 0;

  @media (max-width: 767px) {
    padding: 1rem 0 0;
  }
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 5rem 0;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid var(--theme-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  &.small {
    width: 2rem;
    height: 2rem;
  }
}

.recommend-grid {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 767px) {
    flex-direction: column;
  }
}

.recommend-main {
  width: 50%;
  min-width: 300px;
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 16 / 9;

  @media (max-width: 767px) {
    width: 100%;
    min-width: unset;
  }

  @media (min-width: 1367px) {
    width: 40%;
  }
}

.nsfw-blur {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px) scale(1.1);
}

.nsfw-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;

  &.small {
    gap: 0.25rem;
  }

  span {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    font-weight: 500;
  }
}

.shield-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: rgba(255, 255, 255, 0.8);

  .small & {
    width: 1.5rem;
    height: 1.5rem;
  }
}

.recommend-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;

  .recommend-main:hover & {
    transform: scale(1.05);
  }
}

.ai-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 20;
  padding: 0.25rem 0.5rem;
  background: rgba(109, 40, 217, 0.9);
  backdrop-filter: blur(8px);
  color: white;
  font-size: 0.625rem;
  font-weight: 500;
  border-radius: 0.25rem;

  &.small {
    padding: 0.125rem 0.375rem;
    font-size: 0.5625rem;
  }
}

.recommend-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent, transparent);
}

.recommend-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;

  @media (max-width: 767px) {
    padding: 1rem;
  }

  h3 {
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    @media (max-width: 767px) {
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }
  }
}

.recommend-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
}

.recommend-side {
  width: 50%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: start;
  gap: 1rem;

  @media (max-width: 767px) {
    width: 100%;
  }

  @media (min-width: 1367px) {
    width: 60%;
    grid-template-columns: repeat(3, 1fr);
  }
}

.recommend-card {
  background: var(--theme-card-bg);
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%;
  overflow: hidden;
}

.card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;

  .recommend-card:hover & {
    transform: scale(1.05);
  }
}

.type-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.card-info {
  padding: 0.75rem;

  h4 {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text);
    margin-bottom: 0.5rem;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;

    .recommend-card:hover & {
      color: var(--theme-primary);
    }
  }
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
}

.views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.eye-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
}

.card-tags {
  display: flex;
  gap: 0.25rem;
}

.card-tag {
  padding: 0.125rem 0.25rem;
  background: var(--theme-surface);
  border-radius: 0.25rem;
  font-size: 0.625rem;
}

.more-recommend {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: start;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 767px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1367px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

.section-divider {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  margin-top: 2rem;

  h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--theme-text);
  }
}

.total-count {
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
}

.main-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: start;
  gap: 1rem;

  @media (max-width: 767px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1367px) {
    grid-template-columns: repeat(5, 1fr);
  }
}

.load-more-trigger {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.all-loaded {
  font-size: 0.875rem;
  color: var(--theme-text-secondary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
