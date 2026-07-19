<script setup lang="ts">
import { useAdminStore } from '@/stores/admin'
import { ACTION_COL, STATUS_COL, TIME_COL, SECONDARY_STYLE } from './adminColumns'
import { Tag, Tooltip, Modal, type TableColumnsType } from 'ant-design-vue'
import { useMediaQuery } from '@vueuse/core'
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons-vue'

const admin = useAdminStore()
const isMobile = useMediaQuery('(max-width: 768px)')

const columns: TableColumnsType = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60, align: 'center' },
  { title: '举报原因', key: 'reason', minWidth: 140 },
  { title: '被举报内容', key: 'content', minWidth: 160 },
  { title: '举报人', key: 'reporter', width: 100 },
  { ...STATUS_COL },
  { ...TIME_COL },
  { ...ACTION_COL },
]

function doHandle(id: number) {
  admin.handleReport(id).then(ok => { if (ok) admin.loadReports() })
}

function doDelete(commentId: number, reportId: number) {
  Modal.confirm({
    title: '删除评论', content: '确定删除？不可撤销。', okType: 'danger',
    async onOk() {
      if (await admin.deleteComment(commentId)) { await admin.handleReport(reportId); admin.loadReports() }
    },
  })
}

onMounted(() => admin.loadReports())
</script>

<template>
  <a-card :bordered="false" :body-style="{ padding: 0 }">
    <template #title>
      <div class="flex items-center justify-between">
        <span>举报管理</span>
        <span class="text-xs font-normal" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">共 {{ admin.reports.length }} 条</span>
      </div>
    </template>

    <a-spin :spinning="admin.reportsLoading">
      <template v-if="admin.reports.length === 0"><div style="padding: 24px"><a-empty description="暂无举报" /></div></template>
      <template v-else-if="!isMobile">
        <a-table :columns="columns" :data-source="admin.reports" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'reason'"><span class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.reason || '其他' }}</span></template>
            <template v-if="column.key === 'content'"><span class="text-sm italic" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.Comment?.text }}</span></template>
            <template v-if="column.key === 'reporter'"><span class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.User?.username }}</span></template>
            <template v-if="column.key === 'status'"><Tag :color="record.handled ? 'success' : 'warning'">{{ record.handled ? '已处理' : '待处理' }}</Tag></template>
            <template v-if="column.key === 'time'"><span class="text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.created_at }}</span></template>
            <template v-if="column.key === 'actions'">
              <div class="action-group">
                <Tooltip v-if="!record.handled" title="标记已处理"><a-button class="action-btn" type="primary" size="small" @click="doHandle(record.id)"><CheckOutlined /></a-button></Tooltip>
                <Tooltip title="删除评论"><a-button class="action-btn" danger size="small" @click="doDelete(record.comment_id, record.id)"><DeleteOutlined /></a-button></Tooltip>
              </div>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else>
        <div class="mobile-list">
          <div v-for="record in admin.reports" :key="record.id" class="mobile-card">
            <div class="text-sm font-medium" style="color: var(--theme-text); margin-bottom: 4px">{{ record.reason || '其他' }}</div>
            <div class="text-sm italic mb-1.5" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ record.Comment?.text }}</div>
            <div class="flex items-center gap-2 flex-wrap" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">
              <span>{{ record.User?.username }}</span>
              <Tag :color="record.handled ? 'success' : 'warning'" size="small">{{ record.handled ? '已处理' : '待处理' }}</Tag>
              <span>{{ record.created_at }}</span>
            </div>
            <div class="mobile-actions">
              <Tooltip v-if="!record.handled" title="标记已处理"><a-button class="action-btn" type="primary" size="small" @click="doHandle(record.id)"><CheckOutlined /></a-button></Tooltip>
              <Tooltip title="删除评论"><a-button class="action-btn" danger size="small" @click="doDelete(record.comment_id, record.id)"><DeleteOutlined /></a-button></Tooltip>
            </div>
          </div>
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
</style>
