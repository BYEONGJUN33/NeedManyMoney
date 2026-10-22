# 사진을 WebP 여러 크기로 만들고, 공유 미리보기(og.jpg 1200×630)를 자른다.
# 입력(stdin JSON): {"src": 원본 폴더, "out": 출력 폴더, "images": ["hero.jpg", ...], "og": "hero.jpg"}
# 출력(stdout JSON): {"hero.jpg": {"w": 1600, "h": 1067, "widths": [480, 960, 1600], "base": "hero"}, ...}
import json
import os
import sys

from PIL import Image, ImageOps

WIDTHS = (480, 960, 1600)


def fresh(target, source):
    return os.path.exists(target) and os.path.getmtime(target) >= os.path.getmtime(source)


def main():
    req = json.load(sys.stdin)
    os.makedirs(req['out'], exist_ok=True)
    meta = {}
    for name in req['images']:
        src = os.path.join(req['src'], name)
        base = os.path.splitext(name)[0].replace('/', '-')
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        widths = sorted({w for w in WIDTHS if w < im.width} | {min(im.width, WIDTHS[-1])})
        for w in widths:
            target = os.path.join(req['out'], f'{base}-{w}.webp')
            if fresh(target, src):
                continue
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(target, 'WEBP', quality=78, method=5)
        meta[name] = {'w': im.width, 'h': im.height, 'widths': widths, 'base': base}
    if req.get('og'):
        src = os.path.join(req['src'], req['og'])
        target = os.path.join(req['out'], 'og.jpg')
        if not fresh(target, src):
            im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
            ImageOps.fit(im, (1200, 630), Image.LANCZOS).save(target, quality=82, optimize=True)
    json.dump(meta, sys.stdout)


if __name__ == '__main__':
    main()
