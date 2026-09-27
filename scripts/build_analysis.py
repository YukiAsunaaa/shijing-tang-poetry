"""Build reproducible poet emotion and diction-cluster data."""
import argparse
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import jieba
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import Normalizer

from build_data import parse_corpus

EMOTIONS = {
    "喜悦": ["喜", "欢", "乐", "笑", "欣", "醉", "宴", "歌", "舞", "游", "赏", "春风", "明媚", "快意", "得意"],
    "哀愁": ["愁", "悲", "哀", "泣", "泪", "恨", "怨", "苦", "伤", "凄", "寂寞", "惆怅", "憔悴", "断肠", "可怜"],
    "思念": ["思", "忆", "怀", "梦", "归", "故乡", "故园", "故人", "相思", "离别", "别离", "独望", "寄", "念", "乡心"],
    "孤寂": ["独", "孤", "空", "寂", "静", "寒", "冷", "闲", "无人", "夜深", "独坐", "独宿", "空山", "孤舟", "残灯"],
    "旷达": ["闲", "笑", "醉", "忘", "任", "自在", "悠然", "逍遥", "归去", "清风", "明月", "无事", "不羁", "放歌", "高卧"],
    "壮志": ["志", "壮", "剑", "功", "名", "报国", "丈夫", "英雄", "万里", "长风", "凌云", "豪", "战", "征", "边塞"],
}

STOPWORDS = set("的了一是不在有我人这他与为来去时上中无之其而以于亦又更自从将相见知得何谁此彼所只莫未已能可多如若乃且因把被让向到过还却都皆甚最每各某诸凡及或但并则故仍曾正既即才又同共非亦者也兮矣哉焉耳乎而其于以为者也尽馀心道远新看好由徒出陈和地便君事里" + "年月日今日明日昨日") | {"何处", "不知", "不是", "不能", "如此", "日日", "一片", "一夜", "一曲", "一种", "一声"}
INVALID_AUTHORS = {"原文未署名", "无名氏", "佚名", "联句", "郊庙歌辞", "杂曲歌辞"}


def clean_author(author):
    return re.sub(r"[^\u3400-\u9fff]", "", author)


def eligible(author, minimum):
    return author not in INVALID_AUTHORS and minimum <= len(author) <= 5 and re.fullmatch(r"[\u3400-\u9fff]+", author)


def count_terms(text, terms):
    return {term: text.count(term) for term in terms if text.count(term)}


def tokenize(text):
    tokens = []
    for token in jieba.cut(text, cut_all=False):
        token = re.sub(r"[^\u3400-\u9fff]", "", token)
        if not token or token in STOPWORDS or len(token) > 4:
            continue
        tokens.append(token)
    return tokens


def top_poem(poems, terms):
    ranked = sorted(poems, key=lambda poem: (-sum(poem["body"].count(term) for term in terms), len(poem["body"])))
    poem = ranked[0]
    sentence = next((line for line in re.findall(r"[^。！？]+[。！？]?", poem["body"].replace("\n", "")) if any(t in line for t in terms)), poem["body"].splitlines()[0])
    return {"id": poem["id"], "title": poem["title"], "excerpt": sentence[:68]}


