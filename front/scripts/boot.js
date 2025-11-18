import { loadLayout } from './layout.js';
import { renderHeader } from './common.js';

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