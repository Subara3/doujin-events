"""水彩風のにじみ素材を作る。

多角形を少しずつ崩しながら、薄い色で何十枚も重ねると、水彩のにじみに近くなる
（Tyler Hobbs の "How to Hack a Painting" の方法）。縁を少し濃くして、紙の目を足す。

使い方: python scripts/watercolor.py
出力: public/img/ に hero.webp（ヘッダー）、paper.webp（背景の紙）、blob-*.webp（種類ごとの色）
      public/og.png（SNSで共有されたときの画像。日本語フォントは OG_FONT で指定、既定は Windows の Noto Serif JP）
"""

import math
import random
from pathlib import Path

import numpy as np
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "img"
SEED = 20261105

# 種類ごとの色（サイトの CSS と同じ値にしておく）
KINDS = {
    "comitia": (61, 111, 168),   # 藍
    "bunfree": (192, 87, 74),    # 茜
    "zine": (217, 161, 43),      # 山吹
    "general": (79, 154, 110),   # 若竹
    "other": (138, 129, 120),    # 鼠
}


def deform(pts, depth, var, rng):
    """辺の真ん中に、少しずれた点を足していく。"""
    for _ in range(depth):
        nxt = []
        for i, (x1, y1, v1) in enumerate(pts):
            x2, y2, v2 = pts[(i + 1) % len(pts)]
            nxt.append((x1, y1, v1))
            length = math.hypot(x2 - x1, y2 - y1)
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            ang = math.atan2(y2 - y1, x2 - x1) + math.pi / 2
            d = rng.gauss(0, length * var * (v1 + v2) / 2)
            nxt.append((mx + math.cos(ang) * d, my + math.sin(ang) * d, (v1 + v2) / 2 * rng.uniform(0.7, 1.3)))
        pts = nxt
    return pts


def base_polygon(cx, cy, r, n, rng):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r * rng.uniform(0.8, 1.15)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr * rng.uniform(0.75, 1.0), rng.uniform(0.4, 1.6)))
    return pts


