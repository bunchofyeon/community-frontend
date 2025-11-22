// profile.js
import {
  renderHeader,
  requireAuth,
  showToast,
  setInlineMessage,
  clearInlineMessage,
  confirmModal,
} from './common.js';
import { apiFetch } from './api.js';

renderHeader();
requireAuth();

const $ = (sel) => document.querySelector(sel);

const $form      = $('#profileForm');
const $nickname  = $('#nickname');
const $current   = $('#currentPassword');
const $newPwd    = $('#newPassword');
const $newPwdCk  = $('#newPasswordCheck');
const $deleteBtn = $('#deleteBtn');

// 프로필 이미지 관련
const $profilePreview       = $('#profileImagePreview');
const $profileFileInput     = $('#profileImageFile');
const $profileDeleteButton  = $('#profileImageDeleteBtn');
const $profileImageSaveBtn  = $('#profileImageSaveBtn');

const API = {
  me: '/users/me',
  checkNickname: (nickname) =>
    `/users/checkNickname?nickname=${encodeURIComponent(nickname)}`,
  updateNickname: '/users/updateNickname',
  updatePassword: '/users/updatePassword',
  profileImage: '/profile-image',
};

let ME = null;
let lastCheckedNickname = '';
let selectedProfileFile = null;
let pendingProfileDelete = false;

// 인라인 메시지
function nickMsgSel() {
  let el = document.querySelector('#profileNickMessage');
  if (!el && $form) {
    el = document.createElement('p');
    el.id = 'profileNickMessage';
    el.className = 'form-message';
    $form.insertBefore(el, $current?.closest('.mb-12') || $form.lastChild);
  }
  return el ? '#profileNickMessage' : null;
}

function pwdMsgSel() {
  let el = document.querySelector('#profilePwdMessage');
  if (!el && $form) {
    el = document.createElement('p');
    el.id = 'profilePwdMessage';
    el.className = 'form-message';
    $form.appendChild(el);
  }
  return el ? '#profilePwdMessage' : null;
}

function defaultProfileSrc() {
  return './assets/img/comong.png';
}

function attachPreviewFallback(imgEl) {
  if (!imgEl) return;
  imgEl.addEventListener(
    'error',
    () => {
      imgEl.src = 'https://placehold.co/88x88?text=IMG';
    },
    { once: true },
  );
}

async function loadMeIntoForm() {
  try {
    const res = await apiFetch(API.me, { method: 'GET' });
    const me = res?.data ?? res;
    ME = me;

    if (me?.nickname && $nickname) {
      $nickname.value = me.nickname;
    }

    if ($profilePreview) {
      attachPreviewFallback($profilePreview);

      const url = me?.profileImageUrl || defaultProfileSrc();
      $profilePreview.src = url
        ? `${url}?t=${Date.now()}`
        : defaultProfileSrc();
    }
  } catch (e) {
    console.error('[profile] load me error', e);
    if ($profilePreview) {
      attachPreviewFallback($profilePreview);
      $profilePreview.src = defaultProfileSrc();
    }
    showToast('프로필 정보를 불러오지 못했습니다.', 'error');
  }
}

// 닉네임 중복 체크
async function checkNicknameUnique() {
  const nickname = ($nickname?.value ?? '').trim();
  const msgSel = nickMsgSel();
  if (msgSel) clearInlineMessage(msgSel);

  if (!nickname) {
    if (msgSel) setInlineMessage(msgSel, '닉네임을 입력하세요.', 'error');
    return false;
  }

  if (ME && nickname === ME.nickname) {
    lastCheckedNickname = nickname;
    if (msgSel) setInlineMessage(msgSel, '현재 사용 중인 닉네임입니다.', 'info');
    return true;
  }

  try {
    await apiFetch(API.checkNickname(nickname), { method: 'GET' });
    lastCheckedNickname = nickname;
    if (msgSel) setInlineMessage(msgSel, '사용 가능한 닉네임입니다.', 'success');
    showToast('사용 가능한 닉네임입니다.', 'success');
    return true;
  } catch (err) {
    console.error('[profile] nickname check error', err);
    if (msgSel) setInlineMessage(msgSel, '이미 사용 중인 닉네임입니다.', 'error');
    showToast('닉네임 중복입니다.', 'error');
    return false;
  }
}

// 닉네임 중복 확인 버튼
const $nickCheckBtn = $('#nicknameCheckBtn');
$nickCheckBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  await checkNicknameUnique();
});

// 프로필 이미지 선택 → 프리뷰
$profileFileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0] ?? null;
  if (!file) {
    selectedProfileFile = null;
    return;
  }

  selectedProfileFile = file;
  pendingProfileDelete = false;

  const previewUrl = URL.createObjectURL(file);
  if ($profilePreview) {
    attachPreviewFallback($profilePreview);
    $profilePreview.src = previewUrl;
  }
});

