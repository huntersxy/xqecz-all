<script setup lang="ts">
import { pollApi } from '@/api'
import type { PollDetail } from '@/types'

const pollDetail = ref<PollDetail | null>(null)
const loading = ref(false)
const voting = ref(false)
const voted = ref(false)
const errorMessage = ref('')

const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']

async function loadLatestPoll() {
  try {
    loading.value = true
    errorMessage.value = ''
    const res = await pollApi.list()
    if (res.code === 200 && res.data.list.length > 0) {
      const latestPoll = res.data.list.reduce((prev, current) => {
        return new Date(prev.created_at) > new Date(current.created_at) ? prev : current
      })
      const detailRes = await pollApi.detail(latestPoll.id)
      if (detailRes.code === 200) {
        pollDetail.value = detailRes.data
        voted.value = detailRes.data.my_vote !== null
      }
    }
  } catch (error) {
    console.error('加载投票失败', error)
    errorMessage.value = '加载投票失败，请刷新重试'
  } finally {
    loading.value = false
  }
}

async function handleVote(optionIndex: number) {
  if (!pollDetail.value || voting.value || voted.value) return
  try {
    voting.value = true
    errorMessage.value = ''
    const res = await pollApi.vote(pollDetail.value.poll.id, optionIndex)
    if (res.code === 200) {
      pollDetail.value.my_vote = optionIndex
      pollDetail.value.vote_counts[optionIndex] =
        (pollDetail.value.vote_counts[optionIndex] || 0) + 1
      pollDetail.value.total_votes += 1
      pollDetail.value.poll.vote_count += 1
      voted.value = true
    } else {
      errorMessage.value = res.message || '投票失败'
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    console.error('投票失败:', err)
    errorMessage.value = err.response?.data?.message || err.message || '投票失败，请重试'
  } finally {
    voting.value = false
  }
}

const getPercentage = (count: number) => {
  if (!pollDetail.value || pollDetail.value.total_votes === 0) return 0
  return Math.round((count / pollDetail.value.total_votes) * 100)
}

const getColor = (index: number) => colors[index % colors.length]

onMounted(() => {
  loadLatestPoll()
})
</script>

<template>
  <section class="poll-component" aria-label="投票组件">
    <div v-if="loading" class="state-wrap" aria-live="polite">
      <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <p>加载投票中...</p>
    </div>

    <div v-else-if="pollDetail" class="poll-card">
      <h3 v-if="pollDetail.poll.title" class="poll-title" :id="`poll-title-${pollDetail.poll.id}`">
        投票：{{ pollDetail.poll.title }}
      </h3>

      <div
        class="tug-bar"
        role="radiogroup"
        :aria-labelledby="`poll-title-${pollDetail.poll.id}`"
        aria-label="投票选项"
      >
        <button
          v-for="(option, index) in pollDetail.poll.options"
          :key="index"
          @click="handleVote(index)"
          :disabled="voted || voting"
          class="tug-segment"
          :class="{
            'is-voted': pollDetail.my_vote === index,
            'is-first': index === 0,
            'is-last': index === pollDetail.poll.options.length - 1,
          }"
          :style="{
            width:
              (pollDetail.total_votes > 0
                ? getPercentage(pollDetail.vote_counts[index] || 0)
                : 100 / pollDetail.poll.options.length) + '%',
            background: getColor(index),
          }"
          role="radio"
          :aria-checked="pollDetail.my_vote === index"
          :aria-label="`${option}，得票率 ${getPercentage(pollDetail.vote_counts[index] || 0)}%`"
        >
          <span class="tug-label">{{ option }}</span>
          <span v-if="pollDetail.total_votes > 0" class="tug-pct"
            >{{ getPercentage(pollDetail.vote_counts[index] || 0) }}%</span
          >
        </button>
      </div>

      <p class="poll-total-votes" aria-live="polite">
        总投票数：{{ pollDetail.total_votes }}
      </p>

      <div v-if="errorMessage" class="error-msg" role="alert" aria-live="assertive">
        <img src="/icons/info.svg" alt="" class="error-msg-icon" aria-hidden="true" />
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <div v-else class="state-wrap">
      <svg
        class="state-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p>暂无投票</p>
    </div>
  </section>
</template>

<style scoped>
.poll-component {
  width: 100%;
}

.state-wrap {
  text-align: center;
  padding: 20px 16px;
  color: var(--theme-text-secondary);
}

.spin-icon {
  width: 32px;
  height: 32px;
  margin-bottom: 10px;
  animation: poll-spin 1s linear infinite;
}

.state-icon {
  width: 32px;
  height: 32px;
  margin-bottom: 10px;
}

@keyframes poll-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.poll-card {
  width: 100%;
  background: var(--theme-card-bg);
  border: 1px solid var(--theme-card-border);
  border-radius: 10px;
  padding: 16px;
  box-sizing: border-box;
}

.poll-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--theme-text);
  margin: 0 0 10px 0;
  text-align: center;
}

.tug-bar {
  display: flex;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
}

.tug-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  transition:
    width 0.5s ease,
    filter 0.15s;
  min-width: 0;
  overflow: visible;
}

.tug-segment:not(:disabled):hover {
  filter: brightness(1.1) saturate(1.2);
}

.tug-segment:disabled {
  cursor: default;
}

.tug-segment.is-voted {
  filter: brightness(1.2) saturate(1.3);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.5);
}

.tug-segment.is-first {
  border-radius: 10px 0 0 10px;
}

.tug-segment.is-last {
  border-radius: 0 10px 10px 0;
}

.tug-label {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  line-height: 1.2;
  position: relative;
  z-index: 1;
}

.tug-pct {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  line-height: 1;
  flex-shrink: 0;
}

.error-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--theme-danger) 10%, transparent);
  border-radius: 8px;
  font-size: 13px;
  color: var(--theme-danger);
}

.error-msg-icon {
  width: 16px;
  height: 16px;
}

.poll-total-votes {
  font-size: 12px;
  color: var(--theme-text-secondary);
  text-align: center;
  margin: 8px 0 0 0;
}

@media screen and (max-width: 768px) {
  .tug-bar {
    height: 44px;
  }
  .tug-label {
    font-size: 14px;
  }
}
</style>
