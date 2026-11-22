/**
 * One command for the routine update: sync the list, fetch only what changed,
 * convert pending HTML and rebuild `index.md` + `manifest.json`.
 *
 *   node weread-export/update.mjs
 *
 * The 数字书房 plugin spawns this same file for its 「更新收藏」 button, so it must
 * stay cwd-independent and tolerate running under Electron's node mode.
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
// `python` next to the bundled node is the DSH runtime layout; config wins.
const siblingPython = join(dirname(process.execPath), '..', '..', 'python', 'python.exe')
const configuredPython = typeof config.pythonPath === 'string' && config.pythonPath !== '' && existsSync(config.pythonPath) ? config.pythonPath : ''
const python = process.env.WEREAD_PYTHON || configuredPython || (existsSync(siblingPython) ? siblingPython : 'python')

// Running under Electron (the DSH desktop app) means every child node also
// needs ELECTRON_RUN_AS_NODE, or it would boot the GUI instead of the script.
const env = { ...process.env }
if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'
// Keep the child's Chinese output UTF-8 even on a cp936 console.
env.PYTHONIOENCODING = 'utf-8'
env.PYTHONUTF8 = '1'

const run = (command, args) => spawnSync(command, args, { stdio: 'inherit', env })

console.log('== 1/2 同步收藏列表')
const sync = run(process.execPath, [join(HERE, 'sync.mjs'), ...process.argv.slice(2)])
if (sync.error) {
  console.error('    运行 sync.mjs 失败：', sync.error.message)
  process.exit(1)
}
if (sync.status !== 0) process.exit(sync.status ?? 1)

console.log('\n== 2/2 转换新增文章')
const convert = run(python, [join(HERE, 'to_markdown.py')])
if (convert.error) {
  console.error('    运行 to_markdown.py 失败：', convert.error.message)
  process.exit(1)
}
process.exit(convert.status ?? 0)
