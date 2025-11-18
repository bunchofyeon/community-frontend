import { renderHeader, requireAuth } from './common.js';
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
let selectedProfileFile = null; // 아직 서버에 안 보낸 새 파일
let pendingProfileDelete = false;

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
  }
}

// 닉네임 중복 체크
async function checkNicknameUnique() {
  const nickname = ($nickname?.value ?? '').trim();
  if (!nickname) {
    alert('닉네임을 입력하세요.');
    $nickname?.focus();
    return false;
  }

  if (ME && nickname === ME.nickname) {
    lastCheckedNickname = nickname;
    alert('현재 사용 중인 닉네임입니다.');
    return true;
  }

  try {
    await apiFetch(API.checkNickname(nickname), { method: 'GET' });
    lastCheckedNickname = nickname;
    alert('사용 가능한 닉네임입니다.');
    return true;
  } catch (err) {
    alert(
      '닉네임 중복: ' + (err?.message || '이미 사용 중인 닉네임입니다.'),
    );
    return false;
  }
}

// 닉네임 중복 확인 버튼
const $nickCheckBtn = $('#nicknameCheckBtn');
$nickCheckBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  await checkNicknameUnique();
});

// 프로필 이미지 선택하면 먼저 프리뷰만 보여줌
$profileFileInput?.addEventListener('change', (e) => {
  const file = e.target.files?.[0] ?? null;
  if (!file) {
    selectedProfileFile = null;
    return;
  }

  selectedProfileFile = file;
  pendingProfileDelete = false;

  const previewUrl = URL.createObjectURL(file); // blob: URL
  if ($profilePreview) {
    attachPreviewFallback($profilePreview);
    $profilePreview.src = previewUrl;
  }
});

// 프로필 이미지 삭제 버튼
$profileDeleteButton?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!confirm('프로필 이미지를 삭제하시겠습니까?')) return;

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

// 프로필 이미지 변경/삭제 서버 반영
async function applyProfileImageChanges() {
  // 삭제만 하는 경우
  if (pendingProfileDelete) {
    await apiFetch(API.profileImage, { method: 'DELETE' });
    return { profileImageUrl: null };
  }

  // 새 파일 선택한 경우
  if (selectedProfileFile) {
    const fd = new FormData();
    fd.append('file', selectedProfileFile);

    const res = await apiFetch(API.profileImage, {
      method: 'POST',
      body: fd,
    });
    return res?.data ?? res;
  }

  // 변경 사항 없음
  return {};
}

// 이미지 저장 버튼 (이미지 단독 저장)
$profileImageSaveBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  if (!selectedProfileFile && !pendingProfileDelete) {
    alert('변경된 이미지가 없습니다.');
    return;
  }

  try {
    const imgRes = await applyProfileImageChanges();

    // 서버 URL 기준으로 다시 로드
    if (imgRes && imgRes.profileImageUrl && $profilePreview) {
      $profilePreview.src = `${imgRes.profileImageUrl}?t=${Date.now()}`;
    } else if (pendingProfileDelete && $profilePreview) {
      $profilePreview.src = defaultProfileSrc();
    }

    // 상태 초기화
    pendingProfileDelete = false;
    selectedProfileFile = null;
    if ($profileFileInput) {
      $profileFileInput.value = '';
    }

    alert('프로필 이미지가 저장되었습니다.');
  } catch (err) {
    console.error('[profile] image save error', err);
    alert('이미지 저장 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});

// 회원 탈퇴
$deleteBtn?.addEventListener('click', async () => {
  if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  try {
    await apiFetch('/users/me', { method: 'DELETE' });
    localStorage.removeItem('token');
    alert('탈퇴 완료');
    location.href = 'signup.html';
  } catch (err) {
    alert('탈퇴 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});

// 프로필 폼 submit (닉네임 + 비밀번호만)
$form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nickname         = ($nickname?.value ?? '').trim();
  const currentPassword  = ($current?.value ?? '').trim();
  const newPassword      = ($newPwd?.value ?? '').trim();
  const newPasswordCheck = ($newPwdCk?.value ?? '').trim();

  const nicknameChanged = !!ME && nickname && nickname !== ME.nickname;
  const passwordChanged = !!(newPassword || newPasswordCheck);

  if (!nicknameChanged && !passwordChanged) {
    alert('변경할 내용이 없습니다. (이미지는 상단의 "이미지 저장" 버튼으로 저장하세요)');
    return;
  }

  // 닉네임/비밀번호 바꾸면 현재 비밀번호 필수
  if ((nicknameChanged || passwordChanged) && !currentPassword) {
    alert('현재 비밀번호를 입력하세요.');
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
      alert('새 비밀번호는 4자 이상이어야 합니다.');
      $newPwd?.focus();
      return;
    }
    if (newPassword !== newPasswordCheck) {
      alert('새 비밀번호와 확인이 일치하지 않습니다.');
      $newPwdCk?.focus();
      return;
    }
  }

  try {
    // 1) 닉네임 변경
    if (nicknameChanged) {
      await apiFetch(API.updateNickname, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, nickname }),
      });
    }

    // 2) 비밀번호 변경
    if (passwordChanged) {
      await apiFetch(API.updatePassword, {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordCheck,
        }),
      });
    }

    alert('프로필 수정 완료!');
    location.href = 'my-page.html';
  } catch (err) {
    console.error('[profile] update error', err);
    alert('수정 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});

// DOM 준비 후 me 호출
document.addEventListener('DOMContentLoaded', loadMeIntoForm);