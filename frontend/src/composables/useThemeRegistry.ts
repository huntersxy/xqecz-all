import type { Component } from 'vue'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  text: string
  textSecondary: string
  surface: string
  cardBg: string
  cardBorder: string
  headerBg: string
  hoverBg: string
  placeholderBg: string
  overlayBg: string
  bgColor: string
  success: string
  warning: string
  danger: string
  onPrimary: string
  adminBg: string
  adminTextTertiary: string
}

export interface ThemeMeta {
  key: string
  name: string
  description: string
  category: 'mac' | 'large'
  previewColor: string
  performanceLabel?: string
  colors: {
    light: ThemeColors
    dark: ThemeColors
  }
}

export interface ThemeRegistration {
  meta: ThemeMeta
  component: () => Promise<{ default: Component }>
}

const themeRegistry = new Map<string, ThemeRegistration>()

export function registerTheme(registration: ThemeRegistration) {
  themeRegistry.set(registration.meta.key, registration)
}

export function getThemeMeta(key: string): ThemeMeta | undefined {
  return themeRegistry.get(key)?.meta
}

export function getThemeComponent(key: string) {
  return themeRegistry.get(key)?.component
}

export function getAllThemes(): ThemeMeta[] {
  return Array.from(themeRegistry.values()).map(r => r.meta)
}

export function getThemesByCategory(): Map<string, ThemeMeta[]> {
  const map = new Map<string, ThemeMeta[]>()
  const all = getAllThemes()
  for (const t of all) {
    const cat = t.category || 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(t)
  }
  return map
}

export const categoryLabels: Record<string, string> = {
  mac: 'MAC 风',
  large: '大屏专属',
}

export function getDefaultTheme(): string {
  return 'default'
}

export function applyThemeColors(meta: ThemeMeta, mode: 'light' | 'dark') {
  const colors = meta.colors[mode]
  const root = document.documentElement

  root.style.setProperty('--theme-primary', colors.primary)
  root.style.setProperty('--theme-secondary', colors.secondary)
  root.style.setProperty('--theme-accent', colors.accent)
  root.style.setProperty('--theme-text', colors.text)
  root.style.setProperty('--theme-text-secondary', colors.textSecondary)
  root.style.setProperty('--theme-surface', colors.surface)
  root.style.setProperty('--theme-card-bg', colors.cardBg)
  root.style.setProperty('--theme-card-border', colors.cardBorder)
  root.style.setProperty('--theme-header-bg', colors.headerBg)
  root.style.setProperty('--theme-hover-bg', colors.hoverBg)
  root.style.setProperty('--theme-placeholder-bg', colors.placeholderBg)
  root.style.setProperty('--theme-overlay-bg', colors.overlayBg)
  root.style.setProperty('--theme-bg-color', colors.bgColor)
  root.style.setProperty('--theme-success', colors.success)
  root.style.setProperty('--theme-warning', colors.warning)
  root.style.setProperty('--theme-danger', colors.danger)
  root.style.setProperty('--theme-on-primary', colors.onPrimary)
  root.style.setProperty('--admin-bg', colors.adminBg)
  root.style.setProperty('--admin-text-tertiary', colors.adminTextTertiary)
}

const themeModules = import.meta.glob<{ default: Component; themeMeta: ThemeMeta }>(
  '@/themes/*.vue',
  { eager: true },
)

Object.values(themeModules).forEach((mod) => {
  if (mod.themeMeta) {
    registerTheme({
      meta: mod.themeMeta,
      component: () => Promise.resolve(mod),
    })
  }
})
