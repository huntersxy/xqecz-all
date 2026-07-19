<script setup lang="ts">
interface Props {
  tags: string[]
  selectedTags: string[]
  maxTags?: number
  allowCustom?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxTags: 30,
  allowCustom: false,
})

const emit = defineEmits<{
  toggle: [tag: string]
  add: [tag: string]
}>()

// 自定义标签输入
const customTagInput = ref('')
const showCustomInput = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

function handleAddCustom() {
  const trimmed = customTagInput.value.trim()
  if (!trimmed) return
  const allTags = new Set([...props.tags, ...props.selectedTags])
  if (allTags.has(trimmed)) {
    // 如果已存在，直接选中
    if (!props.selectedTags.includes(trimmed)) {
      emit('toggle', trimmed)
    }
  } else {
    emit('add', trimmed)
  }
  customTagInput.value = ''
  showCustomInput.value = false
}

function toggleCustomInput() {
  showCustomInput.value = !showCustomInput.value
  if (showCustomInput.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

// 预定义渐变色彩方案
const colorSchemes = [
  { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)', text: '#6366f1', hover: 'rgba(99, 102, 241, 0.2)' },
  { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.3)', text: '#ec4899', hover: 'rgba(236, 72, 153, 0.2)' },
  { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', hover: 'rgba(59, 130, 246, 0.2)' },
  { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981', hover: 'rgba(16, 185, 129, 0.2)' },
  { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', hover: 'rgba(245, 158, 11, 0.2)' },
  { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6', hover: 'rgba(139, 92, 246, 0.2)' },
  { bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.3)', text: '#14b8a6', hover: 'rgba(20, 184, 166, 0.2)' },
  { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', text: '#f97316', hover: 'rgba(249, 115, 22, 0.2)' },
]

// 选中状态的颜色
const selectedScheme = { bg: 'var(--admin-primary, #6366f1)', border: 'var(--admin-primary, #6366f1)', text: '#ffffff', hover: 'var(--admin-primary, #6366f1)' }

// 根据标签名称生成稳定的哈希值，用于确定大小和颜色
function getTagHash(tag: string): number {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

// 根据哈希值计算标签大小等级 (0-4)
function getSizeLevel(tag: string, index: number): number {
  const hash = getTagHash(tag)
  const combined = (hash + index * 7) % 100
  if (combined < 10) return 4
  if (combined < 25) return 3
  if (combined < 50) return 2
  if (combined < 80) return 1
  return 0
}

// 大小等级对应的 Tailwind 类
const sizeClasses: Record<number, string> = {
  0: 'text-xs px-2.5 py-1',
  1: 'text-[0.8rem] px-3 py-1.5',
  2: 'text-sm px-3.5 py-1.5',
  3: 'text-[0.95rem] px-4 py-[7px]',
  4: 'text-base px-[18px] py-2',
}

// 获取标签动态颜色样式（CSS 变量，无法用 Tailwind）
function getTagColorStyle(tag: string, index: number, isSelected: boolean) {
  const hash = getTagHash(tag)
  const colorScheme = isSelected ? selectedScheme : colorSchemes[hash % colorSchemes.length]
  return {
    '--tag-bg': colorScheme.bg,
    '--tag-border': colorScheme.border,
    '--tag-text': colorScheme.text,
    '--tag-hover': colorScheme.hover,
  }
}

// 计算标签动画延迟
function getAnimationDelay(index: number): string {
  return `${(index % 20) * 30}ms`
}

const displayTags = computed(() => props.tags.slice(0, props.maxTags))
</script>

<template>
  <div class="flex flex-wrap gap-2 p-1 min-h-[40px] sm:gap-1.5 lg:gap-2.5">
    <TransitionGroup name="tag-fade">
      <div
        v-for="(tag, index) in displayTags"
        :key="tag"
        :class="[
          'tag-item inline-flex items-center gap-1 rounded-full cursor-pointer select-none whitespace-nowrap font-medium tracking-wide relative overflow-hidden',
          'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md',
          'active:translate-y-0 active:scale-[0.98]',
          sizeClasses[getSizeLevel(tag, index)] ?? sizeClasses[1],
          { 'is-selected': selectedTags.includes(tag) },
        ]"
        :style="{ ...getTagColorStyle(tag, index, selectedTags.includes(tag)), animationDelay: getAnimationDelay(index) }"
        @click="emit('toggle', tag)"
      >
        <span v-if="selectedTags.includes(tag)" class="flex items-center text-current animate-[check-pop_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
          </svg>
        </span>
        <span class="leading-tight">{{ tag }}</span>
      </div>
    </TransitionGroup>

    <!-- 自定义标签输入 -->
    <template v-if="allowCustom">
      <div v-if="showCustomInput" class="custom-tag-input-wrap">
        <input
          ref="inputRef"
          v-model="customTagInput"
          type="text"
          class="custom-tag-input"
          placeholder="输入标签..."
          maxlength="20"
          @keydown.enter.prevent="handleAddCustom"
          @keydown.escape="showCustomInput = false"
          @blur="customTagInput.trim() ? handleAddCustom() : (showCustomInput = false)"
        />
      </div>
      <button
        v-else
        class="add-tag-btn"
        @click="toggleCustomInput"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
          <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
        </svg>
        <span>自定义标签</span>
      </button>
    </template>

    <div v-if="tags.length > maxTags" class="flex items-center px-3.5 py-1.5 text-xs text-[var(--theme-text-secondary)] opacity-70">
      +{{ tags.length - maxTags }} 更多标签...
    </div>
  </div>
</template>

<style lang="scss" scoped>
// 标签动态颜色（CSS 变量驱动，无法用 Tailwind 实现）
.tag-item {
  border: 1.5px solid var(--tag-border);
  background: var(--tag-bg);
  color: var(--tag-text);
  animation: tag-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover {
    background: var(--tag-hover);
    border-color: var(--tag-text);

    &::before {
      opacity: 1;
    }
  }

  &.is-selected {
    background: var(--tag-bg);
    border-color: var(--tag-text);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.1);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), transparent);
      pointer-events: none;
    }
  }
}

// 动画 keyframes
@keyframes tag-pop {
  0% {
    opacity: 0;
    transform: scale(0.6) translateY(8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes check-pop {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}

// TransitionGroup 动画
.tag-fade {
  &-enter-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &-leave-active {
    transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
  }

  &-enter-from {
    opacity: 0;
    transform: scale(0.8) translateY(4px);
  }

  &-leave-to {
    opacity: 0;
    transform: scale(0.9);
  }

  &-move {
    transition: transform 0.3s;
  }
}

// 响应式：移动端缩小（Tailwind 类已覆盖 sm:/lg: 断点，此处仅覆盖无法用 Tailwind 的动画部分）
@media (max-width: 640px) {
  .tag-item {
    font-size: 0.7rem !important;
    padding: 3px 8px !important;
  }
}

// 自定义标签输入
.custom-tag-input-wrap {
  display: inline-flex;
  align-items: center;
}

.custom-tag-input {
  width: 120px;
  padding: 5px 12px;
  font-size: 0.875rem;
  border: 1.5px solid var(--theme-card-border);
  border-radius: 20px;
  background: var(--theme-card-bg);
  color: var(--theme-text);
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: var(--admin-primary, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  &::placeholder {
    color: var(--theme-text-secondary);
    opacity: 0.5;
  }
}

.add-tag-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--admin-primary, #6366f1);
  background: transparent;
  border: 1.5px dashed var(--admin-primary, #6366f1);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
