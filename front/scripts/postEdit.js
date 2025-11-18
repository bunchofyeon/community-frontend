// scripts/postEdit.js
import { requireAuth } from './common.js';
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
    alert('잘못된 접근입니다. (게시글 id 누락)');
    location.replace('posts.html');
    return;
  }

  const form = document.getElementById('editForm');
  const titleEl = document.getElementById('title');
  const contentEl = document.getElementById('content');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const existingFilesContainer = document.getElementById('existingFiles');
  const newFilesInput = document.getElementById('newPostFiles'); // ✅ HTML id와 통일
  const newFilePreview = document.getElementById('newFilePreview');

  if (titleEl) titleEl.setAttribute('maxlength', '26');

  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    location.href = `post-detail.html?id=${postId}`;
  });

  let existingFiles = [];   // 서버에 저장된 파일 목록
  let filesToDelete = [];   // 삭제할 fileId 모음
  let newFiles = [];        // 새로 추가할 File 객체들

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
      btn.addEventListener('click', (e) => {
        const row = e.currentTarget.closest('.file-row');
        const fileId = row?.getAttribute('data-file-id');
        if (!fileId) return;
        if (!confirm('이 파일을 삭제하시겠습니까?')) return;

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

  // ===== 게시글 및 파일 정보 로드 =====
  (async () => {
    try {
      // 1) 게시글 본문
      const res = await apiFetch(`/posts/${postId}`, { method: 'GET' });
      const p = res?.data ?? res;

      sessionStorage.setItem('lastPostId', String(p.id));
      if (titleEl) titleEl.value = p?.title ?? '';
      if (contentEl) contentEl.value = p?.content ?? '';

      // 2) 첨부 파일 목록
      try {
        const fileRes = await apiFetch(`/posts/${postId}/files`, { method: 'GET' });
        const list = fileRes?.data ?? fileRes;
        existingFiles = Array.isArray(list) ? list : [];
        renderExistingFiles();
      } catch (e) {
        console.warn('[edit] 파일 목록 로드 실패', e);
        existingFiles = [];
        renderExistingFiles();
      }
    } catch (err) {
      console.error('[edit] load error', err);
      alert('게시글을 불러오지 못했습니다.');
      location.replace('posts.html');
    }
  })();

  // ===== 저장 =====
  let pending = false;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pending) return;

    const title = titleEl?.value.trim();
    const content = contentEl?.value.trim();

    if (!title) {
      alert('제목을 입력하세요.');
      titleEl?.focus();
      return;
    }
    if (title.length > 26) {
      alert('제목은 최대 26자까지 가능합니다.');
      titleEl?.focus();
      return;
    }
    if (!content) {
      alert('내용을 입력하세요.');
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

      // 2) 삭제 신청된 파일 삭제
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
        newFiles.forEach((file) => fd.append('files', file)); // ✅ @RequestPart("files")

        await apiFetch(`/posts/${postId}/files`, {
          method: 'POST',
          body: fd,
        });
      }

      alert('수정되었습니다.');
      location.href = `post-detail.html?id=${postId}`;
    } catch (err) {
      console.error('[edit] save error', err);
      const msg = String(err?.message || '');
      if (msg.startsWith('401') || msg.includes('[401]')) {
        alert('수정 실패: 인증이 필요합니다. 다시 로그인해주세요.');
        location.href = 'login.html';
      } else {
        alert('수정 실패: ' + msg);
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