# 数字书房 · 本地定制版（dsh-weread-gather-local）

这是从 npm 包 `dsh-weread-gather@1.1.5` 复制出来的本地版本，加入了我们自己做的功能，
代码放在 `E:\Deepseek插件\dsh-weread-gather\`，不再受上游 npm 更新影响。

## 和上游 1.1.5 的差异

| 功能 | 说明 |
| --- | --- |
| 文章收藏条目 | 书架里显示「文章收藏」卡片（`kind: mp`），带独立分类桶 |
| 本地文章列表 | 点开后读取 Obsidian 导出目录（`D:\个人文件\Obsidian Vault\Obsidian\文章\微信读书`）里的 `manifest.json`，展示所有导出文章 |
| 文章阅读 | 面板内渲染 Markdown：标题、图片、引用、列表、链接；可跳转 Obsidian / 原文 |
| 更新收藏 | 调 `weread-export/update.mjs` 做增量同步（只抓新增/变化） |
| 强制重抓 | 调 `weread-export/force-refresh.mjs` 全量重抓正文，但**不覆盖**现有文件 |
| 版本对比 | 有差异的文章进入待对比清单，点开是 unified diff（`-` 旧 / `+` 新），可选「保留旧版」或「采用新版」（`apply-choice.mjs`） |

## 关键路径

| 用途 | 路径 |
| --- | --- |
| 文章输出目录 | `D:\个人文件\Obsidian Vault\Obsidian\文章\微信读书` |
| 增量脚本入口 | `E:\Deepseek插件\weread-export\update.mjs` |
| 强制重抓脚本 | 同目录 `force-refresh.mjs` |
| 选择版本脚本 | 同目录 `apply-choice.mjs` |

插件配置在 `~/.dsh/weread-gather/config.json`，可用 `articlesDir` / `articlesScript` 覆盖上面的默认值。

## 安装方式（已在本机完成）

`~/.dsh/profiles/desktop/package.json` 里依赖改为：

```json
"dsh-weread-gather": "link:E:\\Deepseek插件\\dsh-weread-gather"
```

并且 `node_modules/dsh-weread-gather` 指向这个目录（junction）。包名保持 `dsh-weread-gather`，
这样 profile 的 bundle 列表和侧栏入口都不用改。

## 升级上游时的注意事项

上游以后发新版时，`npm install dsh-weread-gather` 会把这个 link 覆盖成 npm 包。
想合并上游更新，建议：

1. 把新版下载到临时目录，`diff` 出上游改了哪些文件；
2. 手工把改动合进这里的 `index.js` / `client.js`；
3. 不要直接 `npm update`。

改完代码后：刷新 DSH 页面（客户端生效），宿主代码需要重载插件或重启 DSH。