def build(source, output, minimum=20, clusters=6):
    poems = parse_corpus(source.read_text(encoding="utf-8-sig"))
    grouped = defaultdict(list)
    for poem in poems:
        author = clean_author(poem["author"])
        if eligible(author, 2):
            grouped[author].append(poem)
    authors = sorted((author for author, rows in grouped.items() if len(rows) >= minimum), key=lambda a: (-len(grouped[a]), a))

    for terms in EMOTIONS.values():
        for term in terms:
            jieba.add_word(term, freq=200000)

    sentiment = []
    documents = []
    for author in authors:
        rows = grouped[author]
        text = "".join(row["body"] for row in rows)
        chars = len(re.findall(r"[\u3400-\u9fff]", text))
        scores = {}
        evidence = {}
        for emotion, terms in EMOTIONS.items():
            counts = count_terms(text, terms)
            raw = sum(counts.values())
            scores[emotion] = round(raw * 10000 / chars, 2)
            leaders = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))[:6]
            evidence[emotion] = {"terms": [{"term": word, "count": count} for word, count in leaders], "poem": top_poem(rows, [word for word, _ in leaders] or terms)}
        dominant = max(scores, key=scores.get)
        sentiment.append({"author": author, "poems": len(rows), "characters": chars, "dominant": dominant, "scores": scores, "evidence": evidence})
        documents.append(" ".join(tokenize(text)))

    vectorizer = TfidfVectorizer(tokenizer=str.split, token_pattern=None, min_df=4, max_df=.8, max_features=1000, sublinear_tf=True)
    matrix = vectorizer.fit_transform(documents)
    latent = Normalizer().fit_transform(TruncatedSVD(n_components=40, random_state=42).fit_transform(matrix))
    kmeans = KMeans(n_clusters=clusters, random_state=42, n_init=50).fit(latent)
    svd = TruncatedSVD(n_components=2, random_state=42)
    coords = svd.fit_transform(matrix)
    for axis in range(2):
        low, high = np.percentile(coords[:, axis], [2, 98])
        coords[:, axis] = np.clip(coords[:, axis], low, high)
        coords[:, axis] -= (low + high) / 2
        coords[:, axis] /= max((high - low) / 2, 1e-9)
    terms = np.array(vectorizer.get_feature_names_out())
    cluster_info = []
    cluster_names = {}
    for cluster_id, center in enumerate(kmeans.cluster_centers_):
        members = np.where(kmeans.labels_ == cluster_id)[0]
        word_center = np.asarray(matrix[members].mean(axis=0)).ravel()
        keywords = [word for word in terms[np.argsort(word_center)[::-1]] if word not in STOPWORDS][:6]
        label = " · ".join(keywords[:3])
        representative = members[np.argmin(np.linalg.norm(latent[members] - center, axis=1))]
        cluster_names[cluster_id] = label
        cluster_info.append({"id": int(cluster_id), "label": label, "keywords": keywords, "size": int(len(members)), "representative": authors[int(representative)]})

    cluster_poets = []
    for index, author in enumerate(authors):
        weights = matrix[index].toarray()[0]
        keywords = [word for word in terms[np.argsort(weights)[::-1]] if weights[vectorizer.vocabulary_[word]] > 0][:8]
        cluster_poets.append({
            "author": author, "poems": len(grouped[author]), "x": round(float(coords[index, 0]), 5), "y": round(float(coords[index, 1]), 5),
            "cluster": int(kmeans.labels_[index]), "clusterLabel": cluster_names[int(kmeans.labels_[index])], "keywords": keywords,
            "dominantEmotion": sentiment[index]["dominant"],
        })

    result = {
        "meta": {
            "authors": len(authors), "minimumPoems": minimum, "clusters": clusters, "randomState": 42,
            "sentimentMethod": "古诗语境词表逐词匹配，按每位诗人的正文汉字数折算为每万字出现次数。类别可重叠；结果表示文本表达倾向，不代表诗人的真实心理。",
            "clusterMethod": "对达到样本门槛的诗人正文使用 jieba 精确模式分词，去停用词后计算 TF-IDF（最多1000词），先以40维语义投影归一化后进行 K-means 分组，再用独立的二维投影展示。坐标仅表示相对用词距离，不表示时代或文学成就。",
            "emotionLexicon": EMOTIONS,
            "svdExplainedVariance": round(float(sum(svd.explained_variance_ratio_)), 4),
        },
        "emotions": list(EMOTIONS.keys()), "sentiment": sentiment, "clusters": cluster_info, "poets": cluster_poets,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"authors": len(authors), "features": len(terms), "clusters": cluster_info, "bytes": output.stat().st_size}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/data/analysis.json"))
    parser.add_argument("--minimum", type=int, default=20)
    parser.add_argument("--clusters", type=int, default=6)
    args = parser.parse_args()
    build(args.source, args.output, args.minimum, args.clusters)
