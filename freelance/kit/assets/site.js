// 랜딩 키트 공용 스크립트 (의존성 없음): 메뉴, 머리말, 등장 효과, 사진 크게 보기, 문의 보내기, 카운트다운
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // 머리말: 히어로 위에서는 투명, 내려가면 불투명
  const header = $('[data-header]');
  const onScroll = () => header?.classList.toggle('solid', window.scrollY > 40);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // 모바일 메뉴
  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const setNav = (open) => {
    nav?.classList.toggle('open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    if (open) header?.classList.add('solid'); else onScroll();
  };
  toggle?.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  $$('a', nav || document.createElement('div')).forEach((a) => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { setNav(false); closeLightbox(); } });

  // 스크롤 등장 효과
  const targets = $$('.sec .sec-head, .feature, .plan, .menu-group, .quote, .work, .steps li, .about-media, .about-text, .gallery figure, .screens figure, .faq details');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(el); });
  }

  // 사진 크게 보기
  const box = $('[data-lightbox-view]');
  let lastFocus = null;
  function closeLightbox() {
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }
  $$('[data-lightbox]').forEach((a) => a.addEventListener('click', (e) => {
    if (!box) return;
    e.preventDefault();
    lastFocus = a;
    const img = $('img', box);
    img.src = a.getAttribute('href');
    img.alt = a.querySelector('img')?.alt || '';
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-lightbox-close]', box).focus();
  }));
  box?.addEventListener('click', (e) => { if (e.target === box || e.target.closest('[data-lightbox-close]')) closeLightbox(); });

  // 문의 보내기: action이 있으면 그 주소로 전송(Formspree·구글 시트 스크립트 등), 없으면 샘플 모드
  $$('[data-form]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('.form-msg', form);
    const show = (text, err = false) => { msg.hidden = false; msg.textContent = text; msg.classList.toggle('err', err); };
    let bad = null;
    $$('input, select, textarea', form).forEach((el) => {
      const ok = el.checkValidity();
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = el;
    });
    if (bad) {
      show(bad.name === 'agree' ? '개인정보 수집·이용에 동의해 주세요.' : '필수 항목을 확인해 주세요.', true);
      bad.focus();
      return;
    }
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = data[k] ? `${data[k]}, ${v}` : v; });
    data.page = location.href;
    const button = $('button[type="submit"]', form);
    const action = form.getAttribute('action');
    if (!action) { show(msg.dataset.demo || msg.dataset.ok); form.reset(); return; }
    button.disabled = true;
    try {
      // sheet: 구글 앱스 스크립트(응답을 읽을 수 없어 no-cors), formspree: JSON
      const sheet = form.dataset.provider === 'sheet';
      const res = await fetch(action, sheet
        ? { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) }
        : { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!sheet && !res.ok) throw new Error(res.status);
      show(msg.dataset.ok);
      form.reset();
    } catch {
      show('전송하지 못했습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.', true);
    } finally {
      button.disabled = false;
    }
  }));

  // 출시 카운트다운
  $$('[data-countdown]').forEach((el) => {
    const end = new Date(el.dataset.countdown).getTime();
    const cells = $$('b', el);
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const parts = [Math.floor(s / 86400), Math.floor((s %= 86400) / 3600), Math.floor((s %= 3600) / 60), s % 60];
      parts.forEach((v, i) => { cells[i].textContent = String(v).padStart(2, '0'); });
    };
    tick();
    setInterval(tick, 1000);
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
