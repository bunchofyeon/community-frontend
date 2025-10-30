// week5/scripts/postDetail.js
import { renderHeader } from './common.js';
import { apiFetch } from './api.js';

renderHeader();

const postId = new URLSearchParams(location.search).get('id');
const detailEl = document.getElementById('postDetail');
const listEl   = document.getElementById('commentList');
const formEl   = document.getElementById('commentForm');
const inputEl  = document.getElementById('commentContent');
const sentinel = document.getElementById('commentsSentinel');

const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('ko-KR') : '';
const esc = (s='') => s
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#39;');
const isEdited = (c,u) => c && u && new Date(u).getTime() !== new Date(c).getTime();

/* ================== 게시글 상세 ================== */
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
      <h2 class="detail-title">${esc(p.title ?? '')}</h2>
      <div class="meta">${meta}</div>
      <div class="detail-content">${esc(p.content ?? '').replaceAll('\n','<br />')}</div>
      ${controls}
    `;

    if (loggedIn) {
      document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
          alert('삭제 완료');
          location.href='posts.html';
        } catch (e) {
          alert('삭제 실패: ' + (e?.message || ''));
        }
      });
    }
  } catch (err) {
    alert('게시글을 불러오지 못했습니다: ' + (err?.message || ''));
  }
}

/* ================== 무한 스크롤 상태 ================== */
let page = 0;          // 서버의 page (0-base)
const size = 10;
let loading = false;
let lastPage = false;

/* ================== 댓글 append ================== */
function appendComments(items) {
  const html = items.map(c => {
    const when = isEdited(c.createdAt, c.updatedAt)
      ? `${fmtDT(c.updatedAt)} (수정됨)`
      : fmtDT(c.createdAt);
    return `
      <div class="comment-item" id="comment-${c.id}" data-id="${c.id}">
        <div class="comment-body">
          <div class="author">${esc(c.nickname ?? '익명')}</div>
          <div class="content">${esc(c.content ?? '')}</div>
          <div class="when">${when}</div>
        </div>
        <div class="comment-actions">
          <button class="btn xs edit" data-id="${c.id}">수정</button>
          <button class="btn xs danger delete" data-id="${c.id}">삭제</button>
        </div>
      </div>`;
  }).join('');
  listEl.insertAdjacentHTML('beforeend', html);
}

/* ================== 댓글 한 페이지 로드 ================== */
async function loadCommentsPage() {
  if (loading || lastPage) return;
  loading = true;
  try {
    const qs = new URLSearchParams({ page, size, sort: 'id,asc' }).toString();
    const res = await apiFetch(`/posts/${postId}/comments/list?${qs}`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? (Array.isArray(pageObj) ? pageObj : []);
    const totalPages = typeof pageObj?.totalPages === 'number' ? pageObj.totalPages : null;

    if (items.length > 0) {
      appendComments(items);
    }

    // ✅ lastPage 판정은 "현재 페이지가 마지막인지"를 서버 값 우선으로
    // 서버 totalPages가 있으면 그걸 신뢰
    if (totalPages != null) {
      // page는 0-base, totalPages는 1-base 개념이므로 현재 페이지가 마지막인지: (page >= totalPages - 1)
      lastPage = (page >= totalPages - 1);
    } else {
      // 서버가 totalPages 안 주는 경우엔, 받아온 개수가 size보다 작으면 마지막
      lastPage = (items.length < size);
    }

    // ✅ 마지막 판정 뒤에 page 증가 (다음 호출 준비)
    if (!lastPage) page += 1;

  } catch (e) {
    console.error('댓글 불러오기 실패:', e);
  } finally {
    loading = false;
  }
}

/* ================== IntersectionObserver + Scroll fallback ================== */
function ensureInfiniteScroll() {
  // 옵저버
  const io = new IntersectionObserver(async (entries) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      await loadCommentsPage();
    }
  }, { root: null, rootMargin: '0px 0px 300px 0px', threshold: 0.01 });

  io.observe(sentinel);

  // 스크롤 백업 (일부 브라우저/레이아웃에서 IO 동작 불안정할 때)
  let ticking = false;
  window.addEventListener('scroll', async () => {
    if (ticking || loading || lastPage) return;
    ticking = true;
    requestAnimationFrame(async () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        await loadCommentsPage();
      }
      ticking = false;
    });
  }, { passive: true });
}

/* ================== 댓글 작성 ================== */
formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = inputEl.value.trim();
  if (!content) return;
  if (!localStorage.getItem('token')) { alert('로그인 후 댓글을 작성할 수 있습니다.'); location.href='login.html'; return; }

  try {
    await apiFetch(`/posts/${postId}/comments/write`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    // 초기화 후 첫 페이지부터 다시 로드
    inputEl.value = '';
    listEl.innerHTML = '';
    page = 0;
    lastPage = false;
    await loadCommentsPage(); // 첫 페이지 즉시 로드
  } catch (err) {
    alert('댓글 작성 실패: ' + (err?.message || ''));
  }
});

/* ================== 인라인 수정/삭제 (이벤트 위임) ================== */
function enterEditMode(itemEl, cid) {
  const contentEl = itemEl.querySelector('.content');
  const original = contentEl?.textContent ?? '';

  // 이미 편집 중이면 무시
  if (itemEl.querySelector('textarea')) return;

  // 본문 숨기고 편집 UI 추가
  contentEl.hidden = true;

  const editWrap = document.createElement('div');
  editWrap.className = 'edit-row';

  editWrap.innerHTML = `
    <textarea class="edit-ta">${original}</textarea>
    <div class="edit-actions">
      <button class="btn xs save">저장</button>
      <button class="btn xs ghost cancel">취소</button>
    </div>
  `;

  itemEl.querySelector('.comment-body').appendChild(editWrap);

  // 저장
  editWrap.querySelector('.save').addEventListener('click', async () => {
    const next = editWrap.querySelector('.edit-ta').value.trim();
    try {
      await apiFetch(`/posts/${postId}/comments/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: next }),
      });
      // 화면 반영
      contentEl.textContent = next;
      const whenEl = itemEl.querySelector('.when');
      whenEl.textContent = `${fmtDT(new Date().toISOString())} (수정됨)`;
      exitEditMode(itemEl);
    } catch (err) {
      alert('수정 실패: ' + (err?.message || ''));
    }
  });

  // 취소
  editWrap.querySelector('.cancel').addEventListener('click', () => {
    exitEditMode(itemEl);
  });
}

