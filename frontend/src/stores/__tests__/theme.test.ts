import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore } from '../theme'
import { applyThemeColors } from '@/composables/useThemeRegistry'

// Mock useThemeRegistry
vi.mock('@/composables/useThemeRegistry', () => ({
  getAllThemes: vi.fn(() => [
    { key: 'default', name: '默认主题' },
    { key: 'bilibiliStyle', name: 'B站风格' },
  ]),
  getDefaultTheme: vi.fn(() => 'default'),
  getThemeMeta: vi.fn(() => ({
    key: 'default',
    name: '默认主题',
    colors: {
      light: {
        primary: '#3b82f6',
        text: '#1f2937',
      },
      dark: {
        primary: '#60a5fa',
        text: '#f3f4f6',
      },
    },
  })),
  applyThemeColors: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock window - default to small screen (< 1024) so getDefaultTheme returns 'default'
vi.stubGlobal('window', {
  innerWidth: 800,
})

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorageMock.getItem.mockReset()
    localStorageMock.getItem.mockReturnValue(null)
    // Reset window to small screen default
    vi.stubGlobal('window', { innerWidth: 800 })
  })

  it('should initialize with default theme', () => {
    const store = useThemeStore()
    expect(store.currentTheme).toBe('default')
  })

  it('should initialize with light mode', () => {
    const store = useThemeStore()
    expect(store.mode).toBe('light')
  })

  it('should set theme correctly', () => {
    const store = useThemeStore()
    store.setTheme('bilibiliStyle')

    expect(store.currentTheme).toBe('bilibiliStyle')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'bilibiliStyle')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme_user_chosen', '1')
  })

  it('should set mode correctly', () => {
    const store = useThemeStore()
    store.setMode('dark')

    expect(store.mode).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme_mode', 'dark')
  })

  it('should toggle mode correctly', () => {
    const store = useThemeStore()

    expect(store.mode).toBe('light')
    store.toggleMode()
    expect(store.mode).toBe('dark')
    store.toggleMode()
    expect(store.mode).toBe('light')
  })

  it('should load saved theme from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return 'bilibiliStyle'
      if (key === 'theme_user_chosen') return '1'
      if (key === 'theme_mode') return 'dark'
      return null
    })

    const store = useThemeStore()
    expect(store.currentTheme).toBe('bilibiliStyle')
    expect(store.mode).toBe('dark')
  })

  it('should use screen size to determine theme when no user choice', () => {
    localStorageMock.getItem.mockReturnValue(null)

    // Small screen → 'default'
    vi.stubGlobal('window', { innerWidth: 800 })
    const smallStore = useThemeStore()
    expect(smallStore.currentTheme).toBe('default')
  })

  it('should use bilibiliStyle on large screens', () => {
    localStorageMock.getItem.mockReturnValue(null)

    // Large screen (≥1024) → 'bilibiliStyle'
    vi.stubGlobal('window', { innerWidth: 1440 })
    const largeStore = useThemeStore()
    expect(largeStore.currentTheme).toBe('bilibiliStyle')
  })

  it('should handle invalid saved theme gracefully', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return 'invalid-theme'
      if (key === 'theme_user_chosen') return '1'
      return null
    })

    const store = useThemeStore()
    expect(store.currentTheme).toBe('default')
  })

  it('should handle invalid saved mode gracefully', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme_mode') return 'invalid-mode'
      return null
    })

    const store = useThemeStore()
    expect(store.mode).toBe('light')
  })

  it('should apply theme when mode changes', () => {
    const store = useThemeStore()

    store.setMode('dark')
    expect(vi.mocked(applyThemeColors)).toHaveBeenCalled()
  })

  it('should apply theme when theme changes', () => {
    const store = useThemeStore()

    store.setTheme('bilibiliStyle')
    expect(vi.mocked(applyThemeColors)).toHaveBeenCalled()
  })
})