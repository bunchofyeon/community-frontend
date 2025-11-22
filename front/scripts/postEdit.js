// postEdit.js
import { requireAuth, showToast, confirmModal, setInlineMessage, clearInlineMessage } from './common.js';
import { apiFetch } from './api.js';

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
  if (!postId) {
    showToast('잘못된 접근입니다. (게시글 id 누락)', 'error');
    location.replace('posts.html');
    return;
  }

  const form = document.getElementById('editForm');
  const titleEl = document.getElementById('title');
  const contentEl = document.getElementById('content');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const existingFilesContainer = document.getElementById('existingFiles');
  const newFilesInput = document.getElementById('newPostFiles');
  const newFilePreview = document.getElementById('newFilePreview');

  function editMsgSel() {
    let el = document.querySelector('#editMessage');
    if (!el && form) {
      el = document.createElement('p');
      el.id = 'editMessage';
      el.className = 'form-message';
      form.appendChild(el);
    }
    return el ? '#editMessage' : null;
  }

  if (titleEl) titleEl.setAttribute('maxlength', '26');

  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    location.href = `post-detail.html?id=${postId}`;
  });

  let existingFiles = [];
  let filesToDelete = [];
  let newFiles = [];

  const esc = (str = '') =>
    String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  function renderExistingFiles() {
    if (!existingFilesContainer) return;

    if (!existingFiles.length) {
      existingFilesContainer.innerHTML = `<div class="form-hint">첨부된 파일이 없습니다.</div>`;
      return;
    }

    existingFilesContainer.innerHTML = existingFiles
      .map((f) => {
        const url = f.fileUrl || f.url || f.downloadUrl;
        const name = f.originName || f.filename || '';
        const fileId = f.id;
        if (!url) return '';
        return `
          <div class="file-row" data-file-id="${fileId}">
            <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${esc(name || '첨부 이미지')}
            </span>
            <button type="button" class="btn btn-light btn-sm file-delete-btn">삭제</button>
          </div>
        `;
      })
      .join('');

    existingFilesContainer.querySelectorAll('.file-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const row = e.currentTarget.closest('.file-row');
        const fileId = row?.getAttribute('data-file-id');
        if (!fileId) return;

        const ok = await confirmModal({
          title: '파일 삭제',
          message: '이 파일을 삭제하시겠습니까?',
          confirmText: '삭제',
          cancelText: '취소',
        });
        if (!ok) return;

        filesToDelete.push(Number(fileId));
        existingFiles = existingFiles.filter((f) => String(f.id) !== String(fileId));
        renderExistingFiles();
      });
    });
  }

  function renderNewFilePreview() {
    if (!newFilePreview) return;
    if (!newFiles.length) {
      newFilePreview.innerHTML = '';
      return;
    }
    newFilePreview.innerHTML = newFiles
      .map((f) => `<div class="file-row"><span>${esc(f.name)}</span></div>`)
      .join('');
  }

  newFilesInput?.addEventListener('change', () => {
    const files = newFilesInput.files;
    newFiles = files && files.length ? Array.from(files) : [];
    renderNewFilePreview();
  });

  // 게시글 및 파일 로드
  (async () => {
    try {
      const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
      const p = res?.data ?? res;

      sessionStorage.setItem('lastPostId', String(p.id));
      if (titleEl) titleEl.value = p?.title ?? '';
      if (contentEl) contentEl.value = p?.content ?? '';

      try {
        const fileRes = await apiFetch(`/posts/${postId}/files`, { method: 'GET' });
        const list = fileRes?.data ?? fileRes;
        existingFiles = Array.isArray(list) ? list : [];
        renderExistingFiles();
      } catch (e) {
        console.warn('[edit] 파일 목록 로드 실패', e);
        existingFiles = [];
        renderExistingFiles();
        showToast('첨부 파일 목록을 불러오지 못했습니다.', 'error');
      }
    } catch (err) {
      console.error('[edit] load error', err);
      showToast('게시글을 불러오지 못했습니다.', 'error');
      location.replace('posts.html');
    }
  })();

  // 저장
  let pending = false;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pending) return;

    const title = titleEl?.value.trim();
    const content = contentEl?.value.trim();
    const msgSel = editMsgSel();
    if (msgSel) clearInlineMessage(msgSel);

    if (!title) {
      if (msgSel) setInlineMessage(msgSel, '제목을 입력하세요.', 'error');
      showToast('제목을 입력해주세요.', 'error');
      titleEl?.focus();
      return;
    }
    if (title.length > 26) {
      if (msgSel) setInlineMessage(msgSel, '제목은 최대 26자까지 가능합니다.', 'error');
      showToast('제목은 최대 26자까지 가능합니다.', 'error');
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
      pending = true;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중…';
      }

      // 1) 게시글 텍스트 수정
      await apiFetch(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, content }),
      });

      // 2) 파일 삭제
      for (const fileId of filesToDelete) {
        try {
          await apiFetch(`/posts/${postId}/files/${fileId}`, {
            method: 'DELETE',
          });
        } catch (err) {
          console.error('[edit] file delete fail', fileId, err);
        }
      }

      // 3) 새 파일 업로드
      if (newFiles.length > 0) {
        const fd = new FormData();
        newFiles.forEach((file) => fd.append('files', file));

        await apiFetch(`/posts/${postId}/files`, {
          method: 'POST',
          body: fd,
        });
      }

      // 성공 토스트 없이 상세 페이지로 이동
      location.href = `post-detail.html?id=${postId}`;
    } catch (err) {
      console.error('[edit] save error', err);
      const msg = String(err?.message || '');
      if (msg.startsWith('401') || msg.includes('[401]')) {
        showToast('수정 실패: 인증이 필요합니다. 다시 로그인해주세요.', 'error');
        location.href = 'login.html';
      } else {
        showToast('게시글 수정에 실패했습니다.', 'error');
      }
    } finally {
      pending = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '수정 완료';
      }
    }
  });
});