import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHomeStore } from '../home'

// Mock window.scrollTo
const mockScrollTo = vi.fn()
vi.stubGlobal('window', { scrollTo: mockScrollTo })

describe('useHomeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const store = useHomeStore()

    expect(store.searchKeyword).toBe('')
    expect(store.selectedTags).toEqual([])
    expect(store.selectedTypes).toEqual([])
    expect(store.page).toBe(1)
    expect(store.recommendPage).toBe(1)
    expect(store.scrollPosition).toBe(0)
    expect(store.hasLoaded).toBe(false)
  })

  it('should save state correctly', () => {
    const store = useHomeStore()

    store.saveState({
      searchKeyword: 'test',
      selectedTags: ['tag1', 'tag2'],
      selectedTypes: ['video'],
      page: 2,
      recommendPage: 3,
      scrollPosition: 500,
    })

    expect(store.searchKeyword).toBe('test')
    expect(store.selectedTags).toEqual(['tag1', 'tag2'])
    expect(store.selectedTypes).toEqual(['video'])
    expect(store.page).toBe(2)
    expect(store.recommendPage).toBe(3)
    expect(store.scrollPosition).toBe(500)
    expect(store.hasLoaded).toBe(true)
  })

  it('should clear state correctly', () => {
    const store = useHomeStore()

    // First save some state
    store.saveState({
      searchKeyword: 'test',
      selectedTags: ['tag1'],
      selectedTypes: ['video'],
      page: 2,
      recommendPage: 3,
      scrollPosition: 500,
    })

    // Then clear
    store.clearState()

    expect(store.searchKeyword).toBe('')
    expect(store.selectedTags).toEqual([])
    expect(store.selectedTypes).toEqual([])
    expect(store.page).toBe(1)
    expect(store.recommendPage).toBe(1)
    expect(store.scrollPosition).toBe(0)
    expect(store.hasLoaded).toBe(false)
  })

  it('should restore scroll position when position > 0', () => {
    const store = useHomeStore()

    store.scrollPosition = 500
    store.restoreScroll()

    expect(mockScrollTo).toHaveBeenCalledWith(0, 500)
  })

  it('should not restore scroll position when position is 0', () => {
    const store = useHomeStore()

    store.scrollPosition = 0
    store.restoreScroll()

    expect(mockScrollTo).not.toHaveBeenCalled()
  })

  it('should update individual state properties', () => {
    const store = useHomeStore()

    store.searchKeyword = 'new search'
    expect(store.searchKeyword).toBe('new search')

    store.selectedTags.push('new-tag')
    expect(store.selectedTags).toEqual(['new-tag'])

    store.page = 5
    expect(store.page).toBe(5)
  })
})