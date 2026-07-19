<script setup lang="ts">
import { useAdminStore } from '@/stores/admin'
import { SECONDARY_STYLE } from './adminColumns'
import { Tag, Modal } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'

const admin = useAdminStore()

function confirmDeletePoll(id: number) {
  Modal.confirm({
    title: '删除投票', content: '确定删除该投票？', okType: 'danger',
    async onOk() { await admin.deletePoll(id); admin.loadPolls() },
  })
}

onMounted(() => admin.loadPolls())
</script>

<template>
  <a-card :bordered="false" :body-style="{ padding: 0 }">
    <template #title>
      <div class="flex items-center justify-between">
        <span>投票管理</span>
        <div class="flex items-center gap-3">
          <span class="text-xs font-normal" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">共 {{ admin.polls.length }} 条</span>
          <a-button size="small" @click="admin.showCreatePollModal = true"><PlusOutlined /> 创建投票</a-button>
        </div>
      </div>
    </template>

    <a-spin :spinning="admin.pollsLoading">
      <div class="poll-list">
        <a-empty v-if="admin.polls.length === 0 && !admin.pollsLoading" description="暂无投票" />
        <a-card v-for="p in admin.polls" :key="p.id" size="small" class="poll-card">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex-1">
              <div class="text-base font-semibold mb-1" style="color: var(--theme-text)">{{ p.title }}</div>
              <div class="flex flex-wrap gap-2 text-xs sm:text-sm" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">
                <span>{{ p.vote_count }} 票</span>
                <span>{{ new Date(p.created_at).toLocaleString() }}</span>
              </div>
            </div>
            <a-button danger size="small" @click="confirmDeletePoll(p.id)"><DeleteOutlined /> 删除</a-button>
          </div>
          <div v-if="p.description" class="text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed" :style="{ color: SECONDARY_STYLE.split(': ')[1] }">{{ p.description }}</div>
          <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            <Tag v-for="(o, i) in p.options" :key="i" color="blue">{{ o }}</Tag>
          </div>
        </a-card>
      </div>
    </a-spin>
  </a-card>

  <a-modal v-model:open="admin.showCreatePollModal" title="创建投票" @ok="admin.createPoll">
    <a-form layout="vertical">
      <a-form-item label="投票标题" required><a-input v-model:value="admin.createPollForm.title" placeholder="请输入投票标题" /></a-form-item>
      <a-form-item label="投票描述"><a-textarea v-model:value="admin.createPollForm.description" :rows="3" placeholder="可选描述" /></a-form-item>
      <a-form-item label="投票选项" required>
        <div class="w-full space-y-2">
          <div v-for="(o, i) in admin.createPollForm.options" :key="i" class="flex gap-2 items-center">
            <a-input v-model:value="admin.createPollForm.options[i]" placeholder="选项内容" class="flex-1" />
            <a-button v-if="admin.createPollForm.options.length > 2" danger shape="circle" size="small" @click="admin.removePollOption(i)"><DeleteOutlined /></a-button>
          </div>
        </div>
        <a-button class="mt-2" size="small" @click="admin.addPollOption"><PlusOutlined /> 添加选项</a-button>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style lang="scss" scoped>
@use './admin' as *;

.poll-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 24px;
}

.poll-card {
  border-radius: 8px;
}
</style>
