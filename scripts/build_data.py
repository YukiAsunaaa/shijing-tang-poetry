"""Build reproducible literal-image counts from the supplied Quan Tang Shi text."""
import argparse
import hashlib
import json
import re
from pathlib import Path

CATEGORIES = [
    ("seasons", "四时", list("春夏秋冬")),
    ("plants", "花木", list("花柳松梅竹桃莲菊兰桂荷杏")),
    ("landscape", "山水", list("山水江海溪泉河湖峰川")),
    ("sky", "天象", list("云月日风雨雪星霞霜露")),
    ("colors", "色彩", list("白青红绿紫碧黄朱翠黑")),
]
HEADER = re.compile(r"卷[ \t]*(\d+)_(\d+)")
FAVORITES = {"李白": 0, "杜甫": 1, "王维": 2, "孟浩然": 3, "白居易": 4, "刘禹锡": 5, "杜牧": 6, "李商隐": 7}
PREFERRED = {"春": "春晓", "秋": "秋夕", "夏": "山亭夏日", "冬": "问刘十九", "花": "春晓", "山": "望岳", "水": "望天门山", "月": "静夜思", "风": "咏柳", "雨": "春夜喜雨", "雪": "江雪", "白": "登鹳雀楼"}


def parse_corpus(raw):
    headers = list(HEADER.finditer(raw))
    poems = []
    for i, match in enumerate(headers):
        block = raw[match.end():headers[i + 1].start() if i + 1 < len(headers) else len(raw)]
        title_line = re.match(r"[ \t]*【([^】]+)】([^\n]*)", block)
        title = title_line[1].strip() if title_line else "原文未题"
        author = re.sub(r"\s+", "", title_line[2]) if title_line else "原文未署名"
        if title_line:
            block = block[title_line.end():]
        lines = []
        for line in block.splitlines():
            line = line.strip()
            if not line or re.match(r"^(?:卷[一二三四五六七八九十百千\d]+|[-─]{3,}|<|正文|全唐诗)", line):
                continue
            if re.search(r"[，。！？；、]", line) and not re.search(r"https?://|制作|版权", line):
                line = re.sub(r"[（(][^）)]*[）)]", "", line)
                lines.append(line)
        body = "\n".join(lines)
        if not body:
            continue
        poems.append({"id": f"{match[1]}_{match[2]}", "title": title, "author": author or "原文未署名", "body": body})
    return poems


def build(source, output):
    content = source.read_bytes()
    poems = parse_corpus(content.decode("utf-8-sig"))
    selected = {}
    categories = []
    for slug, name, terms in CATEGORIES:
        items = []
        for term in terms:
            matches = [p for p in poems if term in p["body"]]
            examples = sorted(matches, key=lambda p: (p["title"] != PREFERRED.get(term), p["title"] in {"句", "逸句", "残句"}, len(p["body"]) > 130, FAVORITES.get(p["author"], 50), len(p["body"])))[:30]
            selected.update({p["id"]: p for p in examples})
            items.append({"name": term, "count": sum(p["body"].count(term) for p in matches), "poems": len(matches), "examples": [p["id"] for p in examples]})
        categories.append({"id": slug, "name": name, "items": sorted(items, key=lambda x: -x["count"])})
    result = {"meta": {"source": "训练营附件《全唐诗.txt》", "sha256": hashlib.sha256(content).hexdigest(), "records": len(poems), "characters": sum(len(re.findall(r"[\u4e00-\u9fff]", p["body"])) for p in poems), "authors": len(set(p["author"] for p in poems)), "headerCount": len(list(HEADER.finditer(content.decode('utf-8-sig')))), "method": "诗歌正文逐字匹配；不计目录、卷号、诗题、作者及括注。同一字在一篇中多次出现分别计数；涉及篇目按源文件篇目记录去重，组诗不拆分。字面统计不等同于语义识别，如‘白’可能是颜色，也可能是其他用法。"}, "categories": categories, "poems": selected}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"records": len(poems), "headers": result['meta']['headerCount'], "examplePoems": len(selected), "bytes": output.stat().st_size, "counts": {c['name']: {x['name']: x['count'] for x in c['items']} for c in categories}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/data/poetry.json"))
    args = parser.parse_args()
    build(args.source, args.output)
