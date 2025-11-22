// boot.js
import { loadLayout } from './layout.js';
import { renderHeader } from './common.js';

async function boot() {
  await loadLayout();
  renderHeader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}