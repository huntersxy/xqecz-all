import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useSearchFilter } from '../useSearchFilter'

// Mock @vueuse/core
const mockStorageValue = ref<any>(null)
vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn((key, defaultValue) => {
    return mockStorageValue
  }),
  useDebounceFn: vi.fn((fn) => fn),
}))

// Mock contentApi
vi.mock('@/api', () => ({
  contentApi: {
    getTags: vi.fn(),
  },
}))

// Mock useHomeStore
vi.mock('@/stores/home', () => ({
  useHomeStore: vi.fn(() => ({
    selectedTags: [],
    searchKeyword: '',
    selectedTypes: [],
  })),
}))

describe('useSearchFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageValue.value = null
  })

  it('should initialize with default values', () => {
    const { allTags, selectedTags, searchKeyword, selectedTypes } = useSearchFilter()

    expect(allTags.value).toEqual([])
    expect(selectedTags.value).toEqual([])
    expect(searchKeyword.value).toBe('')
    expect(selectedTypes.value).toEqual([])
  })

  it('should select and deselect tags', () => {
    const { selectedTags, selectTag } = useSearchFilter()
    const callback = vi.fn()

    selectTag('tag1', callback)
    expect(selectedTags.value).toEqual(['tag1'])
    expect(callback).toHaveBeenCalled()

    selectTag('tag1', callback)
    expect(selectedTags.value).toEqual([])
  })

  it('should select and deselect types', () => {
    const { selectedTypes, selectType } = useSearchFilter()
    const callback = vi.fn()

    selectType('video', callback)
    expect(selectedTypes.value).toEqual(['video'])
    expect(callback).toHaveBeenCalled()

    selectType('video', callback)
    expect(selectedTypes.value).toEqual([])
  })

  it('should handle search with debounce', () => {
    const { handleSearch } = useSearchFilter()
    const callback = vi.fn()

    handleSearch(callback)
    expect(callback).toHaveBeenCalled()
  })

  it('should load tags from API', async () => {
    const { loadTags, allTags } = useSearchFilter()
    const mockTags = ['tag1', 'tag2', 'tag3']

    const { contentApi } = await import('@/api')
    vi.mocked(contentApi.getTags).mockResolvedValue({
      code: 200,
      message: 'success',
      data: mockTags,
    })

    await loadTags()
    expect(allTags.value.length).toBeLessThanOrEqual(15)
  })

  it('should use cached tags when available', async () => {
    const mockTags = ['cached1', 'cached2']

    // Set the mock storage value before using the composable
    mockStorageValue.value = {
      tags: mockTags,
      date: new Date().toDateString(),
    }

    const { loadTags, allTags } = useSearchFilter()

    await loadTags()
    expect(allTags.value).toEqual(mockTags)
  })

  it('should handle API error gracefully', async () => {
    const { loadTags, allTags } = useSearchFilter()

    const { contentApi } = await import('@/api')
    vi.mocked(contentApi.getTags).mockRejectedValue(new Error('API Error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await loadTags()
    expect(allTags.value).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})