// 프로필 이미지 삭제 버튼
$profileDeleteButton?.addEventListener('click', async (e) => {
  e.preventDefault();

  const ok = await confirmModal({
    title: '프로필 이미지 삭제',
    message: '프로필 이미지를 삭제하시겠습니까?',
    confirmText: '삭제',
    cancelText: '취소',
  });
  if (!ok) return;

  pendingProfileDelete = true;
  selectedProfileFile = null;
  if ($profileFileInput) {
    $profileFileInput.value = '';
  }
  if ($profilePreview) {
    attachPreviewFallback($profilePreview);
    $profilePreview.src = defaultProfileSrc();
  }
});

// 이미지 서버 반영
async function applyProfileImageChanges() {
  if (pendingProfileDelete) {
    await apiFetch(API.profileImage, { method: 'DELETE' });
    return { profileImageUrl: null };
  }

  if (selectedProfileFile) {
    const fd = new FormData();
    fd.append('file', selectedProfileFile);

    const res = await apiFetch(API.profileImage, {
      method: 'POST',
      body: fd,
    });
    return res?.data ?? res;
  }

  return {};
}

// 이미지 저장 버튼
$profileImageSaveBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  if (!selectedProfileFile && !pendingProfileDelete) {
    showToast('변경된 이미지가 없습니다.', 'info');
    return;
  }

  try {
    const imgRes = await applyProfileImageChanges();

    if (imgRes && imgRes.profileImageUrl && $profilePreview) {
      $profilePreview.src = `${imgRes.profileImageUrl}?t=${Date.now()}`;
    } else if (pendingProfileDelete && $profilePreview) {
      $profilePreview.src = defaultProfileSrc();
    }

    pendingProfileDelete = false;
    selectedProfileFile = null;
    if ($profileFileInput) {
      $profileFileInput.value = '';
    }

    showToast('프로필 이미지가 저장되었습니다.', 'success');
  } catch (err) {
    console.error('[profile] image save error', err);
    showToast('이미지 저장 실패', 'error');
  }
});

// 회원 탈퇴
$deleteBtn?.addEventListener('click', async () => {
  const ok = await confirmModal({
    title: '회원 탈퇴',
    message: '정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    confirmText: '탈퇴',
    cancelText: '취소',
  });
  if (!ok) return;

  try {
    await apiFetch('/users/me', { method: 'DELETE' });
    localStorage.removeItem('token');
    showToast('탈퇴가 완료되었습니다.', 'success');
    location.href = 'signup.html';
  } catch (err) {
    console.error('[profile] withdraw error', err);
    showToast('탈퇴 처리에 실패했습니다.', 'error');
  }
});

// 프로필 폼 submit (닉네임 + 비밀번호)
$form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nickname         = ($nickname?.value ?? '').trim();
  const currentPassword  = ($current?.value ?? '').trim();
  const newPassword      = ($newPwd?.value ?? '').trim();
  const newPasswordCheck = ($newPwdCk?.value ?? '').trim();

  const nicknameChanged = !!ME && nickname && nickname !== ME.nickname;
  const passwordChanged = !!(newPassword || newPasswordCheck);

  const nickSel = nickMsgSel();
  const pwdSel  = pwdMsgSel();
  if (nickSel) clearInlineMessage(nickSel);
  if (pwdSel) clearInlineMessage(pwdSel);

  if (!nicknameChanged && !passwordChanged) {
    showToast('변경할 내용이 없습니다. (이미지는 상단의 "이미지 저장" 버튼으로 저장하세요)', 'info');
    return;
  }

  if ((nicknameChanged || passwordChanged) && !currentPassword) {
    if (pwdSel) setInlineMessage(pwdSel, '현재 비밀번호를 입력하세요.', 'error');
    showToast('현재 비밀번호를 입력해주세요.', 'error');
    $current?.focus();
    return;
  }

  if (nicknameChanged) {
    if (lastCheckedNickname !== nickname) {
      const ok = await checkNicknameUnique();
      if (!ok) return;
    }
  }

  if (passwordChanged) {
    if (newPassword.length < 4) {
      if (pwdSel) setInlineMessage(pwdSel, '새 비밀번호는 4자 이상이어야 합니다.', 'error');
      showToast('비밀번호가 너무 짧습니다.', 'error');
      $newPwd?.focus();
      return;
    }
    if (newPassword !== newPasswordCheck) {
      if (pwdSel) setInlineMessage(pwdSel, '새 비밀번호와 확인이 일치하지 않습니다.', 'error');
      showToast('비밀번호 확인이 일치하지 않습니다.', 'error');
      $newPwdCk?.focus();
      return;
    }
  }

  try {
    if (nicknameChanged) {
      await apiFetch(API.updateNickname, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, nickname }),
      });
      if (nickSel) setInlineMessage(nickSel, '닉네임이 변경되었습니다.', 'success');
    }

    if (passwordChanged) {
      await apiFetch(API.updatePassword, {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordCheck,
        }),
      });
      if (pwdSel) setInlineMessage(pwdSel, '비밀번호가 변경되었습니다.', 'success');
    }

    showToast('프로필이 수정되었습니다.', 'success');
    location.href = 'my-page.html';
  } catch (err) {
    console.error('[profile] update error', err);
    showToast('프로필 수정에 실패했습니다.', 'error');
  }
});

// DOM 준비 후 me 호출
document.addEventListener('DOMContentLoaded', loadMeIntoForm);