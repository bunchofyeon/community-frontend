import { apiFetch } from './api.js';

const form = document.querySelector('#signupForm');
const fileInput = document.querySelector('#profileImage');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email          = document.querySelector('#email').value.trim();
  const nickname       = document.querySelector('#nickname').value.trim();
  const password       = document.querySelector('#password').value;
  const passwordCheck  = document.querySelector('#passwordCheck').value;
  const profileFile    = fileInput?.files?.[0] ?? null;

  if (!email || !nickname || !password || !passwordCheck) {
    return alert('모든 필드를 입력해주세요.');
  }
  if (password !== passwordCheck) {
    return alert('비밀번호가 일치하지 않습니다.');
  }

  try {
    // 1) 회원가입
    await apiFetch('/users/register', {
      method: 'POST',
      body: JSON.stringify({ email, nickname, password, passwordCheck }),
    });

    // 2) 바로 로그인해서 토큰 확보
    const loginRes = await apiFetch('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = loginRes?.data?.token ?? loginRes?.token;
    if (!token) {
      alert('회원가입은 되었지만 로그인에 실패했습니다. 다시 로그인해주세요.');
      location.href = 'login.html';
      return;
    }
    localStorage.setItem('token', token);

    // 3) 프로필 이미지가 있다면 업로드 (multipart/form-data)
    if (profileFile) {
      const fd = new FormData();
      fd.append('file', profileFile);

      await apiFetch('/profile-image', {
        method: 'POST',
        body: fd,
      });
    }

    alert('회원가입 완료!');
    location.href = 'my-page.html';
  } catch (err) {
    console.error('[signup] error', err);
    alert('회원가입 실패: ' + (err?.message || '알 수 없는 오류'));
  }
});