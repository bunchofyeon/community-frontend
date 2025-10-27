// scripts/posts.js
import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader('posts');
requireAuth();

document.addEventListener('DOMContentLoaded', loadPosts);

// 날짜 포멧 (YYYY.MM.DD)
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// 목록 불러오기
async function loadPosts() {
  try {
    const res = await apiFetch('/posts/list', { method: 'GET' });
    const payload = res?.data ?? res;
    const items = Array.isArray(payload) ? payload : (payload?.content ?? []);

    const list = document.getElementById('postList');
    if (!items.length) {
      list.innerHTML = `<div class="empty">게시글이 없습니다.</div>`;
      return;
    }

    list.innerHTML = items.map(p => { // 아이템을 HTML로 변환...?...
      const title = (p.title ?? '').trim() || '(제목 없음)';
      const author = p.authorNickname ?? p.nickname ?? '익명';
      const dateStr = fmtDate(p.createdAt);

      return `
        <div class="item">
          <h3 class="title">
            <a class="title-link" href="post-detail.html?id=${p.id}">${title}</a>
          </h3>
          <div class="meta">${author} · ${dateStr}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('[posts] error', err);
    alert('목록 불러오기 실패: ' + (err?.message || '알 수 없는 오류'));
  }
}