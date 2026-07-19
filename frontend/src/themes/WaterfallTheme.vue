<script lang="ts">
import type { ThemeMeta } from '@/composables/useThemeRegistry'

export const themeMeta: ThemeMeta = {
  key: 'waterfall',
  name: '瀑布流',
  description: '无限滚动瀑布流，沉浸式图片体验',
  category: 'large',
  previewColor: '#8b5cf6',
  colors: {
    light: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      accent: '#f59e0b',
      text: '#1e1b4b',
      textSecondary: '#6b7280',
      surface: '#ffffff',
      cardBg: 'rgba(255, 255, 255, 0.9)',
      cardBorder: 'rgba(139, 92, 246, 0.12)',
      headerBg: '#f8f7ff',
      hoverBg: '#f5f3ff',
      placeholderBg: '#f3f4f6',
      overlayBg: 'rgba(255, 255, 255, 0.6)',
      bgColor: '#faf5ff',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      onPrimary: '#ffffff',
      adminBg: '#f5f3ff',
      adminTextTertiary: 'rgba(0, 0, 0, 0.4)',
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#c4b5fd',
      accent: '#fbbf24',
      text: '#f5f3ff',
      textSecondary: '#a1a1aa',
      surface: '#0c0a1d',
      cardBg: 'rgba(20, 18, 45, 0.9)',
      cardBorder: 'rgba(167, 139, 250, 0.12)',
      headerBg: '#1a1530',
      hoverBg: 'rgba(167, 139, 250, 0.08)',
      placeholderBg: '#1e1b4b',
      overlayBg: 'rgba(0, 0, 0, 0.6)',
      bgColor: '#050314',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
      onPrimary: '#ffffff',
      adminBg: '#0c0a1d',
      adminTextTertiary: 'rgba(255, 255, 255, 0.3)',
    },
  },
}
</script>

<script setup lang="ts">
import { useIntersectionObserver, useResizeObserver } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { contentApi } from '@/api'
import { useHomeStore } from '@/stores/home'
import { useThemeStore } from '@/stores/theme'
import { useRecommendLoader } from '@/composables/useRecommendLoader'
import { useSearchFilter } from '@/composables/useSearchFilter'
import { getImageUrl } from '@/utils'
import { CONTENT_TYPES, ContentSchema } from '@/types/schemas'
import type { Content, ListParams } from '@/types'

const router = useRouter()
const homeStore = useHomeStore()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.mode === 'dark')

const recommendLoader = useRecommendLoader()
const searchFilter = useSearchFilter()

const contentTypes = CONTENT_TYPES
const contentTypeLabels: Record<string, string> = {
  video: '视频',
  image: '图片',
  text: '图文',
  link: '链接',
}

const swapSections = computed(
  () =>
    searchFilter.selectedTags.value.length > 0 ||
    searchFilter.selectedTypes.value.length > 0 ||
    !!searchFilter.searchKeyword.value.trim(),
)

// ── 标签展开/收起 ──
const showMore = ref(false)
const maxVisibleTags = 15
const displayedTags = computed(() => {
  if (showMore.value) return searchFilter.sortedTags.value
  return searchFilter.sortedTags.value.slice(0, maxVisibleTags)
})
function toggleMore() {
  showMore.value = !showMore.value
}

