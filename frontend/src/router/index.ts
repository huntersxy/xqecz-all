import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { createAsyncComponent } from '@/utils/asyncComponent'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: createAsyncComponent(() => import('../views/HomeView.vue')),
  },
  {
    path: '/easter-egg',
    name: 'easter-egg',
    component: createAsyncComponent(() => import('../views/EasterEggView.vue')),
  },
  {
    path: '/login',
    name: 'login',
    component: createAsyncComponent(() => import('../views/LoginView.vue')),
  },
  {
    path: '/content/:id',
    name: 'content-detail',
    component: createAsyncComponent(() => import('../views/ContentDetailView.vue')),
  },
  {
    path: '/admin',
    name: 'admin',
    component: createAsyncComponent(() => import('../views/AdminView.vue')),
    meta: { requiresAuth: true },
  },
  {
    path: '/theme',
    name: 'theme-settings',
    component: createAsyncComponent(() => import('../views/ThemeSettingsView.vue')),
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    await userStore.checkAuth()
    if (!userStore.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  // 注：/admin 同时承载「我的内容/上传/主题设置」(任意登录用户)
  // 与「审核/用户/投票等管理功能」(仅管理员)。
  // 管理员门禁已在 AdminView 组件级按 is_admin 隔离，此处不整体拦截，
  // 否则会误伤非管理员的正常功能。
})

interface PreloadTask {
  loader: () => Promise<unknown>
  priority: number
  delay: number
}

const preloadQueue: PreloadTask[] = [
  { loader: () => import('../views/ContentDetailView.vue'), priority: 1, delay: 2000 },
  { loader: () => import('../views/LoginView.vue'), priority: 2, delay: 4000 },
  { loader: () => import('../views/AdminView.vue'), priority: 3, delay: 6000 },
  { loader: () => import('../views/ThemeSettingsView.vue'), priority: 4, delay: 8000 },
]

function schedulePreload(task: PreloadTask) {
  const run = () => {
    task.loader().catch(() => {})
  }

  if ('requestIdleCallback' in globalThis) {
    globalThis.requestIdleCallback(() => {
      setTimeout(run, task.delay)
    })
  } else {
    setTimeout(run, task.delay + 2000)
  }
}

if (typeof globalThis !== 'undefined') {
  preloadQueue.sort((a, b) => a.priority - b.priority)
  preloadQueue.forEach(schedulePreload)
}

export default router
