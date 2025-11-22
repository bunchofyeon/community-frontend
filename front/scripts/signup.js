// signup.js
import { apiFetch } from './api.js';
import { setInlineMessage, clearInlineMessage, showToast } from './common.js';

const form = document.querySelector('#signupForm');
const fileInput = document.querySelector('#profileImage');

function signupMsgSel() {
  let el = document.querySelector('#signupMessage');
  if (!el && form) {
    el = document.createElement('p');
    el.id = 'signupMessage';
    el.className = 'form-message';
    form.appendChild(el);
  }
  return el ? '#signupMessage' : null;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email          = document.querySelector('#email').value.trim();
  const nickname       = document.querySelector('#nickname').value.trim();
  const password       = document.querySelector('#password').value;
  const passwordCheck  = document.querySelector('#passwordCheck').value;
  const profileFile    = fileInput?.files?.[0] ?? null;

  const msgSel = signupMsgSel();
  if (msgSel) clearInlineMessage(msgSel);

  if (!email || !nickname || !password || !passwordCheck) {
    if (msgSel) setInlineMessage(msgSel, '모든 필드를 입력해주세요.', 'error');
    showToast('회원가입 정보를 모두 입력해주세요.', 'error');
    return;
  }
  if (password !== passwordCheck) {
    if (msgSel) setInlineMessage(msgSel, '비밀번호가 일치하지 않습니다.', 'error');
    showToast('비밀번호가 일치하지 않습니다.', 'error');
    return;
  }

  try {
    // 1) 회원가입
    await apiFetch('/users/register', {
      method: 'POST',
      body: JSON.stringify({ email, nickname, password, passwordCheck }),
    });

    // 2) 자동 로그인
    const loginRes = await apiFetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = loginRes?.data?.token ?? loginRes?.token;
    if (!token) {
      if (msgSel) setInlineMessage(msgSel, '회원가입은 되었지만 로그인에 실패했습니다. 다시 로그인해주세요.', 'error');
      showToast('회원가입은 되었지만 로그인에 실패했습니다.', 'error');
      location.href = 'login.html';
      return;
    }
    localStorage.setItem('token', token);

    // 3) 프로필 이미지 업로드
    if (profileFile) {
      const fd = new FormData();
      fd.append('file', profileFile);

      await apiFetch('/profile-image', {
        method: 'POST',
        body: fd,
      });
    }

    if (msgSel) setInlineMessage(msgSel, '회원가입 완료! 마이페이지로 이동합니다.', 'success');
    showToast('회원가입 완료!', 'success');
    location.href = 'my-page.html';
  } catch (err) {
    console.error('[signup] error', err);
    if (msgSel) setInlineMessage(msgSel, '회원가입에 실패했습니다. 입력값을 다시 확인해주세요.', 'error');
    showToast('회원가입에 실패했습니다.', 'error');
  }
});