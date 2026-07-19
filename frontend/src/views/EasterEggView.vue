<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Content } from '@/types'
import { getImageUrl, getPreviewText } from '@/utils'
import qrcodeImg from '@/assets/qrcode.webp'

const router = useRouter()
const contents = ref<Content[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const showQrModal = ref(false)

const mysteryMembers = ref([
  {
    id: 1,
    avatar: '🐉',
    nickname: 'SCPLin',
    role: '成员',
    signature: '龙王',
    tags: ['ESFP', '话痨', '轻松活泼']
  },
  {
    id: 2,
    avatar: '📖',
    nickname: '东文闻妙喵',
    role: '成员',
    signature: '评论家',
    tags: ['INTJ', '深度分析', '严谨']
  },
  {
    id: 3,
    avatar: '💭',
    nickname: '折光记',
    role: '成员',
    signature: '沉默终结者',
    tags: ['ENTJ', '深度话题', '高回复']
  },
  {
    id: 4,
    avatar: '🔧',
    nickname: 'brief',
    role: '成员',
    signature: '技术专家',
    tags: ['ISTP', '技术宅', '低调']
  },
  {
    id: 5,
    avatar: '✨',
    nickname: '未闻的星间',
    role: '成员',
    signature: '互动达人',
    tags: ['ENFJ', '善于交流', '社交牛']
  },
  {
    id: 6,
    avatar: '😂',
    nickname: '黎旭',
    role: '成员',
    signature: '表情包军火库',
    tags: ['ISFP', '表情包大师', '活泼']
  },
  {
    id: 7,
    avatar: '🌙',
    nickname: '饮水思源',
    role: '成员',
    signature: '夜猫子',
    tags: ['INFP', '沉思者', '安静']
  },
  {
    id: 8,
    avatar: '☀️',
    nickname: 'ᴍɪɴɢ.',
    role: '成员',
    signature: '阳角',
    tags: ['ESTJ', '高冷', '影响力']
  }
])

const displayNumber = '1098940107'

async function copyNumber() {
  window.open('https://qun.qq.com/universal-share/share?ac=1&authKey=agCMbFW0oz7gtdv%2BZON30E2Ml/XHV8T88it3K5CUu3RyWR2/6ZowlelOJgGgHEzT&busi_data=eyJncm91cENvZGUiOiIxMDk4OTQwMTA3IiwidG9rZW4iOiJMeU9lclU1dVNiMGI1QmEvam9oNkFVbW1EU29VNDdKQ3QwdW4xb1lTei9GUS9MNmJ3QnhvV1NHdmZLallCK2U0IiwidWluIjoiMTgzMzUwNTk3MiJ9&data=ThBmm-0JfST_YYCUEq8TuTwHjyFzlWtiWU_Lqz2AA1EY_1oGQhG-jMIOaUXRbf_VxIVhRwRPatY9PHDlbFFXuNY7Z5ex-ceKTfli8ZFJSyY&svctype=5&tempid=h5_group_info', '_blank', 'noopener,noreferrer')
}

async function loadContents() {
  contents.value = []
  total.value = 0
  totalPages.value = 1
}

function goToDetail(content: Content) {
  const linkUrl = content.type === 'link' && content.url
  if (linkUrl) {
    window.open(linkUrl, '_blank', 'noopener,noreferrer')
    return
  }
  const id = content.id
  if (id) {
    router.push(`/content/${id}`)
  }
}

function goBack() {
  router.push('/')
}

function openQrModal() {
  showQrModal.value = true
}

function closeQrModal() {
  showQrModal.value = false
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadContents()
  }
}

onMounted(() => {
  loadContents()
})
</script>

