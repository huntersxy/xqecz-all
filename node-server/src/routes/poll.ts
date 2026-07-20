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
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { randomToken } from '../util/security.js'

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
router.get('/list', (req, res) => {
  const p = parsePagination(req.query.page, req.query.page_size, 20, 100)
  const { rows, total } = listPolls(p.offset, p.limit)
  paginated(
    res,
    rows.map((r) => decoratePoll(r)),
    total,
    p.page,
    p.pageSize,
  )
})

// detail (optional auth)
router.get('/:id', optionalAuth, (req, res) => {
  const id = Number(req.params.id)
  const row = getPollRow(id)
  if (!row) return error(res, 404, '投票不存在')
  const counts = pollVoteCounts(id)
  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
  let myVote: number | null = null
  if (req.user) myVote = getVoteOption(id, req.user.uid, null)
  else myVote = getVoteOption(id, null, req.cookies?.visitor_id || null)
  success(res, {
    poll: decoratePoll(row),
    vote_counts: counts,
    total_votes: totalVotes,
    my_vote: myVote,
  })
})

// vote (optional auth)
router.post('/:id/vote', optionalAuth, (req, res) => {
  const id = Number(req.params.id)
  const row = getPollRow(id)
  if (!row) return error(res, 404, '投票不存在')
  const optionIndex = Number(req.body?.option_index)
  const options: string[] = parseTags(row.options)
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length)
    return error(res, 400, '选项不存在')
  const vid = req.user ? null : visitorId(req, res)
  castVote({ pollId: id, userId: req.user?.uid ?? null, visitorId: vid, optionIndex })
  const counts = pollVoteCounts(id)
  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0)
  let myVote: number | null = null
  if (req.user) myVote = getVoteOption(id, req.user.uid, null)
  else myVote = getVoteOption(id, null, req.cookies?.visitor_id || null)
  success(res, {
    poll: decoratePoll(getPollRow(id)),
    vote_counts: counts,
    total_votes: totalVotes,
    my_vote: myVote,
  })
})

// create (auth)
router.post('/create', requireAuth, (req, res) => {
  const { title, description, options } = req.body || {}
  if (!title || !title.trim()) return error(res, 400, '投票标题不能为空')
  let opts: string[] = []
  if (Array.isArray(options)) opts = options.filter((o) => typeof o === 'string' && o.trim())
  else if (typeof options === 'string')
    opts = options
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  if (opts.length < 2) return error(res, 400, '至少需要两个选项')
  const id = createPoll({
    title: title.trim(),
    description: typeof description === 'string' ? description : '',
    options: opts,
    userId: req.user!.uid,
  })
  success(res, decoratePoll(getPollRow(id)!), '创建成功', 201)
})

// delete (auth, owner or admin)
router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const row = getPollRow(id)
  if (!row) return error(res, 404, '投票不存在')
  if (req.user!.uid !== row.user_id && !req.user!.is_admin)
    return error(res, 403, '无权删除该投票')
  deletePoll(id)
  success(res, null, '已删除')
})

export default router
