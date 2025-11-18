// scripts/postCreate.js
import { requireAuth } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('createForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const filesInput = document.getElementById('postFiles'); // ✅ HTML id와 통일

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleEl = document.getElementById('title');
    const contentEl = document.getElementById('content');

    const title = titleEl?.value?.trim();
    const content = contentEl?.value?.trim();

    if (!title) {
      alert('제목을 입력하세요.');
      titleEl?.focus();
      return;
    }
    if (!content) {
      alert('내용을 입력하세요.');
      contentEl?.focus();
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중…';
      }

      // 1) 게시글 본문 먼저 생성
      const res = await apiFetch('/posts/write', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });

      const data = res?.data ?? res;
      const newId = data?.id ?? data?.postId;

      if (!newId) {
        alert('게시글 등록은 성공했지만 ID를 확인하지 못했습니다. 목록으로 이동합니다.');
        location.href = 'posts.html';
        return;
      }

      // 2) 첨부파일이 있으면 /posts/{id}/files 로 업로드
      if (filesInput && filesInput.files && filesInput.files.length > 0) {
        const fd = new FormData();
        // ✅ @RequestPart("files")와 이름 딱 맞추기
        Array.from(filesInput.files).forEach((file) => {
          fd.append('files', file);
        });

        await apiFetch(`/posts/${newId}/files`, {
          method: 'POST',
          body: fd, // ✅ Content-Type 자동 설정 (FormData)
        });
      }

      alert('게시글 등록 성공!');
      location.href = `post-detail.html?id=${newId}`;
    } catch (err) {
      console.error('[create] error', err);
      alert('등록 실패: ' + (err?.message || ''));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '등록';
      }
    }
  });
});