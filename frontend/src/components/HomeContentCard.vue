<script setup lang="ts">
import { getImageUrl, getPreviewText } from '@/utils'
import type { Content } from '@/types'

interface Props {
  content: Content
  variant?: 'default' | 'dark' | 'liquidGlass'
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  compact: false,
})

defineEmits<{
  click: [content: Content]
}>()

const isDark = computed(() => props.variant === 'dark')
const isLiquid = computed(() => props.variant === 'liquidGlass')

const hasNsfw = computed(() =>
  props.content.tags?.some((t) => t.toLowerCase() === 'nsfw'),
)

const hasAi = computed(() =>
  props.content.tags?.some((t) => /ai/i.test(t)),
)

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalHeight > img.naturalWidth * 1.2) {
    img.style.objectPosition = '50% 8%'
  }
}
</script>

<template>
  <article
    @click="$emit('click', content)"
    @keydown.enter="$emit('click', content)"
    @keydown.space.prevent="$emit('click', content)"
    class="overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
    :class="[
      isLiquid
        ? 'glass-card hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] hover:border-white/30'
        : 'theme-card rounded-xl shadow-md hover:shadow-lg',
    ]"
    tabindex="0"
    :aria-label="`${content.title} - ${content.type === 'video' ? '视频' : content.type === 'image' ? '图片' : content.type === 'link' ? '链接' : '文字'}内容`"
  >
    <div class="relative w-full pt-[75%] overflow-hidden" :class="isLiquid ? 'bg-white/5' : 'theme-placeholder-bg'">
      <!-- NSFW 遮罩 -->
      <template v-if="hasNsfw && content.type !== 'text'">
        <img
          :src="getImageUrl(content.thumb)"
          :alt="content.type === 'link' ? '链接' : content.type === 'video' ? '视频封面' : '内容图片'"
          class="absolute top-0 left-0 w-full h-full object-cover blur-xl scale-110"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-10">
          <img src="/icons/shield.svg" alt="内容警告" class="w-10 h-10" />
          <span class="text-white/80 text-xs font-medium">不适合在工作期间访问</span>
        </div>
      </template>
      <template v-else-if="content.type !== 'text'">
        <img
          :src="getImageUrl(content.thumb)"
          :alt="content.type === 'link' ? '链接' : content.type === 'video' ? '视频封面' : '内容图片'"
          class="absolute top-0 left-0 w-full h-full object-cover"
          loading="lazy"
          @load="onImageLoad"
        />
        <div v-if="isDark" class="absolute inset-0 bg-black/35 pointer-events-none"></div>
      </template>
      <!-- AI 生成标签 -->
      <div v-if="hasAi" class="absolute top-2 left-2 z-20 px-2 py-0.5 bg-violet-600/80 backdrop-blur-sm text-white text-[10px] font-medium rounded" aria-label="AI生成内容">
        AI生成
      </div>
      <template v-if="content.type === 'video' && !hasNsfw">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 rounded-full flex items-center justify-center" :class="isDark ? 'z-[2]' : ''" aria-hidden="true">
          <img src="/icons/play.svg" alt="" class="w-5 h-5" />
        </div>
      </template>
      <template v-if="content.type === 'link'">
        <div class="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md" :class="isDark ? 'bg-gradient-to-br from-[#818cf8] to-[#c084fc] text-white z-[2]' : isLiquid ? 'bg-gradient-to-br from-[#22d3ee] to-[#38bdf8] text-[#082f49]' : 'bg-[var(--theme-primary)] text-[var(--theme-on-primary)] border-2 border-white/50'" aria-hidden="true">
          <img src="/icons/link.svg" alt="" class="w-4 h-4" />
        </div>
      </template>
      <template v-if="content.type === 'text'">
        <div class="absolute top-0 left-0 w-full h-full p-4 theme-surface flex items-center justify-center text-center" :class="isDark ? 'z-[2]' : ''">
          <p class="text-sm theme-text-secondary m-0 line-clamp-4">{{ getPreviewText(content.text || '暂无内容') }}</p>
        </div>
      </template>
    </div>
    <div class="p-3 sm:p-4" :class="isLiquid ? '' : ''">
      <h3 class="font-semibold mb-2 overflow-hidden text-ellipsis whitespace-nowrap" :class="[compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base', isLiquid ? 'text-white' : 'theme-text']">{{ content.title }}</h3>
      <div class="flex items-center gap-2 flex-wrap" :class="compact ? 'mb-1' : 'mb-2 sm:mb-2.5'">
        <span class="flex items-center gap-1 text-xs" :class="isLiquid ? 'text-white/90' : 'theme-text-secondary'">
          <img src="/icons/user-circle.svg" alt="" class="w-3.5 h-3.5" aria-hidden="true" />
          {{ content.user?.username }}
        </span>
        <template v-if="!compact">
          <div class="flex gap-1 flex-wrap">
            <span v-for="tag in content.tags" :key="tag" class="px-1.5 py-0.5 rounded text-xs" :class="isDark ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : isLiquid ? 'bg-[#fbbf24]/15 text-[#fbbf24]' : 'theme-surface theme-text-secondary'">{{ tag }}</span>
          </div>
        </template>
      </div>
      <div v-if="!compact" class="flex items-center gap-2">
        <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', content.type === 'video' ? (isLiquid ? 'bg-[#f87171]/15 text-[#f87171]' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]') : content.type === 'image' ? (isLiquid ? 'bg-[#34d399]/15 text-[#34d399]' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]') : content.type === 'link' ? (isLiquid ? 'bg-[#38bdf8]/15 text-[#38bdf8]' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]') : isLiquid ? 'bg-[#a78bfa]/15 text-[#a78bfa]' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]']">
          {{ content.type === 'video' ? '视频' : content.type === 'image' ? '图片' : content.type === 'link' ? '链接' : '文字' }}
        </span>
        <span class="flex items-center gap-1 text-xs theme-text-secondary">
          <img src="/icons/eye.svg" alt="" class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {{ content.view_count }}
        </span>
      </div>
      <div v-else class="flex gap-1">
        <span v-for="tag in content.tags.slice(0, 2)" :key="tag" class="px-1.5 py-0.5 rounded text-xs" :class="isLiquid ? 'bg-[#fbbf24]/15 text-[#fbbf24]' : isDark ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'theme-surface theme-text-secondary'">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>
