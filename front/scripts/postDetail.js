// postDetail.js
import { renderHeader, showToast, confirmModal, setInlineMessage, clearInlineMessage } from './common.js';
import { apiFetch } from './api.js';

renderHeader();

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

// 댓글 인라인 메시지 영역
function commentMsgSel() {
  let el = document.querySelector('#commentMessage');
  if (!el && commentForm) {
    el = document.createElement('p');
    el.id = 'commentMessage';
    el.className = 'form-message';
    commentForm.appendChild(el);
  }
  return el ? '#commentMessage' : null;
}

function renderFilesSection(files) {
  if (!Array.isArray(files) || !files.length) return '';

  const items = files.map((f) => {
    const url = f.fileUrl || f.url || f.downloadUrl;
    if (!url) return '';
    const name = f.originName || f.filename || '';
    return `
      <figure class="post-file-thumb" style="margin:0;">
        <img
          src="${url}"
          alt="${esc(name || '첨부 이미지')}"
          style="width:160px;height:160px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;"
        />
      </figure>
    `;
  }).join('');

  if (!items.trim()) return '';

  return `
    <div class="post-files-wrap" style="margin-top:16px;">
      <div class="chips" style="margin-bottom:8px;">
        <span class="chip">첨부 이미지</span>
      </div>
      <div class="post-files-grid" style="display:flex;gap:12px;flex-wrap:wrap;">
        ${items}
      </div>
    </div>
  `;
}

async function loadPostFiles() {
  try {
    const res = await apiFetch(`/posts/${postId}/files`, { method: 'GET' });
    const list = unwrap(res);
    const files = Array.isArray(list) ? list : [];
    const html = renderFilesSection(files);
    if (html && detailEl) {
      detailEl.insertAdjacentHTML('beforeend', html);
    }
  } catch (e) {
    console.warn('[postDetail] 파일 목록 로드 실패', e);
    showToast('첨부 이미지를 불러오지 못했습니다.', 'error');
  }
}

// 게시글 상세
async function loadPost() {
  if (!postId) {
    showToast('잘못된 접근입니다. (id 누락)', 'error');
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
      <div class="detail-content">
        ${esc(p.content ?? '').replaceAll('\n','<br />')}
      </div>
      ${controls}
    `;

    if (isLoggedIn()) {
      document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        const ok = await confirmModal({
          title: '게시글 삭제',
          message: '이 게시글을 삭제하시겠습니까?',
          confirmText: '삭제',
          cancelText: '취소',
        });
        if (!ok) return;

        try {
          await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
          // 성공 토스트 없이 목록으로 이동
          location.href = 'posts.html';
        } catch (e) {
          console.error('[postDetail] delete error', e);
          showToast('게시글 삭제에 실패했습니다.', 'error');
        }
      });
    }

    await loadPostFiles();
  } catch (err) {
    console.error('[postDetail] load error', err);
    const msg = String(err?.message || '');
    if (msg.includes('[401]')) {
      showToast('로그인이 필요합니다.', 'error');
      location.href = 'login.html';
      return;
    }
    showToast('게시글을 불러오지 못했습니다.', 'error');
  }
}

// 댓글 API
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

// 렌더링
function renderCommentRow(c) {
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
      const original = list.find((x) => String(x.id) === String(id));
      if (!original) return;

      itemEl.querySelector('.edit')?.addEventListener('click', () => {
        if (!isLoggedIn()) {
          showToast('로그인이 필요합니다.', 'error');
          return;
        }
        toEditMode(itemEl, original);

        itemEl.querySelector('.save')?.addEventListener('click', async () => {
          const ta = itemEl.querySelector('textarea');
          const next = (ta?.value ?? '').trim();
          const msgSel = commentMsgSel();
          if (msgSel) clearInlineMessage(msgSel);

          if (!next) {
            if (msgSel) setInlineMessage(msgSel, '댓글 내용을 입력하세요.', 'error');
            showToast('댓글 내용을 입력해주세요.', 'error');
            return;
          }
          try {
            await patchComment(id, next);
            await loadComments();
            // 성공 토스트 없이 목록만 갱신
          } catch (e) {
            console.error('[comments] patch error', e);
            showToast('댓글 수정에 실패했습니다.', 'error');
          }
        });

        itemEl.querySelector('.cancel')?.addEventListener('click', () => loadComments());
      });

      itemEl.querySelector('.delete')?.addEventListener('click', async () => {
        if (!isLoggedIn()) {
          showToast('로그인이 필요합니다.', 'error');
          return;
        }

        const ok = await confirmModal({
          title: '댓글 삭제',
          message: '이 댓글을 삭제하시겠습니까?',
          confirmText: '삭제',
          cancelText: '취소',
        });
        if (!ok) return;

        try {
          await deleteComment(id);
          itemEl.remove();
          // 성공 토스트 없이 바로 제거
        } catch (e) {
          console.error('[comments] delete error', e);
          showToast('댓글 삭제에 실패했습니다.', 'error');
        }
      });
    });
  } catch (e) {
    console.error('[comments] load error', e);
    commentListEl.innerHTML = `<div class="empty">댓글을 불러오지 못했습니다.</div>`;
    showToast('댓글을 불러오지 못했습니다.', 'error');
  }
}

/* ========== 댓글 작성 ========== */
commentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgSel = commentMsgSel();
  if (msgSel) clearInlineMessage(msgSel);

  if (!isLoggedIn()) {
    showToast('댓글 작성은 로그인 후 가능합니다.', 'error');
    location.href = 'login.html';
    return;
  }
  const content = (commentInput?.value ?? '').trim();
  if (!content) {
    if (msgSel) setInlineMessage(msgSel, '댓글 내용을 입력하세요.', 'error');
    showToast('댓글 내용을 입력해주세요.', 'error');
    return;
  }
  try {
    await createComment(content);
    commentInput.value = '';
    await loadComments();
    // 성공 토스트 없이 목록만 갱신
  } catch (err) {
    console.error('[comments] create error', err);
    const msg = String(err?.message || '');
    if (msg.includes('[401]')) {
      showToast('세션이 만료되었습니다. 다시 로그인해주세요.', 'error');
      location.href = 'login.html';
      return;
    }
    showToast('댓글 등록에 실패했습니다.', 'error');
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