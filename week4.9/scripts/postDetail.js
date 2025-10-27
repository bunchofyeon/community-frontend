import { requireAuth } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

const params = new URLSearchParams(location.search);
const postId = params.get('id');
if (!postId) {
  alert('잘못된 접근입니다. (id 없음)');
  location.href = 'posts.html';
}

function fmtDate(v) {
  if (!v) return '';
  try {
    return new Date(v).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replaceAll('. ', '/').replaceAll('.', '');
  } catch { return ''; }
}

function escapeHTML(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// 게시글 상세
async function loadPost() {
  try {
    const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
    const p = res?.data ?? res;

    const title = escapeHTML(p.title ?? '');
    const author = escapeHTML(p.authorNickname ?? p.nickname ?? '익명');
    const date = fmtDate(p.createdAt);
    const content = escapeHTML(p.content ?? '').replaceAll('\n', '<br>');

    document.getElementById('postDetail').innerHTML = `
      <div class="card-body">
        <h1 class="h3 mb-2">${title}</h1>
        <div class="text-muted small mb-3">${author} · ${date}</div>
        <div class="lead">${content}</div>
        <div class="d-flex gap-2 justify-content-end mt-3">
          <a href="post-edit.html?id=${p.id}" class="btn btn-outline-secondary">수정</a>
          <button class="btn btn-danger" id="deleteBtn">삭제</button>
        </div>
      </div>
    `;

    document.getElementById('deleteBtn').addEventListener('click', async () => {
      if (!confirm('삭제하시겠습니까?')) return;
      await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      alert('삭제 완료');
      location.href = 'posts.html';
    });
  } catch (err) {
    alert('게시글을 불러오지 못했습니다: ' + err.message);
  }
}

// 댓글 목록
async function loadComments() {
  try {
    const res = await apiFetch(`/posts/${postId}/comments/list`, { method: 'GET' });
    const page = res?.data ?? res;
    const comments = Array.isArray(page) ? page : (page?.content ?? []);

    const html = comments.map(c => {
      const date = fmtDate(c.createdAt);
      const author = escapeHTML(c.authorNickname ?? '익명');
      const body = escapeHTML(c.content ?? '').replaceAll('\n', '<br>');
      return `
        <div class="list-group-item" data-id="${c.id}">
          <div class="d-flex align-items-start justify-content-between">
            <div class="me-3">
              <div class="fw-semibold">${author}</div>
              <div class="small text-muted">${date}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary edit">수정</button>
              <button class="btn btn-sm btn-danger delete">삭제</button>
            </div>
          </div>
          <div class="mt-2">${body}</div>
        </div>
      `;
    }).join('');

    document.getElementById('commentList').innerHTML =
      html || '<div class="list-group-item text-center text-muted">댓글이 없습니다.</div>';
  } catch (err) {
    console.error(err);
    document.getElementById('commentList').innerHTML =
      '<div class="list-group-item text-danger">댓글을 불러오지 못했습니다.</div>';
  }
}

// 댓글 작성
document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const contentInput = document.getElementById('commentContent');
  const content = contentInput.value.trim();
  if (!content) return;
  try {
    await apiFetch(`/posts/${postId}/comments/write`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    contentInput.value = '';
    await loadComments();
  } catch (err) {
    console.error(err);
    alert('댓글 작성 실패: ' + err.message);
  }
});

// 댓글 수정/삭제
document.getElementById('commentList').addEventListener('click', async (e) => {
  const item = e.target.closest('.list-group-item');
  if (!item) return;
  const commentId = item.dataset.id;

  if (e.target.classList.contains('delete')) {
    if (!confirm('댓글을 삭제할까요?')) return;
    try {
      await apiFetch(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
      await loadComments();
    } catch (err) {
      console.error(err);
      alert('삭제 실패: ' + err.message);
    }
  }

  if (e.target.classList.contains('edit')) {
    const current = item.querySelector('.mt-2').textContent;
    const next = prompt('내용을 수정하세요', current);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    try {
      await apiFetch(`/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: trimmed }),
      });
      await loadComments();
    } catch (err) {
      console.error(err);
      alert('수정 실패: ' + err.message);
    }
  }
});

loadPost();
loadComments();