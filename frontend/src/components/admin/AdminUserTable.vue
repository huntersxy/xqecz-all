<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useAdminStore } from '@/stores/admin'
import { ACTION_COL, SECONDARY_STYLE } from './adminColumns'
import { UserOutlined, DeleteOutlined, TeamOutlined, StopOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons-vue'
import { Tag, Tooltip, Modal, type TableColumnsType } from 'ant-design-vue'
import { useMediaQuery } from '@vueuse/core'

const userStore = useUserStore()
const admin = useAdminStore()
const isMobile = useMediaQuery('(max-width: 768px)')

const columns: TableColumnsType = [
  { title: '用户名', key: 'username', minWidth: 140 },
  { title: '角色', key: 'role', width: 100, align: 'center' },
  { title: '状态', key: 'status', width: 100, align: 'center' },
  { ...ACTION_COL },
]

function onTableChange(p: { current?: number }) {
  if (p.current) admin.loadUsers(p.current)
}

function doRole(id: number, isAdmin: boolean) {
  Modal.confirm({
    title: isAdmin ? '取消管理员' : '设为管理员',
    content: isAdmin ? '确定取消该用户的管理员权限？' : '确定将该用户设为管理员？',
    async onOk() { if (await admin.updateUserRole(id, !isAdmin)) admin.loadUsers(admin.users.page) },
  })
}

function doBan(id: number, isBanned: boolean) {
  Modal.confirm({
    title: isBanned ? '解封' : '封禁',
    content: isBanned ? '确定解封该用户？' : '确定封禁该用户？',
    async onOk() { if (await admin.updateUserBan(id, !isBanned)) admin.loadUsers(admin.users.page) },
  })
}

function doDelete(id: number) {
  Modal.confirm({
    title: '删除用户', content: '确定删除该用户？此操作不可撤销。', okType: 'danger',
    async onOk() { if (await admin.deleteUser(id)) admin.loadUsers(admin.users.page) },
  })
}

onMounted(() => admin.loadUsers())
</script>

<template>
  <a-card :bordered="false" :body-style="{ padding: 0 }">
    <template #title>
      <div class="flex items-center justify-between">
        <span>用户管理</span>
        <span class="text-xs font-normal" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">共 {{ admin.users.total }} 位用户</span>
      </div>
    </template>

    <a-spin :spinning="admin.users.loading">
      <template v-if="!isMobile">
        <a-table :columns="columns" :data-source="admin.users.list" :pagination="{ current: admin.users.page, pageSize: admin.users.pageSize, total: admin.users.total, showSizeChanger: false }" row-key="id" size="middle" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'username'">
              <div class="flex items-center gap-2">
                <a-avatar size="small" :style="{ backgroundColor: 'var(--theme-primary)' }"><template #icon><UserOutlined /></template></a-avatar>
                <span class="font-medium">{{ record.username }}</span>
              </div>
            </template>
            <template v-if="column.key === 'role'">
              <Tag :color="record.is_admin ? 'blue' : 'default'">{{ record.is_admin ? '管理员' : '普通用户' }}</Tag>
            </template>
            <template v-if="column.key === 'status'">
              <Tag :color="record.is_banned ? 'red' : 'green'">{{ record.is_banned ? '已封禁' : '正常' }}</Tag>
            </template>
            <template v-if="column.key === 'actions'">
              <div v-if="record.id !== userStore.user?.id" class="action-group">
                <Tooltip :title="record.is_admin ? '取消管理员' : '设为管理员'"><a-button class="action-btn" size="small" @click="doRole(record.id, record.is_admin)"><TeamOutlined /></a-button></Tooltip>
                <template v-if="!record.is_admin">
                  <Tooltip :title="record.is_banned ? '解封' : '封禁'"><a-button class="action-btn" size="small" @click="doBan(record.id, record.is_banned)"><LockOutlined v-if="!record.is_banned" /><UnlockOutlined v-else /></a-button></Tooltip>
                  <Tooltip title="删除"><a-button class="action-btn" danger size="small" @click="doDelete(record.id)"><DeleteOutlined /></a-button></Tooltip>
                </template>
              </div>
              <span v-else class="text-xs" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">当前用户</span>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else>
        <div class="mobile-list">
          <div v-for="record in admin.users.list" :key="record.id" class="mobile-card">
            <div class="flex items-center gap-2 flex-wrap">
              <a-avatar size="small" :style="{ backgroundColor: 'var(--theme-primary)' }"><template #icon><UserOutlined /></template></a-avatar>
              <span class="text-sm font-medium">{{ record.username }}</span>
              <Tag :color="record.is_admin ? 'blue' : 'default'" size="small">{{ record.is_admin ? '管理员' : '普通用户' }}</Tag>
              <Tag v-if="record.is_banned" color="red" size="small">已封禁</Tag>
            </div>
            <div v-if="record.id !== userStore.user?.id" class="mobile-actions">
              <Tooltip :title="record.is_admin ? '取消管理员' : '设为管理员'">
                <a-button class="action-btn" size="small" @click="doRole(record.id, !!record.is_admin)"><TeamOutlined /></a-button>
              </Tooltip>
              <template v-if="!record.is_admin">
                <Tooltip :title="record.is_banned ? '解封' : '封禁'">
                  <a-button class="action-btn" size="small" @click="doBan(record.id, !!record.is_banned)"><StopOutlined /></a-button>
                </Tooltip>
                <Tooltip title="删除"><a-button class="action-btn" danger size="small" @click="doDelete(record.id)"><DeleteOutlined /></a-button></Tooltip>
              </template>
            </div>
            <span v-else class="text-xs mt-2 block" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">当前用户</span>
          </div>
          <a-empty v-if="admin.users.list.length === 0" description="暂无用户" />
        </div>
        <div v-if="admin.users.totalPages > 1" class="mobile-pagination">
          <a-pagination :current="admin.users.page" :total="admin.users.total" :page-size="admin.users.pageSize" :show-size-changer="false" size="small" @change="(p: number) => admin.loadUsers(p)" />
        </div>
      </template>
    </a-spin>
  </a-card>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.action-btn { @include action-btn; }
.action-group { @include action-group; }
.mobile-list { @include mobile-list; }
.mobile-card { @include mobile-card; }
.mobile-actions { @include mobile-actions; }
.mobile-pagination { @include mobile-pagination; }
</style>
