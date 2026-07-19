import { ref, computed } from 'vue'
import { useStorage, useDebounceFn } from '@vueuse/core'
import { contentApi } from '@/api'
import { useHomeStore } from '@/stores/home'

function handleSearch(onSearch: () => void) {
  const debouncedSearch = useDebounceFn(onSearch, 300)
  debouncedSearch()
}

export function useSearchFilter() {
  const homeStore = useHomeStore()

  const allTags = ref<string[]>([])
  const selectedTags = ref<string[]>(homeStore.selectedTags)
  const searchKeyword = ref(homeStore.searchKeyword)
  const selectedTypes = ref<string[]>(homeStore.selectedTypes)

  const cachedTags = useStorage<{ tags: string[]; date: string } | null>('home_tags_cache', null)

  const sortedTags = computed(() => {
    return [...allTags.value].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  })

  async function loadTags() {
    try {
      const today = new Date().toDateString()
      if (cachedTags.value?.date === today && Array.isArray(cachedTags.value?.tags)) {
        allTags.value = cachedTags.value.tags
        return
      }

      const res = await contentApi.getTags()
      if (res.code === 200) {
        allTags.value = res.data
        cachedTags.value = { tags: res.data, date: today }
      }
    } catch (error) {
      console.error('加载标签失败', error)
    }
  }

  function selectTag(tag: string, onFilterChange: () => void) {
    const index = selectedTags.value.indexOf(tag)
    if (index > -1) {
      selectedTags.value = []
    } else {
      selectedTags.value = [tag]
    }
    onFilterChange()
  }

  function selectType(type: string, onFilterChange: () => void) {
    const index = selectedTypes.value.indexOf(type)
    if (index > -1) {
      selectedTypes.value = []
    } else {
      selectedTypes.value = [type]
    }
    onFilterChange()
  }

  return {
    allTags,
    selectedTags,
    searchKeyword,
    selectedTypes,
    sortedTags,
    loadTags,
    selectTag,
    selectType,
    handleSearch,
  }
}
