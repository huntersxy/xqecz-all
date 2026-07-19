import { ref, nextTick } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { contentApi } from '@/api'
import { RecommendContentSchema, type RecommendContent } from '@/types'

const TOTAL_PAGES = 6
const PER_PAGE = 16

export function useRecommendLoader() {
  const recommendContents = ref<RecommendContent[]>([])
  const recommendPage = ref(1)
  const recommendHint = ref('')

  const query = useQuery({
    queryKey: ['recommend', recommendPage] as const,
    queryFn: async () => {
      const res = await contentApi.recommend(PER_PAGE, recommendPage.value)
      if (res.code !== 200) {
        throw new Error(res.message || '加载推荐失败')
      }
      recommendContents.value = res.data.list.map((item) => RecommendContentSchema.parse(item))
      return res
    },
    enabled: false,
  })

  function loadRecommendContents(page?: number) {
    if (page !== undefined) {
      recommendPage.value = page
    }
    return query.refetch()
  }

  async function refreshRecommend() {
    if (query.isLoading.value) return

    const page = recommendPage.value >= TOTAL_PAGES ? 1 : recommendPage.value + 1
    recommendPage.value = page

    await query.refetch()
    await nextTick()
    const el =
      document.getElementById('recommend-section-liquid') ??
      document.getElementById('recommend-section-default')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return {
    recommendContents,
    isRecommendLoading: query.isLoading,
    recommendPage,
    maxRecommendPages: TOTAL_PAGES,
    recommendHint,
    loadRecommendContents,
    refreshRecommend,
  }
}
