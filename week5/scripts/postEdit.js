// scripts/postEdit.js
import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader('posts');
requireAuth();

function getPostIdRobust() {
  const url = new URL(location.href);
  let id = url.searchParams.get('id');

  if (!id && url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    id = hashParams.get('id');
  }
  if (!id) {
    id = sessionStorage.getItem('lastPostId');
  }
  if (!id && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      id =
        ref.searchParams.get('id') ||
        (ref.hash ? new URLSearchParams(ref.hash.replace(/^#/, '')).get('id') : null);
    } catch {}
  }
  return id;
}

document.addEventListener('DOMContentLoaded', () => {
  const postId = getPostIdRobust();
  const form = document.getElementById('editForm');
  const titleEl = document.getElementById('title');
  const contentEl = document.getElementById('content');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  if (!postId) {
    alert('잘못된 접근입니다. (id 누락)');
    location.replace('posts.html');
    return;
  }

  // 제목 입력 박스에 최대 길이 보강 (HTML에 없어도 동작)
  if (titleEl) titleEl.setAttribute('maxlength', '26');

  // 취소 → 상세로 이동
  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    location.href = `post-detail.html?id=${postId}`;
  });

  // 초기 데이터 로드
  (async () => {
    try {
      const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
      const p = res?.data ?? res;

      sessionStorage.setItem('lastPostId', String(p.id));
      titleEl.value = p?.title ?? '';
      contentEl.value = p?.content ?? '';
    } catch (err) {
      console.error('[edit] load error', err);
      alert('게시글을 불러오지 못했습니다.');
      location.replace('posts.html');
    }
  })();

  // 제출 시 유효성 체크 (제목 최대 26자)
  let pending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pending) return;

    const title = titleEl.value.trim();
    const content = contentEl.value.trim();

    if (!title) { alert('제목을 입력하세요.'); titleEl.focus(); return; }
    if (title.length > 26) { alert('제목은 최대 26자까지 가능합니다.'); titleEl.focus(); return; }
    if (!content) { alert('내용을 입력하세요.'); contentEl.focus(); return; }

    try {
      pending = true;
      saveBtn.disabled = true;
      saveBtn.textContent = '저장 중…';

      await apiFetch(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, content }),
      });

      alert('수정되었습니다.');
      location.href = `post-detail.html?id=${postId}`;
    } catch (err) {
      console.error('[edit] save error', err);
      const msg = String(err?.message || '');
      if (msg.startsWith('401')) {
        alert('수정 실패: 인증이 필요합니다. 다시 로그인해주세요.');
        location.href = 'login.html';
      } else {
        alert('수정 실패: ' + msg);
      }
    } finally {
      pending = false;
      saveBtn.disabled = false;
      saveBtn.textContent = '수정 완료';
    }
  });
});