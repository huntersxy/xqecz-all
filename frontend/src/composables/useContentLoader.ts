import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { contentApi } from '@/api'
import { CONTENT_TYPES, ContentSchema, type Content, type ListParams } from '@/types'

export function useContentLoader() {
  const pageSize = ref(12)

  const searchKeyword = ref('')
  const selectedTags = ref<string[]>([])
  const selectedTypes = ref<string[]>([])
  const page = ref(1)

  const contentTypes = CONTENT_TYPES
  const contentTypeLabels: Record<string, string> = {
    video: '视频',
    image: '图片',
    text: '图文',
    link: '链接',
  }

  const queryKey = computed(() => [
    'contents',
    {
      searchKeyword: searchKeyword.value,
      selectedTags: selectedTags.value,
      selectedTypes: selectedTypes.value,
      page: page.value,
      pageSize: pageSize.value,
    },
  ])

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let res
      if (searchKeyword.value) {
        res = await contentApi.search(searchKeyword.value, {
          page: page.value,
          page_size: pageSize.value,
          tag: selectedTags.value.length > 0 ? selectedTags.value.join(',') : undefined,
          type: selectedTypes.value.length > 0 ? selectedTypes.value.join(',') : undefined,
        })
      } else {
        const params: ListParams = {
          page: page.value,
          page_size: pageSize.value,
          sort_by: 'created_at',
          order: 'desc',
        }
        if (selectedTags.value.length > 0) params.tag = selectedTags.value.join(',')
        if (selectedTypes.value.length > 0) params.type = selectedTypes.value.join(',')
        res = await contentApi.list(params)
      }
      if (res.code !== 200) {
        throw new Error(res.message || '加载内容失败')
      }
      return res.data
    },
    enabled: false,
  })

  const contents = computed<Content[]>(() =>
    data.value?.list.map((item) => ContentSchema.parse(item)) ?? [],
  )
  const total = computed(() => data.value?.total ?? 0)
  const totalPages = computed(() => data.value?.total_page ?? 1)
  const swapSections = computed(
    () =>
      selectedTags.value.length > 0 ||
      selectedTypes.value.length > 0 ||
      !!searchKeyword.value.trim(),
  )


  async function loadContents(
    newSearchKeyword: string,
    newSelectedTags: string[],
    newSelectedTypes: string[],
    newPage: number,
  ) {
    searchKeyword.value = newSearchKeyword
    selectedTags.value = newSelectedTags
    selectedTypes.value = newSelectedTypes
    page.value = newPage
    await refetch()
  }

  return {
    contents,
    isLoading,
    contentKey: ref(0),
    pageSize,
    total,
    totalPages,
    swapSections,
    contentTypes,
    contentTypeLabels,
    loadContents,
  }
}
