/**
 * Incremental update of 文章收藏.
 *
 * Reads the favourites list from the mobile host, compares it with
 * `state.json`, and fetches HTML only for articles that are new (or whose
 * collect timestamp moved). `to_markdown.py` then converts whatever is pending
 * and rebuilds `index.md`.
 *
 *   node weread-export/sync.mjs            # incremental
 *   node weread-export/sync.mjs --force    # re-fetch every article
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { HERE, articlesDir, withClient } from './auth.mjs'

const STATE = join(HERE, 'state.json')
const HTML_DIR = join(HERE, '.cache', 'html')
const MD_DIR = articlesDir()
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const FORCE = process.argv.includes('--force')

mkdirSync(HTML_DIR, { recursive: true })
mkdirSync(MD_DIR, { recursive: true })

const rel = (path) => path.slice(HERE.length + 1).replace(/\\/g, '/')
const nowIso = () => new Date().toISOString()
const pad = (value) => String(value).padStart(2, '0')
const safeId = (reviewId) => String(reviewId).replace(/[^\w-]/g, '_')

/** First run: rebuild state.json from the one-off manifest and the files on disk. */
function bootstrapState() {
  const manifestPath = join(HERE, 'articles.json')
  if (!existsSync(manifestPath)) return null
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const mdFiles = readdirSync(MD_DIR).filter((name) => name.endsWith('.md'))
  const articles = manifest.map((item) => {
    const prefix = pad(item.index) + '-'
    const mdFile = mdFiles.find((name) => name.startsWith(prefix)) || ''
    return {
      reviewId: item.reviewId,
      index: item.index,
      title: item.title,
      account: item.account,
      collectedAt: item.updateTime,
      url: item.url,
      thumbUrl: item.thumbUrl || '',
      html: item.html ? rel(item.html) : '',
      md: mdFile ? join(MD_DIR, mdFile) : '',
      bytes: item.bytes || 0,
      fetchedAt: nowIso(),
      removed: false,
      removedAt: null,
    }
  })
  return {
    version: 1,
    updatedAt: nowIso(),
    nextIndex: articles.reduce((max, item) => Math.max(max, item.index), 0) + 1,
    articles,
  }
}

function loadState() {
  if (existsSync(STATE)) return JSON.parse(readFileSync(STATE, 'utf8'))
  const boot = bootstrapState()
  if (boot) {
    writeFileSync(STATE, JSON.stringify(boot, null, 2), 'utf8')
    console.log(`state.json 初始化：沿用现有 ${boot.articles.length} 篇`)
    return boot
  }
  return { version: 1, updatedAt: nowIso(), nextIndex: 1, articles: [] }
}

async function fetchHtml(tokenManager, item, index) {
  const htmlRel = `.cache/html/${pad(index)}-${safeId(item.reviewId)}.html`
  const htmlAbs = join(HERE, htmlRel)
  mkdirSync(dirname(htmlAbs), { recursive: true })

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const token = await tokenManager.get(attempt > 1)
    const url = `https://weread.qq.com/web/mp/content?reviewId=${encodeURIComponent(item.reviewId)}`
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: `wr_vid=${token.vid}; wr_skey=${token.accessToken}` },
    })
    const html = await response.text()
    if (html.includes('js_content')) {
      writeFileSync(htmlAbs, html, 'utf8')
      return { html: htmlRel, bytes: html.length }
    }
    console.log(`    尝试 ${attempt} 失败：${response.status} ${html.slice(0, 120).replace(/\s+/g, ' ')}`)
    if (!/-2012|登录超时/.test(html)) break
  }
  return null
}

const state = loadState()
const known = new Map(state.articles.map((item) => [item.reviewId, item]))

/**
 * The 文章收藏 folder is fed by two slices: WeRead favourites and (after the
 * account authorises it) WeChat favourites / floating articles. `listType=1`
 * selects the second slice; it is empty until that authorization exists, and an
 * error there must not break the main list.
 */
async function fetchListSlices(client) {
  const slices = []
  for (const query of [{ count: 200 }, { count: 200, listType: 1 }]) {
    try {
      const body = await client.call('GET', '/mp/list', { query })
      const lists = (body?.body ?? body)?.lists
      if (Array.isArray(lists)) slices.push(...lists)
    } catch (error) {
      if (query.listType !== 1) throw error
      console.log(`  listType=1 拉取失败（忽略）：${error?.message ?? error}`)
    }
  }
  const unique = new Map()
  for (const item of slices) {
    if (!unique.has(item.reviewId)) unique.set(item.reviewId, item)
  }
  return [...unique.values()]
}

