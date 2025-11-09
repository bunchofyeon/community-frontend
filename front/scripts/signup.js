import { renderHeader } from './common.js';
import { apiFetch } from './api.js';

// 상단 네비게이션 렌더링
renderHeader('signup');

// 폼 제출 이벤트
document.querySelector('#signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.querySelector('#email').value.trim();
  const nickname = document.querySelector('#nickname').value.trim();
  const password = document.querySelector('#password').value;
  const passwordCheck = document.querySelector('#passwordCheck').value;

  if (!email || !nickname || !password || !passwordCheck)
    return alert('모든 필드를 입력해주세요.');

  if (password !== passwordCheck)
    return alert('비밀번호가 일치하지 않습니다.');

  try {
    await apiFetch('/users/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, passwordCheck, nickname }),
    });
    alert('회원가입 성공!');
    location.href = 'login.html';
  } catch (err) {
    console.error(err);
    alert('회원가입 실패: ' + err.message);
  }
});