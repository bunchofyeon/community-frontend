import { requireAuth } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

// 프로필 수정
document.querySelector('#profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('nickname').value.trim();
  try {
    await apiFetch('/users/update', {
      method: 'PUT',
      body: JSON.stringify({ nickname }),
    });
    alert('프로필 수정 완료!');
  } catch (e2) {
    alert('수정 실패: ' + e2.message);
  }
});

// 회원 탈퇴
document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!confirm('정말 탈퇴하시겠습니까?')) return;
  try {
    await apiFetch('/users', { method: 'DELETE' });
    localStorage.removeItem('token');
    alert('탈퇴 완료');
    location.href = 'signup.html';
  } catch (e) {
    alert('탈퇴 실패: ' + e.message);
  }
});

// ▼ 비밀번호 변경 추가 로직
document.getElementById('pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword').value;
  const newPasswordCheck = document.getElementById('newPasswordCheck').value;

  if (!newPassword || !newPasswordCheck) {
    alert('새 비밀번호를 입력해주세요.');
    return;
  }
  if (newPassword !== newPasswordCheck) {
    alert('새 비밀번호가 일치하지 않습니다.');
    return;
  }

  try {
    // 백엔드에 맞춰 경로/메서드 조정 가능: PUT /users/password
    await apiFetch('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword, passwordCheck: newPasswordCheck }),
    });
    alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
    localStorage.removeItem('token');
    location.href = 'login.html';
  } catch (err) {
    alert('비밀번호 변경 실패: ' + err.message);
  }
});