// ── 数据状态 ──
const allContents = ref<Content[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const totalPages = ref(1)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const hasMore = computed(() => currentPage.value <= totalPages.value)

// ── v-viewer ──
const viewerImages = ref<string[]>([])
const viewerRef = ref<HTMLElement | null>(null)

// ── 哨兵 ──
const sentinelRef = ref<HTMLElement | null>(null)

// ── 瀑布流布局 ──
interface CardPosition {
  id: number
  x: number
  y: number
  width: number
  height: number
}

const masonryRef = ref<HTMLElement | null>(null)
const cardPositions = ref<CardPosition[]>([])
const containerHeight = ref(0)
const columnCount = ref(4)
const GAP = 10

function getColumnCount(): number {
  const w = window.innerWidth
  if (w >= 1400) return 5
  if (w >= 1024) return 4
  if (w >= 640) return 3
  return 2
}

function getCardWidth(): number {
  if (!masonryRef.value) return 200
  const containerWidth = masonryRef.value.offsetWidth
  const cols = columnCount.value
  return (containerWidth - GAP * (cols - 1)) / cols
}

// 只对新增的卡片计算位置，不影响已有卡片
function layoutNewCards() {
  if (!masonryRef.value || allContents.value.length === 0) return

  const cols = columnCount.value
  const cardW = getCardWidth()

  // 初始化列高度（从已有卡片的最高点继续）
  const colHeights = new Array(cols).fill(0)
  const existingMap = new Map<number, CardPosition>()
  for (const pos of cardPositions.value) {
    existingMap.set(pos.id, pos)
    const col = Math.round(pos.x / (cardW + GAP))
    if (col >= 0 && col < cols) {
      colHeights[col] = Math.max(colHeights[col], pos.y + pos.height + GAP)
    }
  }

  // 找出需要布局的新卡片
  const newItems = allContents.value.filter((item) => !existingMap.has(item.id))
  if (newItems.length === 0) return

  // 获取所有卡片 DOM
  const cardEls = masonryRef.value.querySelectorAll<HTMLElement>('[data-card-id]')
  const elMap = new Map<number, HTMLElement>()
  cardEls.forEach((el) => {
    const id = Number(el.dataset.cardId)
    if (id) elMap.set(id, el)
  })

  const newPositions: CardPosition[] = []

  for (const item of newItems) {
    const el = elMap.get(item.id)
    if (!el) continue

    // 找最短列
    let minCol = 0
    for (let i = 1; i < cols; i++) {
      if (colHeights[i] < colHeights[minCol]) minCol = i
    }

    const x = minCol * (cardW + GAP)
    const y = colHeights[minCol]
    const height = el.offsetHeight

    newPositions.push({ id: item.id, x, y, width: cardW, height })
    colHeights[minCol] = y + height + GAP
  }

  cardPositions.value.push(...newPositions)
  containerHeight.value = Math.max(...colHeights)
}

// 窗口 resize 时全部重新布局
function relayoutAll() {
  columnCount.value = getColumnCount()
  const cardW = getCardWidth()
  const cols = columnCount.value
  const colHeights = new Array(cols).fill(0)

  const newPositions: CardPosition[] = []

  nextTick(() => {
    if (!masonryRef.value) return
    const cardEls = masonryRef.value.querySelectorAll<HTMLElement>('[data-card-id]')
    const elMap = new Map<number, HTMLElement>()
    cardEls.forEach((el) => {
      const id = Number(el.dataset.cardId)
      if (id) elMap.set(id, el)
    })

    for (const item of allContents.value) {
      const el = elMap.get(item.id)
      if (!el) continue

      let minCol = 0
      for (let i = 1; i < cols; i++) {
        if (colHeights[i] < colHeights[minCol]) minCol = i
      }

      const x = minCol * (cardW + GAP)
      const y = colHeights[minCol]
      const height = el.offsetHeight

      newPositions.push({ id: item.id, x, y, width: cardW, height })
      colHeights[minCol] = y + height + GAP
    }

    cardPositions.value = newPositions
    containerHeight.value = Math.max(...colHeights)
  })
}

function getCardStyle(item: Content) {
  const pos = cardPositions.value.find((p) => p.id === item.id)
  if (!pos) {
    // 还没计算出来，先隐藏
    return { visibility: 'hidden' as const, position: 'absolute' as const }
  }
  return {
    position: 'absolute' as const,
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    width: `${pos.width}px`,
  }
}

// ── 数据加载 ──
function openViewer(content: Content) {
  if (content.type === 'image' && content.img) {
    viewerImages.value = [getImageUrl(content.img)]
    // 延迟触发，确保 DOM 已更新
    setTimeout(() => {
      const viewer = viewerRef.value
      if (viewer) {
        const imgs = viewer.querySelectorAll('img')
        if (imgs.length > 0) {
          imgs[0].click()
        }
      }
    }, 100)
  } else if (content.type === 'link' && content.url) {
    globalThis.open(content.url, '_blank')
  } else if (content.id) {
    homeStore.saveState({
      searchKeyword: searchFilter.searchKeyword.value,
      selectedTags: searchFilter.selectedTags.value,
      selectedTypes: searchFilter.selectedTypes.value,
      page: currentPage.value,
      recommendPage: recommendLoader.recommendPage.value,
      scrollPosition: globalThis.scrollY,
    })
    router.push(`/content/${content.id}`)
  }
}

async function fetchPage(page: number, append = false) {
  if (isLoading.value || isLoadingMore.value) return

  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    let res
    if (searchFilter.searchKeyword.value) {
      res = await contentApi.search(searchFilter.searchKeyword.value, {
        page,
        page_size: pageSize.value,
        tag: searchFilter.selectedTags.value.length > 0 ? searchFilter.selectedTags.value.join(',') : undefined,
        type: searchFilter.selectedTypes.value.length > 0 ? searchFilter.selectedTypes.value.join(',') : undefined,
      })
    } else {
      const params: ListParams = {
        page,
        page_size: pageSize.value,
        sort_by: 'created_at',
        order: 'desc',
      }
      if (searchFilter.selectedTags.value.length > 0) params.tag = searchFilter.selectedTags.value.join(',')
      if (searchFilter.selectedTypes.value.length > 0) params.type = searchFilter.selectedTypes.value.join(',')
      res = await contentApi.list(params)
    }

    if (res.code === 200) {
      const parsed = res.data.list.map((item: unknown) => ContentSchema.parse(item))
      total.value = res.data.total
      totalPages.value = res.data.total_page
      currentPage.value = page

      if (append) {
        allContents.value.push(...parsed)
      } else {
        allContents.value = parsed
        cardPositions.value = []
      }

      // 等 DOM 渲染完成后计算新卡片位置
      await nextTick()
      requestAnimationFrame(() => {
        layoutNewCards()
      })
    }
  } catch (e) {
    console.error('加载失败:', e)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

function resetAndLoad() {
  currentPage.value = 1
  allContents.value = []
  cardPositions.value = []
  containerHeight.value = 0
  fetchPage(1)
}

function selectTag(tag: string) {
  searchFilter.selectTag(tag, resetAndLoad)
}

function selectType(type: string) {
  searchFilter.selectType(type, resetAndLoad)
}

function handleSearch() {
  searchFilter.handleSearch(resetAndLoad)
}

function clearFilters() {
  searchFilter.selectedTags.value = []
  searchFilter.selectedTypes.value = []
  searchFilter.searchKeyword.value = ''
  resetAndLoad()
}

// 图片加载完成后更新该卡片高度
function onImageLoad(itemId: number, e: Event) {
  const img = e.target as HTMLImageElement
  const pos = cardPositions.value.find((p) => p.id === itemId)
  if (!pos || !masonryRef.value) return

  const cardEl = img.closest<HTMLElement>('[data-card-id]')
  if (!cardEl) return

  const newHeight = cardEl.offsetHeight
  if (Math.abs(newHeight - pos.height) < 2) return // 高度没变，跳过

  // 更新该卡片高度，后续卡片上移/下移
  pos.height = newHeight

  // 重新计算容器高度和后续卡片位置
  relayoutFromIndex(cardPositions.value.indexOf(pos))
}

// 从指定索引开始重新布局后续卡片
function relayoutFromIndex(startIdx: number) {
  if (!masonryRef.value) return

  const cols = columnCount.value
  const cardW = getCardWidth()
  const colHeights = new Array(cols).fill(0)

  // 先计算 startIdx 之前所有卡片的列高度
  for (let i = 0; i < startIdx; i++) {
    const pos = cardPositions.value[i]
    const col = Math.round(pos.x / (cardW + GAP))
    if (col >= 0 && col < cols) {
      colHeights[col] = Math.max(colHeights[col], pos.y + pos.height + GAP)
    }
  }

  // 重新布局 startIdx 及之后的卡片
  for (let i = startIdx; i < cardPositions.value.length; i++) {
    const pos = cardPositions.value[i]

    let minCol = 0
    for (let c = 1; c < cols; c++) {
      if (colHeights[c] < colHeights[minCol]) minCol = c
    }

    pos.x = minCol * (cardW + GAP)
    pos.y = colHeights[minCol]
    pos.width = cardW
    colHeights[minCol] = pos.y + pos.height + GAP
  }

  containerHeight.value = Math.max(...colHeights)
}

// ── 无限滚动 ──
useIntersectionObserver(
  sentinelRef,
  ([{ isIntersecting }]) => {
    if (isIntersecting && hasMore.value && !isLoading.value && !isLoadingMore.value) {
      fetchPage(currentPage.value + 1, true)
    }
  },
  { rootMargin: '200px' },
)

// ── 响应式：窗口变化时重新布局 ──
useResizeObserver(masonryRef, () => {
  relayoutAll()
})

function onMountedTheme() {
  columnCount.value = getColumnCount()

  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  if (navEntries.length > 0 && navEntries[0].type === 'reload') {
    homeStore.clearState()
  }

  if (homeStore.hasLoaded) {
    homeStore.restoreScroll()
    recommendLoader.recommendPage.value = homeStore.recommendPage
  }

  fetchPage(1)
  searchFilter.loadTags()
  recommendLoader.loadRecommendContents(recommendLoader.recommendPage.value)
}

onMounted(() => {
  onMountedTheme()
})
</script>

<template>
  <div class="wf-root">
    <!-- Hidden viewer -->
    <div ref="viewerRef" v-viewer="{ navbar: false }" class="hidden">
      <img v-for="(src, i) in viewerImages" :key="i" :src="src" />
    </div>

    <!-- 顶部栏 -->
    <header class="wf-topbar">
      <div class="wf-topbar-inner">
        <div class="wf-brand">
          <span class="wf-dot"></span>
          <span class="wf-dot wf-dot--y"></span>
          <span class="wf-dot wf-dot--g"></span>
          <span class="wf-brand-text">小泉二创站</span>
        </div>

        <div class="wf-search">
          <input
            v-model="searchFilter.searchKeyword.value"
            type="text"
            placeholder="搜索..."
            aria-label="搜索"
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch" aria-label="搜索按钮">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 筛选条 -->
    <div class="wf-filters-bar">
      <div :class="['wf-filters-scroll', { expanded: showMore }]">
        <button
          v-for="type in contentTypes"
          :key="type"
          :class="['wf-chip', { active: searchFilter.selectedTypes.value.includes(type) }]"
          @click="selectType(type)"
        >
          {{ contentTypeLabels[type] }}
        </button>
        <span class="wf-divider"></span>
        <button
          v-for="tag in displayedTags"
          :key="tag"
          :class="['wf-chip', { active: searchFilter.selectedTags.value.includes(tag) }]"
          @click="selectTag(tag)"
        >
          {{ tag }}
        </button>
        <button
          v-if="searchFilter.sortedTags.value.length > maxVisibleTags"
          class="wf-chip wf-chip--more"
          @click="toggleMore"
        >
          {{ showMore ? '收起' : '更多' }}
          <svg
            class="wf-more-arrow"
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

    <!-- 推荐区 -->
    <section v-if="!swapSections && recommendLoader.recommendContents.value.length > 0" class="wf-recommend">
      <div class="wf-recommend-head">
        <h2>✨ 精选推荐</h2>
        <button
          class="wf-reload"
          :disabled="recommendLoader.isRecommendLoading.value"
          @click="recommendLoader.refreshRecommend()"
        >
          {{ recommendLoader.isRecommendLoading.value ? '...' : '换一批' }}
        </button>
      </div>
      <div class="wf-recommend-scroll">
        <div
          v-for="item in recommendLoader.recommendContents.value"
          :key="item.id"
          class="wf-recommend-card"
          @click="openViewer(item as unknown as Content)"
        >
          <img
            v-if="item.type !== 'text'"
            :src="getImageUrl((item as any).img || item.thumb)"
            :alt="item.title"
            loading="lazy"
          />
          <div v-else class="wf-rec-text">{{ item.title }}</div>
          <div class="wf-rec-overlay">
            <span>{{ item.title }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 统计 -->
    <div class="wf-stats">
      <span v-if="total > 0">共 {{ total }} 件作品</span>
      <span v-if="swapSections" class="wf-filter-hint">
        筛选中 ·
        <button @click="clearFilters">清除</button>
      </span>
    </div>

    <!-- 瀑布流 -->
    <div class="wf-masonry-wrap">
      <!-- 首次加载 -->
      <div v-if="isLoading && allContents.length === 0" class="wf-center-state">
        <div class="wf-spinner-lg"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isLoading && allContents.length === 0" class="wf-center-state">
        <p>暂无内容</p>
      </div>

      <!-- 瀑布流容器 -->
      <div
        v-else
        ref="masonryRef"
        class="wf-masonry"
        :style="{ height: containerHeight > 0 ? containerHeight + 'px' : 'auto', position: 'relative' }"
      >
        <div
          v-for="item in allContents"
          :key="item.id"
          :data-card-id="item.id"
          class="wf-card"
          :style="getCardStyle(item)"
          @click="openViewer(item)"
          @keydown.enter="openViewer(item)"
          tabindex="0"
        >
          <!-- 图片/视频封面 -->
          <template v-if="item.type !== 'text'">
            <div class="wf-card-media">
              <img
                :src="getImageUrl(item.img || item.thumb)"
                :alt="item.title"
                loading="lazy"
                decoding="async"
                @load="onImageLoad(item.id, $event)"
              />
              <div v-if="item.type === 'video'" class="wf-play-btn">
                <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div v-if="item.tags?.some(t => /ai/i.test(t))" class="wf-badge-ai">AI</div>
              <div v-if="item.type === 'link'" class="wf-badge-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
            </div>
          </template>

          <!-- 纯文字卡片 -->
          <template v-else>
            <div class="wf-card-text-body">
              <p>{{ item.title }}</p>
            </div>
          </template>

          <!-- 底部信息 -->
          <div class="wf-card-info">
            <span class="wf-card-title">{{ item.title }}</span>
            <div class="wf-card-meta">
              <span class="wf-card-user">{{ item.user?.username }}</span>
              <span class="wf-card-views">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {{ item.view_count }}
              </span>
            </div>
            <div v-if="item.tags?.length" class="wf-card-tags">
              <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="wf-mini-tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="isLoadingMore" class="wf-loadmore">
        <div class="wf-spinner-sm"></div>
        <span>加载更多...</span>
      </div>

      <!-- 哨兵 -->
      <div ref="sentinelRef" class="wf-sentinel"></div>

      <!-- 到底了 -->
      <div v-if="!hasMore && allContents.length > 0" class="wf-end">
        <span>— 到底啦 —</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wf-root {
  min-height: 100vh;
  background: transparent;
  color: var(--theme-text);
}

/* ===== 顶栏 ===== */
.wf-topbar {
  position: relative;
  z-index: 100;
}

.wf-topbar-inner {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  gap: 1rem;
  background: var(--theme-header-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .wf-topbar-inner {
    padding: 0.625rem 0.75rem;
  }
}

.wf-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.wf-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--theme-primary);
  opacity: 0.8;

  &--y { background: var(--theme-accent); opacity: 0.7; }
  &--g { background: var(--theme-success); opacity: 0.6; }
}

.wf-brand-text {
  margin-left: 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--theme-text);
  letter-spacing: 0.02em;
}

.wf-search {
  display: flex;
  align-items: center;
  background: var(--theme-surface);
  border: 1px solid var(--theme-card-border);
  border-radius: 2rem;
  overflow: hidden;
  max-width: 360px;
  flex: 1;
  transition: all 0.3s ease;

  &:focus-within {
    border-color: var(--theme-primary);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
  }

  input {
    flex: 1;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    background: transparent;
    border: none;
    outline: none;
    color: var(--theme-text);

    &::placeholder { color: var(--theme-text-secondary); opacity: 0.6; }
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--theme-primary);
    border: none;
    cursor: pointer;
    color: #fff;
    flex-shrink: 0;
    transition: all 0.2s ease;

    svg { width: 1.125rem; height: 1.125rem; }
    &:hover { opacity: 0.9; }
  }
}

