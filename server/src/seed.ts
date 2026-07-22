import {
  countUsers,
  createUser,
  createContent,
  createPoll,
  createComment,
} from './db/index.js'
import { hashPassword } from './util/security.js'

// Seed a usable demo environment the first time the server boots with an empty DB.
export async function seedDemo(): Promise<void> {
  if ((await countUsers()) > 0) return

  const [adminHash, demoHash] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('demo123'),
  ])
  const adminId = await createUser('admin', adminHash, true)
  const demoId = await createUser('demo', demoHash, false)

  const samples: Array<{
    title: string
    type: 'text' | 'link' | 'image'
    content?: string
    url?: string
    tags: string[]
  }> = [
    {
      title: '欢迎来到小泉动漫二创站（Node 版）',
      type: 'text',
      content:
        '这是一个使用 Node.js + TypeScript + Express + Vue 3 实现的全栈版本。后端使用 MySQL + Redis，与 Go 版共享同一份数据和登录态。',
      tags: ['公告'],
    },
    {
      title: '二次创作投稿指南',
      type: 'text',
      content: '请遵守社区规范，原创优先，转载请注明出处。支持图片、视频、图文、链接四种类型。',
      tags: ['指南'],
    },
    {
      title: '推荐一个开源插画站点',
      type: 'link',
      url: 'https://example.com',
      tags: ['资源', '插画'],
    },
  ]

  const contentIds: number[] = []
  for (const s of samples) {
    contentIds.push(
      await createContent({
        title: s.title,
        type: s.type,
        content: s.content,
        url: s.url,
        tags: s.tags,
        userId: demoId,
        auditStatus: 'approved',
      }),
    )
  }

  // A sample poll.
  await createPoll({
    title: '你最喜欢哪种二创形式？',
    description: '投票看看大家的偏好',
    options: ['同人图', '剪辑视频', '同人文', 'MAD/AMV'],
    userId: adminId,
  })

  // A sample comment.
  await createComment({ contentId: contentIds[0], userId: demoId, text: 'Node 版跑起来了，很丝滑！' })

  console.log('[seed] demo data created: admin/admin123, demo/demo123')
}
