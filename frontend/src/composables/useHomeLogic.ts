import { useRouter } from 'vue-router'
import { useHomeStore } from '@/stores/home'
import { useContentLoader } from './useContentLoader'
import { useRecommendLoader } from './useRecommendLoader'
import { useSearchFilter } from './useSearchFilter'
import { getImageUrl, formatTime, getPreviewText } from '@/utils'
import type { Content } from '@/types'

async function scrollToContent() {
  await nextTick()
  const el = document.getElementById('content-section-liquid') ?? document.getElementById('content-section-default')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalHeight > img.naturalWidth * 1.2) {
    img.style.objectPosition = '50% 8%'
  }
}

export function useHomeLogic() {
  const router = useRouter()
  const homeStore = useHomeStore()

  const contentLoader = useContentLoader()
  const recommendLoader = useRecommendLoader()
  const searchFilter = useSearchFilter()

  const page = ref(homeStore.page)

  async function loadContents() {
    await contentLoader.loadContents(
      searchFilter.searchKeyword.value,
      searchFilter.selectedTags.value,
      searchFilter.selectedTypes.value,
      page.value,
    )
  }

  function selectTag(tag: string) {
    searchFilter.selectTag(tag, () => {
      page.value = 1
      loadContents().then(scrollToContent)
    })
  }

  function selectType(type: string) {
    searchFilter.selectType(type, () => {
      page.value = 1
      loadContents().then(scrollToContent)
    })
  }

  function handleSearch() {
    searchFilter.handleSearch(() => {
      page.value = 1
      loadContents().then(scrollToContent)
    })
  }

  function goToDetail(content: Content) {
    const linkUrl = content.type === 'link' && content.url
    if (linkUrl) {
      globalThis.open(linkUrl, '_blank')
      return
    }
    if (content.id) {
      homeStore.saveState({
        searchKeyword: searchFilter.searchKeyword.value,
        selectedTags: searchFilter.selectedTags.value,
        selectedTypes: searchFilter.selectedTypes.value,
        page: page.value,
        recommendPage: recommendLoader.recommendPage.value,
        scrollPosition: globalThis.scrollY,
      })
      router.push(`/content/${content.id}`)
    }
  }

  function goToPage(p: number) {
    if (p >= 1 && p <= contentLoader.totalPages.value && !contentLoader.isLoading.value) {
      page.value = p
      loadContents().then(scrollToContent)
    }
  }

  function goToEasterEgg() {
    router.push('/easter-egg')
  }

  function onMountedHome() {
    const navigationEntries = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[]
    const isReload = navigationEntries.length > 0 && navigationEntries[0].type === 'reload'

    if (isReload) {
      homeStore.clearState()
    }

    if (homeStore.hasLoaded) {
      homeStore.restoreScroll()
      recommendLoader.recommendPage.value = homeStore.recommendPage
    }
    loadContents()
    searchFilter.loadTags()
    recommendLoader.loadRecommendContents(recommendLoader.recommendPage.value)
  }

  return {
    ...contentLoader,
    recommendContents: recommendLoader.recommendContents,
    isRecommendLoading: recommendLoader.isRecommendLoading,
    recommendPage: recommendLoader.recommendPage,
    recommendHint: recommendLoader.recommendHint,
    refreshRecommend: recommendLoader.refreshRecommend,
    loadRecommendContents: recommendLoader.loadRecommendContents,
    ...searchFilter,
    page,
    loadContents,
    selectTag,
    selectType,
    handleSearch,
    goToDetail,
    goToPage,
    goToEasterEgg,
    onMountedHome,
    getImageUrl,
    onImageLoad,
    formatTime,
    getPreviewText,
  }
}