const summary = await withClient(async (client, tokenManager) => {
  const lists = await fetchListSlices(client)

  let added = 0
  let changed = 0
  let skipped = 0
  let failed = 0
  const seen = new Set()

  // WeChat-sourced entries carry a sync stamp in `updateTime` that can move
  // without the article changing, so it must never trigger a re-download.
  // Content identity (title/account/url) does; a failed fetch is retried daily.
  const FAIL_RETRY_MS = 24 * 60 * 60 * 1000
  const retryDue = (entry) =>
    !entry.fetchFailed || typeof entry.failedAt !== 'string' || Date.now() - Date.parse(entry.failedAt) >= FAIL_RETRY_MS

  for (const item of lists) {
    seen.add(item.reviewId)
    const existing = known.get(item.reviewId)
    const stamp = Number(item.updateTime) || 0
    const fromWechat = Number(item.fromWechat) || 0
    // Titles and account names come back with irregular spacing; the Markdown
    // step normalises them, so identity has to compare the normalised form or
    // those entries look "changed" on every sync.
    const title = String(item.title || '').replace(/\s+/g, ' ').trim()
    const account = String(item.account || '').replace(/\s+/g, ' ').trim()

    const identityChanged =
      existing !== undefined &&
      (existing.title !== title || existing.account !== account || existing.url !== item.url)
    const needsFetch =
      existing === undefined ||
      FORCE ||
      !existing.md ||
      identityChanged ||
      (existing.fetchFailed === true && retryDue(existing))

    if (!needsFetch) {
      Object.assign(existing, { collectedAt: stamp, fromWechat, removed: false, removedAt: null })
      skipped += 1
      continue
    }

    const index = existing ? existing.index : state.nextIndex
    console.log(`  ${existing ? (existing.fetchFailed ? '重试' : '更新') : '新增'} ${title}`)
    const fetched = await fetchHtml(tokenManager, item, index)
    if (!fetched) {
      failed += 1
      console.log(`    抓取失败，先保留占位，24 小时内不再重试：${title}`)
      if (existing) {
        Object.assign(existing, {
          title,
          account,
          collectedAt: stamp,
          url: item.url,
          fromWechat,
          fetchFailed: true,
          failedAt: nowIso(),
        })
      } else {
        // Keep an entry anyway so the index/数字书房 shows every favourite; the
        // Markdown step writes a stub with the original link.
        state.articles.push({
          reviewId: item.reviewId,
          index,
          title,
          account,
          collectedAt: stamp,
          url: item.url,
          thumbUrl: item.thumbUrl || '',
          fromWechat,
          html: '',
          md: '',
          bytes: 0,
          fetchedAt: nowIso(),
          removed: false,
          removedAt: null,
          fetchFailed: true,
          failedAt: nowIso(),
        })
        state.nextIndex = index + 1
      }
      continue
    }

    if (existing) {
      Object.assign(existing, {
        title,
        account,
        collectedAt: stamp,
        url: item.url,
        thumbUrl: item.thumbUrl || existing.thumbUrl || '',
        fromWechat: Number(item.fromWechat) || 0,
        html: fetched.html,
        bytes: fetched.bytes,
        fetchedAt: nowIso(),
        needsRefresh: true,
        fetchFailed: false,
        failedAt: null,
        removed: false,
        removedAt: null,
      })
      changed += 1
    } else {
      state.articles.push({
        reviewId: item.reviewId,
        index,
        title,
        account,
        collectedAt: stamp,
        url: item.url,
        thumbUrl: item.thumbUrl || '',
        fromWechat: Number(item.fromWechat) || 0,
        html: fetched.html,
        md: '',
        bytes: fetched.bytes,
        fetchedAt: nowIso(),
        removed: false,
        removedAt: null,
      })
      state.nextIndex = index + 1
      added += 1
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
  }

  let removed = 0
  for (const entry of state.articles) {
    if (!seen.has(entry.reviewId) && !entry.removed) {
      entry.removed = true
      entry.removedAt = nowIso()
      removed += 1
      console.log(`  移除 ${entry.title}`)
    }
  }

  state.updatedAt = nowIso()
  writeFileSync(STATE, JSON.stringify(state, null, 2), 'utf8')
  const wechat = lists.filter((item) => Number(item.fromWechat) === 1).length
  return { added, changed, removed, skipped, failed, total: lists.length, wechat }
})

console.log(
  `\n同步结果：收藏 ${summary.total} 篇（其中微信收藏来源 ${summary.wechat} 篇）· 新增 ${summary.added} · 更新 ${summary.changed} · 移除 ${summary.removed} · 跳过 ${summary.skipped} · 失败 ${summary.failed}`,
)
if (summary.added + summary.changed > 0) {
  console.log('接着运行：python weread-export/to_markdown.py')
}
