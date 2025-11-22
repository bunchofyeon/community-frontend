// scripts/profileNickname.js
import {
  requireAuth,
  showToast,
  setInlineMessage,
  clearInlineMessage,
} from './common.js';
import { apiFetch } from './api.js';

requireAuth();

const $ = (sel) => document.querySelector(sel);

const $form = $('#nicknameForm');
const $nickname = $('#nickname');
const $currentPwd = $('#currentPassword');
const $nickMsg = $('#nicknameMessage');
const $pwdMsg = $('#passwordMessage');
const $nickCheckBtn = $('#nicknameCheckBtn');

const API = {
  me: '/users/me',
  checkNickname: (nickname) =>
    `/users/checkNickname?nickname=${encodeURIComponent(nickname)}`,
  updateNickname: '/users/updateNickname',
};

let ME = null;
let lastCheckedNickname = '';

function setNickMsg(msg, type = 'error') {
  if (!$nickMsg) return;
  $nickMsg.textContent = msg;
  $nickMsg.className = `form-message form-message--${type}`;
}

function setPwdMsg(msg, type = 'error') {
  if (!$pwdMsg) return;
  $pwdMsg.textContent = msg;
  $pwdMsg.className = `form-message form-message--${type}`;
}

async function loadMe() {
  try {
    const res = await apiFetch(API.me, { method: 'GET' });
    const me = res?.data ?? res;
    ME = me;
    if ($nickname && me?.nickname) {
      $nickname.value = me.nickname;
    }
  } catch (e) {
    console.error('[nickname] load me error', e);
    showToast('내 정보를 불러오지 못했습니다.', 'error');
  }
}

async function checkNicknameUnique() {
  const nickname = ($nickname?.value ?? '').trim();
  if (!nickname) {
    setNickMsg('닉네임을 입력하세요.', 'error');
    return false;
  }

  clearInlineMessage('#nicknameMessage');

  if (ME && nickname === ME.nickname) {
    lastCheckedNickname = nickname;
    setNickMsg('현재 사용 중인 닉네임입니다.', 'info');
    showToast('현재 사용 중인 닉네임입니다.', 'info');
    return true;
  }

  try {
    await apiFetch(API.checkNickname(nickname), { method: 'GET' });
    lastCheckedNickname = nickname;
    setNickMsg('사용 가능한 닉네임입니다.', 'success');
    showToast('사용 가능한 닉네임입니다.', 'success');
    return true;
  } catch (err) {
    console.error('[nickname] check error', err);
    setNickMsg('이미 사용 중인 닉네임입니다.', 'error');
    showToast('닉네임 중복입니다.', 'error');
    return false;
  }
}

$nickCheckBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  await checkNicknameUnique();
});

$form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  clearInlineMessage('#nicknameMessage');
  clearInlineMessage('#passwordMessage');

  const nickname = ($nickname?.value ?? '').trim();
  const currentPassword = ($currentPwd?.value ?? '').trim();

  if (!nickname) {
    setNickMsg('닉네임을 입력하세요.', 'error');
    showToast('닉네임을 입력해주세요.', 'error');
    return;
  }

  if (!currentPassword) {
    setPwdMsg('현재 비밀번호를 입력하세요.', 'error');
    showToast('현재 비밀번호를 입력해주세요.', 'error');
    return;
  }

  if (lastCheckedNickname !== nickname) {
    const ok = await checkNicknameUnique();
    if (!ok) return;
  }

  try {
    await apiFetch(API.updateNickname, {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, nickname }),
    });
    showToast('닉네임이 변경되었습니다.', 'success');
    location.href = 'my-page.html';
  } catch (err) {
    console.error('[nickname] update error', err);
    setPwdMsg('닉네임 변경에 실패했습니다.', 'error');
    showToast('닉네임 변경에 실패했습니다.', 'error');
  }
});

document.addEventListener('DOMContentLoaded', loadMe);