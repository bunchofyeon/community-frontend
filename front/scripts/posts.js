// posts.js
import { renderHeader, showToast } from './common.js';
import { apiFetch } from './api.js';

renderHeader('posts');
// 공개목록이라 requireAuth()는 생략

const listEl = document.getElementById('postList');
const pagerEl = document.getElementById('pagination');

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function getUiPage() {
  const p = parseInt(new URL(location.href).searchParams.get('page') || '1', 10);
  return Number.isNaN(p) || p < 1 ? 1 : p;
}
function setUiPage(p) {
  const url = new URL(location.href);
  url.searchParams.set('page', String(p));
  history.pushState(null, '', url);
}

function renderList(items) {
  if (!items.length) {
    listEl.innerHTML = `<div class="empty">게시글이 없습니다.</div>`;
    return;
  }
  listEl.innerHTML = items.map(p => {
    const title   = (p.title ?? '').trim() || '(제목 없음)';
    const author  = p.authorNickname ?? p.nickname ?? '익명';
    const created = fmtDate(p.createdAt);
    const updated = fmtDate(p.updatedAt);
    const views   = p.viewCount ?? 0;

    return `
      <div class="post-row">
        <div class="col title"><a href="post-detail.html?id=${p.id}">${title}</a></div>
        <div class="col author">${author}</div>
        <div class="col date">${created}</div>
        <div class="col update">${updated}</div>
        <div class="col views">${views}</div>
      </div>
    `;
  }).join('');
}

function renderPagination(uiPage, totalPages) {
  const makeBtn = (label, target, disabled=false, active=false) => {
    const a = document.createElement('a');
    a.href = `?page=${target}`;
    a.textContent = label;
    a.className = `page-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (disabled || active) return;
      setUiPage(target);
      loadPosts();
    });
    return a;
  };
  const start = Math.max(1, uiPage - 2);
  const end   = Math.min(totalPages, Math.max(start + 4, uiPage));
  pagerEl.innerHTML = '';
  pagerEl.appendChild(makeBtn('‹', Math.max(1, uiPage - 1), uiPage === 1));
  for (let p = start; p <= end; p++) pagerEl.appendChild(makeBtn(String(p), p, false, p === uiPage));
  pagerEl.appendChild(makeBtn('›', Math.min(totalPages, uiPage + 1), uiPage === totalPages));
}

async function loadPosts() {
  try {
    const uiPage = getUiPage();
    const page = uiPage - 1;
    const size = 10;
    const sort = 'createdAt,desc';
    const qs = new URLSearchParams({ page, size, sort }).toString();

    const res = await apiFetch(`/posts/list?${qs}`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? [];
    const totalPages = pageObj?.totalPages ?? 1;

    renderList(items);
    renderPagination(uiPage, totalPages);
  } catch (err) {
    console.error('[posts] list load error', err);
    showToast('게시글 목록 불러오기에 실패했습니다.', 'error');
  }
}

window.addEventListener('popstate', loadPosts);
document.addEventListener('DOMContentLoaded', loadPosts);