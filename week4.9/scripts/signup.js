import { apiFetch } from './api.js';

const form = document.querySelector('#signupForm');
const emailEl = document.querySelector('#email');
const nicknameEl = document.querySelector('#nickname');
const passwordEl = document.querySelector('#password');
const passwordCheckEl = document.querySelector('#passwordCheck');
const alertBox = document.querySelector('#signupAlert');
const signupBtn = document.querySelector('#signupBtn');

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
  const nickname = nicknameEl.value.trim();
  const password = passwordEl.value;
  const passwordCheck = passwordCheckEl.value;

  if (!email || !nickname || !password || !passwordCheck) {
    showAlert('모든 필드를 입력해주세요.', 'warning');
    return;
  }
  if (nickname.length > 10) {
    showAlert('닉네임은 최대 10자입니다.', 'warning');
    return;
  }
  if (password !== passwordCheck) {
    showAlert('비밀번호가 일치하지 않습니다.', 'warning');
    return;
  }

  signupBtn.disabled = true;
  const originalText = signupBtn.textContent;
  signupBtn.textContent = '가입 처리 중...';

  try {
    await apiFetch('/users/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, passwordCheck, nickname }),
    });
    showAlert('회원가입 성공! 로그인 페이지로 이동합니다.', 'success');
    setTimeout(() => { location.href = 'login.html'; }, 400);
  } catch (err) {
    showAlert('회원가입 실패: ' + (err?.message || '알 수 없는 오류'), 'danger');
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = originalText;
  }
});