/**
 * 强制重抓：把所有收藏的正文重新抓一遍，但**不覆盖**现有 Markdown。
 * 新正文写进 `.cache/pending/`，有差异的条目列进 `pending.json`，由用户在
 * 数字书房里逐篇对比后决定保留哪一版。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'))
  } catch {
    return {}
  }
}

const config = loadConfig()
const siblingPython = join(dirname(process.execPath), '..', '..', 'python', 'python.exe')
const configuredPython = typeof config.pythonPath === 'string' && config.pythonPath !== '' && existsSync(config.pythonPath) ? config.pythonPath : ''
const python = process.env.WEREAD_PYTHON || configuredPython || (existsSync(siblingPython) ? siblingPython : 'python')

const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' }
if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'

const run = (command, args) => spawnSync(command, args, { stdio: 'inherit', env })

console.log('== 1/2 重新抓取全部正文')
const sync = run(process.execPath, [join(HERE, 'sync.mjs'), '--force'])
if (sync.error) {
  console.error('运行 sync.mjs 失败：', sync.error.message)
  process.exit(1)
}
if (sync.status !== 0) process.exit(sync.status ?? 1)

console.log('\n== 2/2 比对正文差异（不覆盖原文件）')
const convert = run(python, [join(HERE, 'to_markdown.py'), '--preview'])
if (convert.error) {
  console.error('运行 to_markdown.py --preview 失败：', convert.error.message)
  process.exit(1)
}
process.exit(convert.status ?? 0)
