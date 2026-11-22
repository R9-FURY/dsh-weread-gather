/**
 * Wait for the WeChat-favourites authorization to land in 文章收藏, then run the
 * normal incremental update once. Started as a background job so the user can
 * authorize on their phone and walk away.
 *
 * Polls at most every 30s for up to 20 minutes; exits early on new reviewIds.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HERE, getClient } from './auth.mjs'

const STATE = join(HERE, 'state.json')
const known = new Set(JSON.parse(readFileSync(STATE, 'utf8')).articles.map((item) => item.reviewId))
const deadline = Date.now() + 20 * 60 * 1000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const { client } = await getClient()

async function currentIds() {
  const ids = new Set()
  for (const query of [{ count: 200 }, { count: 200, listType: 1 }]) {
    try {
      const body = await client.call('GET', '/mp/list', { query })
      for (const item of (body?.body ?? body)?.lists || []) ids.add(item.reviewId)
    } catch (error) {
      if (query.listType !== 1) throw error
    }
  }
  return ids
}

console.log(`监听文章收藏变化，已知 ${known.size} 篇；最多等 20 分钟`)

let round = 0
for (;;) {
  let ids
  try {
    ids = await currentIds()
  } catch (error) {
    console.log('LIST_ERROR', error?.message ?? error)
    await sleep(30_000)
    continue
  }
  const fresh = [...ids].filter((id) => !known.has(id))
  round += 1
  console.log(`[${new Date().toLocaleTimeString('zh-CN')}] 第 ${round} 次：${ids.size} 篇，新增 ${fresh.length}`)

  if (fresh.length > 0) {
    console.log(`检测到 ${fresh.length} 篇新文章，开始增量同步`)
    const result = spawnSync(process.execPath, [join(HERE, 'update.mjs')], {
      stdio: 'inherit',
      env: { ...process.env, ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}) },
    })
    console.log('UPDATE_EXIT', result.status)
    process.exit(result.status ?? 0)
  }

  if (Date.now() >= deadline) {
    console.log('TIMEOUT：20 分钟内没有检测到新文章（授权可能还没生效或没有可同步的微信收藏）')
    process.exit(0)
  }
  await sleep(30_000)
}
