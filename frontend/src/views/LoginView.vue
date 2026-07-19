<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api'

const router = useRouter()
const userStore = useUserStore()

const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const message = ref('')
const messageType = ref<'error' | 'success'>('error')
const isLoading = ref(false)

async function handleSubmit() {
  isLoading.value = true
  message.value = ''

  try {
    if (isLoginMode.value) {
      const success = await userStore.login(username.value, password.value)
      if (success) {
        router.push('/')
      } else {
        message.value = '用户名或密码错误'
        messageType.value = 'error'
      }
    } else {
      const res = await authApi.register(username.value, password.value)
      if (res.code === 200) {
        message.value = '注册成功，请登录'
        messageType.value = 'success'
        isLoginMode.value = true
        username.value = ''
        password.value = ''
      } else {
        message.value = res.message || '注册失败'
        messageType.value = 'error'
      }
    }
  } catch {
    message.value = '网络错误，请稍后重试'
    messageType.value = 'error'
  } finally {
    isLoading.value = false
  }
}

function switchMode() {
  isLoginMode.value = !isLoginMode.value
  message.value = ''
  username.value = ''
  password.value = ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-[400px]">
      <!-- Logo -->
      <div class="text-center mb-6">
        <div class="w-14 h-14 mx-auto mb-3 bg-[var(--theme-primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--theme-primary)]/20">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 class="text-xl font-bold theme-text">
          {{ isLoginMode ? '欢迎回来' : '创建账号' }}
        </h1>
        <p class="text-sm theme-text-secondary mt-1">
          {{ isLoginMode ? '登录你的小泉动漫账号' : '注册以参与互动' }}
        </p>
      </div>

      <!-- Form card -->
      <div class="theme-card rounded-xl p-6 shadow-sm theme-border">
        <!-- Error/success message -->
        <div
          v-if="message"
          class="flex items-center gap-2 px-3 py-2.5 mb-4 rounded-lg text-sm"
          :class="messageType === 'error'
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'"
        >
          <svg v-if="messageType === 'error'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
          </svg>
          <span>{{ message }}</span>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Username -->
          <div>
            <label class="block text-sm font-medium theme-text-secondary mb-1.5">用户名</label>
            <input
              v-model="username"
              type="text"
              placeholder="请输入用户名"
              required
              minlength="3"
              maxlength="50"
              class="w-full px-3.5 py-2.5 text-sm theme-text theme-border rounded-lg theme-surface focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium theme-text-secondary mb-1.5">密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              required
              minlength="6"
              class="w-full px-3.5 py-2.5 text-sm theme-text theme-border rounded-lg theme-surface focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all"
            />
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2.5 text-sm font-semibold text-white bg-[var(--theme-primary)] rounded-lg hover:brightness-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isLoading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ isLoading ? '处理中...' : (isLoginMode ? '登录' : '注册') }}
          </button>
        </form>

        <!-- Switch mode -->
        <p class="mt-5 pt-4 border-t theme-border text-center text-sm theme-text-secondary">
          {{ isLoginMode ? '还没有账号？' : '已有账号？' }}
          <button
            @click="switchMode"
            class="font-semibold text-[var(--theme-primary)] hover:underline ml-0.5"
          >
            {{ isLoginMode ? '立即注册' : '去登录' }}
          </button>
        </p>
      </div>

      <!-- Back to home -->
      <div class="text-center mt-4">
        <button
          @click="router.push('/')"
          class="text-sm theme-text-secondary hover:text-[var(--theme-primary)] transition-colors inline-flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>
