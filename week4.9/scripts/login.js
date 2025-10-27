import { apiFetch } from './api.js';

const form = document.querySelector('#loginForm');
const emailEl = document.querySelector('#email');
const passwordEl = document.querySelector('#password');
const alertBox = document.querySelector('#loginAlert');
const loginBtn = document.querySelector('#loginBtn');

function showAlert(message, type = 'danger') {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');
}
function hideAlert() {
  alertBox.classList.add('d-none');
  alertBox.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    showAlert('이메일과 비밀번호를 모두 입력해주세요.', 'warning');
    return;
  }

  loginBtn.disabled = true;
  const originalText = loginBtn.textContent;
  loginBtn.textContent = '로그인 중...';

  try {
    const res = await apiFetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = res?.data?.token || res?.token || res;
    if (!token || typeof token !== 'string') throw new Error('토큰이 응답에 없습니다.');

    localStorage.setItem('token', token);
    showAlert('로그인 성공! 게시글 목록으로 이동합니다.', 'success');

    setTimeout(() => { location.href = 'posts.html'; }, 300);
  } catch (err) {
    showAlert('로그인 실패: ' + (err?.message || '알 수 없는 오류'), 'danger');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = originalText;
  }
});