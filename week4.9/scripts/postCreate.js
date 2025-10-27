import { requireAuth } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

const form = document.querySelector('#createForm');
const titleEl = document.querySelector('#title');
const contentEl = document.querySelector('#content');
const alertBox = document.querySelector('#createAlert');
const createBtn = document.querySelector('#createBtn');
const titleCount = document.querySelector('#titleCount');

function showAlert(message, type = 'danger') {
  if (!alertBox) return;
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');
}
function hideAlert() {
  if (!alertBox) return;
  alertBox.classList.add('d-none');
  alertBox.textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  if (!form) {
    console.error('#createForm not found');
    return;
  }

  const updateCount = () => {
    if (titleCount && titleEl) titleCount.textContent = (titleEl.value ?? '').length;
  };
  titleEl?.addEventListener('input', updateCount);
  updateCount();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const title = titleEl?.value?.trim();
    const content = contentEl?.value?.trim();

    if (!title || !content) {
      showAlert('제목과 내용을 모두 입력해주세요.', 'warning');
      return;
    }
    if (title.length > 10) {
      showAlert('제목은 10자를 넘을 수 없습니다.', 'warning');
      return;
    }

    createBtn.disabled = true;
    const originalText = createBtn.textContent;
    createBtn.textContent = '등록 중...';

    try {
      await apiFetch('/posts/write', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      showAlert('게시글 등록 성공! 목록으로 이동합니다.', 'success');
      setTimeout(() => { location.href = 'posts.html'; }, 400);
    } catch (err) {
      console.error('[post-create] error', err);
      showAlert('등록 실패: ' + (err?.message ?? '알 수 없는 오류'), 'danger');
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = originalText;
    }
  });
});