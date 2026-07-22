import { Router } from 'express'
import {
  castVote,
  createPoll,
  decoratePoll,
  deletePoll,
  getPollRow,
  getVoteOption,
  listPolls,
  pollVoteCounts,
} from '../db/index.js'
import { parsePagination, parseTags } from '../util/pagination.js'
import { success, paginated, error } from '../util/response.js'
import { optionalAuth, requireAuth } from '../middleware/index.js'
import { randomToken } from '../util/security.js'
import { validate } from '../validation/validate.js'
import { pollCreateSchema, pollVoteSchema } from '../validation/schemas.js'

const router = Router()

function visitorId(req: import('express').Request, res: import('express').Response): string {
  let vid = req.cookies?.visitor_id as string | undefined
  if (!vid) {
    vid = randomToken(16)
    res.cookie('visitor_id', vid, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 365 * 24 * 60 * 60 * 1000 })
  }
  return vid
}

// list
router.get('/list', async (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = await listPolls(p.offset, p.limit)
  const list = await Promise.all(rows.map((r) => decoratePoll(r)))
  paginated(res, list, total, p.page, p.pageSize)
})

// detail (optional auth)
router.get('/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id)
  const row = await getPollRow(id)
  if (!row) return error(res, 404, '投票不存在')
  const counts = await pollVoteCounts(id)
  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
  let myVote: number | null = null
  if (req.user) myVote = await getVoteOption(id, req.user.uid, null)
  else myVote = await getVoteOption(id, null, req.cookies?.visitor_id || null)
  success(res, {
    poll: await decoratePoll(row),
    vote_counts: counts,
    total_votes: totalVotes,
    my_vote: myVote,
  })
})

// vote (optional auth)
router.post('/:id/vote', optionalAuth, validate(pollVoteSchema), async (req, res) => {
  const id = Number(req.params.id)
  const row = await getPollRow(id)
  if (!row) return error(res, 404, '投票不存在')
  const optionIndex = Number(req.body.option_index)
  const options: string[] = parseTags(row.options)
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length)
    return error(res, 400, '选项不存在')
  const vid = req.user ? null : visitorId(req, res)
  await castVote({ pollId: id, userId: req.user?.uid ?? null, visitorId: vid, optionIndex })
  const counts = await pollVoteCounts(id)
  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
  let myVote: number | null = null
  if (req.user) myVote = await getVoteOption(id, req.user.uid, null)
  else myVote = await getVoteOption(id, null, req.cookies?.visitor_id || null)
  const updatedRow = await getPollRow(id)
  success(res, {
    poll: await decoratePoll(updatedRow),
    vote_counts: counts,
    total_votes: totalVotes,
    my_vote: myVote,
  })
})

// create (auth)
router.post('/create', requireAuth, validate(pollCreateSchema), async (req, res) => {
  const { title, description, options } = req.body
  if (!title || !title.trim()) return error(res, 400, '投票标题不能为空')
  const opts = options as string[]
  if (opts.length < 2) return error(res, 400, '至少需要两个选项')
  const id = await createPoll({
    title: title.trim(),
    description: typeof description === 'string' ? description : '',
    options: opts,
    userId: req.user!.uid,
  })
  const row = await getPollRow(id)
  success(res, await decoratePoll(row!), '创建成功', 201)
})

// delete (auth, owner or admin)
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const row = await getPollRow(id)
  if (!row) return error(res, 404, '投票不存在')
  if (req.user!.uid !== row.user_id && !req.user!.is_admin)
    return error(res, 403, '无权删除该投票')
  await deletePoll(id)
  success(res, null, '已删除')
})

export default router