def wash(size, cx, cy, r, rng, layers=40, peak=0.5):
    """1色分のにじみの濃さ（0〜1）を作る。色はあとで付ける。"""
    w, h = size
    acc = np.zeros((h, w), np.float32)
    base = deform(base_polygon(cx, cy, r, 10, rng), 3, 0.3, rng)
    for _ in range(layers):
        poly = deform(base, 3, 0.25, rng)
        m = Image.new("L", size, 0)
        ImageDraw.Draw(m).polygon([(x, y) for x, y, _ in poly], fill=8)
        acc += np.asarray(m, np.float32)
    a = acc / max(acc.max(), 1)
    # 中の濃さのむら：大きくぼかしたノイズを掛ける
    g = rng_np(rng)
    blot = Image.fromarray((g.uniform(0, 255, (h // 24 + 2, w // 24 + 2))).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    blot = np.asarray(blot.filter(ImageFilter.GaussianBlur(12)), np.float32) / 255
    a *= 0.55 + 0.45 * blot
    # 縁を少し濃く
    blur = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(2, r * 0.05))), np.float32) / 255
    a = a + np.clip(a - blur, 0, 1) * 0.8
    # 顔料の粒
    a *= g.uniform(0.85, 1.0, a.shape).astype(np.float32)
    return np.clip(a * peak, 0, 1)


def glaze(canvas, a, color):
    """紙に絵の具を重ねる（掛け合わせ）。重なったところは自然に濁る。"""
    c = np.array(color, np.float32) / 255
    return canvas * (1 - a[..., None] * (1 - c))


def rng_np(rng):
    return np.random.default_rng(rng.randrange(1 << 30))


def paper(size, rng, strength=10):
    """紙の目。細かいノイズを少しだけぼかして、白に重ねる。"""
    w, h = size
    g = rng_np(rng)
    n = g.normal(0, 1, (h, w)).astype(np.float32)
    n = np.asarray(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), np.float32) - 128
    # 横に流れる繊維っぽさ
    fib = np.asarray(Image.fromarray(((g.normal(0, 1, (h, w)) * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3)).resize((w, h)), np.float32) - 128
    v = 250 + (n * 0.6 + fib * 0.4) * strength / 40
    return np.clip(v, 225, 255)


def to_webp(arr, path, quality=82):
    mode = "RGBA" if arr.shape[-1] == 4 else "RGB"
    Image.fromarray(arr.clip(0, 255).astype(np.uint8), mode).save(path, "WEBP", quality=quality, method=6)
    print(path.name, path.stat().st_size // 1024, "KB")


def tileable(arr):
    """左右・上下をずらして重ね、継ぎ目を目立たなくする。"""
    h, w = arr.shape[:2]
    sx, sy = w // 2, h // 2
    rolled = np.roll(np.roll(arr, sx, 1), sy, 0)
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.minimum(np.minimum(xx, w - 1 - xx) / (w / 2), np.minimum(yy, h - 1 - yy) / (h / 2))
    m = np.clip(m * 2, 0, 1)
    return arr * m + rolled * (1 - m)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SEED)

    # ヘッダー：右側に色が集まり、左（文字の下）は薄く
    W, H = 1600, 520
    p = paper((W, H), rng)
    canvas = np.repeat(p[..., None], 3, -1)
    spots = [
        ("comitia", 1180, 230, 240, 0.55), ("bunfree", 1430, 340, 200, 0.5), ("zine", 960, 400, 160, 0.55),
        ("general", 1500, 90, 150, 0.45), ("comitia", 740, 110, 110, 0.35), ("bunfree", 280, 500, 120, 0.25),
        ("zine", 1290, 40, 100, 0.4), ("general", 40, 40, 100, 0.25),
    ]
    for key, cx, cy, r, peak in spots:
        canvas = glaze(canvas, wash((W, H), cx, cy, r, rng, layers=45, peak=peak), KINDS[key])
    to_webp(canvas, OUT / "hero.webp", quality=80)

    # 背景の紙（繰り返して敷く）
    t = tileable(paper((384, 384), rng, strength=7))
    to_webp(np.repeat(t[..., None], 3, -1) * np.array([1.0, 0.995, 0.985]), OUT / "paper.webp", quality=75)

    # 種類ごとの小さなにじみ（日付の下に敷く）。色はそのまま、濃さを透明度にする
    for key, col in KINDS.items():
        s = (220, 150)
        a = wash(s, 110, 75, 58, rng, layers=40, peak=0.6)
        img = np.zeros((s[1], s[0], 4), np.float32)
        img[..., :3] = col
        img[..., 3] = a * 255
        to_webp(img, OUT / f"blob-{key}.webp", quality=85)

    og(rng)


def og(rng):
    W, H = 1200, 630
    canvas = np.repeat(paper((W, H), rng)[..., None], 3, -1)
    for key, cx, cy, r, peak in [
        ("comitia", 980, 170, 210, 0.55), ("bunfree", 1130, 470, 190, 0.5), ("zine", 820, 520, 140, 0.55),
        ("general", 1160, 60, 120, 0.45), ("bunfree", 60, 600, 110, 0.25), ("comitia", 40, 30, 90, 0.2),
    ]:
        canvas = glaze(canvas, wash((W, H), cx, cy, r, rng, layers=45, peak=peak), KINDS[key])
    img = Image.fromarray(canvas.clip(0, 255).astype(np.uint8), "RGB")
    path = os.environ.get("OG_FONT", "C:/Windows/Fonts/NotoSerifJP-VF.ttf")
    d = ImageDraw.Draw(img)

    def font(size, weight):
        f = ImageFont.truetype(path, size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        return f

    ink = (42, 39, 35)
    d.text((90, 110), "同人誌即売会の日程と申込締切", font=font(30, 500), fill=(110, 104, 95))
    d.text((84, 160), "一次創作イベント", font=font(92, 800), fill=ink)
    d.text((84, 270), "ウォッチャー", font=font(92, 800), fill=ink)
    sub = font(32, 500)
    d.text((90, 420), "一次創作の同人誌即売会の開催日と", font=sub, fill=(77, 72, 66))
    d.text((90, 466), "サークル申込の締切を、カレンダーで。", font=sub, fill=(77, 72, 66))
    d.text((90, 548), "events.subara3.com", font=font(26, 500), fill=(110, 104, 95))
    out = OUT.parent / "og.png"
    img.save(out, optimize=True)
    print(out.name, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
