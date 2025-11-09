// scripts/postDetail.js
import { renderHeader } from './common.js';
import { apiFetch } from './api.js';          // ✅ isLoggedIn import 제거

renderHeader();

// ✅ 로컬 유틸: 로그인 여부 (api.js 의존 제거)
const isLoggedIn = () => !!localStorage.getItem('token');

const postId = new URLSearchParams(location.search).get('id');
const detailEl = document.getElementById('postDetail');
const commentListEl = document.getElementById('commentList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentContent');

const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString('ko-KR') : '');
const esc = (s = '') =>
  s.replaceAll('&', '&amp;')
   .replaceAll('<', '&lt;')
   .replaceAll('>', '&gt;')
   .replaceAll('"', '&quot;')
   .replaceAll("'", '&#39;');

const isEdited = (c, u) => c && u && new Date(u).getTime() !== new Date(c).getTime();
const unwrap = (r) => (r && typeof r === 'object' && 'data' in r ? r.data : r);

/* ========== 게시글 상세 ========== */
async function loadPost() {
  if (!postId) {
    alert('잘못된 접근입니다. (id 누락)');
    location.replace('posts.html');
    return;
  }
  try {
    const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
    const p = unwrap(res);
    if (!p || typeof p !== 'object') throw new Error('게시글 데이터가 올바르지 않습니다.');

    const meta = isEdited(p.createdAt, p.updatedAt)
      ? `${esc(p.nickname ?? p.authorNickname ?? '익명')} · ${fmtDT(p.updatedAt)} (수정됨)`
      : `${esc(p.nickname ?? p.authorNickname ?? '익명')} · ${fmtDT(p.createdAt)}`;

    // 수정(노란색), 삭제(흰색)
    const controls = isLoggedIn() ? `
      <div class="actions" style="margin-top:12px;">
        <a href="post-edit.html?id=${p.id}" class="btn btn-accent">수정</a>
        <button class="btn btn-light" id="deleteBtn">삭제</button>
      </div>` : '';

    const viewInfo = `
      <div style="margin-top:6px; color:var(--muted); font-size:14px;">
        조회수 ${p.viewCount ?? 0}
      </div>
    `;

    detailEl.innerHTML = `
      <h2 class="detail-title">${esc(p.title ?? '')}</h2>
      <div class="meta">${meta}</div>
      ${viewInfo}
      <div class="detail-content">${esc(p.content ?? '').replaceAll('\n','<br />')}</div>
      ${controls}
    `;

    if (isLoggedIn()) {
      document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
          alert('삭제 완료');
          location.href = 'posts.html';
        } catch (e) {
          alert('삭제 실패: ' + (e?.message || ''));
        }
      });
    }
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.includes('[401]')) {
      alert('로그인이 필요합니다.');
      location.href = 'login.html';
      return;
    }
    alert('게시글을 불러오지 못했습니다: ' + msg);
  }
}

/* ========== 댓글 API (백엔드 라우트 매칭) ========== */
async function getComments() {
  const r = await apiFetch(
    `/posts/${postId}/comments/list?page=0&size=100&sort=createdAt,asc`,
    { method: 'GET' }
  );
  const d = unwrap(r);
  return Array.isArray(d?.content) ? d.content : (Array.isArray(d) ? d : []);
}

async function createComment(content) {
  return await apiFetch(`/posts/${postId}/comments/write`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

async function patchComment(id, content) {
  return await apiFetch(`/posts/${postId}/comments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

async function deleteComment(id) {
  return await apiFetch(`/posts/${postId}/comments/${id}`, { method: 'DELETE' });
}

/* ========== 렌더링 ========== */
function renderCommentRow(c) {
  // 로그인 시 버튼 노출(최종 권한은 서버 검증)
  const showEdit = isLoggedIn();
  const showDelete = isLoggedIn();

  const when = isEdited(c.createdAt, c.updatedAt)
    ? `${fmtDT(c.updatedAt)} (수정됨)`
    : `${fmtDT(c.createdAt)}`;

  return `
    <div class="comment-item" data-id="${c.id}">
      <div class="comment-body">
        <div class="author">${esc(c.authorNickname ?? c.nickname ?? '익명')}</div>
        <div class="content">${esc(c.content ?? '')}</div>
        <div class="when">${when}</div>
      </div>
      <div class="comment-actions">
        ${showEdit ? `<button class="btn btn-accent xs edit">수정</button>` : ''}
        ${showDelete ? `<button class="btn btn-light xs delete">삭제</button>` : ''}
      </div>
    </div>
  `;
}

function toEditMode(itemEl, c) {
  const body = itemEl.querySelector('.comment-body');
  const actions = itemEl.querySelector('.comment-actions');

  body.innerHTML = `
    <div class="author">${esc(c.authorNickname ?? c.nickname ?? '익명')}</div>
    <div class="content">
      <textarea class="input" style="min-height:72px;">${esc(c.content ?? '')}</textarea>
    </div>
    <div class="when">${fmtDT(c.updatedAt ?? c.createdAt)}</div>
  `;
  actions.innerHTML = `
    <button class="btn btn-accent xs save">저장</button>
    <button class="btn ghost xs cancel">취소</button>
  `;
}

async function loadComments() {
  try {
    const list = await getComments();
    commentListEl.innerHTML = list.map(renderCommentRow).join('');

    commentListEl.querySelectorAll('.comment-item').forEach((itemEl) => {
      const id = itemEl.getAttribute('data-id');
      const original = list.find(x => String(x.id) === String(id));
      if (!original) return;

      // 수정
      itemEl.querySelector('.edit')?.addEventListener('click', () => {
        if (!isLoggedIn()) return alert('로그인이 필요합니다.');
        toEditMode(itemEl, original);

        itemEl.querySelector('.save')?.addEventListener('click', async () => {
          const ta = itemEl.querySelector('textarea');
          const next = (ta?.value ?? '').trim();
          if (!next) return alert('내용을 입력하세요.');
          try {
            await patchComment(id, next);
            await loadComments();
          } catch (e) {
            alert('수정 실패: ' + (e?.message || ''));
          }
        });

        itemEl.querySelector('.cancel')?.addEventListener('click', () => loadComments());
      });

      // 삭제
      itemEl.querySelector('.delete')?.addEventListener('click', async () => {
        if (!isLoggedIn()) return alert('로그인이 필요합니다.');
        if (!confirm('이 댓글을 삭제할까요?')) return;
        try {
          await deleteComment(id);
          itemEl.remove();
        } catch (e) {
          alert('삭제 실패: ' + (e?.message || ''));
        }
      });
    });
  } catch (e) {
    commentListEl.innerHTML = `<div class="empty">댓글을 불러오지 못했습니다.</div>`;
  }
}

/* ========== 댓글 작성 ========== */
commentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isLoggedIn()) return alert('댓글 작성은 로그인 후 가능합니다.');
  const content = (commentInput?.value ?? '').trim();
  if (!content) return alert('댓글 내용을 입력하세요.');
  try {
    await createComment(content);
    commentInput.value = '';
    await loadComments();
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.includes('[401]')) {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      location.href = 'login.html';
      return;
    }
    alert('댓글 등록 실패: ' + msg);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadPost();
  await loadComments();

  if (!isLoggedIn() && commentInput) {
    commentInput.disabled = true;
    commentInput.placeholder = '댓글 작성은 로그인 후 가능합니다.';
  }
});