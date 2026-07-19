<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { getThemesByCategory, categoryLabels } from '@/composables/useThemeRegistry'
import { SECONDARY_STYLE } from './adminColumns'
import { BgColorsOutlined, ThunderboltOutlined, CheckCircleFilled } from '@ant-design/icons-vue'

const themeStore = useThemeStore()
const themeCategories = computed(() => getThemesByCategory())

const allThemes = computed(() => {
  const list: { key: string; name: string; description: string; previewColor: string; performanceLabel?: string; category: string }[] = []
  for (const [cat, themes] of themeCategories.value) {
    for (const t of themes) list.push({ ...t, category: cat })
  }
  return list
})

function isSelected(key: string) { return themeStore.currentTheme === key }
function selectTheme(key: string) { themeStore.setTheme(key) }
</script>

<template>
  <div class="theme-settings">
    <a-card :bordered="false" size="small" class="mb-8">
      <div class="flex items-center gap-4">
        <div class="current-dot" :style="{ background: allThemes.find(t => t.key === themeStore.currentTheme)?.previewColor || 'var(--theme-primary)' }" />
        <div class="flex-1">
          <div class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">当前主题</div>
          <div class="text-base font-medium">{{ allThemes.find(t => t.key === themeStore.currentTheme)?.name || '默认' }}</div>
        </div>
        <a-tag color="blue" :bordered="false">已启用</a-tag>
      </div>
    </a-card>

    <a-card :bordered="false" size="small">
      <template #title>
        <div class="flex items-center gap-2"><BgColorsOutlined /> 显示模式</div>
      </template>
      <div class="flex gap-3">
        <a-button
          :type="themeStore.mode === 'light' ? 'primary' : 'default'"
          @click="themeStore.setMode('light')"
        >
          日间模式
        </a-button>
        <a-button
          :type="themeStore.mode === 'dark' ? 'primary' : 'default'"
          @click="themeStore.setMode('dark')"
        >
          暗色模式
        </a-button>
      </div>
    </a-card>

    <template v-for="[category, themes] in [...themeCategories]" :key="category">
      <div>
        <div class="category-header">
          <BgColorsOutlined />
          <span>{{ categoryLabels[category] || category }}</span>
        </div>

        <div class="theme-list">
          <div
            v-for="theme in themes"
            :key="theme.key"
            class="theme-row"
            :class="{ active: isSelected(theme.key) }"
            @click="selectTheme(theme.key)"
          >
            <div class="theme-row-left">
              <div class="theme-swatch" :style="{ background: `linear-gradient(135deg, ${theme.previewColor}, ${theme.previewColor}88)` }"></div>
              <div>
                <div class="theme-row-name">{{ theme.name }}</div>
                <div class="theme-row-desc">{{ theme.description }}</div>
              </div>
            </div>
            <div class="theme-row-right">
              <a-tag v-if="theme.performanceLabel" color="purple" :bordered="false" size="small">
                <ThunderboltOutlined /> {{ theme.performanceLabel }}
              </a-tag>
              <CheckCircleFilled v-if="isSelected(theme.key)" class="text-lg" style="color: var(--theme-primary)" />
              <div v-else class="theme-radio"></div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.theme-settings {
  display: flex;
  flex-direction: column;
  gap: $admin-gap-xl;
}

.category-header {
  @include section-header;
  margin-top: $admin-gap-lg;
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: $admin-gap-sm;
}

.theme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $admin-gap-md $admin-gap-lg;
  background: $admin-card-bg;
  border: 1px solid $admin-border;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--theme-primary);
  }

  &.active {
    border-color: $admin-primary;
    background: var(--theme-hover-bg);
  }
}

.theme-row-left {
  display: flex;
  align-items: center;
  gap: $admin-gap-md;
  flex: 1;
  min-width: 0;
}

.theme-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--theme-card-border);
}

.theme-row-name {
  @include text-primary;
  font-weight: 500;
}

.theme-row-desc {
  @include text-tertiary;
  margin-top: 2px;
}

.theme-row-right {
  display: flex;
  align-items: center;
  gap: $admin-gap-sm;
  flex-shrink: 0;
}

.theme-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--theme-card-border);
  transition: border-color 0.2s;

  .theme-row:hover & {
    border-color: var(--theme-primary);
  }
}

.current-dot {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--theme-card-border);
}
</style>
