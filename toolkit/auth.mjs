/**
 * Shared WeRead session for the export scripts.
 *
 * Loads `credentials.json`, keeps it fresh (refreshed tokens are written back),
 * and falls back to a QR login when there is no session yet. The QR image is
 * written to `weread-export/login-qr.gif` so it can be shown in the chat.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import qrcode from '../upstream/qrcode-generator/package/dist/qrcode.mjs'
import { login } from '../upstream/weread-omni/package/dist/auth/qrlogin.js'
import { TokenManager } from '../upstream/weread-omni/package/dist/auth/token.js'
import { MobileClient } from '../upstream/weread-omni/package/dist/api/mobile.js'

/** Script directory, independent of the caller's cwd. */
export const HERE = dirname(fileURLToPath(import.meta.url))
export const CREDENTIALS = join(HERE, 'credentials.json')
export const CONFIG_PATH = join(HERE, 'config.json')

/** `config.json`: `{ articlesDir, pythonPath }`. */
export function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  } catch {
    return {}
  }
}

/** Where the Markdown files and `manifest.json` live. */
export function articlesDir() {
  return loadConfig().articlesDir || join(HERE, 'articles')
}

function writeQr(url) {
  const qr = qrcode(0, 'L')
  qr.addData(url)
  qr.make()
  const dataUrl = qr.createDataURL(10, 4)
  const file = join(HERE, 'login-qr.gif')
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
  writeFileSync(join(HERE, 'login-url.txt'), url, 'utf8')
  console.log('QR_READY', file)
  console.log('用微信扫码登录微信读书（5 分钟内有效）')
}

async function interactiveLogin() {
  const credentials = await login({
    onQr: writeQr,
    onStatus: (status) => console.log('QR_STATUS', status),
  })
  writeFileSync(CREDENTIALS, JSON.stringify(credentials, null, 2), { mode: 0o600 })
  console.log('登录成功，vid', credentials.vid)
  return credentials
}

function saveCredentials(next) {
  writeFileSync(CREDENTIALS, JSON.stringify(next, null, 2), { mode: 0o600 })
}

/** A mobile client backed by a saved or fresh session. */
export async function getClient() {
  let credentials
  if (existsSync(CREDENTIALS)) {
    credentials = JSON.parse(readFileSync(CREDENTIALS, 'utf8'))
  } else {
    credentials = await interactiveLogin()
  }
  const tokenManager = new TokenManager(credentials, {
    onCredentials: (next) => saveCredentials({ ...credentials, ...next }),
  })
  return { client: new MobileClient({ tokenManager }), tokenManager }
}

/** Run `fn(client, tokenManager)`; on an auth rejection, log in again and retry once. */
export async function withClient(fn) {
  const { client, tokenManager } = await getClient()
  try {
    return await fn(client, tokenManager)
  } catch (error) {
    const authFailed =
      error?.name === 'AuthError' ||
      /authentication|登录|unauthor/i.test(String(error?.message || '')) ||
      error?.errCode === -2012
    if (!authFailed) throw error
    console.log('会话失效，需要重新扫码登录…')
    if (existsSync(CREDENTIALS)) writeFileSync(CREDENTIALS + '.expired', readFileSync(CREDENTIALS))
    const credentials = await interactiveLogin()
    const retryManager = new TokenManager(credentials, {
      onCredentials: (next) => saveCredentials({ ...credentials, ...next }),
    })
    return fn(new MobileClient({ tokenManager: retryManager }), retryManager)
  }
}
