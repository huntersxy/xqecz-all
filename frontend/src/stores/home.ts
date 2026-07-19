import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHomeStore = defineStore('home', () => {
  // 搜索和筛选状态
  const searchKeyword = ref('')
  const selectedTags = ref<string[]>([])
  const selectedTypes = ref<string[]>([])
  const page = ref(1)
  
  // 推荐内容页码
  const recommendPage = ref(1)
  
  // 滚动位置
  const scrollPosition = ref(0)
  
  // 是否已经加载过数据（用于判断是否需要恢复状态）
  const hasLoaded = ref(false)

  // 保存状态
  function saveState(params: {
    searchKeyword: string
    selectedTags: string[]
    selectedTypes: string[]
    page: number
    recommendPage: number
    scrollPosition: number
  }) {
    searchKeyword.value = params.searchKeyword
    selectedTags.value = params.selectedTags
    selectedTypes.value = params.selectedTypes
    page.value = params.page
    recommendPage.value = params.recommendPage
    scrollPosition.value = params.scrollPosition
    hasLoaded.value = true
  }

  // 清除状态
  function clearState() {
    searchKeyword.value = ''
    selectedTags.value = []
    selectedTypes.value = []
    page.value = 1
    recommendPage.value = 1
    scrollPosition.value = 0
    hasLoaded.value = false
  }

  // 恢复滚动位置
  function restoreScroll() {
    if (scrollPosition.value > 0) {
      window.scrollTo(0, scrollPosition.value)
    }
  }

  return {
    searchKeyword,
    selectedTags,
    selectedTypes,
    page,
    recommendPage,
    scrollPosition,
    hasLoaded,
    saveState,
    clearState,
    restoreScroll
  }
})