function exitEditMode(itemEl) {
  const contentEl = itemEl.querySelector('.content');
  contentEl.hidden = false;
  itemEl.querySelector('.edit-row')?.remove();
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const cid = btn.dataset.id || btn.closest('.comment-item')?.dataset.id;
  if (!cid) return;

  if (!localStorage.getItem('token')) {
    alert('로그인 후 이용할 수 있습니다.');
    location.href='login.html';
    return;
  }

  const item = document.getElementById(`comment-${cid}`);

  if (btn.classList.contains('delete')) {
    if (!confirm('댓글을 삭제할까요?')) return;
    try {
      await apiFetch(`/posts/${postId}/comments/${cid}`, { method: 'DELETE' });
      // 화면에서 제거
      item?.remove();
    } catch (err) {
      alert('삭제 실패: ' + (err?.message || ''));
    }
    return;
  }

  if (btn.classList.contains('edit')) {
    enterEditMode(item, cid);
  }
});

/* ================== 특정 댓글 포커스(옵션) ================== */
async function focusCommentIfNeeded() {
  const targetCid = new URLSearchParams(location.search).get('commentId');
  if (!targetCid) return;

  let el = document.getElementById(`comment-${targetCid}`);
  let safety = 12; // 최대 12페이지 탐색

  while (!el && !lastPage && safety-- > 0) {
    await loadCommentsPage();
    el = document.getElementById(`comment-${targetCid}`);
  }
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('focus-highlight');
    setTimeout(() => el.classList.remove('focus-highlight'), 1600);
  }
}

/* ================== 초기 로드 ================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadPost();
  // 첫 페이지 미리 적재
  await loadCommentsPage();
  // 무한 스크롤 가동 (IO + scroll fallback)
  ensureInfiniteScroll();
  // commentId 포커스 지원(옵션)
  await focusCommentIfNeeded();
});