# 메인 페이지 이미지 만들기: 게임·앱 원본 이미지를 작은 WebP로 줄여 hub/img/에 둔다
# 실행: python3 hub/tools/make-images.py (저장소 맨 위에서)
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'hub', 'img')
os.makedirs(OUT, exist_ok=True)

def save(src, name, size, crop=None, quality=82):
    im = Image.open(os.path.join(ROOT, src)).convert('RGB')
    if crop:  # 가로세로 비율 맞춰 가운데 자르기
        w, h = im.size
        tw, th = crop
        r = max(tw / w, th / h)
        im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
        w, h = im.size
        l, t = (w - tw) // 2, (h - th) // 2
        im = im.crop((l, t, l + tw, t + th))
    else:
        im.thumbnail(size, Image.LANCZOS)
    im.save(os.path.join(OUT, name), 'WEBP', quality=quality, method=6)
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')

# 배경화면은 tools/wallpapers.mjs가 따로 만든다 (img/wall/)
# 게임 카드 (정사각형)
save('game/assets/store/cover-800x800.png', 'swarm.webp', None, crop=(360, 360))
save('blocks/assets/store/cover-800x800.png', 'blocks.webp', None, crop=(360, 360))
save('merge/assets/store/cover-800x800.png', 'merge.webp', None, crop=(360, 360))
# 파일처럼 보이는 가로 썸네일
save('game/assets/store/screenshot-2.png', 'boss.webp', None, crop=(480, 270))
# 토스 앱 로고
save('toss-apps/store/salary/logo-600.png', 'app-salary.webp', None, crop=(240, 240))
save('toss-apps/store/fortune/logo-600.png', 'app-fortune.webp', None, crop=(240, 240))
