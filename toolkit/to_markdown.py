"""Convert pending WeChat article HTML into Markdown and rebuild the index.

State lives in `state.json` (maintained by `sync.mjs`). Where the Markdown goes
is decided by `config.json` → `articlesDir` (the Obsidian folder), and a
`manifest.json` is written there for other tools (e.g. the 数字书房 plugin) to
consume without reading `state.json`.

    node weread-export/sync.mjs          # list + fetch new HTML
    python weread-export/to_markdown.py  # convert pending HTML + rebuild index
"""
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta

from lxml import html as LH

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "state.json")
CONFIG = os.path.join(HERE, "config.json")
TZ = timezone(timedelta(hours=8))

try:
    with open(CONFIG, encoding="utf-8") as fh:
        OUT = json.load(fh).get("articlesDir") or os.path.join(HERE, "articles")
except (FileNotFoundError, json.JSONDecodeError):
    OUT = os.path.join(HERE, "articles")
os.makedirs(OUT, exist_ok=True)

SKIP = {"script", "style", "noscript", "svg", "iframe", "mpvoice", "mpprofile", "qqmusic"}


def clean_inline(text):
    text = text.replace("\u00a0", " ").replace("\u200b", "")
    return re.sub(r"[ \t]+", " ", text)


def render(el):
    tag = el.tag
    if not isinstance(tag, str):
        return ""
    tag = tag.lower()
    if tag in SKIP:
        return ""

    if tag == "img":
        src = el.get("data-src") or el.get("src") or ""
        if not src or src.startswith("data:"):
            return ""
        alt = el.get("alt") or ""
        return f"\n\n![{alt}]({src})\n\n"
    if tag == "br":
        return "\n"
    if tag == "hr":
        return "\n\n---\n\n"

    inner = clean_inline(el.text or "")
    for child in el:
        inner += render(child)
        if child.tail:
            inner += clean_inline(child.tail)

    if tag in ("strong", "b"):
        return f"**{inner.strip()}**" if inner.strip() else ""
    if tag in ("em", "i"):
        return f"*{inner.strip()}*" if inner.strip() else ""
    if tag == "code":
        return f"`{inner.strip()}`" if inner.strip() else ""
    if tag == "a":
        href = el.get("href") or ""
        label = inner.strip()
        if href and label and not href.startswith("javascript"):
            return f"[{label}]({href})"
        return label
    if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        level = int(tag[1])
        text = inner.strip()
        return f"\n\n{'#' * min(level + 1, 6)} {text}\n\n" if text else ""
    if tag == "blockquote":
        body = inner.strip()
        if not body:
            return ""
        return "\n\n" + "\n".join(f"> {line}" if line else ">" for line in body.splitlines()) + "\n\n"
    if tag == "li":
        body = inner.strip()
        return f"\n- {body}" if body else ""
    if tag in ("ul", "ol"):
        return "\n" + inner.strip() + "\n"
    if tag == "p":
        body = inner.strip()
        return f"\n\n{body}\n\n" if body else ""
    return inner


