// scripts/boot.js
import { renderHeader } from './common.js';

// DOM 로드 후 헤더 렌더링
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => renderHeader(), { once: true });
} else {
  renderHeader();
}