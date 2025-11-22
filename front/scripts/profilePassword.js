// scripts/profilePassword.js
import { requireAuth, showToast } from './common.js';
import { apiFetch } from './api.js';

requireAuth();

const $ = (sel) => document.querySelector(sel);

const $form = $('#passwordForm');
const $current = $('#currentPassword');
const $newPwd = $('#newPassword');
const $newPwdCk = $('#newPasswordCheck');
const $msg = $('#passwordMessage');

const API = {
  updatePassword: '/users/updatePassword',
};

function setMsg(msg, type = 'error') {
  if (!$msg) return;
  $msg.textContent = msg;
  $msg.className = `form-message form-message--${type}`;
}

$form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  setMsg('', 'info');

  const currentPassword = ($current?.value ?? '').trim();
  const newPassword = ($newPwd?.value ?? '').trim();
  const newPasswordCheck = ($newPwdCk?.value ?? '').trim();

  if (!currentPassword) {
    setMsg('현재 비밀번호를 입력하세요.', 'error');
    showToast('현재 비밀번호를 입력해주세요.', 'error');
    $current?.focus();
    return;
  }
  if (!newPassword || !newPasswordCheck) {
    setMsg('새 비밀번호와 확인을 모두 입력하세요.', 'error');
    showToast('새 비밀번호를 모두 입력해주세요.', 'error');
    return;
  }
  if (newPassword.length < 4) {
    setMsg('새 비밀번호는 4자 이상이어야 합니다.', 'error');
    showToast('비밀번호가 너무 짧습니다.', 'error');
    $newPwd?.focus();
    return;
  }
  if (newPassword !== newPasswordCheck) {
    setMsg('새 비밀번호와 확인이 일치하지 않습니다.', 'error');
    showToast('비밀번호 확인이 일치하지 않습니다.', 'error');
    $newPwdCk?.focus();
    return;
  }

  try {
    await apiFetch(API.updatePassword, {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        newPasswordCheck,
      }),
    });

    showToast('비밀번호가 변경되었습니다.', 'success');
    location.href = 'my-page.html';
  } catch (err) {
    console.error('[password] update error', err);
    setMsg('비밀번호 변경에 실패했습니다.', 'error');
    showToast('비밀번호 변경에 실패했습니다.', 'error');
  }
});