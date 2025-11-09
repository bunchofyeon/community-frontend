// scripts/profile.js
import { renderHeader, requireAuth } from './common.js';
import { apiFetch } from './api.js';

renderHeader();
requireAuth();

const $ = (sel) => document.querySelector(sel);

const $form       = $('#profileForm');
const $nickname   = $('#nickname');
const $current    = $('#currentPassword');
const $newPwd     = $('#newPassword');
const $newPwdCk   = $('#newPasswordCheck');
const $deleteBtn  = $('#deleteBtn');

let ME = null; // /users/me 결과 캐시(백엔드가 이메일 등 요구시 호환용)

// ===== 회원 탈퇴 =====
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

// ===== 프로필 수정 =====
$form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nickname          = ($nickname?.value ?? '').trim();
  const currentPassword   = ($current?.value ?? '').trim();
  const newPassword       = ($newPwd?.value ?? '').trim();
  const newPasswordCheck  = ($newPwdCk?.value ?? '').trim();

  if (!currentPassword) {
    alert('현재 비밀번호를 입력하세요.');
    $current?.focus();
    return;
  }

  // 기본 페이로드(닉네임만 수정 가능)
  const bodyBase = {
    nickname,
    currentPassword,
  };

  // 백엔드가 이메일을 여전히 요구한다면(과거 DTO 호환용)
  if (ME?.email) bodyBase.email = ME.email;

  // 새 비번 입력한 경우에만 포함
  const willChangePassword = newPassword.length > 0 || newPasswordCheck.length > 0;
  if (willChangePassword) {
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

  // 1차 시도: 선택형 DTO 기준(비번 비우면 미포함)
  let body = { ...bodyBase };
  if (willChangePassword) {
    body.password = newPassword;
    body.passwordCheck = newPasswordCheck;
  }

  try {
    await apiFetch('/users/update', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    afterSuccess();
  } catch (err) {
    // ⛑️ 호환용 Fallback:
    // 백엔드가 여전히 password/passwordCheck를 @NotBlank로 강제하면
    // "이메일을 입력해주세요." / "변경할 비밀번호를 입력해주세요." 류 메시지가 올 수 있음.
    const msg = String(err?.message || '');
    const looksLikeRequiresPw =
      /비밀번호를 입력|password.*blank|passwordCheck.*blank|이메일을 입력/i.test(msg);

    if (!willChangePassword && looksLikeRequiresPw) {
      // 다시 한 번 시도: 새 비번을 보내지 않으려던 케이스에서
      // 서버가 강제할 때 현재 비번으로 양쪽 채워 재시도
      try {
        const retry = {
          ...bodyBase,
          password: currentPassword,
          passwordCheck: currentPassword,
        };
        await apiFetch('/users/update', {
          method: 'PATCH',
          body: JSON.stringify(retry),
        });
        afterSuccess();
        return;
      } catch (e2) {
        alert('수정 실패: ' + (e2?.message ?? '알 수 없는 에러'));
        return;
      }
    }

    alert('수정 실패: ' + (err?.message ?? '알 수 없는 에러'));
  }
});

function afterSuccess() {
  alert('프로필 수정 완료!');
  // UX 1) 마이페이지로 이동
  location.href = 'my-page.html';
  // 만약 이 페이지에 머무르고 싶다면 아래처럼 새로고침/재로드:
  // $current.value = $newPwd.value = $newPwdCk.value = '';
  // loadMeIntoForm();
}

// ===== 내 정보 채우기 =====
async function loadMeIntoForm() {
  try {
    const meRes = await apiFetch('/users/me'); // { message, data: {...} }
    const me = meRes?.data ?? meRes;
    ME = me;
    if (me?.nickname && $nickname) $nickname.value = me.nickname;
  } catch (e) {
    console.error('[profile] load me error', e);
  }
}

document.addEventListener('DOMContentLoaded', loadMeIntoForm);