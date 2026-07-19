<script setup lang="ts">
import 'ant-design-vue/dist/reset.css'
import { theme as antTheme } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import { useAdminStore } from '@/stores/admin'
import { useThemeStore } from '@/stores/theme'
import { getThemeMeta } from '@/composables/useThemeRegistry'
import {
  UserOutlined, FileTextOutlined, EyeOutlined, HomeOutlined,
  TeamOutlined, BarChartOutlined, LinkOutlined, WarningOutlined,
  UploadOutlined, SettingOutlined, BgColorsOutlined, KeyOutlined,
} from '@ant-design/icons-vue'
import type { MenuProps } from 'ant-design-vue'

const userStore = useUserStore()
const admin = useAdminStore()
const themeStore = useThemeStore()
const mobileMenuOpen = ref(false)

const antThemeConfig = computed(() => {
  const meta = getThemeMeta(themeStore.currentTheme)
  const colors = meta?.colors[themeStore.mode]
  return {
    algorithm: themeStore.mode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: colors?.primary || '#3b82f6',
      borderRadius: 6,
    },
  }
})

const menuItems = computed<MenuProps['items']>(() => {
  const items: MenuProps['items'] = [
    { key: 'my', icon: () => h(FileTextOutlined), label: '我的内容' },
  ]
  if (userStore.user?.is_admin) {
    items.push(
      { key: 'pending', icon: () => h(EyeOutlined), label: '审核内容' },
      { key: 'all', icon: () => h(HomeOutlined), label: '所有内容' },
      { key: 'users', icon: () => h(TeamOutlined), label: '用户管理' },
      { key: 'polls', icon: () => h(BarChartOutlined), label: '投票管理' },
      { key: 'claims', icon: () => h(LinkOutlined), label: '认领管理' },
      { key: 'reports', icon: () => h(WarningOutlined), label: '举报管理' },
    )
  }
  items.push(
    { key: 'upload', icon: () => h(UploadOutlined), label: '上传内容' },
    { key: 'api-keys', icon: () => h(KeyOutlined), label: 'API 密钥' },
    { key: 'theme', icon: () => h(BgColorsOutlined), label: '主题设置' },
  )
  return items
})

const sectionTitle = computed(() => {
  const map: Record<string, string> = {
    my: '我的内容', upload: '上传内容', pending: '审核内容', all: '所有内容',
    users: '用户管理', polls: '投票管理', claims: '认领管理', reports: '举报管理',
    theme: '主题设置', 'api-keys': 'API 密钥',
  }
  return map[admin.activeTab] || ''
})

watch(() => admin.activeTab, () => { mobileMenuOpen.value = false })

onMounted(() => { admin.loadTags() })
</script>

<template>
  <a-config-provider :theme="antThemeConfig">
    <a-layout class="admin-root">
      <a-layout-sider :width="220" breakpoint="md" :collapsed-width="0" :trigger="null" class="admin-sider">
        <div class="admin-logo">
          <SettingOutlined />
          <span>后台管理</span>
        </div>
        <a-menu
          mode="inline"
          :selected-keys="[admin.activeTab]"
          :items="menuItems"
          @click="(info: { key: string }) => admin.activeTab = info.key"
        />
      </a-layout-sider>

      <a-layout>
        <a-layout-header class="admin-header">
          <div class="admin-header-left">
            <a-button class="admin-menu-btn" type="text" @click="mobileMenuOpen = !mobileMenuOpen">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </a-button>
            <span class="admin-header-title">{{ sectionTitle }}</span>
          </div>
          <div class="admin-header-right">
            <a-avatar size="small" :style="{ backgroundColor: 'var(--theme-primary)' }">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <span class="admin-header-username">{{ userStore.user?.username }}</span>
          </div>
        </a-layout-header>

        <a-layout-content class="admin-content">
          <AdminContentTable v-if="admin.activeTab === 'my'" mode="my" />
          <AdminUploadPanel v-else-if="admin.activeTab === 'upload'" />
          <AdminContentTable v-else-if="admin.activeTab === 'pending' && userStore.user?.is_admin" mode="pending" />
          <AdminContentTable v-else-if="admin.activeTab === 'all' && userStore.user?.is_admin" mode="all" />
          <AdminUserTable v-else-if="admin.activeTab === 'users' && userStore.user?.is_admin" />
          <AdminPollPanel v-else-if="admin.activeTab === 'polls' && userStore.user?.is_admin" />
          <AdminClaimTable v-else-if="admin.activeTab === 'claims' && userStore.user?.is_admin" />
          <AdminReportTable v-else-if="admin.activeTab === 'reports' && userStore.user?.is_admin" />
          <AdminThemeSettings v-else-if="admin.activeTab === 'theme'" />
          <AdminApiKeys v-else-if="admin.activeTab === 'api-keys'" />
          <a-result
            v-else
            status="403"
            title="该页面仅管理员可见"
            sub-title="你当前账号没有访问此管理功能的权限。"
          />
        </a-layout-content>
      </a-layout>
    </a-layout>

    <a-drawer
      :open="mobileMenuOpen"
      placement="left"
      :closable="false"
      @close="mobileMenuOpen = false"
      :body-style="{ padding: 0 }"
      :width="240"
    >
      <a-menu
        mode="inline"
        :selected-keys="[admin.activeTab]"
        :items="menuItems"
        @click="(info: { key: string }) => { admin.activeTab = info.key; mobileMenuOpen = false }"
      />
    </a-drawer>

    <AdminContentDrawer />
  </a-config-provider>
</template>

<style lang="scss" scoped>
@use '@/components/admin/admin' as *;

.admin-root {
  min-height: calc(100vh - 48px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: $admin-text;
  background: $admin-bg;
}

.admin-sider {
  background: $admin-card-bg !important;
  border-right: 1px solid $admin-border;
  overflow-y: auto;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  font-size: 15px;
  font-weight: 600;
  color: $admin-text;
  border-bottom: 1px solid $admin-border;
}

.admin-header {
  background: $admin-card-bg !important;
  padding: 0 24px !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid $admin-border;
  height: 56px !important;
  line-height: 56px !important;
}

.admin-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-header-title {
  font-size: 16px;
  font-weight: 600;
  color: $admin-text;
}

.admin-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-header-username {
  font-size: 14px;
  color: $admin-text-secondary;
}

.admin-menu-btn {
  display: none;
}

.admin-content {
  padding: 24px;
  overflow-y: auto;
}

:deep(.ant-layout-sider-zero-width-trigger) {
  display: none;
}

@media (max-width: 768px) {
  .admin-sider {
    display: none !important;
  }

  .admin-menu-btn {
    display: flex;
  }

  .admin-content {
    padding: 16px;
  }
}
</style>

<style>
.ant-card-head .ant-btn > .anticon + span,
.ant-card-head .ant-btn > span + .anticon {
  margin-left: 4px;
}

.ant-card-head .ant-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
