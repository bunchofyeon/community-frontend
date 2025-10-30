// week5/scripts/layout.js
export async function loadLayout() {
  const currentBody = document.body.cloneNode(true);

  const html = await fetch('layout.html', { cache: 'no-store' }).then(r => r.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = doc.body.innerHTML;

  const slot = document.getElementById('app-content');
  slot.innerHTML = '';
  Array.from(currentBody.childNodes).forEach(node => slot.appendChild(node));

  // 헤더 그림자(선택)
  const hdr = document.querySelector('.header');
  const onScroll = () => hdr && hdr.classList.toggle('is-scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}