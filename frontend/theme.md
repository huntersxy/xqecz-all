# 主题开发指南

## 架构

**Sass + Tailwind CSS + 运行时注入**，一个主题一个 `.vue` 文件。

```
src/
├── themes/                    # 主题目录，自动扫描注册
│   ├── DefaultTheme.vue       # 默认主题（含 light/dark 颜色）
│   └── BilibiliStyleTheme.vue # Bilibili 风格
├── composables/
│   └── useThemeRegistry.ts    # 主题注册中心 + applyThemeColors
├── stores/
│   └── theme.ts               # 主题状态（currentTheme + mode）
└── assets/
    └── main.css               # Tailwind 入口 + 基础样式（不含主题变量）
```

## 创建新主题

在 `src/themes/` 创建 `XxxTheme.vue`，系统自动注册。

```vue
<script lang="ts">
import type { ThemeMeta } from '@/composables/useThemeRegistry'

export const themeMeta: ThemeMeta = {
  key: 'myTheme',
  name: '我的主题',
  description: '主题描述',
  category: 'mac',           // 'mac' | 'large'
  previewColor: '#3b82f6',
  colors: {
    light: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#ec4899',
      text: '#1f2937',
      textSecondary: '#6b7280',
      surface: '#ffffff',
      cardBg: '#ffffff',
      cardBorder: '#e5e7eb',
      headerBg: 'linear-gradient(to bottom, #f1f2f3, #f6f7f8)',
      hoverBg: '#f3f4f6',
      placeholderBg: '#f3f4f6',
      overlayBg: 'rgba(255,255,255,0.5)',
      bgColor: '#f5f5f5',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      onPrimary: '#ffffff',
      adminBg: '#f0f2f5',
      adminTextTertiary: 'rgba(0,0,0,0.45)',
    },
    dark: {
      // ... 暗色配色
    },
  },
}
</script>

<script setup lang="ts">
import { useHomeLogic } from '@/composables/useHomeLogic'
import { useThemeStore } from '@/stores/theme'

const { contents, isLoading, ... } = useHomeLogic()
const themeStore = useThemeStore()
const isDark = computed(() => themeStore.mode === 'dark')

onMounted(() => { onMountedHome() })
</script>

<template>
  <!-- 主题布局 -->
</template>

<style lang="scss" scoped>
// Sass 样式
</style>
```

**保存即生效，无需手动注册。**

## 颜色变量

| 变量 | 用途 |
|------|------|
| `primary` | 主色调（按钮、链接） |
| `text` / `textSecondary` | 文字颜色 |
| `surface` | 导航栏/卡片表面背景 |
| `cardBg` / `cardBorder` | 卡片背景/边框 |
| `hoverBg` | 悬浮背景 |
| `bgColor` | 页面底色 |
| `adminBg` / `adminTextTertiary` | 后台专用 |

## 日间/暗色切换

每个主题的 `colors` 包含 `light` 和 `dark` 两套配色。用户通过主题设置切换 `mode`，`applyThemeColors()` 运行时注入 CSS 变量。

## 后台管理

后台使用 antd 的 `ConfigProvider` + `darkAlgorithm`，antd 组件自动适配暗色。自定义样式通过 CSS 变量（`--theme-*`、`--admin-*`）跟随主题。

## Tailwind 中使用主题变量

```html
<div class="bg-[var(--theme-card-bg)] text-[var(--theme-text)]">
```
