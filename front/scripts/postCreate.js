import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader();
requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#createForm');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title   = document.getElementById('title')?.value?.trim();
    const content = document.getElementById('content')?.value?.trim();
    if (!title)   return alert('제목을 입력하세요.');
    if (!content) return alert('내용을 입력하세요.');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '등록 중…';

      const res = await apiFetch('/posts/write', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const data  = res?.data ?? res; // res.data가 존재하면 쓰고 없으면 res 전체 씀 (어차피 res안에 data 있으니까...)
      const newId = data?.id ?? data?.postId; // data.id가 존재하면 쓰고 없으면 data.postId 씀

      if (!newId) {
        // 혹시 id가 없다면 안전하게 목록으로...
        // 이거 이렇게밖에 처리 못하는건가 ㅠ
        alert('게시글 등록 성공! (id 확인 실패, 목록으로 이동)');
        location.href = 'posts.html';
        return;
      }
      alert('게시글 등록 성공!');
      // 방금 만든 글 상세로 이동
      location.href = `post-detail.html?id=${newId}`;
    } catch (err) {
      console.error('[create] error', err);
      alert('등록 실패: ' + (err?.message || ''));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '등록';
    }
  });
});