def normalize(md):
    md = re.sub(r"[ \t]+\n", "\n", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip() + "\n"


def one_line(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def safe_name(text, limit=80):
    text = re.sub(r'[\\/:*?"<>|\r\n\t]', "_", text).strip().strip(".")
    return text[:limit] or "article"


def write_stub(entry, title, account, publish, reason):
    """Every favourite gets a file, even when WeRead returns no body."""
    filename = os.path.basename(entry["md"]) if entry.get("md") else (
        f'{entry["index"]:02d}-{safe_name(account, 20)}-{safe_name(title, 60)}.md'
    )
    path = os.path.join(OUT, filename)
    stamp = datetime.fromtimestamp(entry["collectedAt"], TZ).strftime("%Y-%m-%d")
    front = [
        "---",
        f'title: "{title.replace(chr(34), chr(39))}"',
        f'account: "{account}"',
        f'publishTime: "{publish}"',
        f'collectedAt: "{stamp}"',
        f'reviewId: "{entry["reviewId"]}"',
        f'source: "{entry["url"]}"',
        'sourceName: "微信读书 · 文章收藏"',
        "readable: false",
        'tags: ["微信读书", "文章收藏", "公众号"]',
        "---",
        "",
        f"# {title}",
        "",
        f"*{account} · {publish} · [原文]({entry['url']})*",
        "",
        f"> 正文没能取到：{reason}",
        ">",
        "> 可以从上面的「原文」链接在微信里打开。",
        "",
    ]
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(front))
    entry["md"] = path
    entry["title"] = title
    entry["account"] = account
    entry["wordCount"] = 0
    entry["stub"] = True
    entry["convertedAt"] = datetime.now(TZ).isoformat(timespec="seconds")
    entry.pop("needsRefresh", None)
    return filename, 0


def strip_front(text):
    return re.sub(r"^---\r?\n[\s\S]*?\r?\n---\r?\n", "", text or "", count=1)


def md_body(text):
    """The article body of an exported file: drop front-matter, title and meta."""
    lines = strip_front(text).split("\n")
    i = 0
    while i < len(lines) and lines[i].strip() == "":
        i += 1
    if i < len(lines) and lines[i].startswith("# "):
        i += 1
    while i < len(lines) and lines[i].strip() == "":
        i += 1
    if i < len(lines) and lines[i].startswith("*") and "[原文]" in lines[i]:
        i += 1
    while i < len(lines) and lines[i].strip() == "":
        i += 1
    return "\n".join(lines[i:]).strip()


def build_text(entry):
    """Render one entry to a full Markdown document without touching disk."""
    html_path = os.path.join(HERE, entry["html"]) if entry.get("html") else ""
    raw = open(html_path, encoding="utf-8", errors="replace").read() if html_path and os.path.exists(html_path) else ""
    if raw.strip() == "":
        return None

    doc = LH.fromstring(raw)
    title = one_line("".join(doc.xpath('//*[@id="activity-name"]//text()'))) or entry["title"]
    account = one_line("".join(doc.xpath('//*[@id="js_name"]//text()'))) or entry.get("account") or ""

    publish = one_line("".join(doc.xpath('//*[@id="publish_time"]//text()')))
    if not re.search(r"\d{4}", publish):
        match = re.search(r'var\s+ct\s*=\s*"(\d{9,11})"', raw)
        publish = (
            datetime.fromtimestamp(int(match.group(1)), TZ).strftime("%Y-%m-%d")
            if match
            else datetime.fromtimestamp(entry["collectedAt"], TZ).strftime("%Y-%m-%d")
        )

    nodes = doc.xpath('//*[@id="js_content"]')
    body = normalize(render(nodes[0])) if nodes else ""
    if not body.strip():
        return None

    filename = os.path.basename(entry["md"]) if entry.get("md") else (
        f'{entry["index"]:02d}-{safe_name(account, 20)}-{safe_name(title, 60)}.md'
    )
    stamp = datetime.fromtimestamp(entry["collectedAt"], TZ).strftime("%Y-%m-%d")
    words = len(re.sub(r"\s", "", body))
    front = [
        "---",
        f'title: "{title.replace(chr(34), chr(39))}"',
        f'account: "{account}"',
        f'publishTime: "{publish}"',
        f'collectedAt: "{stamp}"',
        f'reviewId: "{entry["reviewId"]}"',
        f'source: "{entry["url"]}"',
        'sourceName: "微信读书 · 文章收藏"',
        f"exportedAt: \"{datetime.now(TZ).strftime('%Y-%m-%dT%H:%M:%S%z')}\"",
        f"wordCount: {words}",
        'tags: ["微信读书", "文章收藏", "公众号"]',
        "---",
        "",
        f"# {title}",
        "",
        f"*{account} · {publish} · [原文]({entry['url']})*",
        "",
        "",
    ]
    return {
        "text": "\n".join(front) + body,
        "body": body,
        "filename": filename,
        "title": title,
        "account": account,
        "publish": publish,
        "words": words,
    }


def convert(entry):
    built = build_text(entry)
    if built is None:
        return write_stub(entry, entry["title"], entry.get("account") or "", "-", "正文为空或取不到（可能已删除、下架或仅付费可读）")

    path = os.path.join(OUT, built["filename"])
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(built["text"])

    entry["md"] = path
    entry["title"] = built["title"]
    entry["account"] = built["account"]
    entry["wordCount"] = built["words"]
    entry["convertedAt"] = datetime.now(TZ).isoformat(timespec="seconds")
    entry.pop("needsRefresh", None)
    entry.pop("stub", None)
    return built["filename"], built["words"]


def preview(entry):
    """Render into memory and compare with the file on disk.

    Returns ("same" | "changed" | "new" | "stub", built). A changed article's new
    text goes to `.cache/pending/` and the current Markdown stays untouched until
    the user picks a version.
    """
    built = build_text(entry)
    if built is None:
        entry.pop("needsRefresh", None)
        return "stub", None

    if not entry.get("md") or not os.path.exists(entry["md"]):
        path = os.path.join(OUT, built["filename"])
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(built["text"])
        entry["md"] = path
        entry["title"] = built["title"]
        entry["account"] = built["account"]
        entry["wordCount"] = built["words"]
        entry.pop("needsRefresh", None)
        return "new", built

    with open(entry["md"], encoding="utf-8", errors="replace") as fh:
        old_text = fh.read()

    if md_body(old_text) == built["body"].strip():
        # Same article body: refresh front-matter in place, nothing to review.
        with open(entry["md"], "w", encoding="utf-8") as fh:
            fh.write(built["text"])
        if entry.get("pendingNew") and os.path.exists(entry["pendingNew"]):
            os.remove(entry["pendingNew"])
        entry.pop("pendingNew", None)
        entry.pop("pendingAt", None)
        entry["title"] = built["title"]
        entry["account"] = built["account"]
        entry["wordCount"] = built["words"]
        entry.pop("needsRefresh", None)
        return "same", built

    pending_dir = os.path.join(HERE, ".cache", "pending")
    os.makedirs(pending_dir, exist_ok=True)
    pending_path = os.path.join(pending_dir, f'{entry["index"]:02d}-{safe_name(built["title"], 60)}.md')
    with open(pending_path, "w", encoding="utf-8") as fh:
        fh.write(built["text"])
    entry["pendingNew"] = pending_path
    entry["pendingAt"] = datetime.now(TZ).isoformat(timespec="seconds")
    entry.pop("needsRefresh", None)
    return "changed", built


def write_manifest(state):
    articles = []
    for item in sorted(state["articles"], key=lambda a: a["collectedAt"], reverse=True):
        if not item.get("md"):
            continue
        articles.append(
            {
                "id": item["reviewId"],
                "index": item["index"],
                "title": item["title"],
                "account": item["account"],
                "collectedAt": item["collectedAt"],
                "collectedAtText": datetime.fromtimestamp(item["collectedAt"], TZ).strftime("%Y-%m-%d"),
                "file": os.path.basename(item["md"]),
                "wordCount": item.get("wordCount", 0),
                "removed": bool(item.get("removed")),
                "wechat": bool(item.get("fromWechat")),
                "stub": bool(item.get("stub")),
            }
        )
    manifest = {
        "version": 1,
        "updatedAt": datetime.now(TZ).isoformat(timespec="seconds"),
        "dir": OUT,
        "activeCount": sum(1 for a in articles if not a["removed"]),
        "articles": articles,
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    return manifest


def build_index(state):
    active = [a for a in state["articles"] if not a.get("removed") and a.get("md")]
    removed = [a for a in state["articles"] if a.get("removed") and a.get("md")]
    active.sort(key=lambda a: a["collectedAt"], reverse=True)
    removed.sort(key=lambda a: a.get("removedAt") or "", reverse=True)

    total_words = sum(a.get("wordCount", 0) for a in active)
    lines = [
        "# 微信读书 · 文章收藏",
        "",
        f"共 {len(active)} 篇 · 约 {total_words:,} 字 · 索引更新于 {datetime.now(TZ).strftime('%Y-%m-%d %H:%M')}。",
        "",
        "| 收藏时间 | 标题 | 公众号 | 字数 |",
        "| --- | --- | --- | --- |",
    ]
    for item in active:
        name = os.path.basename(item["md"])
        lines.append(
            f"| {datetime.fromtimestamp(item['collectedAt'], TZ).strftime('%Y-%m-%d')} "
            f"| [{item['title']}](<{name}>) | {item['account']} | {item.get('wordCount', 0)} |"
        )

    if removed:
        lines += ["", "## 已从收藏移除", "", "| 标题 | 公众号 | 移除时间 |", "| --- | --- | --- |"]
        for item in removed:
            when = (item.get("removedAt") or "")[:10]
            name = os.path.basename(item["md"])
            lines.append(f"| [{item['title']}](<{name}>) | {item['account']} | {when} |")

    with open(os.path.join(OUT, "index.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return len(active), len(removed)


def write_pending(changed):
    items = []
    for entry, built in changed:
        items.append(
            {
                "id": entry["reviewId"],
                "index": entry["index"],
                "title": built["title"],
                "account": built["account"],
                "oldFile": os.path.basename(entry["md"]),
                "newFile": os.path.basename(entry["pendingNew"]),
                "oldPath": entry["md"],
                "newPath": entry["pendingNew"],
                "oldWords": entry.get("wordCount", 0),
                "newWords": built["words"],
            }
        )
    payload = {
        "updatedAt": datetime.now(TZ).isoformat(timespec="seconds"),
        "items": items,
    }
    with open(os.path.join(OUT, "pending.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    return payload


def main():
    state = json.load(open(STATE, encoding="utf-8"))
    if "--all" in sys.argv:
        for entry in state["articles"]:
            if entry.get("html"):
                entry["needsRefresh"] = True

    if "--preview" in sys.argv:
        # Force-refresh preview: convert everything fetched into memory, write the
        # new text aside, and leave the live Markdown for the user to decide.
        candidates = [a for a in state["articles"] if a.get("needsRefresh") or not a.get("md")]
        print(f"preview: {len(candidates)}")
        changed = []
        same = 0
        fresh = 0
        stubs = 0
        for entry in candidates:
            status, built = preview(entry)
            if status == "changed":
                changed.append((entry, built))
                print(f"  改动 {entry['title']}")
            elif status == "same":
                same += 1
            elif status == "new":
                fresh += 1
            else:
                stubs += 1
        payload = write_pending(changed)
        with open(STATE, "w", encoding="utf-8") as fh:
            json.dump(state, fh, ensure_ascii=False, indent=2)
        print(f"preview 结果：改动 {len(payload['items'])} · 相同 {same} · 新增文件 {fresh} · 无正文 {stubs}")
        print(json.dumps({"ok": True, "changed": len(payload["items"]), "same": same, "new": fresh, "stub": stubs, "dir": OUT}, ensure_ascii=False))
        return

    pending = [a for a in state["articles"] if not a.get("md") or a.get("needsRefresh")]
    print(f"pending: {len(pending)}")
    for entry in pending:
        result = convert(entry)
        if result is None:
            print(f"  跳过：{entry['title']}")
            continue
        filename, words = result
        print(f"  ok {filename} ({words} chars)")

    with open(STATE, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)

    manifest = write_manifest(state)
    active, removed = build_index(state)
    print(f"index: {active} active, {removed} removed → {OUT}")
    print(json.dumps({"ok": True, "active": active, "removed": removed, "total": len(manifest["articles"]), "dir": OUT}, ensure_ascii=False))


if __name__ == "__main__":
    main()
