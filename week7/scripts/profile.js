import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader();
requireAuth();

const $ = (sel) => document.querySelector(sel);

const $form = $('#profileForm');
const $nickname = $('#nickname');
const $current = $('#currentPassword');
const $newPwd = $('#newPassword');
const $newPwdCk = $('#newPasswordCheck');
const $deleteBtn = $('#deleteBtn');


$deleteBtn?.addEventListener('click', async () => {
  if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  try {
    await apiFetch('/users/me', { method: 'DELETE' }); // ★ /me 사용
    localStorage.removeItem('token');
    alert('탈퇴 완료');
    location.href = 'signup.html';
  } catch (err) {
    alert('탈퇴 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});

$form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nickname = $nickname.value.trim();
  const currentPassword = $current.value.trim();
  const newPassword = $newPwd.value.trim();
  const newPasswordCheck = $newPwdCk.value.trim();

  if (!currentPassword) {
    alert('현재 비밀번호를 입력하세요.');
    $current.focus();
    return;
  }

  const body = { nickname };

  // 새 비번을 입력하면! -> 새 비번 유효성/일치 체크
  if (newPassword.length > 0 || newPasswordCheck.length > 0) {
    if (newPassword.length < 4) {
      alert('새 비밀번호는 4자 이상이어야 합니다.'); // 이건 일단 숫자로만...
      $newPwd.focus();
      return;
    }
    if (newPassword !== newPasswordCheck) {
      alert('새 비밀번호와 확인이 일치하지 않습니다.');
      $newPwdCk.focus();
      return;
    }
    body.password = newPassword;
    body.passwordCheck = newPasswordCheck;
  } else {
    // 비밀번호 안바꾸면 비워두면 됨
    // 현재 비번을 그대로 다시 설정함!
    body.password = currentPassword;
    body.passwordCheck = currentPassword;
  }

  try {
    await apiFetch('/users/update', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    alert('프로필 수정 완료!');
    // 비번 입력칸 초기화
    $current.value = '';
    $newPwd.value = '';
    $newPwdCk.value = '';
  } catch (err) {
    alert('수정 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});

// 회원 탈퇴
$deleteBtn?.addEventListener('click', async () => {
  if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

  try {
    await apiFetch('/users', { method: 'DELETE' });
    localStorage.removeItem('token');
    alert('탈퇴 완료');
    location.href = 'signup.html';
  } catch (err) {
    alert('탈퇴 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});
// ★ DOM 로드 후 현재 사용자 정보로 채우기
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const meRes = await apiFetch('/users/me'); // /api 프록시 붙음
    const me = meRes.data; // ApiResponse { data: {...} } 구조면 맞춰서
    if (me?.nickname) $nickname.value = me.nickname;
  } catch (e) {
    console.error(e);
  }
});