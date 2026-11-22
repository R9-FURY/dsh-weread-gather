# 微信读书「文章收藏」导出

把微信读书 App 里「文章收藏」增量导出成 Markdown，落在 Obsidian vault 里；
数字书房插件里也有一份同样的列表，并带一个「更新收藏」按钮。

## 输出位置

```
D:\个人文件\Obsidian Vault\Obsidian\文章\微信读书\
  ├─ 01-谓无名-王前丨子安宣邦谈亚洲、日本与中国.md
  ├─ …
  ├─ index.md        # 收藏索引（收藏时间倒序，含字数）
  └─ manifest.json   # 给数字书房读的清单（标题/公众号/时间/文件名）
```

`state.json`（增量账本）和 `.cache/html/`（原始 HTML）留在 `weread-export/`，属于工具数据，不要放进 vault。

## 两种更新方式

**1. 在数字书房里点「更新收藏」**

书架 →「文章收藏」卡片 → 右上角「更新收藏」。宿主会跑一次增量：
拉列表 → 只抓新增/变化的正文 → 只转换 pending → 刷新列表。
过程中显示进度条和最后一行日志；没有新增时会提示「更新完成，没有新增（共 19 篇）」。

**2. 命令行**

```bash
node weread-export/update.mjs          # 增量
node weread-export/force-refresh.mjs   # 强制重抓 + 生成待对比清单（不覆盖现有文章）
node weread-export/sync.mjs --force    # 只重抓 HTML，不做对比
node weread-export/apply-choice.mjs <reviewId> old|new   # 命令行里做选择
python weread-export/to_markdown.py --all   # 用缓存 HTML 重转（改排版时用）
```

**3. 强制重抓 + 版本对比（数字书房里）**

「更新收藏」旁边是「强制重抓」：

1. 重新抓取全部收藏的正文（无论时间戳有没有变）；
2. 渲染成 Markdown 后与现有文件逐篇比对，**不会直接覆盖**；
3. 有差异的文章写进 `.cache/pending/`，`pending.json` 记录清单；
4. 面板上出现「N 篇正文有改动」，点进去是并排的差异视图（`-` 旧行 / `+` 新行，类似 VS Code），可以选「保留旧版」或「采用新版」；
5. 选择后重建索引与清单，待对比清单里移除该篇。

无差异时只刷新 front-matter（导出时间等），正文一个字节都不动。

两条路径跑的是同一套脚本，状态互不冲突（同一时间只会有一个更新任务）。

## 配置

`weread-export/config.json`：

```json
{
  "articlesDir": "D:\\个人文件\\Obsidian Vault\\Obsidian\\文章\\微信读书",
  "pythonPath": "C:\\Users\\qq948\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe"
}
```

- `articlesDir`：Markdown / index / manifest 的输出目录（换 vault 只改这里）。
- `pythonPath`：HTML 转 Markdown 用的解释器；不填会尝试 bundled python，再退回 PATH 里的 `python`。
- 想换目录：改完 `config.json` 后，在数字书房里重新同步一次文章收藏会写进新目录；旧的不会自动搬。

## 增量规则

| 情况 | 行为 |
| --- | --- |
| 新收藏 | 抓正文 → `NN-公众号-标题.md` → 进 index + manifest |
| 收藏时间变了 | 只更新索引日期，**不重抓正文** |
| 标题/公众号/链接变了 | 视为内容变化，重抓并覆盖同一个 .md，编号不变 |
| 取消收藏 | 文件保留，账本标 `removed`，索引单列「已从收藏移除」；重新收藏会移回来 |
| 抓取失败（返回空/已删除） | 写占位文件，**24 小时内不再重试**，之后自动再试 |
| 会话过期 | 打印新二维码到 `weread-export/login-qr.gif`，扫码后继续（按钮那边会停在「正在更新」最多 8 分钟） |

> 微信收藏条目的 `updateTime` 是同步时间戳，会随微读同步变动；增量判断因此只看「标题 / 公众号 / 原文链接」，不看时间戳，否则每次都会全量重抓。标题两侧的多余空格也会先归一化再比较（Markdown 那步同样会归一化）。

## 数字书房这边怎么接的

- 宿主新增 4 条路由：`GET /articles`、`GET /articles/content?file=`、`POST /articles/update`、`GET /articles/update`；
- 页面上的「文章收藏」卡片点开后是文章列表，点单篇在面板里渲染 Markdown（标题/图片/引用/列表/链接），右上角可跳 Obsidian 或原文；
- 「更新收藏」由宿主 `spawn` 本目录的 `update.mjs`，8 分钟超时保护；只在本地跑，不经过任何第三方服务。

## 数据来源

| 用途 | 接口 | 认证 |
| --- | --- | --- |
| 收藏列表 | `GET https://i.weread.qq.com/mp/list?count=200` | 扫码登录会话（accessToken） |
| 文章正文 | `GET https://weread.qq.com/web/mp/content?reviewId=…` | `Cookie: wr_vid=<vid>; wr_skey=<accessToken>` |

官方 `wrk-` API Key 只暴露「文章收藏」这个入口，拿不到列表和正文；直接抓 `mp.weixin.qq.com` 也拿不到（反爬空壳），所以必须走上面两条。

## 注意

- 图片仍是 `mmbiz.qpic.cn` 热链，不是本地文件；换设备或久了可能加载不出来。
- `credentials.json` 是微读登录态（vid + accessToken + refreshToken），等同账号凭证，别外传；不用了去微读「设备管理」踢掉 e-ink 设备并删除该文件。
- 非官方接口，改版可能失效；失效时同步会报 404 或 `-2003`。
- 列表接口目前只回 19 条（`count=200`、`offset=20` 结果相同）；收藏明显更多时需要再找分页参数。
