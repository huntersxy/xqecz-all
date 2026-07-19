<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { formatTime } from '@/utils'
import type { Comment } from '@/types'

interface Props {
  comment: Comment
  replyTarget: Comment | null
  menuTarget: number | null
  level?: number
}

withDefaults(defineProps<Props>(), {
  level: 0,
})

const emit = defineEmits<{
  'select-reply': [comment: Comment]
  'toggle-menu': [id: number | null]
  'delete-comment': [id: number]
  'report-comment': [comment: Comment]
}>()

const userStore = useUserStore()
</script>

<template>
  <div
    class="flex gap-2 sm:gap-3 p-2 sm:p-3 bg-[var(--theme-card-bg)] rounded-lg border border-[var(--theme-card-border)]"
  >
    <div
      class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0"
    >
      <svg
        class="w-4 h-4 sm:w-5 sm:h-5 text-[var(--theme-primary)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
    <div class="flex-1 relative">
      <div class="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
        <span class="font-semibold text-sm theme-text">{{ comment.user?.username }}</span>
        <span class="text-xs theme-text-secondary">{{ formatTime(comment.created_at) }}</span>
        <button
          v-if="
            userStore.isLoggedIn &&
            (userStore.user?.is_admin || comment.user_id === userStore.user?.id)
          "
          class="ml-auto p-1 theme-text-secondary hover:theme-text transition-colors"
          @click.stop="emit('toggle-menu', comment.id)"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      <div class="text-xs sm:text-sm theme-text leading-relaxed">
        <div
          v-if="comment.parent"
          class="mb-1 p-1.5 bg-[var(--theme-hover-bg)] rounded text-xs theme-text-secondary border-l-2 border-[var(--theme-primary)]"
        >
          <span class="font-medium theme-text-secondary">{{ comment.parent.user?.username }}: </span
          >{{ comment.parent.text }}
        </div>
        <span>{{ comment.text }}</span>
      </div>

      <div class="mt-1 sm:mt-2">
        <button
          v-if="userStore.isLoggedIn"
          class="flex items-center gap-1 text-xs theme-text-secondary hover:text-[var(--theme-primary)] transition-colors"
          @click="emit('select-reply', comment)"
        >
          <svg
            class="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>回复</span>
        </button>
      </div>

      <div
        v-if="menuTarget === comment.id"
        class="absolute right-0 top-0 bg-[var(--theme-surface)] rounded-lg shadow-lg shadow-black/12 p-1 min-w-[120px] z-10"
      >
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-danger)] hover:bg-[var(--theme-danger)]/5 rounded"
          @click="emit('delete-comment', comment.id); emit('toggle-menu', null)"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          删除
        </button>
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/5 rounded"
          @click="emit('report-comment', comment); emit('toggle-menu', null)"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          举报
        </button>
      </div>

      <div
        v-if="comment.replies && comment.replies.length > 0"
        class="mt-2 sm:mt-3 pl-3 sm:pl-4 border-l-2 border-[var(--theme-primary)]/20"
      >
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :reply-target="replyTarget"
          :menu-target="menuTarget"
          :level="level + 1"
          @select-reply="(c) => emit('select-reply', c)"
          @toggle-menu="(id) => emit('toggle-menu', id)"
          @delete-comment="(id) => emit('delete-comment', id)"
          @report-comment="(c) => emit('report-comment', c)"
        />
      </div>
    </div>
  </div>
</template>
