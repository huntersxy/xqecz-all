<script setup lang="ts">
import { useAdminStore } from '@/stores/admin'
import { getImageUrl } from '@/utils'
import { ACTION_COL, CONTENT_COL, STATUS_COL, CLAIMER_COL, REASON_COL, SECONDARY_STYLE } from './adminColumns'
import { Tag, Tooltip, type TableColumnsType } from 'ant-design-vue'
import { useMediaQuery } from '@vueuse/core'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'

const admin = useAdminStore()
const isMobile = useMediaQuery('(max-width: 768px)')
const statusFilter = ref('')

const columns: TableColumnsType = [
  { ...CONTENT_COL },
  { ...CLAIMER_COL },
  { ...REASON_COL },
  { ...STATUS_COL },
  { ...ACTION_COL },
]

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: '待处理' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已拒绝' },
}

async function load() { admin.loadClaims(1, statusFilter.value || undefined) }
async function handleClaim(id: number, action: 'approve' | 'reject') { if (await admin.handleClaim(id, action)) load() }
function onTableChange(p: { current?: number }) { if (p.current) admin.loadClaims(p.current, statusFilter.value || undefined) }

onMounted(load)
</script>

<template>
  <a-card :bordered="false" :body-style="{ padding: 0 }">
    <template #title>
      <div class="flex items-center justify-between">
        <span>认领管理</span>
        <div class="flex items-center gap-3">
          <span class="text-xs font-normal" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">共 {{ admin.claims.total }} 条</span>
          <a-select :value="statusFilter || undefined" size="small" style="width:120px" @change="(v: string) => { statusFilter = v || ''; load() }">
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="pending">待处理</a-select-option>
            <a-select-option value="approved">已通过</a-select-option>
            <a-select-option value="rejected">已拒绝</a-select-option>
          </a-select>
        </div>
      </div>
    </template>

    <a-spin :spinning="admin.claims.loading">
      <template v-if="!isMobile">
        <a-table :columns="columns" :data-source="admin.claims.list" :pagination="{ current: admin.claims.page, pageSize: admin.claims.pageSize, total: admin.claims.total, showSizeChanger: false }" row-key="id" size="middle" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'content'">
              <div class="flex items-center gap-3">
                <div v-if="record.content?.type !== 'text' && record.content?.type !== 'link'" class="flex-shrink-0 w-12 h-9 rounded overflow-hidden bg-gray-100">
                  <img :src="getImageUrl(record.content?.thumb)" class="w-full h-full object-cover" loading="lazy" alt="" />
                </div>
                <Tooltip :title="record.content?.title || '未知内容'">
                  <span class="claim-title">{{ record.content?.title || '未知内容' }}</span>
                </Tooltip>
              </div>
            </template>
            <template v-if="column.key === 'claimer'"><span class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.user?.username }}</span></template>
            <template v-if="column.key === 'reason'"><span class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.reason }}</span></template>
            <template v-if="column.key === 'status'"><Tag :color="statusMap[record.status]?.color">{{ statusMap[record.status]?.label }}</Tag></template>
            <template v-if="column.key === 'actions'">
              <div v-if="record.status === 'pending'" class="action-group">
                <Tooltip title="通过"><a-button class="action-btn" type="primary" size="small" @click="handleClaim(record.id, 'approve')"><CheckOutlined /></a-button></Tooltip>
                <Tooltip title="拒绝"><a-button class="action-btn" danger size="small" @click="handleClaim(record.id, 'reject')"><CloseOutlined /></a-button></Tooltip>
              </div>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else>
        <div class="mobile-list">
          <div v-for="record in admin.claims.list" :key="record.id" class="mobile-card">
            <div class="claim-title mb-1">{{ record.content?.title || '未知内容' }}</div>
            <div class="flex items-center gap-2 flex-wrap" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">
              <span>{{ record.user?.username }}</span>
              <Tag :color="statusMap[record.status]?.color" size="small">{{ statusMap[record.status]?.label }}</Tag>
            </div>
            <div v-if="record.reason" class="text-sm mt-1.5" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.reason }}</div>
            <div v-if="record.status === 'pending'" class="mobile-actions">
              <Tooltip title="通过"><a-button class="action-btn" type="primary" size="small" @click="handleClaim(record.id, 'approve')"><CheckOutlined /></a-button></Tooltip>
              <Tooltip title="拒绝"><a-button class="action-btn" danger size="small" @click="handleClaim(record.id, 'reject')"><CloseOutlined /></a-button></Tooltip>
            </div>
          </div>
          <a-empty v-if="admin.claims.list.length === 0" description="暂无认领" />
        </div>
        <div v-if="admin.claims.totalPages > 1" class="mobile-pagination">
          <a-pagination :current="admin.claims.page" :total="admin.claims.total" :page-size="admin.claims.pageSize" :show-size-changer="false" size="small" @change="(p: number) => admin.loadClaims(p, statusFilter || undefined)" />
        </div>
      </template>
    </a-spin>
  </a-card>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.claim-title {
  @include text-primary;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  font-weight: 500;
}

.action-btn { @include action-btn; }
.action-group { @include action-group; }
.mobile-list { @include mobile-list; }
.mobile-card { @include mobile-card; }
.mobile-actions { @include mobile-actions; }
.mobile-pagination { @include mobile-pagination; }
</style>