/* ===== 筛选条 ===== */
.wf-filters-bar {
  position: relative;
  z-index: 99;
}

.wf-filters-scroll {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--theme-header-bg);
  border-radius: 0 0 0.75rem 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-wrap: nowrap;

  &::-webkit-scrollbar { display: none; }

  &.expanded {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

@media (max-width: 768px) {
  .wf-filters-scroll {
    padding: 0.5rem 0.75rem;
    gap: 0.375rem;
    border-radius: 0;
  }
}

.wf-chip {
  flex-shrink: 0;
  padding: 0.375rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--theme-text-secondary);
  background: var(--theme-surface);
  border: 1px solid var(--theme-card-border);
  border-radius: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: var(--theme-primary);
    border-color: var(--theme-primary);
  }

  &.active {
    color: #fff;
    background: var(--theme-primary);
    border-color: transparent;
  }

  &--more {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--theme-primary);
    background: rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.2);

    &:hover {
      background: rgba(139, 92, 246, 0.15);
    }
  }
}

.wf-more-arrow {
  width: 0.875rem;
  height: 0.875rem;
  transition: transform 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

@media (max-width: 768px) {
  .wf-chip {
    padding: 0.3rem 0.75rem;
    font-size: 0.75rem;
  }
}

.wf-divider {
  width: 1px;
  height: 1.25rem;
  background: rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  margin: 0 0.25rem;
}

/* ===== 推荐横滚 ===== */
.wf-recommend {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem 1rem 0;
}

.wf-recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.625rem;

  h2 {
    font-size: 0.9375rem;
    font-weight: 700;
    margin: 0;
    color: var(--theme-text);
  }
}

