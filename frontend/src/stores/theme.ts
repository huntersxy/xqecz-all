import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  getAllThemes,
  getDefaultTheme,
  getThemeMeta,
  applyThemeColors,
} from '@/composables/useThemeRegistry'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<string>(getDefaultTheme())
  const mode = ref<'light' | 'dark'>('light')

  function setTheme(theme: string) {
    currentTheme.value = theme
    try {
      localStorage.setItem('theme', theme)
      localStorage.setItem('theme_user_chosen', '1')
    } catch {}
  }

  function setMode(newMode: 'light' | 'dark') {
    mode.value = newMode
    try {
      localStorage.setItem('theme_mode', newMode)
    } catch {}
    applyTheme()
  }

  function toggleMode() {
    setMode(mode.value === 'light' ? 'dark' : 'light')
  }

  function applyTheme() {
    const meta = getThemeMeta(currentTheme.value)
    if (meta) {
      applyThemeColors(meta, mode.value)
    }

    const root = document.documentElement
    root.classList.remove('light', 'dark', 'theme-light', 'theme-dark')
    root.classList.add(mode.value, `theme-${mode.value}`)
  }

  try {
    const userChosen = localStorage.getItem('theme_user_chosen') === '1'
    const savedTheme = localStorage.getItem('theme')
    const savedMode = localStorage.getItem('theme_mode') as 'light' | 'dark' | null
    const validThemes = getAllThemes()

    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      mode.value = savedMode
    }

    if (userChosen && savedTheme && validThemes.some((t) => t.key === savedTheme)) {
      currentTheme.value = savedTheme
    } else {
      const isLargeScreen = window.innerWidth >= 1024
      currentTheme.value = isLargeScreen ? 'bilibiliStyle' : 'default'
    }
  } catch {
    // Privacy mode or localStorage unavailable
  }

  applyTheme()

  watch(
    [currentTheme, mode],
    () => {
      applyTheme()
    },
    { immediate: true },
  )

  return {
    currentTheme,
    mode,
    setTheme,
    setMode,
    toggleMode,
  }
})
