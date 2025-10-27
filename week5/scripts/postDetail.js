// week5/scripts/postDetail.js
import { renderHeader } from './common.js'; // 보기 공개
import { apiFetch } from './api.js';

renderHeader();

const postId = new URLSearchParams(location.search).get('id');
const detailEl = document.getElementById('postDetail');
const listEl   = document.getElementById('commentList');
const pagerEl  = document.getElementById('commentPagination');
const formEl   = document.getElementById('commentForm');
const inputEl  = document.getElementById('commentContent');

const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('ko-KR') : '';
const esc = (s='') => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const isEdited = (c,u) => c && u && new Date(u).getTime() !== new Date(c).getTime();

async function loadPost() {
  if (!postId) { alert('잘못된 접근입니다. (id 누락)'); location.replace('posts.html'); return; }
  try {
    const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
    const p = res?.data ?? res;
    const meta = isEdited(p.createdAt, p.updatedAt)
      ? `${esc(p.nickname ?? '익명')} · ${fmtDT(p.updatedAt)} (수정됨)`
      : `${esc(p.nickname ?? '익명')} · ${fmtDT(p.createdAt)}`;

    const loggedIn = !!localStorage.getItem('token');
    const controls = loggedIn ? `
      <div class="actions" style="margin-top:12px;">
        <a href="post-edit.html?id=${p.id}" class="btn ghost">수정</a>
        <button class="btn danger" id="deleteBtn">삭제</button>
      </div>` : '';

    detailEl.innerHTML = `
      <h2 class="detail-title">${esc(p.title) ?? ''}</h2>
      <div class="meta">${meta}</div>
      <div class="detail-content">${esc(p.content ?? '').replaceAll('\n','<br />')}</div>
      ${controls}
    `;

    if (loggedIn) {
      document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try { await apiFetch(`/posts/${postId}`, { method: 'DELETE' }); alert('삭제 완료'); location.href='posts.html'; }
        catch (e) { alert('삭제 실패: ' + (e?.message || '')); }
      });
    }
  } catch (err) {
    alert('게시글을 불러오지 못했습니다: ' + (err?.message || ''));
  }
}

function renderComments(items) {
  if (!items.length) { listEl.innerHTML = '<div class="empty">댓글이 없습니다.</div>'; return; }
  listEl.innerHTML = items.map(c => {
    const when = isEdited(c.createdAt, c.updatedAt) ? `${fmtDT(c.updatedAt)} (수정됨)` : fmtDT(c.createdAt);
    return `
      <div class="comment-item" data-id="${c.id}">
        <div class="comment-body">
          <div class="author">${esc(c.nickname ?? '익명')}</div>
          <div class="content">${esc(c.content ?? '')}</div>
          <div class="when">${when}</div>
        </div>
        <div class="comment-actions">
          <button class="btn xs edit">수정</button>
          <button class="btn xs danger delete">삭제</button>
        </div>
      </div>`;
  }).join('');
}

function renderPagination(uiPage, totalPages) {
  const makeBtn = (label, to, disabled=false, active=false) => {
    const a = document.createElement('a');
    a.href = `?id=${postId}&cpage=${to}`;
    a.textContent = label;
    a.className = `page-btn${active?' active':''}${disabled?' disabled':''}`;
    a.addEventListener('click', e => {
      e.preventDefault();
      if (disabled || active) return;
      setUiPage(to);
      loadComments();
    });
    return a;
  };
  const start = Math.max(1, uiPage-2);
  const end = Math.min(totalPages, Math.max(start+4, uiPage));
  pagerEl.innerHTML = '';
  pagerEl.appendChild(makeBtn('‹', Math.max(1, uiPage-1), uiPage===1));
  for (let p=start; p<=end; p++) pagerEl.appendChild(makeBtn(String(p), p, false, p===uiPage));
  pagerEl.appendChild(makeBtn('›', Math.min(totalPages, uiPage+1), uiPage===totalPages));
}

const getUiPage = () => {
  const p = parseInt(new URL(location.href).searchParams.get('cpage') || '1', 10);
  return Number.isNaN(p) || p < 1 ? 1 : p;
};
const setUiPage = (p) => {
  const url = new URL(location.href);
  url.searchParams.set('cpage', String(p));
  history.pushState(null, '', url);
};

async function loadComments() {
  try {
    const uiPage = getUiPage();
    const page = uiPage - 1;
    const size = 10;
    const sort = 'createdAt,desc';
    const qs = new URLSearchParams({ page, size, sort }).toString();
    const res = await apiFetch(`/posts/${postId}/comments/list?${qs}`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = Array.isArray(pageObj) ? pageObj : (pageObj?.content ?? []);
    const totalPages = pageObj?.totalPages ?? 1;
    renderComments(items);
    renderPagination(uiPage, totalPages);
  } catch (err) {
    console.error('[comments] list load error', err);
    listEl.innerHTML = '<div class="empty">댓글을 불러오지 못했습니다.</div>';
  }
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = inputEl.value.trim();
  if (!content) return;
  if (!localStorage.getItem('token')) { alert('로그인 후 댓글을 작성할 수 있습니다.'); location.href='login.html'; return; }
  try {
    await apiFetch(`/posts/${postId}/comments/write`, { method:'POST', body: JSON.stringify({ content }) });
    inputEl.value = '';
    setUiPage(1);
    await loadComments();
  } catch (err) {
    alert('댓글 작성 실패: ' + (err?.message || ''));
  }
});

listEl.addEventListener('click', async (e) => {
  const item = e.target.closest('.comment-item');
  if (!item) return;
  const commentId = item.dataset.id;

  if (!localStorage.getItem('token')) {
    if (e.target.classList.contains('edit') || e.target.classList.contains('delete')) {
      alert('로그인 후 이용할 수 있습니다.'); location.href='login.html';
    }
    return;
  }

  if (e.target.classList.contains('delete')) {
    if (!confirm('댓글을 삭제할까요?')) return;
    try { await apiFetch(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }); await loadComments(); }
    catch (err) { alert('삭제 실패: ' + (err?.message || '')); }
    return;
  }

  if (e.target.classList.contains('edit')) {
    const next = prompt('내용을 수정하세요', item.querySelector('.content').textContent);
    if (next == null) return;
    try { await apiFetch(`/posts/${postId}/comments/${commentId}`, { method:'PATCH', body: JSON.stringify({ content: next.trim() }) }); await loadComments(); }
    catch (err) { alert('수정 실패: ' + (err?.message || '')); }
  }
});

window.addEventListener('popstate', loadComments);
document.addEventListener('DOMContentLoaded', async () => {
  await loadPost();
  await loadComments();
});