<template>
  <div class="min-h-screen p-2 sm:p-5 flex justify-center">
    <div class="w-full max-w-[1200px] overflow-hidden bg-[var(--theme-surface)] rounded-xl shadow-lg shadow-black/5 border border-[var(--theme-card-border)]">
      <div class="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 theme-header-bg">
        <div class="w-3 h-3 rounded-full bg-[#ff5f57] mr-2"></div>
        <div class="w-3 h-3 rounded-full bg-[#febc2e] mr-2"></div>
        <div class="w-3 h-3 rounded-full bg-[#28c840] mr-4"></div>
        <div class="text-xs sm:text-sm theme-text-secondary font-medium">🎁 彩蛋空间</div>
      </div>

      <div class="p-4 sm:p-6">
        <div class="text-center mb-5 sm:mb-8">
          <div class="bg-gradient-to-br from-indigo-500/80 to-purple-500/80 rounded-xl p-4 sm:p-6 mb-4 sm:mb-5">
            <div class="text-4xl sm:text-6xl mb-2 sm:mb-3 animate-[bounce_2s_ease-in-out_infinite]">🎉</div>
            <h1 class="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">欢迎来到彩蛋空间</h1>
            <p class="text-sm text-white/80">你发现了一个隐藏的秘密区域！</p>
          </div>
          <button @click="goBack" class="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-[var(--theme-primary)] text-white rounded-lg text-sm font-medium hover:brightness-90 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            <span>返回主页</span>
          </button>
        </div>

        <div class="bg-[var(--theme-card-bg)] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-md shadow-black/8 border border-[var(--theme-card-border)]">
          <div class="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-[var(--theme-card-border)]">
            <h3 class="text-base sm:text-lg font-semibold theme-text mb-2">👋 关于我</h3>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed mb-2">大家好！我是 <strong class="theme-text">汐兮雨</strong>，一个小泉动漫的粉丝。</p>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed mb-2">在这里偷偷回答一下泉姐问为什么发私信的不是我，因为我之前发送过消息了发不了新的了😭</p>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed">欢迎关注我的社交平台：</p>
            <div class="flex flex-wrap gap-2 sm:gap-3 mt-2">
              <a href="https://space.bilibili.com/98560079" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-lg text-xs sm:text-sm theme-text hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 transition-all">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.54 4.46c-1.3-1.3-3.02-2-4.86-2H9.32c-1.84 0-3.56.7-4.86 2L.46 9.32c-1.3 1.3-2 3.02-2 4.86v1.36c0 1.84.7 3.56 2 4.86l4.86 4.86c1.3 1.3 3.02 2 4.86 2h1.36c1.84 0 3.56-.7 4.86-2l4.86-4.86c1.3-1.3 2-3.02 2-4.86v-1.36c0-1.84-.7-3.56-2-4.86l-4.86-4.86zM12 16.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/>
                </svg>
                <span>Bilibili</span>
              </a>
              <a href="https://github.com/huntersxy" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-lg text-xs sm:text-sm theme-text hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 transition-all">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>

          <div class="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-[var(--theme-card-border)]">
            <h3 class="text-base sm:text-lg font-semibold theme-text mb-2">🌟 关于小泉动漫</h3>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed">原创手绘✍️制作成本比较大，谢谢大家点赞关注！全村的希望！喜欢的宝子们，可以充电支持一下！每天不定期1～10000更新。</p>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed mt-1">欢迎关注小泉动漫的B站账号：</p>
            <div class="flex flex-wrap gap-2 sm:gap-3 mt-2">
              <a href="https://space.bilibili.com/3546778043419394" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-card-border)] rounded-lg text-xs sm:text-sm theme-text hover:bg-[var(--theme-hover-bg)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 transition-all">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.54 4.46c-1.3-1.3-3.02-2-4.86-2H9.32c-1.84 0-3.56.7-4.86 2L.46 9.32c-1.3 1.3-2 3.02-2 4.86v1.36c0 1.84.7 3.56 2 4.86l4.86 4.86c1.3 1.3 3.02 2 4.86 2h1.36c1.84 0 3.56-.7 4.86-2l4.86-4.86c1.3-1.3 2-3.02 2-4.86v-1.36c0-1.84-.7-3.56-2-4.86l-4.86-4.86zM12 16.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/>
                </svg>
                <span>小泉动漫</span>
              </a>
            </div>
          </div>

          <div>
            <h3 class="text-base sm:text-lg font-semibold theme-text mb-2">🎊 加入我们</h3>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed">小泉动漫二创的QQ交流群：小泉动漫同人二创群🎊📢！</p>
            <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-3 p-3 sm:p-4 bg-[var(--theme-card-bg)] rounded-xl border border-[var(--theme-card-border)]">
              <div class="relative cursor-pointer" @click="openQrModal">
                <img :src="qrcodeImg" alt="QQ群二维码" class="w-28 h-28 sm:w-32 sm:h-32 rounded-lg bg-white p-1 shadow-md" />
                <div class="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <svg class="w-6 h-6 text-white mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                    <path d="M11 8v6M8 11h6"/>
                  </svg>
                  <span class="text-xs text-white">查看大图</span>
                </div>
              </div>
              <div class="flex-1 w-full">
                <div class="flex items-center gap-2 sm:gap-3 mb-2">
                  <div class="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <svg class="w-6 h-6 theme-text" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                  </div>
                  <div>
                    <div class="font-semibold theme-text text-sm sm:text-base">小泉动漫同人二创群</div>
                    <div class="text-xs theme-text-secondary">欢迎加入一起交流</div>
                  </div>
                </div>
                <div class="flex items-center justify-center sm:justify-start gap-2 bg-[var(--theme-hover-bg)] rounded-lg px-3 py-2 mb-2">
                  <span class="text-xs theme-text-secondary">群号</span>
                  <span class="text-sm sm:text-base font-semibold theme-text font-mono">{{ displayNumber }}</span>
                </div>
                <button @click="copyNumber" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg text-sm font-medium hover:brightness-90 transition-all">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
                  </svg>
                  <span>加入群聊</span>
                </button>
              </div>
            </div>
            <p class="text-xs sm:text-sm theme-text-secondary leading-relaxed mt-3">期待你的加入，一起交流分享！🎉</p>
          </div>
        </div>

        <div class="mb-4 sm:mb-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-[var(--theme-card-bg)] rounded-xl border border-[var(--theme-card-border)]">
            <h2 class="text-base sm:text-lg font-semibold theme-text">👥 神秘群员</h2>
            <span class="text-xs sm:text-sm theme-text-secondary">共 {{ mysteryMembers.length }} 位</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div
              v-for="member in mysteryMembers"
              :key="member.id"
              class="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 p-3 bg-[var(--theme-card-bg)] rounded-xl border border-[var(--theme-card-border)] hover:shadow-lg hover:shadow-black/8 transition-all"
            >
              <div class="w-12 h-12 sm:w-13 sm:h-13 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-indigo-500/30">
                {{ member.avatar }}
              </div>
              <div class="flex-1 text-center sm:text-left">
                <div class="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h3 class="font-semibold theme-text text-sm">{{ member.nickname }}</h3>
                  <span v-if="member.role !== '成员'" :class="[member.role === '群主' ? 'bg-gradient-to-r from-pink-400 to-red-400' : 'bg-gradient-to-r from-blue-400 to-cyan-400']" class="px-2 py-0.5 rounded-full text-xs text-white font-medium">
                    {{ member.role }}
                  </span>
                </div>
                <p class="text-xs theme-text-secondary mb-2">{{ member.signature }}</p>
                <div class="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                  <span v-for="tag in member.tags" :key="tag" class="px-1.5 py-0.5 bg-[var(--theme-primary)]/10 rounded text-xs text-[var(--theme-primary)]">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-4 sm:mb-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 sm:mb-4 p-2 sm:p-3 bg-[var(--theme-card-bg)] rounded-xl border border-[var(--theme-card-border)]">
            <h2 class="text-base sm:text-lg font-semibold theme-text">神秘内容列表</h2>
            <span class="text-xs sm:text-sm theme-text-secondary">共 {{ total }} 条</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div
              v-for="content in contents"
              :key="content.id"
              @click="goToDetail(content)"
              class="overflow-hidden cursor-pointer bg-[var(--theme-card-bg)] rounded-xl border border-[var(--theme-card-border)] hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <div class="relative w-full pt-[56.25%] bg-[var(--theme-hover-bg)] overflow-hidden">
                <template v-if="content.type !== 'text' && content.type !== 'link'">
                  <img
                    :src="getImageUrl(content.thumb)"
                    :alt="content.type === 'video' ? '视频封面' : '内容图片'"
                    class="absolute top-0 left-0 w-full h-full object-cover"
                  />
                  <div v-if="content.type === 'video'" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 border-[var(--theme-card-border)]0 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </template>
                <template v-else>
                  <div class="absolute top-0 left-0 w-full h-full p-3 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-center">
                    <p class="text-xs theme-text-secondary line-clamp-4">{{ getPreviewText(content.text || '暂无内容') }}</p>
                  </div>
                </template>
              </div>
              <div class="p-3">
                <h3 class="text-sm font-semibold theme-text mb-2 overflow-hidden text-ellipsis whitespace-nowrap">{{ content.title }}</h3>
                <div class="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span class="flex items-center gap-1 text-xs theme-text-secondary">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    {{ content.user?.username }}
                  </span>
                  <div class="flex gap-1">
                    <span v-for="tag in (content.tags || [])" :key="tag" class="px-1.5 py-0.5 border-[var(--theme-card-border)] rounded text-xs theme-text-secondary">{{ tag }}</span>
                  </div>
                </div>
                <ContentTypeBadge :type="content.type" />
              </div>
            </div>
          </div>

          <div v-if="contents.length === 0" class="flex flex-col items-center py-8 sm:py-12 theme-text-secondary">
            <svg class="w-12 h-12 sm:w-16 sm:h-16 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <p class="text-sm">暂无彩蛋内容</p>
          </div>
        </div>

        <HomePagination v-if="totalPages > 1" :current-page="page" :total-pages="totalPages" @change="goToPage" />
      </div>

      <Teleport to="body">
        <div v-if="showQrModal" class="fixed inset-0 flex items-center justify-center bg-[var(--theme-hover-bg)]0 z-[1000]" @click="closeQrModal">
          <div class="bg-[var(--theme-surface)] rounded-xl p-4 sm:p-6 max-w-[90vw] max-h-[90vh] animate-[scaleIn_0.3s_ease]" @click.stop>
            <button @click="closeQrModal" class="float-right p-2 theme-text-secondary hover:text-[var(--theme-primary)] transition-colors">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div class="flex flex-col items-center">
              <img :src="qrcodeImg" alt="QQ群二维码" class="max-w-[400px] max-h-[70vh] w-full h-auto rounded-xl border-4 border-gray-100" />
              <div class="text-center mt-4">
                <p class="text-lg font-semibold theme-text">小泉动漫同人二创群</p>
                <p class="text-sm theme-text-secondary font-mono">QQ群号：{{ displayNumber }}</p>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>