// login.js
import { renderHeader, setInlineMessage, clearInlineMessage, showToast } from './common.js';
import { apiFetch } from './api.js';

renderHeader('login');

const form = document.querySelector('#loginForm');

function loginMsgSel() {
  let el = document.querySelector('#loginMessage');
  if (!el && form) {
    el = document.createElement('p');
    el.id = 'loginMessage';
    el.className = 'form-message';
    form.appendChild(el);
  }
  return el ? '#loginMessage' : null;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;

  const msgSel = loginMsgSel();
  if (msgSel) clearInlineMessage(msgSel);

  if (!email || !password) {
    if (msgSel) setInlineMessage(msgSel, '이메일과 비밀번호를 모두 입력해주세요.', 'error');
    showToast('로그인 정보를 입력해주세요.', 'error');
    return;
  }

  try {
    const res = await apiFetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const token = res.data?.token || res.token;
    localStorage.setItem('token', token);

    // 성공 토스트/메시지는 없이 바로 이동
    location.href = 'posts.html';
  } catch (err) {
    console.error('[login] error', err);
    if (msgSel) setInlineMessage(msgSel, '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
    showToast('로그인에 실패했습니다.', 'error');
  }
});