.wf-reload {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  border: 1px solid var(--theme-card-border);
  background: var(--theme-surface);
  color: var(--theme-text-secondary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--theme-primary);
    color: var(--theme-primary);
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.wf-recommend-scroll {
  display: flex;
  gap: 0.625rem;
  overflow-x: auto;
  padding-bottom: 0.75rem;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.wf-recommend-card {
  flex-shrink: 0;
  width: 140px;
  height: 180px;
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  background: var(--theme-placeholder-bg);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }

  &:hover img { transform: scale(1.08); }

  .wf-rec-text {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0.75rem;
    font-size: 0.75rem;
    color: var(--theme-text-secondary);
    text-align: center;
  }
}

.wf-rec-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 0.5rem 0.5rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.3;

  span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* ===== 统计行 ===== */
.wf-stats {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0.625rem 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
}

.wf-filter-hint {
  button {
    background: none;
    border: none;
    color: var(--theme-primary);
    cursor: pointer;
    font-size: 0.75rem;
    text-decoration: underline;

    &:hover { opacity: 0.8; }
  }
}

/* ===== 瀑布流 ===== */
.wf-masonry-wrap {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0.75rem 0.75rem 3rem;

  @media (min-width: 640px) { padding: 1rem 1rem 3rem; }
}

.wf-masonry {
  position: relative;
  width: 100%;
}

.wf-card {
  border-radius: 0.625rem;
  overflow: hidden;
  background: var(--theme-surface);
  border: 1px solid var(--theme-card-border);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  }

  &:focus-visible {
    outline: 2px solid var(--theme-primary);
    outline-offset: 2px;
  }
}

