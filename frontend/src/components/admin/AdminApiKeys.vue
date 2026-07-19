<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { apiKeyApi } from '@/api'
import type { ApiKey, ApiKeyCreated, CreateApiKeyData } from '@/types'

const loading = ref(false)
const keys = ref<ApiKey[]>([])
const showCreateModal = ref(false)
const showKeyModal = ref(false)
const createdKey = ref<ApiKeyCreated | null>(null)

// Create form
const newName = ref('')
const newPermissions = ref<string[]>(['upload'])
const allPermissions = [
  { label: '上传内容', value: 'upload' },
  { label: '读取内容', value: 'read' },
  { label: '删除内容', value: 'delete' },
]

async function loadKeys() {
  loading.value = true
  try {
    const res = await apiKeyApi.list()
    if (res.code === 200) {
      keys.value = res.data.list
    }
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!newName.value.trim()) {
    message.warning('请输入名称')
    return
  }
  if (newPermissions.value.length === 0) {
    message.warning('至少选择一个权限')
    return
  }

  const res = await apiKeyApi.create({
    name: newName.value.trim(),
    permissions: newPermissions.value,
  })
  if (res.code === 200) {
    createdKey.value = res.data as ApiKeyCreated
    showCreateModal.value = false
    showKeyModal.value = true
    newName.value = ''
    newPermissions.value = ['upload']
    loadKeys()
  }
}

async function handleDelete(id: number, name: string) {
  Modal.confirm({
    title: '撤销 API Key',
    content: `确定要撤销 "${name}" 吗？撤销后使用该 Key 的应用将立即无法访问。`,
    okText: '撤销',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await apiKeyApi.delete(id)
      message.success('已撤销')
      loadKeys()
    },
  })
}

async function toggleActive(key: ApiKey) {
  await apiKeyApi.update(key.id, { is_active: !key.is_active })
  message.success(key.is_active ? '已禁用' : '已启用')
  loadKeys()
}

function copyKey() {
  if (createdKey.value?.key) {
    navigator.clipboard.writeText(createdKey.value.key)
    message.success('已复制到剪贴板')
  }
}

function formatDate(ts: number | null) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

function permLabel(p: string) {
  const map: Record<string, string> = { upload: '上传', read: '读取', delete: '删除' }
  return map[p] || p
}

function permColor(p: string) {
  const map: Record<string, string> = { upload: 'blue', read: 'green', delete: 'red' }
  return map[p] || 'default'
}

onMounted(loadKeys)
</script>

<template>
  <div class="api-keys-panel">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">API 密钥管理</h3>
      <a-button type="primary" size="small" @click="showCreateModal = true">+ 新建密钥</a-button>
    </div>

    <p class="text-xs theme-text-secondary mb-4">
      API 密钥用于第三方应用接入。创建后请妥善保存完整密钥，之后将无法再次查看。
    </p>

    <a-spin :spinning="loading">
      <a-table
        :data-source="keys"
        :pagination="false"
        size="small"
        row-key="id"
        :scroll="{ x: 600 }"
      >
        <a-table-column title="名称" data-index="name" :width="120" />
        <a-table-column title="前缀" data-index="key_prefix" :width="100">
          <template #default="{ record }">
            <code class="text-xs">{{ record.key_prefix }}...</code>
          </template>
        </a-table-column>
        <a-table-column title="权限" :width="180">
          <template #default="{ record }">
            <a-tag v-for="p in record.permissions" :key="p" :color="permColor(p)" size="small">
              {{ permLabel(p) }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="状态" :width="80">
          <template #default="{ record }">
            <a-badge :status="record.is_active ? 'success' : 'default'" :text="record.is_active ? '启用' : '禁用'" />
          </template>
        </a-table-column>
        <a-table-column title="最后使用" :width="160">
          <template #default="{ record }">
            <span class="text-xs">{{ formatDate(record.last_used_at) }}</span>
          </template>
        </a-table-column>
        <a-table-column title="创建时间" :width="160">
          <template #default="{ record }">
            <span class="text-xs">{{ formatDate(record.created_at) }}</span>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="140" fixed="right">
          <template #default="{ record }">
            <a-space>
              <a-button size="small" @click="toggleActive(record)">
                {{ record.is_active ? '禁用' : '启用' }}
              </a-button>
              <a-button size="small" danger @click="handleDelete(record.id, record.name)">撤销</a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-spin>

    <!-- 新建弹窗 -->
    <a-modal v-model:open="showCreateModal" title="新建 API 密钥" @ok="handleCreate" ok-text="创建" cancel-text="取消">
      <a-form layout="vertical">
        <a-form-item label="名称" required>
          <a-input v-model:value="newName" placeholder="例如：我的上传工具" maxlength="100" />
        </a-form-item>
        <a-form-item label="权限" required>
          <a-checkbox-group v-model:value="newPermissions" :options="allPermissions" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 显示完整 Key 弹窗 -->
    <a-modal v-model:open="showKeyModal" title="API 密钥已创建" :footer="null">
      <div class="mb-3">
        <p class="text-sm mb-2">请保存以下密钥，<strong>关闭后将无法再次查看</strong>：</p>
        <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded">
          <code class="text-sm flex-1 break-all select-all">{{ createdKey?.key }}</code>
          <a-button size="small" @click="copyKey">复制</a-button>
        </div>
      </div>
      <div class="text-xs theme-text-secondary">
        <p>在请求头中添加：</p>
        <code>X-API-Key: {{ createdKey?.key }}</code>
      </div>
    </a-modal>
  </div>
</template>
