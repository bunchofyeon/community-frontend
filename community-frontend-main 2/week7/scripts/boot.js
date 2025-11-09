// week5/scripts/boot.js
import { loadLayout } from './layout.js';
import { renderHeader } from './common.js';

// DOM 파싱 끝난 다음 레이아웃 → 헤더
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await loadLayout();
    renderHeader(); // 현재 경로 기준 active 처리됨
  }, { once: true });
} else {
  (async () => { await loadLayout(); renderHeader(); })();
}