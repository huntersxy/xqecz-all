<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useAdminStore } from '@/stores/admin'
import { getImageUrl } from '@/utils'
import { ACTION_COL, SECONDARY_STYLE } from './adminColumns'
import { Tag, Tooltip, type TableColumnsType } from 'ant-design-vue'
import { useMediaQuery } from '@vueuse/core'
import {
  PlayCircleOutlined, PictureOutlined, LinkOutlined, FileTextOutlined,
  EditOutlined, DeleteOutlined, SyncOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons-vue'

const props = defineProps<{ mode: 'my' | 'all' | 'pending' }>()
const userStore = useUserStore()
const admin = useAdminStore()
const isMobile = useMediaQuery('(max-width: 768px)')

const storeMap = { my: admin.myContent, all: admin.allContent, pending: admin.pendingContent }
const data = computed(() => storeMap[props.mode])

const columns = computed<TableColumnsType>(() => [
  { title: '类型', key: 'type', width: 80, align: 'center' },
  { title: '内容', key: 'content', width: 200 },
  { title: '标签', key: 'tags', width: 180 },
  { title: '作者', key: 'author', width: 100 },
  { ...ACTION_COL },
])

const typeMap: Record<string, { color: string; label: string; icon: Component }> = {
  video: { color: 'red', label: '视频', icon: PlayCircleOutlined },
  image: { color: 'green', label: '图片', icon: PictureOutlined },
  link: { color: 'orange', label: '链接', icon: LinkOutlined },
  text: { color: 'blue', label: '文字', icon: FileTextOutlined },
}
const auditMap: Record<string, { color: string; label: string }> = {
  approved: { color: 'success', label: '已通过' },
  pending: { color: 'warning', label: '审核中' },
  rejected: { color: 'error', label: '已拒绝' },
}

async function load(page = 1) {
  if (props.mode === 'my') admin.loadMyContent(page)
  else if (props.mode === 'all') admin.loadAllContent(page)
  else admin.loadPendingContent(page)
}
async function handleAudit(id: number, status: 'approved' | 'rejected') {
  if (!userStore.user) return
  if (await admin.auditContent(id, status, userStore.user.id)) load(data.value.page)
}
function handleDelete(id: number) { admin.confirmDelete(id, () => load(data.value.page)) }
async function handleRegenerate(id: number) { if (await admin.regenerateThumbnail(id)) load(data.value.page) }
function onTableChange(p: { current?: number }) { if (p.current) load(p.current) }

onMounted(load)
</script>

<template>
  <a-card :bordered="false" :body-style="{ padding: 0 }">
    <template #title>
      <div class="flex items-center justify-between">
        <span>{{ mode === 'my' ? '我的内容' : mode === 'pending' ? '待审核内容' : '所有内容' }}</span>
        <div class="flex items-center gap-3">
          <span class="text-xs font-normal" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">共 {{ data.total }} 条</span>
          <a-button v-if="mode === 'all'" size="small" @click="admin.regenerateAllThumbnails()"><SyncOutlined /> 批量生成缩略图</a-button>
        </div>
      </div>
    </template>

    <a-spin :spinning="data.loading">
      <template v-if="!isMobile">
        <a-table :columns="columns" :data-source="data.list" :pagination="{ current: data.page, pageSize: data.pageSize, total: data.total, showSizeChanger: false }" row-key="id" size="middle" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'content'">
              <div class="flex items-center gap-3">
                <div v-if="record.type !== 'text'" class="flex-shrink-0 w-12 h-9 rounded overflow-hidden bg-gray-100">
                  <img :src="getImageUrl(record.thumb)" class="w-full h-full object-cover" loading="lazy" alt="" />
                </div>
                <Tooltip :title="record.title || '无标题'"><span class="content-title">{{ record.title || '无标题' }}</span></Tooltip>
              </div>
            </template>
            <template v-if="column.key === 'author'"><span class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.user?.username }}</span></template>
            <template v-if="column.key === 'type'"><Tag :color="typeMap[record.type]?.color"><component :is="typeMap[record.type]?.icon" /> {{ typeMap[record.type]?.label }}</Tag></template>
            <template v-if="column.key === 'tags'">
              <div class="flex flex-wrap gap-1">
                <Tag v-for="tag in (record.tags || []).slice(0, 3)" :key="tag" :bordered="false" style="margin: 0">{{ tag }}</Tag>
                <Tooltip v-if="(record.tags || []).length > 3" :title="record.tags.slice(3).join(', ')"><Tag :bordered="false" style="margin: 0">+{{ record.tags.length - 3 }}</Tag></Tooltip>
              </div>
            </template>
            <template v-if="column.key === 'actions'">
              <div class="action-group">
                <Tooltip title="编辑"><a-button class="action-btn" size="small" @click="admin.openDrawer(record, 'edit')"><EditOutlined /></a-button></Tooltip>
                <Tooltip v-if="mode === 'pending'" title="通过"><a-button class="action-btn" type="primary" size="small" @click="handleAudit(record.id, 'approved')"><CheckOutlined /></a-button></Tooltip>
                <Tooltip v-if="mode === 'pending'" title="拒绝"><a-button class="action-btn" danger size="small" @click="handleAudit(record.id, 'rejected')"><CloseOutlined /></a-button></Tooltip>
                <Tooltip v-if="record.type === 'video'" title="更新封面"><a-button class="action-btn" size="small" @click="handleRegenerate(record.id)"><SyncOutlined /></a-button></Tooltip>
                <Tooltip title="删除"><a-button class="action-btn" danger size="small" @click="handleDelete(record.id)"><DeleteOutlined /></a-button></Tooltip>
              </div>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else>
        <div class="mobile-list">
          <div v-for="record in data.list" :key="record.id" class="mobile-card" @click="admin.openDrawer(record, 'view')">
            <div class="flex gap-2.5 items-start">
              <div v-if="record.type !== 'text'" class="flex-shrink-0 w-14 h-10.5 rounded overflow-hidden bg-gray-100"><img :src="getImageUrl(record.thumb)" class="w-full h-full object-cover" loading="lazy" alt="" /></div>
              <div class="flex-1 min-w-0">
                <div class="mobile-title">{{ record.title || '无标题' }}</div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <Tag :color="typeMap[record.type]?.color" size="small" :bordered="false" style="margin: 0">{{ typeMap[record.type]?.label }}</Tag>
                  <Tag v-if="record.audit_status && mode !== 'my'" :color="auditMap[record.audit_status]?.color" size="small" :bordered="false" style="margin: 0">{{ auditMap[record.audit_status]?.label }}</Tag>
                  <span v-if="mode !== 'my'" class="text-xs" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.user?.username }}</span>
                </div>
              </div>
            </div>
            <div class="mobile-actions" @click.stop>
              <Tooltip title="编辑"><a-button class="action-btn" size="small" @click="admin.openDrawer(record, 'edit')"><EditOutlined /></a-button></Tooltip>
              <Tooltip v-if="mode === 'pending'" title="通过"><a-button class="action-btn" type="primary" size="small" @click="handleAudit(record.id, 'approved')"><CheckOutlined /></a-button></Tooltip>
              <Tooltip v-if="mode === 'pending'" title="拒绝"><a-button class="action-btn" danger size="small" @click="handleAudit(record.id, 'rejected')"><CloseOutlined /></a-button></Tooltip>
              <Tooltip v-if="record.type === 'video'" title="更新封面"><a-button class="action-btn" size="small" @click="handleRegenerate(record.id)"><SyncOutlined /></a-button></Tooltip>
              <Tooltip title="删除"><a-button class="action-btn" danger size="small" @click="handleDelete(record.id)"><DeleteOutlined /></a-button></Tooltip>
            </div>
          </div>
          <a-empty v-if="data.list.length === 0" description="暂无内容" />
        </div>
        <div v-if="data.totalPages > 1" class="mobile-pagination">
          <a-pagination :current="data.page" :total="data.total" :page-size="data.pageSize" :show-size-changer="false" size="small" @change="(p: number) => load(p)" />
        </div>
      </template>
    </a-spin>
  </a-card>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.content-title {
  @include text-primary;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  font-weight: 500;
}

.action-btn { @include action-btn; }
.action-group { @include action-group; }
.mobile-list { @include mobile-list; }
.mobile-card {
  @include mobile-card;
  cursor: pointer;
  transition: border-color 0.2s;

  &:active {
    border-color: $admin-primary;
  }
}
.mobile-title {
  @include text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
  font-weight: 500;
}
.mobile-actions { @include mobile-actions; }
.mobile-pagination { @include mobile-pagination; }
</style>
