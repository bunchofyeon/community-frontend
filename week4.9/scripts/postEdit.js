import { apiFetch } from './api.js';
import { requireAuth } from './common.js';

requireAuth();

const params = new URLSearchParams(location.search);
const id = params.get('id');
if (!id) {
  alert('잘못된 접근입니다. (id 없음)');
  location.href = 'posts.html';
}

const form = document.getElementById('editForm');
const titleEl = document.getElementById('title');
const contentEl = document.getElementById('content');
const alertBox = document.getElementById('editAlert');
const saveBtn = document.getElementById('saveBtn');
const detailLink = document.getElementById('detailLink');

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

if (detailLink && id) {
  detailLink.href = `post-detail.html?id=${id}`;
}

// 기존 내용 불러오기
(async () => {
  try {
    const res = await apiFetch(`/posts/${id}`, { method: 'GET' });
    const p = res?.data ?? res;
    titleEl.value = p.title ?? '';
    contentEl.value = p.content ?? '';
  } catch (err) {
    console.error('[edit] load error', err);
    showAlert('게시글을 불러오지 못했습니다: ' + (err?.message || '알 수 없는 오류'));
  }
})();

// 저장
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  if (!title || !content) {
    showAlert('제목과 내용을 모두 입력해주세요.', 'warning');
    return;
  }
  if (title.length > 10) {
    showAlert('제목은 10자를 넘을 수 없습니다.', 'warning');
    return;
  }

  saveBtn.disabled = true;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = '저장 중...';

  try {
    await apiFetch(`/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, content }),
    });
    showAlert('수정 완료! 상세 페이지로 이동합니다.', 'success');
    setTimeout(() => { location.href = `post-detail.html?id=${id}`; }, 300);
  } catch (err) {
    console.error('[edit] error', err);
    showAlert('수정 실패: ' + (err?.message || '알 수 없는 오류'), 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
});