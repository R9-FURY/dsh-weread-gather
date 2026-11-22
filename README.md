# 数字书房 · dsh-weread-gather（本地定制版）

微信读书的私人书房 DSH 插件：书架、笔记、想法、阅读统计，外加这套定制版才有的
**文章收藏**（本地导出、增量同步、强制重抓、版本对比）。

基于上游 `dsh-weread-gather@1.1.5`（MIT），本仓库是自用分支，版本号 `1.1.5-local.1`。

## 和上游的差异

| 功能 | 说明 |
| --- | --- |
| 文章收藏卡片 | 书架里显示「文章收藏」条目，独立分类桶 |
| 文章列表/阅读 | 读取本地导出的 `manifest.json`，面板内渲染 Markdown（标题/图片/引用/列表/链接） |
| 更新收藏 | 调 `toolkit/update.mjs` 增量同步：只抓新增或内容变化的文章 |
| 强制重抓 | 调 `toolkit/force-refresh.mjs` 全量重抓，但**不覆盖**现有 Markdown |
| 版本对比 | 有差异的进入待对比清单，diff 视图（`-` 旧 / `+` 新），可选保留旧版 / 采用新版 |

## 安装

要求 DSH ≥ 0.2.2-rc.1（Web 端），以及 **Python 3 + lxml**（正文转 Markdown 用）。

```bash
# 本地目录
dsh plugin --profile <profile> add link:/path/to/dsh-weread-gather

# 或从 GitHub（包名与 npm 上游相同，装之前先把上游卸掉）
dsh plugin --profile <profile> add github:<你的用户名>/<仓库名>
```

> 包名故意保持 `dsh-weread-gather`，这样 profile 的 bundle 列表、侧栏入口、配置键都不用改。
> 从 git 安装时，npm 上的同名包会被替换掉，这正是我们要的。

## 首次配置

1. 复制配置样例：

   ```bash
   cp toolkit/config.example.json toolkit/config.json
   ```

   把 `articlesDir` 改成你的 Obsidian 文章目录（必须可写）。

2. 第一次点「更新收藏」时会弹出微信扫码登录（二维码写到 `toolkit/login-qr.gif`），
   扫完凭据存在 `toolkit/credentials.json`，30 天内自动续期。

3. 数字书房面板里如果提示目录不存在，就是 `articlesDir` 没配对。

## 数据都放在哪

| 内容 | 位置 | 是否入库 |
| --- | --- | --- |
| 文章 Markdown / index.md / manifest.json | `config.articlesDir`（你的 Obsidian 目录） | 否 |
| 原始 HTML 缓存 | `toolkit/.cache/html/` | 否 |
| 增量账本 | `toolkit/state.json` | 否 |
| 登录态 | `toolkit/credentials.json` | **绝不** |
| 插件本体 | 仓库根目录 | 是 |

## 目录

```
.
├── index.js            宿主：WeRead 网关、文章收藏路由、任务调度
├── client.js           客户端：侧栏入口、书架、笔记、文章列表、diff 视图
├── cordis.patch.yml    bundle 声明（entry id: weread-gather）
├── locale/             中英文文案
├── icon.svg
├── toolkit/            文章收藏导出工具链（Node + Python）
│   ├── update.mjs        增量
│   ├── force-refresh.mjs 强制重抓 + 生成待对比
│   ├── apply-choice.mjs  保留旧版 / 采用新版
│   ├── sync.mjs          列表 diff + 抓 HTML
│   ├── to_markdown.py    HTML → Markdown（lxml）
│   └── auth.mjs          会话与扫码登录
├── upstream/           工具链依赖（weread-omni、qrcode-generator，均为 MIT）
└── README-LOCAL.md     更细的本地说明（路径、升级注意事项）
```

## 合并上游更新

上游发新版时不要直接覆盖本仓库：

1. 把新版解压到临时目录；
2. `diff` 出 `index.js` / `client.js` 的改动；
3. 手工把上游修复合进来，再跑一遍 `node --check`。

`toolkit/`、文章收藏相关代码是本仓库独有的，上游没有对应实现。

## 隐私

- 插件只读微信读书数据；文章导出走本机脚本，不经过任何第三方服务。
- API Key 存在 `~/.dsh/weread-gather/config.json`；微信会话存在 `toolkit/credentials.json`。
- 两者都在 `.gitignore` 里，不会被提交。

## License

MIT。`upstream/` 内的第三方代码版权归各自作者（weread-omni、qrcode-generator）。
