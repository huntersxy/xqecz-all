<script setup lang="ts">
import { useConfirm } from '@/composables/useToast'

const { pendingConfirm, respond } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="pendingConfirm"
      class="fixed inset-0 flex items-center justify-center bg-black/50 z-[10001]"
      @click.self="respond(false)"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div class="w-[90%] sm:w-[400px] bg-[var(--theme-surface)] rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease]">
        <div class="flex justify-between items-center px-4 py-3 border-b border-[var(--theme-card-border)]">
          <h3 id="confirm-dialog-title" class="font-semibold theme-text">确认操作</h3>
          <button @click="respond(false)" class="theme-text-secondary hover:text-[var(--theme-primary)] text-xl leading-none" aria-label="关闭对话框">×</button>
        </div>
        <div class="p-4">
          <p id="confirm-dialog-message" class="text-sm theme-text">{{ pendingConfirm.message }}</p>
        </div>
        <div class="flex justify-end gap-3 px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-hover-bg)]">
          <button @click="respond(false)" class="px-4 py-2 text-sm theme-text hover:text-[var(--theme-primary)] transition-colors" aria-label="取消操作">取消</button>
          <button @click="respond(true)" class="px-4 py-2 bg-[var(--theme-danger)] text-white text-sm font-medium rounded-lg hover:brightness-90 transition-colors" aria-label="确认操作">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