.wf-card-media {
  position: relative;
  width: 100%;
  overflow: hidden;
  line-height: 0;
  /* 最小高度占位，防止卡片塌缩为0 */
  min-height: 80px;
  background: var(--theme-placeholder-bg);

  img {
    width: 100%;
    height: auto;
    display: block;
  }
}

.wf-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0.85;
  transition: opacity 0.2s;

  svg { width: 1.125rem; height: 1.125rem; margin-left: 2px; }

  .wf-card:hover & { opacity: 1; }
}

.wf-badge-ai {
  position: absolute;
  top: 0.375rem;
  left: 0.375rem;
  padding: 0.0625rem 0.375rem;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  background: rgba(139, 92, 246, 0.8);
  backdrop-filter: blur(4px);
  border-radius: 0.25rem;
}

.wf-badge-link {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  border-radius: 50%;

  svg { width: 0.875rem; height: 0.875rem; }
}

.wf-card-text-body {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  background: var(--theme-hover-bg);

  p {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--theme-text);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.wf-card-info {
  padding: 0.5rem 0.625rem 0.625rem;
}

.wf-card-title {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--theme-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0.25rem;
}

.wf-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.wf-card-user {
  font-size: 0.6875rem;
  color: var(--theme-text-secondary);
}

.wf-card-views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  color: var(--theme-text-secondary);

  svg { width: 0.75rem; height: 0.75rem; }
}

.wf-card-tags {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.375rem;
  flex-wrap: wrap;
}

.wf-mini-tag {
  font-size: 0.5625rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 1rem;
  background: var(--theme-hover-bg);
  color: var(--theme-text-secondary);
}

/* ===== 状态 ===== */
.wf-center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  color: var(--theme-text-secondary);

  p { font-size: 0.875rem; margin-top: 1rem; }
}

.wf-spinner-lg {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--theme-card-border);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: wf-spin 0.7s linear infinite;
}

.wf-spinner-sm {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--theme-card-border);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: wf-spin 0.7s linear infinite;
}

.wf-loadmore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  font-size: 0.8125rem;
  color: var(--theme-text-secondary);
}

.wf-sentinel {
  height: 1px;
}

.wf-end {
  text-align: center;
  padding: 2rem;
  font-size: 0.75rem;
  color: var(--theme-text-secondary);
  opacity: 0.6;
}

@keyframes wf-spin {
  to { transform: rotate(360deg); }
}
</style>
