import { loadLayout } from './layout.js';
import { renderHeader } from './common.js';

// DOM 파싱 이후 레이아웃 → 헤더 렌더
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await loadLayout();
    renderHeader();
  }, { once: true });
} else {
  (async () => {
    await loadLayout();
    renderHeader();
  })();
}