import { renderHeader } from './common.js';
import { apiFetch } from './api.js';
renderHeader('login');

document.querySelector('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // 페이지 새로고침 방지
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  try {
    const res = await apiFetch('/users/login', { // 로그인 API 호출
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const token = res.data?.token || res.token; // 응답에서 토큰 꺼내기
    localStorage.setItem('token', token); // 토큰 저장하고 이후 인증 필요 API에서 사용
    alert('로그인 성공!');
    location.href = 'posts.html'; // 글 목록으로 이동
  } catch (err) {
    alert('로그인 실패: ' + err.message);
  }
});