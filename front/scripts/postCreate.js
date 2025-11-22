// postCreate.js
import { requireAuth, setInlineMessage, clearInlineMessage, showToast } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('createForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const filesInput = document.getElementById('postFiles');

  function createMsgSel() {
    let el = document.querySelector('#createMessage');
    if (!el && form) {
      el = document.createElement('p');
      el.id = 'createMessage';
      el.className = 'form-message';
      form.appendChild(el);
    }
    return el ? '#createMessage' : null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleEl = document.getElementById('title');
    const contentEl = document.getElementById('content');

    const title = titleEl?.value?.trim();
    const content = contentEl?.value?.trim();

    const msgSel = createMsgSel();
    if (msgSel) clearInlineMessage(msgSel);

    if (!title) {
      if (msgSel) setInlineMessage(msgSel, '제목을 입력하세요.', 'error');
      showToast('제목을 입력해주세요.', 'error');
      titleEl?.focus();
      return;
    }
    if (!content) {
      if (msgSel) setInlineMessage(msgSel, '내용을 입력하세요.', 'error');
      showToast('내용을 입력해주세요.', 'error');
      contentEl?.focus();
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중…';
      }

      // 1) 게시글 생성
      const res = await apiFetch('/posts/write', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });

      const data = res?.data ?? res;
      const newId = data?.id ?? data?.postId;

      if (!newId) {
        if (msgSel) setInlineMessage(msgSel, '게시글 등록은 되었지만 ID를 확인하지 못했습니다. 목록으로 이동합니다.', 'info');
        showToast('게시글 등록은 되었지만 ID 확인에 실패했습니다.', 'info');
        location.href = 'posts.html';
        return;
      }

      // 2) 첨부파일 업로드
      if (filesInput && filesInput.files && filesInput.files.length > 0) {
        const fd = new FormData();
        Array.from(filesInput.files).forEach((file) => {
          fd.append('files', file);
        });

        await apiFetch(`/posts/${newId}/files`, {
          method: 'POST',
          body: fd,
        });
      }

      // 성공 토스트 없이 바로 상세 페이지로 이동
      location.href = `post-detail.html?id=${newId}`;
    } catch (err) {
      console.error('[create] error', err);
      if (msgSel) setInlineMessage(msgSel, '게시글 등록에 실패했습니다.', 'error');
      showToast('게시글 등록에 실패했습니다.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '등록';
      }
    }
  });
});