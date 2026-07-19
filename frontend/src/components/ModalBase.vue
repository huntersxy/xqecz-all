<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('close')"
    >
      <div class="w-full max-w-lg bg-[var(--theme-surface)] rounded-xl shadow-2xl overflow-hidden border border-[var(--theme-card-border)]">
        <div class="flex justify-between items-center px-4 py-3 border-b border-[var(--theme-card-border)]">
          <h3 class="font-semibold theme-text">
            <slot name="title" />
          </h3>
          <button
            @click="$emit('close')"
            class="theme-text-secondary hover:text-[var(--theme-primary)] text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div class="p-4">
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="flex justify-end gap-3 px-4 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-hover-bg)]"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
