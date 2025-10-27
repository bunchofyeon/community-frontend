import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader('posts');
requireAuth(); // 목록 페이지 로그인 필요..?

const listEl = document.getElementById('postList');
const pagerEl = document.getElementById('pagination');

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function getUiPage() {
  const url = new URL(location.href);
  const p = parseInt(url.searchParams.get('page') || '1', 10);
  return Number.isNaN(p) || p < 1 ? 1 : p; // UI는 1부터
}
function setUiPage(p) {
  const url = new URL(location.href);
  url.searchParams.set('page', String(p));
  history.pushState(null, '', url); // 주소만 갱신
}

// 렌더링
function renderList(items) {
  if (!items.length) {
    listEl.innerHTML = `<div class="empty">게시글이 없습니다.</div>`;
    return;
  }
  listEl.innerHTML = items.map(p => {
    const title = (p.title ?? '').trim() || '(제목 없음)';
    const author = p.authorNickname ?? p.nickname ?? '익명';
    const created = fmtDate(p.createdAt);
    const updated = fmtDate(p.updatedAt);

    return `
      <div class="post-row">
        <div class="col title">
          <a href="post-detail.html?id=${p.id}">${title}</a>
        </div>
        <div class="col author">${author}</div>
        <div class="col date">${created}</div>
        <div class="col update">${updated}</div>
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
  const end = Math.min(totalPages, Math.max(start + 4, uiPage)); // 최대 5개 노출

  pagerEl.innerHTML = '';
  pagerEl.appendChild(makeBtn('‹', Math.max(1, uiPage - 1), uiPage === 1));
  for (let p = start; p <= end; p++) {
    pagerEl.appendChild(makeBtn(String(p), p, false, p === uiPage));
  }
  pagerEl.appendChild(makeBtn('›', Math.min(totalPages, uiPage + 1), uiPage === totalPages));
}

// ===== 데이터 로드 =====
async function loadPosts() {
  try {
    const uiPage = getUiPage();     // 1,2,3...
    const page = uiPage - 1;        // 서버는 0부터
    const size = 10;
    const sort = 'createdAt,desc';

    const qs = new URLSearchParams({ page, size, sort }).toString();
    const res = await apiFetch(`/posts/list?${qs}`, { method: 'GET' });

    // ApiResponse<Page<T>> or Page<T> 지원
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? [];
    const totalPages = pageObj?.totalPages ?? 1;

    renderList(items);
    renderPagination(uiPage, totalPages);
  } catch (err) {
    console.error('[posts] list load error', err);
    alert('목록 불러오기 실패: ' + (err?.message || '알 수 없는 오류'));
  }
}

// ===== 이벤트 =====
window.addEventListener('popstate', loadPosts); // 뒤/앞으로 가기 대응
document.addEventListener('DOMContentLoaded', loadPosts);