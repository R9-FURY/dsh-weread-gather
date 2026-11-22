/**
 * 应用一次「正文对比」的选择。
 *
 *   node apply-choice.mjs <reviewId> new   # 用新抓到的版本覆盖
 *   node apply-choice.mjs <reviewId> old   # 保留本地现有版本
 *
 * 完成后重建 index.md / manifest.json，并把该条从 pending.json 移除。
 */
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const STATE = join(HERE, 'state.json')

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'))
  } catch {
    return {}
  }
}

const config = loadConfig()
const OUT = config.articlesDir || join(HERE, 'articles')
const siblingPython = join(dirname(process.execPath), '..', '..', 'python', 'python.exe')
const configuredPython = typeof config.pythonPath === 'string' && config.pythonPath !== '' && existsSync(config.pythonPath) ? config.pythonPath : ''
const python = process.env.WEREAD_PYTHON || configuredPython || (existsSync(siblingPython) ? siblingPython : 'python')

const [id, keep] = process.argv.slice(2)
if (!id || (keep !== 'new' && keep !== 'old')) {
  console.error('用法: node apply-choice.mjs <reviewId> <new|old>')
  process.exit(1)
}

const state = JSON.parse(readFileSync(STATE, 'utf8'))
const entry = state.articles.find((item) => item.reviewId === id)
if (!entry || !entry.pendingNew || !existsSync(entry.pendingNew)) {
  console.log(JSON.stringify({ ok: false, error: '没有待对比的新版本（可能已经处理过）' }))
  process.exit(0)
}

if (keep === 'new') {
  copyFileSync(entry.pendingNew, entry.md)
  const text = readFileSync(entry.pendingNew, 'utf8')
  const words = /^wordCount:\s*(\d+)/m.exec(text)
  if (words) entry.wordCount = Number(words[1])
}

rmSync(entry.pendingNew, { force: true })
delete entry.pendingNew
delete entry.pendingAt
entry.choice = keep
entry.choiceAt = new Date().toISOString()

const pendingPath = join(OUT, 'pending.json')
if (existsSync(pendingPath)) {
  try {
    const payload = JSON.parse(readFileSync(pendingPath, 'utf8'))
    payload.items = (payload.items || []).filter((item) => item.id !== id)
    payload.updatedAt = new Date().toISOString()
    writeFileSync(pendingPath, JSON.stringify(payload, null, 2), 'utf8')
  } catch {
    // A missing/short pending list is not worth failing the choice.
  }
}

writeFileSync(STATE, JSON.stringify(state, null, 2), 'utf8')

// Rebuild index.md + manifest.json so the vault and the panel reflect the choice.
const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'
const rebuild = spawnSync(python, [join(HERE, 'to_markdown.py')], { stdio: 'inherit', env })
console.log(JSON.stringify({ ok: true, id, keep, rebuild: rebuild.status }))
