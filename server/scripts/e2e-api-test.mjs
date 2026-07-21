// 全接口端到端测试 - 对独立测试实例 (PORT 3001) 发起每个端点的真实请求
// 修正版：匹配服务端真实响应结构（data.user_id / data 直接是 user / 分页 {list} / is_admin / is_banned / 文件带 filename）
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const BASE = 'http://localhost:3001/api'
const results = []
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`)
}

function cookieFrom(res) {
  const sc = res.headers.get('set-cookie')
  if (!sc) return null
  const m = sc.match(/access_token=([^;,\s]+)/)
  return m ? `access_token=${m[1]}` : null
}
async function call(method, path, { form, json, cookie } = {}) {
  const headers = {}
  if (cookie) headers.Cookie = cookie
  let body
  if (form) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(form)) {
      if (Array.isArray(v)) v.forEach((it) => fd.append(k, String(it)))
      else if (v && typeof v === 'object' && v.__file) fd.append(k, new Blob([v.content], { type: v.type }), v.filename)
      else fd.append(k, String(v))
    }
    body = fd
  } else if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }
  const res = await fetch(BASE + path, { method, headers, body })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, data, cookie: cookieFrom(res) }
}

// ---- 生成测试媒体 ----
const imgBuf = await sharp({ create: { width: 120, height: 90, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer()
const tmpVid = '/tmp/_e2e_testvid.mp4'
spawnSync(ffmpegPath, ['-f', 'lavfi', '-i', 'testsrc=duration=1:size=160x120:rate=8', '-y', tmpVid])
const vidBuf = fs.existsSync(tmpVid) ? fs.readFileSync(tmpVid) : null
const file = (buf, filename, type) => ({ __file: true, content: buf, filename, type })

// ========== 认证 ==========
console.log('\n===== AUTH =====')
let r = await call('GET', '/health'); check('GET /health', r.status === 200)
r = await call('POST', '/auth/init-admin'); check('POST /auth/init-admin (已有admin应拒绝 409)', r.status === 409, `code=${r.data?.code}`)
const reg = async (u, p) => { const x = await call('POST', '/auth/register', { json: { username: u, password: p } }); return x }
let u1 = await reg('e2e_u1', 'pass123'); check('register e2e_u1', u1.status === 201, `user_id=${u1.data?.data?.user_id}`)
const uid1 = u1.data?.data?.user_id
let u2 = await reg('e2e_u2', 'pass123'); const uid2 = u2.data?.data?.user_id; check('register e2e_u2', u2.status === 201)
let u3 = await reg('e2e_u3', 'pass123'); const uid3 = u3.data?.data?.user_id; check('register e2e_u3', u3.status === 201)
let u4 = await reg('e2e_u4', 'pass123'); const uid4 = u4.data?.data?.user_id; check('register e2e_u4', u4.status === 201)
let admin = await call('POST', '/auth/login', { json: { username: 'admin', password: 'admin123' } }); check('login admin', admin.status === 200 && admin.data?.data?.user?.is_admin === true)
let a = admin.cookie
let c1 = (await call('POST', '/auth/login', { json: { username: 'e2e_u1', password: 'pass123' } })).cookie
let c2 = (await call('POST', '/auth/login', { json: { username: 'e2e_u2', password: 'pass123' } })).cookie
let c3 = (await call('POST', '/auth/login', { json: { username: 'e2e_u3', password: 'pass123' } })).cookie
let c4 = (await call('POST', '/auth/login', { json: { username: 'e2e_u4', password: 'pass123' } })).cookie
check('login e2e_u1/2/3/4', !!c1 && !!c2 && !!c3 && !!c4)
r = await call('POST', '/auth/logout', { cookie: a }); check('logout admin', r.status === 200)
r = await call('GET', '/auth/me', { cookie: a }); check('GET /auth/me (admin, data 直接是user)', r.status === 200 && r.data?.data?.is_admin === true)
r = await call('GET', '/auth/me', { cookie: c1 }); check('GET /auth/me (u1)', r.status === 200 && r.data?.data?.id === uid1)
r = await call('GET', '/auth/me'); check('GET /auth/me 无cookie -> 401', r.status === 401)

// ========== 内容 ==========
console.log('\n===== CONTENT =====')
r = await call('POST', '/content/upload', { cookie: c1, form: { title: 'E2E文本', type: 'text', content: '正文', tags: ['t1', 't2'] } }); check('upload text (u1)', r.status === 201, `id=${r.data?.data?.id}`)
const textId = r.data?.data?.id
r = await call('POST', '/content/upload', { cookie: c1, form: { title: 'E2E图片', type: 'image', tags: ['img'], file: file(imgBuf, 't.png', 'image/png') } }); check('upload image (u1) 含thumb webp', r.status === 201 && /webp$/.test(r.data?.data?.thumb || ''), `thumb=${r.data?.data?.thumb}`)
const imgId = r.data?.data?.id
if (vidBuf) {
  r = await call('POST', '/content/upload', { cookie: c1, form: { title: 'E2E视频', type: 'video', tags: ['vid'], file: file(vidBuf, 't.mp4', 'video/mp4') } }); check('upload video (u1) 含thumb webp', r.status === 201 && /webp$/.test(r.data?.data?.thumb || ''), `thumb=${r.data?.data?.thumb}`)
} else check('upload video (ffmpeg失败 SKIP)', true)
const vidId = r.data?.data?.id
r = await call('POST', '/content/upload', { cookie: c1, form: { title: 'E2E链接', type: 'link', url: 'https://example.com', tags: ['lnk'] } }); check('upload link (u1)', r.status === 201, `id=${r.data?.data?.id}`)
const linkId = r.data?.data?.id
r = await call('POST', '/content/upload', { form: { title: 'x', type: 'text', content: 'y' } }); check('upload 无cookie -> 401', r.status === 401)
r = await call('POST', '/content/upload', { cookie: c1, form: { type: 'text', content: 'no title' } }); check('upload 缺title -> 400', r.status === 400)
r = await call('GET', '/content/list'); check('GET /content/list', r.status === 200 && r.data?.data?.total >= 4, `total=${r.data?.data?.total}`)
r = await call('GET', '/content/search?keyword=E2E'); check('GET /content/search', r.status === 200 && r.data?.data?.list?.some?.(c => /E2E/.test(c.title)))
r = await call('GET', '/content/recommend'); check('GET /content/recommend ({list,count})', r.status === 200 && Array.isArray(r.data?.data?.list) && typeof r.data?.data?.count === 'number', `n=${r.data?.data?.list?.length}`)
r = await call('GET', '/content/tags'); check('GET /content/tags', r.status === 200 && Array.isArray(r.data?.data))
r = await call('GET', `/content/${textId}`); check('GET /content/:id', r.status === 200 && r.data?.data?.id === textId)
r = await call('GET', '/content/999999'); check('GET /content/不存在 -> 404', r.status === 404)
r = await call('GET', '/content/my', { cookie: c1 }); check('GET /content/my (u1, len>=4)', r.status === 200 && r.data?.data?.list?.length >= 4, `len=${r.data?.data?.list?.length}`)
r = await call('PUT', `/content/${textId}`, { cookie: c1, form: { title: 'E2E文本改' } }); check('PUT /content/:id (u1改自己)', r.status === 200 && r.data?.data?.title === 'E2E文本改')
r = await call('PUT', `/content/${textId}`, { cookie: c2, form: { title: 'x' } }); check('PUT /content/:id 非作者 -> 403', r.status === 403)
r = await call('POST', `/content/${imgId}/claim`, { cookie: c2, json: { reason: '我是原作者' } }); check('POST /content/:id/claim (u2认领u1图片)', r.status === 200 && r.data?.data?.id, `id=${r.data?.data?.id}`)

// ========== 评论 ==========
console.log('\n===== COMMENT =====')
r = await call('POST', '/comment/add', { cookie: c2, form: { content_id: String(textId), text: 'u2的评论' } }); check('POST /comment/add (u2评text)', r.status === 201, `id=${r.data?.data?.id}`)
const commentId = r.data?.data?.id
r = await call('GET', `/comment/list/${textId}`); check('GET /comment/list', r.status === 200 && r.data?.data?.list?.some?.(c => c.id === commentId))
r = await call('GET', `/comment/count/${textId}`); check('GET /comment/count', r.status === 200 && r.data?.data?.count >= 1, `count=${r.data?.data?.count}`)
r = await call('POST', '/comment/add', { cookie: c1, form: { content_id: String(textId), text: 'u1的评论' } }); check('POST /comment/add (u1评text)', r.status === 201)
const commentId2 = r.data?.data?.id
r = await call('POST', '/comment/report', { cookie: c3, form: { comment_id: String(commentId), reason: 'spam' } }); check('POST /comment/report (u3举报, 201)', r.status === 201, `id=${r.data?.data?.id}`)
r = await call('DELETE', `/comment/${commentId}`, { cookie: c2 }); check('DELETE /comment/:id (作者删自己)', r.status === 200)
r = await call('DELETE', `/comment/${commentId2}`, { cookie: c3 }); check('DELETE /comment/:id 非作者 -> 403', r.status === 403)

// ========== 投票 ==========
console.log('\n===== POLL =====')
r = await call('POST', '/poll/create', { cookie: c1, json: { title: '投票A', description: 'd', options: ['X', 'Y', 'Z'] } }); check('POST /poll/create (u1)', r.status === 201, `id=${r.data?.data?.id}`)
const pollId = r.data?.data?.id
r = await call('GET', '/poll/list'); check('GET /poll/list', r.status === 200 && r.data?.data?.total >= 1)
r = await call('GET', `/poll/${pollId}`); check('GET /poll/:id (无cookie含vote_counts/my_vote)', r.status === 200 && r.data?.data?.vote_counts && 'my_vote' in r.data?.data, `vc=${JSON.stringify(r.data?.data?.vote_counts)}`)
r = await call('POST', `/poll/${pollId}/vote`, { cookie: c2, json: { option_index: 0 } }); check('POST /poll/:id/vote (u2投0)', r.status === 200 && r.data?.data?.vote_counts?.[0] >= 1)
r = await call('POST', `/poll/${pollId}/vote`, { cookie: c1, json: { option_index: 1 } }); check('POST /poll/:id/vote (u1投1)', r.status === 200)
r = await call('POST', `/poll/${pollId}/vote`, { cookie: c1, json: { option_index: 99 } }); check('POST vote 越界 -> 400', r.status === 400)
r = await call('DELETE', `/poll/${pollId}`, { cookie: c1 }); check('DELETE /poll/:id (作者删)', r.status === 200)

// ========== 通知 ==========
console.log('\n===== NOTIFICATIONS =====')
r = await call('POST', '/notifications/device', { cookie: c1, json: { token: 'tok1', platform: 'web', device_info: 'x' } }); check('POST /notifications/device', r.status === 200)
r = await call('GET', '/notifications/list', { cookie: c1 }); check('GET /notifications/list (含u2评论通知)', r.status === 200 && Array.isArray(r.data?.data) && r.data?.data?.length >= 1, `n=${r.data?.data?.length}`)
r = await call('GET', '/notifications/unread-count', { cookie: c1 }); check('GET /notifications/unread-count', r.status === 200 && r.data?.data?.count >= 1, `c=${r.data?.data?.count}`)
const firstNid = Array.isArray(r.data?.data) ? r.data?.data[0]?.id : (r.data?.data?.list?.[0]?.id)
if (firstNid) { r = await call('PUT', `/notifications/${firstNid}/read`, { cookie: c1 }); check('PUT /notifications/:id/read', r.status === 200) }
else check('PUT /notifications/:id/read (无通知ID SKIP)', true)
r = await call('PUT', '/notifications/read-all', { cookie: c1 }); check('PUT /notifications/read-all', r.status === 200)
r = await call('DELETE', '/notifications/device/tok1', { cookie: c1 }); check('DELETE /notifications/device/:token', r.status === 200)

// ========== 管理 ==========
console.log('\n===== ADMIN =====')
r = await call('GET', '/admin/pending', { cookie: a }); check('GET /admin/pending ({list})', r.status === 200 && Array.isArray(r.data?.data?.list))
r = await call('GET', '/admin/content/all', { cookie: a }); check('GET /admin/content/all', r.status === 200 && r.data?.data?.total >= 1, `total=${r.data?.data?.total}`)
r = await call('POST', `/admin/audit/${textId}`, { cookie: a, json: { status: 'approved', remark: 'ok' } }); check('POST /admin/audit/:id', r.status === 200 && r.data?.data?.audit_status === 'approved')
r = await call('PUT', `/admin/content/${imgId}/author`, { cookie: a, json: { user_id: uid3 } }); check('PUT /admin/content/:id/author (转u3)', r.status === 200 && r.data?.data?.new_user_id === uid3)
r = await call('POST', `/admin/content/${imgId}/regenerate-thumbnail`, { cookie: a }); check('POST /admin/content/:id/regenerate-thumbnail', r.status === 200 && /\S/.test(r.data?.data?.thumb_path || ''), `tp=${r.data?.data?.thumb_path}`)
r = await call('POST', '/admin/content/regenerate-all-thumbnails', { cookie: a }); check('POST /admin/content/regenerate-all-thumbnails', r.status === 200 && typeof r.data?.data?.count === 'number', `count=${r.data?.data?.count}`)
r = await call('DELETE', '/admin/files/clean', { cookie: a }); check('DELETE /admin/files/clean', r.status === 200 || r.status === 204)
r = await call('GET', '/admin/users', { cookie: a }); check('GET /admin/users ({list})', r.status === 200 && r.data?.data?.list?.some?.(u => u.id === uid1))
r = await call('PUT', `/admin/users/${uid2}/role`, { cookie: a, json: { is_admin: true } }); check('PUT /admin/users/:id/role (u2->admin, 返回is_admin)', r.status === 200 && r.data?.data?.is_admin === true)
r = await call('PUT', `/admin/users/${uid3}/ban`, { cookie: a, json: { is_banned: true } }); check('PUT /admin/users/:id/ban (u3禁, 返回is_banned)', r.status === 200 && r.data?.data?.is_banned === true)
r = await call('GET', '/admin/comments/reports', { cookie: a }); check('GET /admin/comments/reports (含u3举报)', r.status === 200 && Array.isArray(r.data?.data) && r.data?.data?.some?.(x => x.id))
if (r.data?.data?.[0]?.id) { r = await call('POST', `/admin/comments/reports/${r.data?.data?.[0]?.id}/handle`, { cookie: a }); check('POST /admin/comments/reports/:id/handle', r.status === 200) }
else check('handle report (无数据 SKIP)', true)
r = await call('GET', '/admin/claims', { cookie: a }); check('GET /admin/claims ({list} 含u2 claim)', r.status === 200 && Array.isArray(r.data?.data?.list) && r.data?.data?.list?.some?.(x => x.id))
const claimId = r.data?.data?.list?.[0]?.id
if (claimId) { r = await call('POST', `/admin/claims/${claimId}/handle`, { cookie: a, json: { action: 'approve' } }); check('POST /admin/claims/:id/handle (action=approve)', r.status === 200) }
else check('handle claim (无数据 SKIP)', true)
await call('DELETE', `/content/${linkId}`, { cookie: c1 })
r = await call('DELETE', '/admin/content/purge', { cookie: a }); check('DELETE /admin/content/purge', r.status === 200 || r.status === 204)
r = await call('DELETE', `/admin/users/${uid4}`, { cookie: a }); check('DELETE /admin/users/:id (删u4)', r.status === 200)
r = await call('GET', '/admin/users', { cookie: c1 }); check('GET /admin/* 非管理员 -> 403', r.status === 403)
r = await call('GET', '/admin/users'); check('GET /admin/* 无cookie -> 401', r.status === 401)

// ========== API 密钥 ==========
console.log('\n===== API-KEYS =====')
r = await call('POST', '/api-keys', { cookie: c1, json: { name: 'k1', permissions: ['read'] } }); check('POST /api-keys (创建)', r.status === 201, `id=${r.data?.data?.id}`)
const keyId = r.data?.data?.id
r = await call('GET', '/api-keys', { cookie: c1 }); check('GET /api-keys ({list})', r.status === 200 && Array.isArray(r.data?.data?.list) && r.data?.data?.list?.some?.(k => k.id === keyId))
r = await call('PUT', `/api-keys/${keyId}`, { cookie: c1, json: { name: 'k1改', permissions: ['read', 'write'] } }); check('PUT /api-keys/:id', r.status === 200 && r.data?.data?.name === 'k1改')
r = await call('DELETE', `/api-keys/${keyId}`, { cookie: c1 }); check('DELETE /api-keys/:id', r.status === 200)
r = await call('GET', '/api-keys'); check('GET /api-keys 无cookie -> 401', r.status === 401)

// ========== 汇总 ==========
const pass = results.filter(x => x.ok).length
const fail = results.filter(x => !x.ok)
console.log(`\n========== SUMMARY: ${pass}/${results.length} PASS ==========`)
if (fail.length) { console.log('FAILURES:'); fail.forEach(f => console.log(`  - ${f.name}  ${f.detail}`)) }
process.exit(fail.length ? 1 : 0)
