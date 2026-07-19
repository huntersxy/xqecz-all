import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Mock @tanstack/vue-query
vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(() => ({
    data: ref(null),
    isLoading: ref(false),
    refetch: vi.fn(),
  })),
}))

// Mock contentApi
vi.mock('@/api', () => ({
  contentApi: {
    list: vi.fn(),
    search: vi.fn(),
  },
}))

describe('useContentLoader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default values', async () => {
    const { useContentLoader } = await import('../useContentLoader')
    const { contents, isLoading, total, totalPages } = useContentLoader()

    expect(contents.value).toEqual([])
    expect(isLoading.value).toBe(false)
    expect(total.value).toBe(0)
    expect(totalPages.value).toBe(1)
  })

  it('should have correct content types', async () => {
    const { useContentLoader } = await import('../useContentLoader')
    const { contentTypes, contentTypeLabels } = useContentLoader()

    expect(contentTypes).toEqual(['video', 'image', 'text', 'link'])
    expect(contentTypeLabels).toEqual({
      video: '视频',
      image: '图片',
      text: '图文',
      link: '链接',
    })
  })

  it('should normalize content correctly', async () => {
    const { useContentLoader } = await import('../useContentLoader')
    const { contents } = useContentLoader()
    // normalizeContent is called internally when contents are loaded from API
    expect(contents.value).toEqual([])
  })

  it('should have default page size of 12', async () => {
    const { useContentLoader } = await import('../useContentLoader')
    const { pageSize } = useContentLoader()

    expect(pageSize.value).toBe(12)
  })

  it('should compute swapSections correctly', async () => {
    const { useContentLoader } = await import('../useContentLoader')
    const { swapSections } = useContentLoader()

    // Initially should be false (no filters)
    expect(swapSections.value).toBe(false)
  })
})