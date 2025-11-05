// scripts/postDetail.js
import { renderHeader } from './common.js';
import { apiFetch } from './api.js';

renderHeader();

const postId = new URLSearchParams(location.search).get('id');
const detailEl = document.getElementById('postDetail');

const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString('ko-KR') : '');
const esc = (s = '') =>
  s.replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// ✅ 작성일과 수정일 다를 때 (수정됨)
const isEdited = (created, updated) =>
  created && updated && new Date(created).getTime() !== new Date(updated).getTime();

let ME = null;

// 로그인 사용자 정보 불러오기
async function loadMe() {
  try {
    const meRes = await apiFetch('/users/me');
    ME = meRes?.data ?? meRes ?? null;
  } catch {
    ME = null;
  }
}

function isMine(comment) {
  if (!ME) return false;
  const meId = ME.id ?? ME.userId ?? ME.usersId ?? null;
  const meEmail = (ME.email || '').toLowerCase();
  const meNick = ME.nickname;

  const cid =
    comment.userId ??
    comment.usersId ??
    comment.authorId ??
    comment.writerId ??
    comment.memberId ??
    null;
  const cEmail = (comment.email || comment.authorEmail || '').toLowerCase();
  const cNick = comment.nickname || comment.authorNickname || comment.writerNickname;

  if (meId && cid && String(meId) === String(cid)) return true;
  if (meEmail && cEmail && meEmail === cEmail) return true;
  if (meNick && cNick && meNick === cNick) return true;
  return false;
}

/* ================== 게시글 상세 ================== */
async function loadPost() {
  if (!postId) {
    alert('잘못된 접근입니다. (id 누락)');
    location.replace('posts.html');
    return;
  }

  try {
    const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
    const p = res?.data ?? res;

    const meta = `${esc(p.nickname ?? '익명')} · ${fmtDT(p.createdAt)}${
      isEdited(p.createdAt, p.updatedAt) ? ' (수정됨)' : ''
    }`;

    const loggedIn = !!localStorage.getItem('token');
    const controls = loggedIn
      ? `
      <div class="actions" style="margin-top:12px;">
        <a href="post-edit.html?id=${p.id}" class="btn ghost">수정</a>
        <button class="btn danger" id="deleteBtn">삭제</button>
      </div>`
      : '';

    const viewInfo = `<div style="margin-top:6px; color:var(--muted); font-size:14px;">조회수 ${p.viewCount ?? 0}</div>`;

    detailEl.innerHTML = `
      <h2 class="detail-title">${esc(p.title ?? '')}</h2>
      <div class="meta">${meta}</div>
      ${viewInfo}
      <div class="detail-content">${esc(p.content ?? '').replaceAll('\n','<br />')}</div>
      ${controls}
    `;

    if (loggedIn) {
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
    alert('게시글을 불러오지 못했습니다: ' + (err?.message || ''));
  }
}

/* ================== 댓글 목록/작성/수정/삭제 ================== */
async function loadComments() {
  if (!postId) return;
  try {
    const res = await apiFetch(`/posts/${postId}/comments/list`, { method: 'GET' });
    const pageObj = res?.data ?? res;
    const items = pageObj?.content ?? [];
    const box = document.getElementById('commentList');
    if (!box) return;

    if (!items.length) {
      box.innerHTML = `<div class="empty">댓글이 없습니다.</div>`;
      return;
    }

    box.innerHTML = items
      .map((c) => {
        const mine = isMine(c);
        const edited = isEdited(c.createdAt, c.updatedAt) ? ' (수정됨)' : '';
        const actions = mine
          ? `
            <div class="comment-actions">
              <button class="btn xs edit" data-action="edit" data-id="${c.id}">수정</button>
              <button class="btn xs danger" data-action="delete" data-id="${c.id}">삭제</button>
            </div>
          `
          : '';
        return `
          <div class="comment-item" data-id="${c.id}">
            <div class="comment-body" style="flex:1;">
              <div class="author">${esc(c.nickname ?? '익명')}</div>
              <div class="meta" style="color:var(--muted); font-size:13px; margin:2px 0;">
                ${fmtDT(c.createdAt)}${edited}
              </div>
              <div class="content" data-role="content">${esc(c.content ?? '').replaceAll('\n','<br>')}</div>
            </div>
            ${actions}
          </div>
        `;
      })
      .join('');
  } catch (e) {
    console.error('[comments] load fail', e);
  }
}

function setupCommentForm() {
  const form = document.getElementById('commentForm');
  const input = document.getElementById('commentContent');
  if (!form || !input) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = (input.value ?? '').trim();
    if (!content) return;

    try {
      await apiFetch(`/posts/${postId}/comments/write`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      input.value = '';
      await loadComments();
    } catch (err) {
      alert('댓글 작성 실패: ' + (err?.message ?? ''));
    }
  });
}

function setupCommentActions() {
  const box = document.getElementById('commentList');
  if (!box) return;

  box.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    if (action === 'delete') {
      if (!confirm('이 댓글을 삭제할까요?')) return;
      try {
        await apiFetch(`/posts/${postId}/comments/${id}`, { method: 'DELETE' });
        await loadComments();
      } catch (err) {
        alert('댓글 삭제 실패: ' + (err?.message ?? ''));
      }
    }

    if (action === 'edit') {
      const item = btn.closest('.comment-item');
      const contentEl = item?.querySelector('[data-role="content"]');
      const currentText = contentEl ? contentEl.textContent : '';
      const next = prompt('새 댓글 내용을 입력하세요', currentText ?? '');
      if (next == null) return;
      const content = next.trim();
      if (!content) {
        alert('내용이 비어 있습니다.');
        return;
      }
      try {
        await apiFetch(`/posts/${postId}/comments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ content }),
        });
        await loadComments();
      } catch (err) {
        alert('댓글 수정 실패: ' + (err?.message ?? ''));
      }
    }
  });
}

/* ================== 초기 로딩 ================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadMe();
  await loadPost();
  setupCommentForm();
  setupCommentActions();
  await loadComments();
});